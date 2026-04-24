import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import AuthLayout from './AuthLayout';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Login = () => {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL_REGEX.test(email.trim())) {
      toast.error('Email invalide');
      return;
    }
    if (!password) {
      toast.error('Mot de passe requis');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await signIn(email.trim(), password);
      if (error || !data.user) {
        toast.error('Email ou mot de passe incorrect');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarded_at')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (!profile || !profile.onboarded_at) {
        navigate('/onboarding');
      } else {
        navigate('/cockpit');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('provider') && msg.includes('not enabled')) {
          toast.error(
            "La connexion Google n'est pas encore active. Utilisez email/mot de passe ou contactez Nick."
          );
        } else {
          toast.error(error.message || 'Échec de la connexion Google');
        }
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthLayout title="Se connecter">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Mot de passe</Label>
            <Link
              to="/reset-password"
              className="text-xs text-accent hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={submitting}
        >
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Se connecter
        </Button>

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-2 text-muted-foreground">ou</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogle}
          disabled={googleLoading}
        >
          {googleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Continuer avec Google
        </Button>
      </form>

      <p className="text-sm text-center text-muted-foreground mt-6">
        Pas encore de compte ?{' '}
        <Link to="/signup" className="text-accent hover:underline">
          Créer un compte
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Login;
