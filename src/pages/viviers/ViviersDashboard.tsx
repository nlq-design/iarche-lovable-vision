import { VivierLayout } from '@/components/viviers/VivierLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Upload, 
  Mail, 
  Target, 
  TrendingUp, 
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ViviersDashboard() {
  // Mock stats - will be replaced with real data
  const stats = {
    totalLeads: 0,
    pendingScoring: 0,
    qualified: 0,
    campaigns: 0,
    sentEmails: 0,
    promotedToLeads: 0,
  };

  return (
    <VivierLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard Viviers</h1>
            <p className="text-muted-foreground">
              Gestion des leads froids et campagnes email
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/viviers/import">
                <Upload className="w-4 h-4 mr-2" />
                Importer
              </Link>
            </Button>
            <Button className="bg-orange-500 hover:bg-orange-600" asChild>
              <Link to="/viviers/campaigns">
                <Mail className="w-4 h-4 mr-2" />
                Nouvelle campagne
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Leads Vivier</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLeads.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Leads froids importés</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">En attente scoring</CardTitle>
              <Target className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingScoring}</div>
              <p className="text-xs text-muted-foreground">À qualifier par l'IA</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Leads qualifiés</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.qualified}</div>
              <p className="text-xs text-muted-foreground">Score ≥ 60</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Campagnes actives</CardTitle>
              <Mail className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.campaigns}</div>
              <p className="text-xs text-muted-foreground">En cours d'envoi</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Emails envoyés</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sentEmails}</div>
              <p className="text-xs text-muted-foreground">Ce mois</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Promus en Leads</CardTitle>
              <ArrowRight className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.promotedToLeads}</div>
              <p className="text-xs text-muted-foreground">Transférés au CRM</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-orange-500" />
                Actions rapides
              </CardTitle>
              <CardDescription>
                Workflow de gestion des leads froids
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/viviers/import">
                  <Upload className="w-4 h-4 mr-3" />
                  Importer un fichier CSV/XLSX
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/viviers/scoring">
                  <Target className="w-4 h-4 mr-3" />
                  Lancer le scoring IA
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/viviers/campaigns">
                  <Mail className="w-4 h-4 mr-3" />
                  Créer une campagne email
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Intégrations</CardTitle>
              <CardDescription>
                Services connectés pour l'envoi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center">
                    <Mail className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Instantly</p>
                    <p className="text-xs text-muted-foreground">Cold email automation</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  Configuré
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                    <Mail className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Brevo</p>
                    <p className="text-xs text-muted-foreground">Marketing campaigns</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                  Actif
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Empty State */}
        {stats.totalLeads === 0 && (
          <Card className="border-dashed border-orange-300 bg-orange-50/50">
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 text-orange-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun lead dans le vivier</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Commencez par importer vos leads froids depuis un fichier CSV ou XLSX
                pour démarrer vos campagnes de prospection.
              </p>
              <Button className="bg-orange-500 hover:bg-orange-600" asChild>
                <Link to="/viviers/import">
                  <Upload className="w-4 h-4 mr-2" />
                  Importer mes premiers leads
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </VivierLayout>
  );
}
