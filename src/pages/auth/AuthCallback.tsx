import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        // Allow Supabase to consume the URL hash / code first
        const { data, error } = await supabase.auth.getSession();
        if (cancelled) return;

        if (error || !data.session) {
          toast.error('Échec de connexion');
          navigate('/login', { replace: true });
          return;
        }

        const userId = data.session.user.id;
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarded_at')
          .eq('user_id', userId)
          .maybeSingle();

        if (cancelled) return;

        if (!profile || !profile.onboarded_at) {
          navigate('/onboarding', { replace: true });
        } else {
          navigate('/cockpit', { replace: true });
        }
      } catch {
        if (!cancelled) {
          toast.error('Échec de connexion');
          navigate('/login', { replace: true });
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center font-sans">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Connexion en cours…</p>
      </div>
    </div>
  );
};

export default AuthCallback;
