import { CockpitLayout } from "@/components/cockpit/CockpitLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, Clock, CheckCircle2, AlertCircle, PauseCircle, Calendar, Users, Plus, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCockpitProjects } from "@/hooks/cockpit";
import { useCockpitVoiceTranscriptions } from '@/hooks/cockpit/useCockpitVoiceTranscriptions';
import { ProjectTimeline } from '@/components/cockpit/ProjectTimeline';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
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
  const { projects, stats, isLoading, createProject } = useCockpitProjects();
  const { transcriptions } = useCockpitVoiceTranscriptions();
  const navigate = useNavigate();

  // Get project IDs that have transcriptions
  const projectsWithTranscriptions = new Set(
    transcriptions?.filter(t => t.project_id).map(t => t.project_id) || []
  );

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
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Projets</h1>
            <p className="text-sm text-muted-foreground">Suivi des projets clients</p>
          </div>
          <Button size="sm" className="h-8 text-sm" onClick={async () => {
            const newProject = await createProject.mutateAsync({ 
              name: 'Nouveau projet',
              status: 'planning',
              health_status: 'on_track',
            });
            if (newProject) {
              navigate(`/cockpit/projects/${newProject.id}`);
            }
          }} disabled={createProject.isPending}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            {createProject.isPending ? 'Création...' : 'Nouveau projet'}
          </Button>
        </div>

        {/* Stats inline */}
        <div className="flex flex-wrap items-center gap-4 p-3 bg-muted/40 rounded-lg border text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <span className="text-muted-foreground">En cours</span>
            <span className="font-semibold">{stats.active}</span>
          </div>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-muted-foreground">Terminés</span>
            <span className="font-semibold">{stats.completed}</span>
          </div>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2">
            <PauseCircle className="h-4 w-4 text-amber-500" />
            <span className="text-muted-foreground">Pause</span>
            <span className="font-semibold">{stats.onHold}</span>
          </div>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-muted-foreground">À risque</span>
            <span className="font-semibold">{stats.atRisk}</span>
          </div>
        </div>

        {/* Active Projects */}
        <Card className="border shadow-sm">
          <CardHeader className="py-3 px-4 border-b bg-muted/30 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Projets actifs</CardTitle>
            <Badge variant="secondary" className="text-xs">{activeProjects.length}</Badge>
          </CardHeader>
          <CardContent className="p-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : activeProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <FolderKanban className="h-10 w-10 mb-3 opacity-40" />
                <p className="font-medium">Aucun projet en cours</p>
                <p className="text-sm">Créez votre premier projet</p>
              </div>
            ) : (
              <div className="space-y-3">
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
                      className="p-3 rounded-md border bg-background hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => navigate(`/cockpit/projects/${project.id}`)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-sm">{project.name}</h3>
                            <div className={`w-2 h-2 rounded-full ${healthConfig.color}`} title={healthConfig.label} />
                            {projectsWithTranscriptions.has(project.id) && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="outline" className="text-xs px-1 py-0 h-5 bg-primary/10 border-primary/30">
                                      <Mic className="h-3 w-3 text-primary" />
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">Transcription disponible</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                          {project.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{project.description}</p>
                          )}
                        </div>
                        <Badge variant="outline" className={`text-xs ${statusConfig.color}`}>
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
