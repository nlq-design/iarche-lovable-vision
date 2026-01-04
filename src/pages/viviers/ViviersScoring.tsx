import { VivierLayout } from '@/components/viviers/VivierLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Target, 
  Sparkles, 
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import LogoArc from '@/components/ui/LogoArc';

export default function ViviersScoring() {
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
          <Button>
            <Play className="w-4 h-4 mr-2" />
            Lancer le scoring
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">En attente</p>
                  <p className="text-2xl font-bold">0</p>
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
                  <p className="text-2xl font-bold text-success">0</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Score moyen (40-79)</p>
                  <p className="text-2xl font-bold text-amber-600">0</p>
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
                  <p className="text-2xl font-bold text-destructive">0</p>
                </div>
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>
        </div>

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
