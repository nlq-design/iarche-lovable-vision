import { PartnerLayout } from '@/components/partner/PartnerLayout';
import { usePartnerAuth } from '@/hooks/partner/usePartnerAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FolderKanban, 
  FileText, 
  Bell, 
  TrendingUp,
  ArrowRight,
  Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PartnerDashboard() {
  const { partnerData } = usePartnerAuth();
  const navigate = useNavigate();

  const stats = [
    {
      title: 'Missions actives',
      value: '—',
      icon: FolderKanban,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Documents',
      value: '—',
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Annonces',
      value: '—',
      icon: Bell,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Ce mois',
      value: '—',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  return (
    <PartnerLayout>
      <div className="p-6 space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              Bienvenue, {partnerData?.name || 'Partenaire'} 👋
            </h1>
            <p className="text-muted-foreground">
              Voici un aperçu de votre activité partenaire
            </p>
          </div>
          <Badge variant="outline" className="w-fit capitalize">
            {partnerData?.partner_type?.replace('_', ' ') || 'Partenaire'}
          </Badge>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Missions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Missions récentes</CardTitle>
                <CardDescription>Vos projets en cours</CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/espace-partenaire/missions')}
              >
                Voir tout
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <FolderKanban className="h-12 w-12 mb-4 opacity-50" />
                <p>Aucune mission pour le moment</p>
                <p className="text-sm">Les projets auxquels vous êtes assigné apparaîtront ici</p>
              </div>
            </CardContent>
          </Card>

          {/* Recent Announcements */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Dernières annonces</CardTitle>
                <CardDescription>Actualités de l'équipe IArche</CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/espace-partenaire/annonces')}
              >
                Voir tout
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <Bell className="h-12 w-12 mb-4 opacity-50" />
                <p>Aucune annonce récente</p>
                <p className="text-sm">Les communications de l'équipe apparaîtront ici</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Timeline Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Activité récente
            </CardTitle>
            <CardDescription>
              Historique de vos dernières actions et mises à jour
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <p>Votre historique d'activité apparaîtra ici</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PartnerLayout>
  );
}
