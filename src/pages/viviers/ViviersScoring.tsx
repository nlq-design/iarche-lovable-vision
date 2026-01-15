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
import { useVivierStats } from '@/hooks/viviers/useVivierStats';

export default function ViviersScoring() {
  // Use centralized stats hook with breakdown
  const { stats, breakdown, refetch } = useVivierStats({ includeBreakdown: true });

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
                  <p className="text-2xl font-bold">{stats.pendingScoring.toLocaleString('fr-FR')}</p>
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
                  <p className="text-2xl font-bold text-green-600">{breakdown.high.toLocaleString('fr-FR')}</p>
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
                  <p className="text-2xl font-bold text-amber-600">{breakdown.medium.toLocaleString('fr-FR')}</p>
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
                  <p className="text-2xl font-bold text-destructive">{breakdown.low.toLocaleString('fr-FR')}</p>
                </div>
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scoring Panel */}
        <VivierScoringPanel pendingCount={stats.pendingScoring} onComplete={() => refetch()} />

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
      </div>
    </VivierLayout>
  );
}
