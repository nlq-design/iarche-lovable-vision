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

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const reasonToMessage = (reason: string): string => {
  switch (reason) {
    case 'invalid':
      return "Code d'invitation invalide";
    case 'expired':
      return 'Ce code a expiré';
    case 'max_uses_reached':
      return 'Ce code a déjà été utilisé';
    case 'email_restriction_mismatch':
      return "Ce code n'est pas valide pour cet email";
    case 'missing_code':
      return "Code d'invitation requis";
    default:
      return 'Code invalide. Veuillez réessayer.';
  }
};

const Signup = () => {
  const navigate = useNavigate();
  const { signUp, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const validateClient = (): string | null => {
    if (!EMAIL_REGEX.test(email.trim())) return 'Email invalide';
    if (!PASSWORD_REGEX.test(password)) {
      return 'Le mot de passe doit faire au moins 12 caractères et contenir une majuscule, un chiffre et un caractère spécial';
    }
    if (password !== confirmPassword) return 'Les mots de passe ne correspondent pas';
    if (!inviteCode.trim()) return "Code d'invitation requis";
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const clientError = validateClient();
    if (clientError) {
      toast.error(clientError);
      return;
    }
    setSubmitting(true);
    try {
      const { data: validation, error: validationError } = await supabase.functions.invoke(
        'validate-invite-code',
        { body: { code: inviteCode.trim(), email: email.trim().toLowerCase() } }
      );

      if (validationError || !validation || validation.valid === false) {
        const reason = validation?.reason ?? 'invalid';
        toast.error(reasonToMessage(reason));
        return;
      }

      const { data, error } = await signUp({
        email: email.trim(),
        password,
        invite_code: inviteCode.trim(),
        workspace_name: workspaceName.trim() || undefined,
      });

      if (error) {
        toast.error(error.message || "Échec de l'inscription");
        return;
      }

      if (data.session) {
        toast.success('Compte créé avec succès');
        navigate('/onboarding');
      } else {
        toast.success('Vérifiez votre email pour confirmer votre compte');
        navigate('/login');
      }
    } catch {
      toast.error("Erreur inattendue lors de l'inscription");
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
    <AuthLayout title="Créer un compte" subtitle="Inscription sur invitation">
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
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <p className="text-xs text-muted-foreground">
            12 caractères min. avec majuscule, chiffre et caractère spécial.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm_password">Confirmer le mot de passe</Label>
          <Input
            id="confirm_password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="invite_code">Code d'invitation</Label>
          <Input
            id="invite_code"
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="workspace_name">
            Nom du workspace <span className="text-muted-foreground">(optionnel)</span>
          </Label>
          <Input
            id="workspace_name"
            type="text"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={submitting}
        >
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Créer mon compte
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
        Déjà un compte ?{' '}
        <Link to="/login" className="text-accent hover:underline">
          Se connecter
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Signup;
