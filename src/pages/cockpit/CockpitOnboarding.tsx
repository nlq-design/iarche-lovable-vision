import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Rocket, User, Sparkles, Check } from 'lucide-react';

type Step = 1 | 2 | 3 | 4;

export default function CockpitOnboarding() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  if (!authLoading && !user) return <Navigate to="/auth" replace />;

  // Step 1
  const [workspaceName, setWorkspaceName] = useState('');
  // Step 2
  const [assistantName, setAssistantName] = useState('');
  const [company, setCompany] = useState('');
  const [city, setCity] = useState('');
  const [role, setRole] = useState('Assistant commercial');
  const [tone, setTone] = useState('Professionnel, direct, expert');

  const progress = (step / 4) * 100;

  const handleCreate = async () => {
    if (!user) { toast.error('Session requise'); return; }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('create-cockpit-workspace', {
      body: {
        workspace_name: workspaceName,
        workspace_type: 'solo',
        persona: {
          assistant_name: assistantName,
          company,
          city,
          role,
          tone,
          language: 'fr',
        },
      },
    });
    setLoading(false);
    if (error) { toast.error(`Erreur : ${error.message}`); return; }
    if (data?.already_exists) toast.info('Workspace existant — redirection');
    else toast.success('Cockpit prêt !');
    setStep(4);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <Rocket className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Bienvenue sur le Cockpit</CardTitle>
          </div>
          <CardDescription>
            Configurons votre espace en {step === 4 ? '' : '3'} étapes — 2 minutes.
          </CardDescription>
          <Progress value={progress} className="mt-4" />
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Sparkles className="h-4 w-4" /> Étape 1/3 — Votre espace
              </div>
              <div>
                <Label htmlFor="ws-name">Nom du workspace</Label>
                <Input
                  id="ws-name"
                  placeholder="Ex : Mon Activité Commerciale"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  maxLength={80}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Affiché dans votre cockpit. Modifiable plus tard.
                </p>
              </div>
              <Button
                onClick={() => setStep(2)}
                disabled={workspaceName.trim().length < 2}
                className="w-full"
              >
                Suivant
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4" /> Étape 2/3 — Votre assistant IA
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="a-name">Nom de l'assistant</Label>
                  <Input id="a-name" placeholder="Ex : Léo" value={assistantName}
                    onChange={(e) => setAssistantName(e.target.value)} maxLength={50} />
                </div>
                <div>
                  <Label htmlFor="company">Votre entreprise</Label>
                  <Input id="company" placeholder="Ex : Acme SAS" value={company}
                    onChange={(e) => setCompany(e.target.value)} maxLength={80} />
                </div>
                <div>
                  <Label htmlFor="city">Ville</Label>
                  <Input id="city" placeholder="Ex : Paris" value={city}
                    onChange={(e) => setCity(e.target.value)} maxLength={80} />
                </div>
                <div>
                  <Label htmlFor="role">Rôle de l'assistant</Label>
                  <Input id="role" value={role}
                    onChange={(e) => setRole(e.target.value)} maxLength={120} />
                </div>
              </div>
              <div>
                <Label htmlFor="tone">Ton de communication</Label>
                <Textarea id="tone" value={tone} onChange={(e) => setTone(e.target.value)}
                  maxLength={200} rows={2}
                  placeholder="Ex : Direct, expert, sans jargon" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Retour</Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={assistantName.trim().length < 1}
                  className="flex-1"
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Check className="h-4 w-4" /> Étape 3/3 — Confirmation
              </div>
              <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
                <div className="text-sm"><strong>Workspace :</strong> {workspaceName}</div>
                <div className="text-sm"><strong>Assistant IA :</strong> {assistantName}
                  {company && ` chez ${company}`}{city && `, ${city}`}</div>
                <div className="text-sm"><strong>Rôle :</strong> {role}</div>
                <div className="text-sm"><strong>Ton :</strong> {tone}</div>
              </div>
              <p className="text-xs text-muted-foreground">
                Essai gratuit 14 jours, sans carte bancaire. Personnalisable à tout moment depuis /cockpit/settings.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1" disabled={loading}>Retour</Button>
                <Button onClick={handleCreate} disabled={loading} className="flex-1">
                  {loading ? 'Création...' : 'Créer mon cockpit'}
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center space-y-4 py-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Tout est prêt</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Votre cockpit est configuré. Vous pouvez maintenant connecter Google Calendar, importer vos leads et démarrer.
                </p>
              </div>
              <Button onClick={() => navigate('/cockpit')} className="w-full">
                Accéder au cockpit
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
