// Cockpit Dashboard v8.2 — Refactored with atomic components
import { useState } from 'react';

import { CockpitLayout } from '@/components/cockpit/CockpitLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Users, Target, Calendar, TrendingUp, Clock,
  Plus, FileText, Activity, Wheat, Sparkles,
  ChevronRight, Brain, RefreshCw, Loader2,
  AlertTriangle, X, Shield, Zap,
  Database, Mic, FolderOpen, BarChart3, ExternalLink,
} from 'lucide-react';
import {
  useCockpitLeads, useCockpitOpportunities, useCockpitTasks,
  useCockpitBookings, useCockpitMeetingNotes, useCockpitActivityLog,
} from '@/hooks/cockpit';
import { useDashboardRealtime } from '@/hooks/cockpit/useDashboardRealtime';
import { useCockpitAICopilot } from '@/hooks/cockpit/useCockpitAICopilot';
import { useCockpitIntelligence } from '@/hooks/cockpit/useCockpitIntelligence';
import { useCrossSignals } from '@/hooks/cockpit/useCrossSignals';
import { useAISentinel } from '@/hooks/cockpit/useAISentinel';
import { useAutoConsulte } from '@/hooks/cockpit/useAutoConsulte';
import { CreateTaskDialog } from '@/components/cockpit/dialogs';
import { HarvestInterviewPanel } from '@/components/cockpit/HarvestInterviewPanel';
import { ActionProposalsList } from '@/components/cockpit/ActionProposalsList';
import {
 TopActionsWidget, CrossSignalsWidget, PredictionsWidget,
 SentinelCardWidget, SentinelButton, StagnantWidget, TrendDeltaWidget,
  TaskRow, MiniStat, ActivityIcon,
  getSmartHeadline, formatCurrency, STAGE_COLORS,
  navigateToEntity,
} from '@/components/cockpit/dashboard';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { OwnerBadge } from '@/components/cockpit/shared/OwnerBadge';

export default function CockpitDashboard() {
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [harvestOpen, setHarvestOpen] = useState(false);
  const [briefExpanded, setBriefExpanded] = useState(false);
  const navigate = useNavigate();

  useDashboardRealtime();

  // ─── Data hooks ───
  const { leads, stats: leadStats, isLoading: leadsLoading } = useCockpitLeads();
  const { opportunities, stats: oppStats, isLoading: oppsLoading } = useCockpitOpportunities();
  const { tasks, stats: taskStats, isLoading: tasksLoading } = useCockpitTasks();
  const { todayBookings, upcomingBookings, isLoading: bookingsLoading } = useCockpitBookings();
  const { stats: noteStats } = useCockpitMeetingNotes();
  const { activities, isLoading: activitiesLoading } = useCockpitActivityLog();

  // ─── UNIFIED INTELLIGENCE ───
  const { data: intel, isLoading: intelLoading, refresh: refreshIntel } = useCockpitIntelligence();

  // ─── Other AI hooks ───
  const { suggestNextStep, suggestTasks } = useCockpitAICopilot();
  const { alerts: sentinelAlerts, isLoading: sentinelLoading, refresh: refreshSentinel, dismissAlert, lastFetched: sentinelLastFetched } = useAISentinel();
  const { isRunning: isAutoRunning, triggerAutoConsulte } = useAutoConsulte();

  // ─── Recent transcriptions ───
  const { data: recentTranscriptions = [] } = useQuery({
    queryKey: ['dashboard-recent-transcriptions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('voice_transcriptions')
        .select('id, title, original_filename, status, created_at, lead_id, project_id, summary, lead:leads(id, name, company), project:projects(id, name)')
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    staleTime: 30_000,
  });

  // ─── Recent projects ───
  const { data: recentProjects = [] } = useQuery({
    queryKey: ['dashboard-recent-projects'],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, name, status, health_status, budget_amount, planned_end_date, lead_id, leads:lead_id(id, name, company)')
        .in('status', ['active', 'planning'])
        .order('updated_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    staleTime: 30_000,
  });

  const isLoading = leadsLoading || oppsLoading || tasksLoading || bookingsLoading;

  const today = new Date().toISOString().split('T')[0];
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const sevenDaysLimit = sevenDaysFromNow.toISOString().split('T')[0];

  const relevantTasks = tasks?.filter(t =>
    t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'harvested'
  ) || [];

  const todayTasks = relevantTasks.filter(t => t.due_date === today).slice(0, 5);
  const upcomingTasks = relevantTasks.filter(t =>
    t.due_date && t.due_date > today && t.due_date <= sevenDaysLimit
  ).slice(0, 5);

  const humanOverdue = relevantTasks.filter(t =>
    t.due_date && t.due_date < today && !t.ai_generated
  ).length;

  // Intelligence-derived values
  const raw = intel?.raw;
  const intelligence = intel?.intelligence;
  const staleCount = raw?.stale_count || 0;
  const overdueAiCount = raw?.overdue_ai_count || 0;
  const globalScore = intelligence?.health_overview?.global_score ?? null;
  const criticalAlerts = sentinelAlerts.filter(a => a.severity === 'critical');
  const hasUrgentContext = humanOverdue > 0 || criticalAlerts.length > 0 || (intelligence?.top_actions?.some(a => a.urgency === 'critical'));

  const NOISE_ACTIVITY_TYPES = ['new_task', 'task_created'];
  const meaningfulActivities = activities.filter(a =>
    !NOISE_ACTIVITY_TYPES.includes(a.activity_type)
  ).slice(0, 12);

  const handleAutoConsulte = async () => {
    try { await triggerAutoConsulte(); } catch {}
  };

  return (
    <CockpitLayout>
      <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">

        {/* ─── AI INTELLIGENCE BAND ─── */}
        <div className="flex-shrink-0 border-b bg-muted/30">
          {/* Row 1: Intelligence header */}
          <div className="px-4 py-2.5">
            <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-3">
              {/* Left: Intelligence score + smart summary */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 relative",
                  intelLoading ? "bg-muted animate-pulse" :
                  globalScore !== null && globalScore >= 70 ? "bg-emerald-500/10" :
                  globalScore !== null && globalScore >= 40 ? "bg-amber-500/10" :
                  globalScore !== null ? "bg-destructive/10" : "bg-primary/10"
                )}>
                  {intelLoading ? (
                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  ) : globalScore !== null ? (
                    <span className={cn("text-sm font-bold",
                      globalScore >= 70 ? "text-emerald-600" :
                      globalScore >= 40 ? "text-amber-600" : "text-destructive"
                    )}>{globalScore}</span>
                  ) : (
                    <Brain className={cn("h-4 w-4", hasUrgentContext ? "text-destructive" : "text-primary")} />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">
                    {intelLoading ? 'Analyse en cours...' :
                     intelligence?.top_actions?.[0]
                       ? `⚡ ${intelligence.top_actions[0].action}`
                       : getSmartHeadline({
                           humanOverdue,
                           criticalAlerts: criticalAlerts.length,
                           todayTasks: todayTasks.length,
                           todayBookings: todayBookings?.length || 0,
                           overdueAi: overdueAiCount,
                           staleQueue: staleCount,
                         })
                    }
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    <span className="capitalize">{format(new Date(), 'EEEE d MMMM', { locale: fr })}</span>
                    {' · '}
                    <span className="cursor-pointer hover:text-foreground" onClick={() => navigate('/cockpit/leads')}>
                      {leadStats.total} leads
                    </span>
                    {' · '}
                    <span className="cursor-pointer hover:text-foreground" onClick={() => navigate('/cockpit/pipeline')}>
                      {oppStats.total} opps · {formatCurrency(oppStats.totalValue)}
                    </span>
                    {raw && raw.win_rate > 0 && (
                      <span className="text-muted-foreground"> · {raw.win_rate}% win</span>
                    )}
                    {intelligence?.health_overview?.pipeline_momentum && (
                      <span className={cn("ml-1",
                        intelligence.health_overview.pipeline_momentum === 'accelerating' ? "text-emerald-600" :
                        intelligence.health_overview.pipeline_momentum === 'decelerating' ? "text-amber-600" :
                        intelligence.health_overview.pipeline_momentum === 'stalled' ? "text-destructive" : "text-muted-foreground"
                      )}>
                        {intelligence.health_overview.pipeline_momentum === 'accelerating' ? '📈' :
                         intelligence.health_overview.pipeline_momentum === 'decelerating' ? '📉' :
                         intelligence.health_overview.pipeline_momentum === 'stalled' ? '⛔' : '➡️'}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Right: action buttons */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {staleCount > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm"
                        className="h-8 gap-1.5 border-blue-500/30 text-blue-600 hover:bg-blue-500/10"
                        onClick={handleAutoConsulte} disabled={isAutoRunning}>
                        {isAutoRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
                        <span className="text-xs font-semibold">{staleCount}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{staleCount} synthèses à mettre à jour</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={refreshIntel} disabled={intelLoading}>
                      {intelLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Rafraîchir l'intelligence</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => setBriefExpanded(!briefExpanded)}>
                      <Sparkles className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Brief IA — Résumé narratif</TooltipContent>
                </Tooltip>
                <SentinelButton alerts={sentinelAlerts} isLoading={sentinelLoading} onRefresh={refreshSentinel} onDismiss={dismissAlert} lastFetched={sentinelLastFetched} />
                {overdueAiCount > 0 && (
                  <Sheet open={harvestOpen} onOpenChange={setHarvestOpen}>
                    <SheetTrigger asChild>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 gap-1 border-primary/30 text-primary hover:bg-primary/10">
                            <Wheat className="h-3.5 w-3.5" />
                            <span className="text-xs font-semibold">{overdueAiCount}</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">{overdueAiCount} tâches IA en retard — Récolter</TooltipContent>
                      </Tooltip>
                    </SheetTrigger>
                    <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                      <SheetHeader>
                        <SheetTitle className="flex items-center gap-2"><Wheat className="h-5 w-5" /> Récolte IA</SheetTitle>
                        <SheetDescription>Transformez les tâches IA en retard en actions concrètes</SheetDescription>
                      </SheetHeader>
                      <div className="mt-4"><HarvestInterviewPanel autoStart /></div>
                    </SheetContent>
                  </Sheet>
                )}
                <Button size="sm" variant="outline" className="h-8" onClick={() => setTaskDialogOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Tâche
                </Button>
              </div>
            </div>
          </div>

          {/* Row 2: Condensed brief preview */}
          {!briefExpanded && intelligence?.narrative_brief && (
            <div className="border-t bg-card/30 px-4 py-1.5 cursor-pointer hover:bg-card/50 transition-colors"
              onClick={() => setBriefExpanded(true)}>
              <div className="max-w-[1600px] mx-auto flex items-center gap-2">
                <Sparkles className="h-3 w-3 text-primary flex-shrink-0" />
                <p className="text-xs text-muted-foreground truncate">
                  {intelligence.narrative_brief.split('\n').filter(l => l.trim()).slice(0, 2).join(' · ').slice(0, 150)}...
                </p>
                <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              </div>
            </div>
          )}

          {/* Row 2b: Brief expanded */}
          {briefExpanded && (
            <div className="border-t bg-card/50 px-4 py-3">
              <div className="max-w-[1600px] mx-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Intelligence Brief</span>
                  <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => setBriefExpanded(false)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                {intelLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Analyse en cours...
                  </div>
                ) : intelligence?.narrative_brief ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed max-h-40 overflow-y-auto">
                    <ReactMarkdown>{intelligence.narrative_brief}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Chargement...</p>
                )}
              </div>
            </div>
          )}

          {/* Row 3: Critical alerts */}
          {criticalAlerts.length > 0 && !briefExpanded && (
            <div className="border-t bg-destructive/5 px-4 py-1.5">
              <div className="max-w-[1600px] mx-auto flex items-center gap-3 overflow-x-auto">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                {criticalAlerts.slice(0, 3).map(alert => (
                  <button key={alert.id} className="text-xs text-destructive hover:underline truncate flex-shrink-0"
                    onClick={() => navigateToEntity(navigate, alert)}>
                    {alert.entity_name}: {alert.question}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── COMMAND CENTER GRID ─── */}
        <div className="flex-1 overflow-auto p-3 sm:p-4">
          <div className="max-w-[1600px] mx-auto grid gap-3 grid-cols-1 lg:grid-cols-12">

            {/* ─── COL 1: Actions Prioritaires + Tâches + RDV ─── */}
            <div className="lg:col-span-4 flex flex-col gap-3">
              <div id="actions-prioritaires">
                <TopActionsWidget actions={intelligence?.top_actions} isLoading={intelLoading} navigate={navigate} />
              </div>
              <ActionProposalsList compact />

              {/* Today tasks */}
              <Card>
                <CardHeader className="pb-1.5 pt-3 px-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Aujourd'hui
                    {todayTasks.length > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">{todayTasks.length}</Badge>}
                    {humanOverdue > 0 && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{humanOverdue} retard</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-3 pb-2">
                  {tasksLoading ? (
                    <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
                  ) : todayTasks.length === 0 ? (
                    <div className="py-4 text-center">
                      <p className="text-xs text-muted-foreground mb-2">Aucune tâche pour aujourd'hui</p>
                      <Button variant="outline" size="sm" className="text-xs h-7"
                        onClick={() => suggestTasks.mutate({})} disabled={suggestTasks.isPending}>
                        {suggestTasks.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                        Suggestions IA
                      </Button>
                    </div>
                  ) : (
                    <ScrollArea className="h-[260px] pr-2">
                      <div className="space-y-0.5">{todayTasks.map(task => <TaskRow key={task.id} task={task} navigate={navigate} />)}</div>
                    </ScrollArea>
                  )}

                </CardContent>
              </Card>

              {/* Bookings */}
              <Card>
                <CardHeader className="pb-1.5 pt-3 px-3">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Rendez-vous
                    {(todayBookings?.length || 0) > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">{todayBookings!.length}</Badge>}
                    <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] ml-auto" onClick={() => navigate('/cockpit/agenda')}>
                      Agenda <ChevronRight className="h-2.5 w-2.5 ml-0.5" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-3 pb-2">
                  {bookingsLoading ? <Skeleton className="h-10 w-full" /> : !todayBookings || todayBookings.length === 0 ? (
                    <div className="py-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1.5">Aucun RDV aujourd'hui</p>
                      {upcomingBookings && upcomingBookings.length > 0 && (
                        <p className="text-[10px] text-primary cursor-pointer hover:underline" onClick={() => navigate('/cockpit/agenda')}>
                          → {upcomingBookings.length} RDV à venir
                        </p>
                      )}
                    </div>
                  ) : (
                    <ScrollArea className="h-[200px] pr-2">
                      <div className="space-y-1">
                        {todayBookings.map((b: any) => (
                          <div key={b.id} className="flex items-center justify-between py-1.5 px-1 rounded hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => navigate('/cockpit/agenda')}>
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{b.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{b.company || b.email}</p>
                            </div>
                            <Badge variant="outline" className="text-[10px] font-mono">{format(new Date(b.start_time), 'HH:mm')}</Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}

                </CardContent>
              </Card>

              {/* Upcoming tasks */}
              {upcomingTasks.length > 0 && (
                <Card>
                  <CardHeader className="pb-1.5 pt-3 px-3">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" /> À venir (7j)
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-1">{upcomingTasks.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 px-3 pb-2">
                    <div className="space-y-0.5">{upcomingTasks.map(task => <TaskRow key={task.id} task={task} showDate navigate={navigate} />)}</div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* ─── COL 2: Signaux Croisés + Pipeline + Prédictions ─── */}
            <div className="lg:col-span-4 flex flex-col gap-3">
              <CrossSignalsWidget signals={intelligence?.cross_signals} embeddingSignals={raw?.cross_signals_db} isLoading={intelLoading} navigate={navigate} />

              {/* Pipeline */}
              <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate('/cockpit/pipeline')}>
                <CardHeader className="pb-1.5 pt-3 px-3">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5" /> Pipeline
                    <ChevronRight className="h-3 w-3 ml-auto" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-3 pb-3">
                  {isLoading ? <Skeleton className="h-16 w-full" /> : (
                    <>
                      <div className="flex items-baseline gap-2 mb-3">
                        <p className="text-2xl font-bold tracking-tight">{formatCurrency(oppStats.totalValue)}</p>
                        <p className="text-sm text-muted-foreground">· {formatCurrency(oppStats.weightedValue)} pondéré</p>
                      </div>
                      <div className="flex gap-1 h-2 rounded-full overflow-hidden mb-2.5">
                        {['lead', 'r1', 'r2', 'pause'].map(stage => {
                          const count = oppStats.byStage?.[stage]?.count || 0;
                          const total = oppStats.total || 1;
                          return (
                            <div key={stage}
                              className={`transition-all ${stage === 'lead' ? 'bg-blue-500' : stage === 'r1' ? 'bg-amber-500' : stage === 'r2' ? 'bg-orange-500' : 'bg-muted-foreground/30'}`}
                              style={{ width: `${Math.max((count / total) * 100, 2)}%` }}
                            />
                          );
                        })}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {['lead', 'r1', 'r2', 'pause', 'closed_won', 'closed_lost'].map(stage => {
                          const data = oppStats.byStage?.[stage];
                          if (!data || data.count === 0) return null;
                          return (
                            <div key={stage} className={`flex items-center justify-between px-2 py-1 rounded text-[11px] ${STAGE_COLORS[stage]}`}>
                              <span className="font-medium">{stage === 'lead' ? 'Lead' : stage === 'r1' ? 'R1' : stage === 'r2' ? 'R2' : stage === 'pause' ? 'Pause' : stage === 'closed_won' ? 'Gagné' : 'Perdu'}</span>
                              <span>{data.count} · {formatCurrency(data.value)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <PredictionsWidget predictions={intelligence?.predictions} isLoading={intelLoading} navigate={navigate} />

              <TrendDeltaWidget deltas={(raw as any)?.temporal_deltas} loading={intelLoading} />

              {/* Health overview */}
              {intelligence?.health_overview && (
                <Card>
                  <CardHeader className="pb-1 pt-3 px-3">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5" /> Santé Globale
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 px-3 pb-2">
                    <div className="flex gap-2 mb-2">
                      <div className="flex-1 text-center p-1.5 rounded bg-emerald-500/10">
                        <p className="text-lg font-bold text-emerald-600">{raw?.health_summary?.on_track || 0}</p>
                        <p className="text-[10px] text-muted-foreground">🟢 OK</p>
                      </div>
                      <div className="flex-1 text-center p-1.5 rounded bg-amber-500/10">
                        <p className="text-lg font-bold text-amber-600">{raw?.health_summary?.at_risk || 0}</p>
                        <p className="text-[10px] text-muted-foreground">🟡 Risque</p>
                      </div>
                      <div className="flex-1 text-center p-1.5 rounded bg-destructive/10">
                        <p className="text-lg font-bold text-destructive">{raw?.health_summary?.off_track || 0}</p>
                        <p className="text-[10px] text-muted-foreground">🔴 Danger</p>
                      </div>
                    </div>
                    {intelligence.health_overview.degrading.length > 0 && (
                      <div className="text-[10px] text-destructive">📉 {intelligence.health_overview.degrading.join(', ')}</div>
                    )}
                    {intelligence.health_overview.improving.length > 0 && (
                      <div className="text-[10px] text-emerald-600">📈 {intelligence.health_overview.improving.join(', ')}</div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Scoring */}
              {raw?.scoring && raw.scoring.length > 0 && (
                <Card>
                  <CardHeader className="pb-1 pt-3 px-3">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <BarChart3 className="h-3.5 w-3.5" /> Scoring Prédictif
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 px-3 pb-2">
                    <div className="space-y-1.5">
                      {raw.scoring.slice(0, 4).map((s: any) => (
                        <div key={s.opportunity_id}
                          className="flex items-center gap-2 py-1 px-1.5 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => navigate('/cockpit/pipeline')}>
                          <span className={cn("text-xs font-bold w-8 text-center",
                            s.conversion_score >= 70 ? "text-emerald-600" :
                            s.conversion_score >= 40 ? "text-amber-600" : "text-destructive"
                          )}>{s.conversion_score}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs truncate">{s.opportunity_title}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{s.recommended_action}</p>
                          </div>
                          <Badge variant={s.risk_level === 'low' ? 'secondary' : s.risk_level === 'medium' ? 'outline' : 'destructive'}
                            className="text-[9px] px-1 py-0">
                            {s.risk_level === 'low' ? '🟢' : s.risk_level === 'medium' ? '🟡' : '🔴'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Mini Stats */}
              <div className="grid grid-cols-3 gap-2">
                <MiniStat icon={Users} label="Leads" value={leadStats.total} loading={leadsLoading} onClick={() => navigate('/cockpit/leads')} />
                <MiniStat icon={Target} label="Opps" value={oppStats.total} loading={oppsLoading} onClick={() => navigate('/cockpit/pipeline')} />
                <MiniStat icon={FileText} label="Notes" value={noteStats.thisWeek} subtitle="sem." loading={false} onClick={() => navigate('/cockpit/transcriptions')} />
              </div>

              <StagnantWidget onSuggestFollowUp={(entityId) => suggestNextStep.mutate(entityId)} suggestNextStep={suggestNextStep} />
            </div>

            {/* ─── COL 3: Transcriptions + Projets + Activité + Sentinel ─── */}
            <div className="lg:col-span-4 flex flex-col gap-3">
              <SentinelCardWidget alerts={sentinelAlerts} lastFetched={sentinelLastFetched} />

              {/* Stale synthesis impact */}
              {intelligence?.stale_synthesis_impact && staleCount > 0 && (
                <Card className="border-amber-500/20">
                  <CardContent className="pt-3 px-3 pb-2">
                    <div className="flex items-start gap-2">
                      <Database className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-amber-600 mb-0.5">{staleCount} synthèses obsolètes</p>
                        <p className="text-[10px] text-muted-foreground">{intelligence.stale_synthesis_impact}</p>
                        <Button variant="outline" size="sm" className="mt-1.5 h-6 text-[10px] border-amber-500/30 text-amber-600"
                          onClick={handleAutoConsulte} disabled={isAutoRunning}>
                          {isAutoRunning ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                          Re-synthétiser
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Transcriptions */}
              <Card>
                <CardHeader className="pb-1.5 pt-3 px-3">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Mic className="h-3.5 w-3.5" /> Transcriptions récentes
                    <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] ml-auto" onClick={() => navigate('/cockpit/transcriptions')}>
                      Tout <ChevronRight className="h-2.5 w-2.5 ml-0.5" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-3 pb-2">
                  {recentTranscriptions.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-3 text-center">Aucune transcription récente</p>
                  ) : (
                    <ScrollArea className="h-[280px] pr-2">
                      <div className="space-y-1">
                        {recentTranscriptions.map((t: any) => (
                          <div key={t.id}
                            className="flex items-start gap-2 py-1.5 px-1.5 rounded hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => navigate(`/cockpit/transcriptions/${t.id}`)}>
                            <Mic className={cn("h-3.5 w-3.5 mt-0.5 flex-shrink-0",
                              t.status === 'done' ? 'text-emerald-500' : t.status === 'error' ? 'text-destructive' : 'text-primary'
                            )} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{t.title || t.summary?.title || t.original_filename || 'Sans titre'}</p>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                {t.lead?.name && <span className="truncate">🎯 {t.lead.name}</span>}
                                {t.project?.name && <span className="truncate">📁 {t.project.name}</span>}
                                <span>{formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: fr })}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}

                </CardContent>
              </Card>

              {/* Active Projects */}
              <Card>
                <CardHeader className="pb-1.5 pt-3 px-3">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <FolderOpen className="h-3.5 w-3.5" /> Projets actifs
                    <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] ml-auto" onClick={() => navigate('/cockpit/projects')}>
                      Tout <ChevronRight className="h-2.5 w-2.5 ml-0.5" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-3 pb-2">
                  {recentProjects.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-3 text-center">Aucun projet actif</p>
                  ) : (
                    <ScrollArea className="h-[260px] pr-2">
                      <div className="space-y-1">
                        {recentProjects.map((p: any) => (
                          <div key={p.id}
                            className="flex items-center justify-between py-1.5 px-1.5 rounded hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => navigate(`/cockpit/projects`)}>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium truncate">{p.name}</p>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                {p.leads?.name && <span className="truncate">🎯 {p.leads.name}</span>}
                                {p.budget_amount > 0 && <span>{formatCurrency(p.budget_amount)}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {p.health_status && (
                                <span className="text-[10px]">
                                  {p.health_status === 'on_track' ? '🟢' : p.health_status === 'at_risk' ? '🟡' : '🔴'}
                                </span>
                              )}
                              <Badge variant="outline" className="text-[9px] px-1 py-0 capitalize">{p.status}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>


              {/* Activity Feed */}
              <Card className="flex-1 min-h-0">
                <CardHeader className="pb-1.5 pt-3 px-3">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" /> Activité récente
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-3 pb-2">
                  <ScrollArea className="h-[300px] pr-2">
                    {activitiesLoading ? (
                      <div className="space-y-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
                    ) : meaningfulActivities.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8">Aucune activité</p>
                    ) : (
                      <div className="space-y-0.5">
                        {meaningfulActivities.map(a => (
                          <div key={a.id}
                            className={cn(
                              "flex items-start gap-2 py-1.5 px-1.5 rounded hover:bg-muted/50 transition-colors cursor-pointer",
                              a.is_ai_generated && "border-l-2 border-primary/30 pl-2.5"
                            )}
                            onClick={() => {
                              const entityRoutes: Record<string, string> = {
                                lead: `/cockpit/leads/${a.entity_id}`,
                                opportunity: `/cockpit/pipeline`,
                                project: `/cockpit/projects/${a.entity_id}`,
                                transcription: `/cockpit/transcriptions/${a.entity_id}`,
                                partner: `/cockpit/partenaires/${a.entity_id}`,
                                task: `/cockpit/projects`,
                              };
                              navigate(entityRoutes[a.entity_type] || '/cockpit');
                            }}>
                            <ActivityIcon type={a.activity_type} isAI={!!a.is_ai_generated} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <OwnerBadge userId={a.created_by} size="sm" />
                                <p className="text-xs font-medium truncate">{a.title}</p>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                {a.is_ai_generated && <span className="text-primary">🤖</span>}
                                <span className="capitalize">{a.entity_type}</span>
                                <span>·</span>
                                <span>{formatDistanceToNow(new Date(a.created_at!), { addSuffix: true, locale: fr })}</span>
                              </div>
                            </div>
                            <ExternalLink className="h-3 w-3 text-muted-foreground/40 flex-shrink-0 mt-1" />
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <CreateTaskDialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen} />
      </div>
    </CockpitLayout>
  );
}
