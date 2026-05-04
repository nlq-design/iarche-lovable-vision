import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AcceptTeamInvitation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [invitationEmail, setInvitationEmail] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [invitationRole, setInvitationRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    supabase.functions
      .invoke('lookup-team-invitation', { body: { token } })
      .then(({ data, error: invErr }) => {
        if (invErr || !data) {
          setError("Invitation introuvable.");
          return;
        }
        if (!data.valid) {
          if (data.already_accepted) setError("Cette invitation a déjà été acceptée.");
          else if (data.expired) setError("Cette invitation a expiré.");
          else setError("Invitation introuvable.");
          return;
        }
        setInvitationEmail(data.email);
        setWorkspaceName(data.workspace_name ?? null);
        setInvitationRole(data.role ?? null);
      });
  }, [token]);

  const accept = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { token };
      if (!user) body.password = password;
      const { data, error: invErr } = await supabase.functions.invoke('accept-team-invitation', { body });
      if (invErr) throw new Error(invErr.message);
      if (data?.error) throw new Error(data.error);
      toast.success("Invitation acceptée");
      if (user) {
        navigate('/cockpit');
      } else {
        navigate(`/login?email=${encodeURIComponent(invitationEmail ?? '')}`);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Erreur lors de l'acceptation");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Invitation à rejoindre une équipe</CardTitle>
          <CardDescription>
            {error
              ? error
              : invitationEmail
              ? `Invitation pour ${invitationEmail}${workspaceName ? ` — ${workspaceName}` : ''}${invitationRole ? ` (${invitationRole})` : ''}`
              : 'Vérification de votre invitation...'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <Link to="/" className="text-sm text-primary hover:underline">
              Retour à l'accueil
            </Link>
          ) : !invitationEmail ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : user ? (
            <>
              <p className="text-sm text-muted-foreground">
                Vous êtes connecté en tant que <strong>{user.email}</strong>.
              </p>
              <Button onClick={accept} disabled={submitting} className="w-full">
                {submitting ? 'Acceptation...' : "Accepter l'invitation"}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={invitationEmail} readOnly disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Choisissez un mot de passe (min. 8 caractères)</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  minLength={8}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button
                onClick={accept}
                disabled={submitting || password.length < 8}
                className="w-full"
              >
                {submitting ? 'Création...' : 'Créer mon compte et accepter'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
