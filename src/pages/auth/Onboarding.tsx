import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import AuthLayout from './AuthLayout';

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    let cancelled = false;
    (async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarded_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (profile?.onboarded_at) {
        navigate('/cockpit', { replace: true });
      } else {
        setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, loading, navigate]);

  const handleConfirm = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarded_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (error) {
        toast.error("Impossible de finaliser l'onboarding");
        return;
      }
      navigate('/cockpit');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthLayout title="Bienvenue chez IArche">
      <div className="space-y-4 text-sm text-foreground">
        <p>
          Merci pour votre inscription. En phase beta, chaque nouveau compte bénéficie
          d'un call de découverte avec Nick Quient pour configurer votre workspace
          et vous accompagner sur vos premiers cas d'usage.
        </p>
        <p className="text-muted-foreground">
          Étape suivante : nous vous recontactons sous 24h au plus tard à l'email que
          vous avez renseigné.
        </p>
        <Button
          onClick={handleConfirm}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={submitting}
        >
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          J'ai compris, accéder à mon espace
        </Button>
      </div>
    </AuthLayout>
  );
};

export default Onboarding;
