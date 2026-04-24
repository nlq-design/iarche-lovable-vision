import { useState, FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import AuthLayout from './AuthLayout';

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { resetPassword, updatePassword } = useAuth();
  const mode = searchParams.get('mode');

  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRequest = async (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL_REGEX.test(email.trim())) {
      toast.error('Email invalide');
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword({ email: email.trim() });
      toast.success('Email envoyé');
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!PASSWORD_REGEX.test(newPassword)) {
      toast.error(
        'Le mot de passe doit faire au moins 12 caractères et contenir une majuscule, un chiffre et un caractère spécial'
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await updatePassword({ password: newPassword });
      if (error) {
        toast.error(error.message || 'Échec de la mise à jour');
        return;
      }
      toast.success('Mot de passe mis à jour');
      navigate('/login');
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === 'update') {
    return (
      <AuthLayout title="Nouveau mot de passe">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new_password">Nouveau mot de passe</Label>
            <Input
              id="new_password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={submitting}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Mettre à jour le mot de passe
          </Button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Mot de passe oublié">
      {submitted ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Si un compte existe, vous recevrez un email avec le lien de réinitialisation.
          </p>
          <Link
            to="/login"
            className="block text-center text-sm text-accent hover:underline"
          >
            Retour à la connexion
          </Link>
        </div>
      ) : (
        <form onSubmit={handleRequest} className="space-y-4">
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
          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={submitting}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Envoyer le lien de réinitialisation
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            <Link to="/login" className="text-accent hover:underline">
              Retour à la connexion
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
};

export default ResetPassword;
