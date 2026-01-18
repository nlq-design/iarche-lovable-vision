import { PartnerLayout } from '@/components/partner/PartnerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderKanban, Building2, Calendar, TrendingUp } from 'lucide-react';
import { usePartnerProjects } from '@/hooks/partner/usePartnerProjects';
import { CreatePartnerProjectDialog } from '@/components/partner/dialogs/CreatePartnerProjectDialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Brouillon', variant: 'secondary' },
  scoping: { label: 'Cadrage', variant: 'outline' },
  planning: { label: 'Planification', variant: 'outline' },
  active: { label: 'En cours', variant: 'default' },
  in_progress: { label: 'En cours', variant: 'default' },
  review: { label: 'Revue', variant: 'secondary' },
  on_hold: { label: 'En pause', variant: 'outline' },
  completed: { label: 'Terminé', variant: 'secondary' },
  cancelled: { label: 'Annulé', variant: 'destructive' },
};

const HEALTH_LABELS: Record<string, { label: string; color: string }> = {
  on_track: { label: 'Sur les rails', color: 'text-green-600' },
  at_risk: { label: 'À risque', color: 'text-orange-600' },
  off_track: { label: 'En difficulté', color: 'text-red-600' },
};

export default function PartnerMissions() {
  const { data: projects, isLoading, error } = usePartnerProjects();

  return (
    <PartnerLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Mes Missions</h1>
            <p className="text-muted-foreground">
              Projets auxquels vous êtes assigné
            </p>
          </div>
          <CreatePartnerProjectDialog />
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-destructive">Erreur lors du chargement des missions</p>
            </CardContent>
          </Card>
        ) : !projects || projects.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Projets en cours</CardTitle>
              <CardDescription>
                Retrouvez ici tous les projets sur lesquels vous intervenez
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <FolderKanban className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">Aucune mission pour le moment</p>
                <p className="text-sm max-w-md mb-4">
                  Créez votre premier projet ou attendez qu'on vous en assigne.
                </p>
                <CreatePartnerProjectDialog />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => {
              const statusInfo = STATUS_LABELS[project.status] || { label: project.status, variant: 'outline' as const };
              const healthInfo = project.health_status ? HEALTH_LABELS[project.health_status] : null;

              return (
                <Card key={project.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{project.name}</h3>
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                          {healthInfo && (
                            <span className={`text-sm font-medium ${healthInfo.color}`}>
                              {healthInfo.label}
                            </span>
                          )}
                        </div>
                        
                        {project.opportunity?.lead && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="h-4 w-4" />
                            <span>
                              {project.opportunity.lead.company || project.opportunity.lead.name}
                            </span>
                          </div>
                        )}

                        {project.role === 'creator' ? (
                          <Badge className="bg-primary/10 text-primary border-primary/20">
                            Créé par vous
                          </Badge>
                        ) : project.role && (
                          <Badge variant="outline" className="capitalize">
                            {project.role}
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                        {project.start_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Début: {format(new Date(project.start_date), 'dd MMM yyyy', { locale: fr })}
                            </span>
                          </div>
                        )}
                        {project.budget_amount && (
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            <span>
                              Budget: {project.budget_amount.toLocaleString('fr-FR')} €
                              {project.consumed_amount != null && (
                                <span className="text-xs ml-1">
                                  ({Math.round((project.consumed_amount / project.budget_amount) * 100)}% consommé)
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PartnerLayout>
  );
}
