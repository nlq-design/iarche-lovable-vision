import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, Mail, MailX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type UnsubscribeStatus = 'loading' | 'idle' | 'confirming' | 'success' | 'error' | 'already';

export default function UnsubscribePage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<UnsubscribeStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const token = searchParams.get('token');
  const campaignId = searchParams.get('campaign');
  const recipientEmail = searchParams.get('email');

  useEffect(() => {
    // Validate parameters
    if (!recipientEmail) {
      setStatus('error');
      setError('Lien de désinscription invalide');
      return;
    }
    
    setEmail(recipientEmail);
    setStatus('idle');
  }, [recipientEmail, token, campaignId]);

  const handleUnsubscribe = async () => {
    if (!recipientEmail) return;

    setStatus('confirming');
    setError(null);

    try {
      // Call edge function to handle unsubscription
      const { data, error: fnError } = await supabase.functions.invoke('campaign-unsubscribe', {
        body: {
          email: recipientEmail,
          campaign_id: campaignId,
          token,
        },
      });

      if (fnError) throw fnError;

      if (data?.already_unsubscribed) {
        setStatus('already');
      } else {
        setStatus('success');
      }
    } catch (err) {
      console.error('Unsubscribe error:', err);
      setStatus('error');
      setError('Une erreur est survenue. Veuillez réessayer.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
            {status === 'success' || status === 'already' ? (
              <MailX className="w-8 h-8 text-primary" />
            ) : (
              <Mail className="w-8 h-8 text-primary" />
            )}
          </div>
          <CardTitle>Désinscription</CardTitle>
          <CardDescription>
            Gestion de vos préférences email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {status === 'idle' && email && (
            <>
              <p className="text-center text-muted-foreground">
                Vous souhaitez vous désinscrire de nos communications ?
              </p>
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="font-mono text-sm">{email}</p>
              </div>
              <Button 
                onClick={handleUnsubscribe} 
                className="w-full"
                variant="destructive"
              >
                Confirmer la désinscription
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Vous ne recevrez plus d'emails de prospection de notre part.
              </p>
            </>
          )}

          {status === 'confirming' && (
            <div className="flex flex-col items-center py-8 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Traitement en cours...</p>
            </div>
          )}

          {status === 'success' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Votre désinscription a été prise en compte. Vous ne recevrez plus d'emails de notre part.
              </AlertDescription>
            </Alert>
          )}

          {status === 'already' && (
            <Alert className="border-blue-200 bg-blue-50">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Vous êtes déjà désinscrit de cette liste.
              </AlertDescription>
            </Alert>
          )}

          {status === 'error' && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                {error || 'Une erreur est survenue'}
              </AlertDescription>
            </Alert>
          )}

          {(status === 'success' || status === 'already' || status === 'error') && (
            <div className="text-center pt-4">
              <a 
                href="https://iarche.fr" 
                className="text-sm text-primary hover:underline"
              >
                Retour au site IArche
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="fixed bottom-4 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} IArche. Tous droits réservés.</p>
      </div>
    </div>
  );
}
