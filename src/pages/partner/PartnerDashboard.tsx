import { PartnerLayout } from '@/components/partner/PartnerLayout';
import { usePartnerAuth } from '@/hooks/partner/usePartnerAuth';
import { usePartnerStats } from '@/hooks/partner/usePartnerStats';
import { usePartnerProjects } from '@/hooks/partner/usePartnerProjects';
import { usePartnerAnnouncements } from '@/hooks/partner/usePartnerAnnouncements';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FolderKanban, 
  FileText, 
  Bell, 
  Users,
  Lightbulb,
  ArrowRight,
  Clock,
  Pin
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function PartnerDashboard() {
  const { partnerData } = usePartnerAuth();
  const { data: stats, isLoading: statsLoading } = usePartnerStats();
  const { data: projects, isLoading: projectsLoading } = usePartnerProjects();
  const { data: announcements, isLoading: announcementsLoading } = usePartnerAnnouncements();
  const navigate = useNavigate();

  const statCards = [
    {
      title: 'Missions actives',
      value: stats?.activeProjects ?? 0,
      icon: FolderKanban,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      link: '/espace-partenaire/missions',
    },
    {
      title: 'Documents',
      value: stats?.documents ?? 0,
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      link: '/espace-partenaire/documents',
    },
    {
      title: 'Leads liés',
      value: stats?.leads ?? 0,
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      link: '/espace-partenaire/leads',
    },
    {
      title: 'Solutions',
      value: stats?.solutions ?? 0,
      icon: Lightbulb,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      link: '/espace-partenaire/solutions',
    },
  ];

  const recentProjects = projects?.slice(0, 3) || [];
  const recentAnnouncements = announcements?.slice(0, 2) || [];

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
          {statCards.map((stat) => (
            <Card 
              key={stat.title} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(stat.link)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    {statsLoading ? (
                      <Skeleton className="h-8 w-12" />
                    ) : (
                      <p className="text-2xl font-bold">{stat.value}</p>
                    )}
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
              {projectsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : recentProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <FolderKanban className="h-12 w-12 mb-4 opacity-50" />
                  <p>Aucune mission pour le moment</p>
                  <p className="text-sm">Les projets auxquels vous êtes assigné apparaîtront ici</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentProjects.map((project) => (
                    <div 
                      key={project.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div>
                        <p className="font-medium">{project.name}</p>
                        {project.opportunity?.lead && (
                          <p className="text-sm text-muted-foreground">
                            {project.opportunity.lead.company || project.opportunity.lead.name}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {project.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
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
              {announcementsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : recentAnnouncements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <Bell className="h-12 w-12 mb-4 opacity-50" />
                  <p>Aucune annonce récente</p>
                  <p className="text-sm">Les communications de l'équipe apparaîtront ici</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentAnnouncements.map((announcement) => (
                    <div 
                      key={announcement.id}
                      className={`p-3 rounded-lg transition-colors ${
                        announcement.is_pinned ? 'bg-primary/5 border border-primary/20' : 'bg-muted/50 hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {announcement.is_pinned && (
                          <Pin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{announcement.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {announcement.published_at 
                              ? format(new Date(announcement.published_at), 'dd MMM yyyy', { locale: fr })
                              : format(new Date(announcement.created_at), 'dd MMM yyyy', { locale: fr })
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Timeline */}
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
