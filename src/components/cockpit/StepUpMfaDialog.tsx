import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCockpitAuth } from '@/hooks/cockpit/useCockpitAuth';

interface StepUpMfaDialogProps {
  open: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export const StepUpMfaDialog = ({ open, onSuccess, onCancel }: StepUpMfaDialogProps) => {
  const { user } = useAuth();
  const { recordStepUpSuccess, recordMfaAttempt, checkRateLimit } = useCockpitAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    if (!open) {
      setCode('');
      setError(null);
      setChallengeId(null);
      setFactorId(null);
      setInitializing(true);
      return;
    }

    const initChallenge = async () => {
      try {
        const { data: { totp } } = await supabase.auth.mfa.listFactors();
        const verifiedFactor = totp?.find(f => f.status === 'verified');

        if (!verifiedFactor) {
          setError('Aucun facteur TOTP configuré. Activez la 2FA dans les paramètres.');
          setInitializing(false);
          return;
        }

        setFactorId(verifiedFactor.id);

        const { data, error } = await supabase.auth.mfa.challenge({ factorId: verifiedFactor.id });
        if (error) {
          setError('Erreur lors de l\'initialisation MFA');
          setInitializing(false);
          return;
        }

        setChallengeId(data.id);
        setInitializing(false);
      } catch (err) {
        setError('Erreur de connexion au service MFA');
        setInitializing(false);
      }
    };

    initChallenge();
  }, [open]);

  const handleSubmit = async () => {
    if (!factorId || !challengeId || code.length !== 6) {
      setError('Code invalide');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check rate limit
      const canAttempt = await checkRateLimit();
      if (!canAttempt) {
        setError('Trop de tentatives. Réessayez dans 5 minutes.');
        setLoading(false);
        return;
      }

      // Verify MFA
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code,
      });

      // Record attempt
      await recordMfaAttempt(!verifyError, verifyError?.message);

      if (verifyError) {
        setError('Code invalide. Vérifiez votre application d\'authentification.');
        setCode('');

        // Get new challenge for retry
        const { data: newChallenge } = await supabase.auth.mfa.challenge({ factorId });
        if (newChallenge) {
          setChallengeId(newChallenge.id);
        }

        setLoading(false);
        return;
      }

      // Record step-up success
      const success = await recordStepUpSuccess();
      if (success) {
        onSuccess();
      } else {
        setError('Erreur lors de l\'enregistrement de la session');
      }
    } catch (err) {
      setError('Erreur inattendue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Vérification de sécurité
          </DialogTitle>
          <DialogDescription>
            Entrez le code de votre application d'authentification pour accéder au Cockpit Commercial.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {initializing ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error && !challengeId ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={setCode}
                  disabled={loading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={onCancel}
                  disabled={loading}
                >
                  Annuler
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={loading || code.length !== 6}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Vérification...
                    </>
                  ) : (
                    'Vérifier'
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
