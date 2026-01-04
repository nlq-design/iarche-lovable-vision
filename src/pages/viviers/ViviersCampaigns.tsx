import { VivierLayout } from '@/components/viviers/VivierLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  Plus, 
  Play,
  BarChart3,
  Send,
  CheckCircle2
} from 'lucide-react';
import LogoArc from '@/components/ui/LogoArc';

export default function ViviersCampaigns() {
  return (
    <VivierLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Campagnes Email</h1>
            <LogoArc size="sm" className="mt-2" />
            <p className="text-muted-foreground mt-2">
              Gérez vos campagnes d'emailing vers les leads du vivier
            </p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle campagne
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Campagnes actives</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
                <Play className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Emails envoyés</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
                <Send className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taux d'ouverture</p>
                  <p className="text-2xl font-bold">--%</p>
                </div>
                <BarChart3 className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Réponses</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Domains Status */}
        <Card>
          <CardHeader>
            <CardTitle>Domaines d'envoi</CardTitle>
            <CardDescription>
              État des domaines email configurés pour l'envoi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="font-medium">Domaines satellites</span>
                </div>
                <Badge variant="outline">15 en warm-up (J15)</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <span className="font-medium">Domaines Brevo</span>
                </div>
                <Badge variant="outline" className="text-success border-success/30">2 actifs</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Empty State */}
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune campagne créée</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Créez votre première campagne email pour contacter les leads du vivier.
            </p>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Créer une campagne
            </Button>
          </CardContent>
        </Card>
      </div>
    </VivierLayout>
  );
}
