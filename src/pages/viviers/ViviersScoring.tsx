import { VivierLayout } from '@/components/viviers/VivierLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Target, 
  Sparkles, 
  CheckCircle2,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import LogoArc from '@/components/ui/LogoArc';
import { VivierScoringPanel } from '@/components/viviers/VivierScoringPanel';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function ViviersScoring() {
  // Fetch scoring stats
  const { data: stats, refetch } = useQuery({
    queryKey: ['viviers-scoring-stats'],
    queryFn: async () => {
      const [pending, high, medium, low] = await Promise.all([
        supabase.from('viviers').select('id', { count: 'exact', head: true }).is('cold_score', null),
        supabase.from('viviers').select('id', { count: 'exact', head: true }).gte('cold_score', 80),
        supabase.from('viviers').select('id', { count: 'exact', head: true }).gte('cold_score', 40).lt('cold_score', 80),
        supabase.from('viviers').select('id', { count: 'exact', head: true }).lt('cold_score', 40).not('cold_score', 'is', null),
      ]);
      return {
        pending: pending.count ?? 0,
        high: high.count ?? 0,
        medium: medium.count ?? 0,
        low: low.count ?? 0,
      };
    },
  });

  return (
    <VivierLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Scoring IA</h1>
            <LogoArc size="sm" className="mt-2" />
            <p className="text-muted-foreground mt-2">
              Qualification automatique des leads par intelligence artificielle
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">En attente</p>
                  <p className="text-2xl font-bold">{stats?.pending.toLocaleString('fr-FR') ?? '...'}</p>
                </div>
                <Target className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Score élevé (≥80)</p>
                  <p className="text-2xl font-bold text-green-600">{stats?.high.toLocaleString('fr-FR') ?? '...'}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Score moyen (40-79)</p>
                  <p className="text-2xl font-bold text-amber-600">{stats?.medium.toLocaleString('fr-FR') ?? '...'}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Score faible (&lt;40)</p>
                  <p className="text-2xl font-bold text-destructive">{stats?.low.toLocaleString('fr-FR') ?? '...'}</p>
                </div>
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scoring Panel */}
        <VivierScoringPanel pendingCount={stats?.pending ?? 0} onComplete={() => refetch()} />

        {/* Scoring Config */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              Configuration du scoring
            </CardTitle>
            <CardDescription>
              Critères utilisés par l'IA pour évaluer les leads
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Critères positifs</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Email professionnel (domaine entreprise)</li>
                  <li>• Entreprise identifiable</li>
                  <li>• Secteur d'activité cible</li>
                  <li>• Taille entreprise adaptée</li>
                  <li>• Localisation France/Europe</li>
                </ul>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Critères négatifs</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Email générique (gmail, yahoo...)</li>
                  <li>• Domaine blacklisté</li>
                  <li>• Données incomplètes</li>
                  <li>• Doublon existant dans CRM</li>
                  <li>• Email invalide/bounced</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Empty State */}
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun lead à scorer</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Importez des leads dans le vivier pour pouvoir lancer le scoring IA.
            </p>
          </CardContent>
        </Card>
      </div>
    </VivierLayout>
  );
}
