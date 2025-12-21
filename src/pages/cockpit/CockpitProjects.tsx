import { useState } from 'react';
import { CockpitLayout } from "@/components/cockpit/CockpitLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, Clock, CheckCircle2, AlertCircle, PauseCircle, Calendar, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useCockpitProjects } from '@/hooks/cockpit';
import { CreateProjectDialog } from '@/components/cockpit/dialogs';
import { ProjectDetailSheet } from '@/components/cockpit/ProjectDetailSheet';
import { ProjectTimeline } from '@/components/cockpit/ProjectTimeline';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';

type Project = Database['public']['Tables']['projects']['Row'];

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  planning: { label: 'Planification', icon: Clock, color: 'text-slate-600' },
  in_progress: { label: 'En cours', icon: Clock, color: 'text-blue-600' },
  on_hold: { label: 'En pause', icon: PauseCircle, color: 'text-amber-600' },
  completed: { label: 'Terminé', icon: CheckCircle2, color: 'text-green-600' },
  cancelled: { label: 'Annulé', icon: AlertCircle, color: 'text-red-600' },
};

const HEALTH_CONFIG: Record<string, { label: string; color: string }> = {
  healthy: { label: 'Sain', color: 'bg-green-500' },
  at_risk: { label: 'À risque', color: 'bg-yellow-500' },
  critical: { label: 'Critique', color: 'bg-red-500' },
};

const CockpitProjects = () => {
  const { projects, stats, isLoading } = useCockpitProjects();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const activeProjects = projects?.filter(p => 
    p.status === 'in_progress' || p.status === 'planning'
  ) || [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getProgressPercentage = (consumed: number, budget: number) => {
    if (!budget || budget === 0) return 0;
    return Math.min(100, Math.round((consumed / budget) * 100));
  };

  return (
    <CockpitLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Projets</h1>
            <p className="text-muted-foreground">Suivi de vos projets clients</p>
          </div>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau projet
          </Button>
        </div>

        <CreateProjectDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
        <ProjectDetailSheet 
          project={selectedProject} 
          open={!!selectedProject} 
          onOpenChange={(open) => !open && setSelectedProject(null)} 
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'En cours', value: stats.active, icon: Clock, color: 'text-blue-600' },
          { label: 'Terminés', value: stats.completed, icon: CheckCircle2, color: 'text-green-600' },
          { label: 'En pause', value: stats.onHold, icon: PauseCircle, color: 'text-amber-600' },
          { label: 'À risque', value: stats.atRisk, icon: AlertCircle, color: 'text-red-600' },
        ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                {isLoading ? (
                  <Skeleton className="h-12 w-full" />
                ) : (
                  <div className="flex items-center gap-3">
                    <stat.icon className={`h-8 w-8 ${stat.color}`} />
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Active Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Projets actifs</CardTitle>
            <Badge variant="secondary">{activeProjects.length} projets</Badge>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : activeProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <FolderKanban className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">Aucun projet en cours</p>
                <p className="text-sm">Créez votre premier projet pour commencer</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeProjects.map((project) => {
                  const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG.planning;
                  const healthConfig = HEALTH_CONFIG[project.health_status] || HEALTH_CONFIG.healthy;
                  const progress = getProgressPercentage(
                    Number(project.consumed_amount) || 0,
                    Number(project.budget_amount) || 0
                  );
                  const daysRemaining = project.target_end_date 
                    ? differenceInDays(new Date(project.target_end_date), new Date())
                    : null;

                  return (
                    <div 
                      key={project.id}
                      className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedProject(project)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{project.name}</h3>
                            <div className={`w-2 h-2 rounded-full ${healthConfig.color}`} title={healthConfig.label} />
                          </div>
                          {project.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">{project.description}</p>
                          )}
                        </div>
                        <Badge variant="outline" className={statusConfig.color}>
                          {statusConfig.label}
                        </Badge>
                      </div>

                      {/* Timeline inline */}
                      {project.start_date && project.target_end_date && (
                        <div className="mb-4">
                          <ProjectTimeline
                            startDate={project.start_date}
                            targetEndDate={project.target_end_date}
                            actualEndDate={project.actual_end_date}
                            status={project.status}
                            healthStatus={project.health_status}
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground mb-1">Budget</p>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span>{formatCurrency(Number(project.consumed_amount) || 0)}</span>
                              <span className="text-muted-foreground">/ {formatCurrency(Number(project.budget_amount) || 0)}</span>
                            </div>
                            <Progress value={progress} className="h-1.5" />
                          </div>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Échéance</p>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {project.target_end_date ? (
                              <span className={daysRemaining !== null && daysRemaining < 0 ? 'text-destructive' : ''}>
                                {format(new Date(project.target_end_date), 'dd MMM yyyy', { locale: fr })}
                                {daysRemaining !== null && (
                                  <span className="text-muted-foreground ml-1">
                                    ({daysRemaining >= 0 ? `J-${daysRemaining}` : `+${Math.abs(daysRemaining)}j`})
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Non définie</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Contacts</p>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{(project as any).project_contacts?.length || 0} contact(s)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budget Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Budget global</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Consommé</span>
                      <span className="font-medium">
                        {formatCurrency(stats.consumedBudget)} / {formatCurrency(stats.totalBudget)}
                      </span>
                    </div>
                    <Progress 
                      value={getProgressPercentage(stats.consumedBudget, stats.totalBudget)} 
                      className="h-2" 
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalBudget > 0 
                      ? `${getProgressPercentage(stats.consumedBudget, stats.totalBudget)}% du budget utilisé`
                      : 'Aucun budget alloué'
                    }
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Échéances proches</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                (() => {
                  const upcomingProjects = projects?.filter(p => {
                    if (!p.target_end_date || p.status === 'completed' || p.status === 'cancelled') return false;
                    const days = differenceInDays(new Date(p.target_end_date), new Date());
                    return days >= 0 && days <= 14;
                  }).sort((a, b) => 
                    new Date(a.target_end_date!).getTime() - new Date(b.target_end_date!).getTime()
                  ).slice(0, 3) || [];

                  if (upcomingProjects.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center h-24 text-muted-foreground">
                        <Clock className="h-6 w-6 mb-2 opacity-50" />
                        <p className="text-sm">Aucune échéance dans les 14 jours</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {upcomingProjects.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-2 rounded border">
                          <span className="text-sm font-medium">{p.name}</span>
                          <Badge variant="outline">
                            {format(new Date(p.target_end_date!), 'dd MMM', { locale: fr })}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </CockpitLayout>
  );
};

export default CockpitProjects;
