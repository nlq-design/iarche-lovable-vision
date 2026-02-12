// Cockpit Dashboard v8.0 — Command Intelligence Layer
import { useState } from 'react';
import { CockpitLayout } from '@/components/cockpit/CockpitLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import {
  Users, Target, Calendar, TrendingUp, Clock,
  CheckCircle2, Plus, FileText, Mail, Phone,
  Activity, Wheat, ArrowRight, Sparkles, AlertCircle,
  ChevronRight, Radar, Brain, RefreshCw, Loader2,
  AlertTriangle, Info, XCircle, X, Shield, Zap,
  Database, Mic, FolderOpen, BarChart3, Trophy,
  ArrowUpRight, ArrowDownRight, ExternalLink, Eye,
  Lightbulb, TrendingDown, Crosshair, Gauge,
} from 'lucide-react';
import {
  useCockpitLeads, useCockpitOpportunities, useCockpitTasks,
  useCockpitBookings, useCockpitMeetingNotes, useCockpitActivityLog,
} from '@/hooks/cockpit';
import { useDashboardRealtime } from '@/hooks/cockpit/useDashboardRealtime';
import { useCockpitAICopilot } from '@/hooks/cockpit/useCockpitAICopilot';
import { useCockpitIntelligence, IntelligenceAction, CrossSignal, Prediction } from '@/hooks/cockpit/useCockpitIntelligence';
import { useAISentinel, SentinelAlert } from '@/hooks/cockpit/useAISentinel';
import { useAutoConsulte } from '@/hooks/cockpit/useAutoConsulte';
import { CreateTaskDialog } from '@/components/cockpit/dialogs';
import { HarvestInterviewPanel } from '@/components/cockpit/HarvestInterviewPanel';
import { ActionProposalsList } from '@/components/cockpit/ActionProposalsList';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

const STAGE_LABELS: Record<string, string> = {
  lead: 'Lead', r1: 'R1', r2: 'R2', pause: 'Pause',
  closed_won: 'Gagné', closed_lost: 'Perdu',
};
const STAGE_COLORS: Record<string, string> = {
  lead: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  r1: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
  r2: 'bg-orange-500/20 text-orange-700 dark:text-orange-300',
  pause: 'bg-muted text-muted-foreground',
  closed_won: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  closed_lost: 'bg-destructive/20 text-destructive',
};

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

  // ─── UNIFIED INTELLIGENCE (replaces morningBrief + healthCheck + opportunityScore) ───
  const { data: intel, isLoading: intelLoading, refresh: refreshIntel } = useCockpitIntelligence();

  // ─── Other AI hooks (kept for specific actions) ───
  const { suggestNextStep, suggestTasks } = useCockpitAICopilot();
  const { alerts: sentinelAlerts, isLoading: sentinelLoading, refresh: refreshSentinel, dismissAlert, lastFetched: sentinelLastFetched } = useAISentinel();
  const { isRunning: isAutoRunning, triggerAutoConsulte, triggerAutoHarvest } = useAutoConsulte();

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
    try {
      await triggerAutoConsulte();
    } catch {}
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
                {/* Global health gauge */}
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
                      <Button
                        variant="outline" size="sm"
                        className="h-8 gap-1.5 border-blue-500/30 text-blue-600 hover:bg-blue-500/10"
                        onClick={handleAutoConsulte}
                        disabled={isAutoRunning}
                      >
                        {isAutoRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
                        <span className="text-xs font-semibold">{staleCount}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{staleCount} synthèses à mettre à jour</TooltipContent>
                  </Tooltip>
                )}

                {/* Refresh Intelligence */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={refreshIntel} disabled={intelLoading}>
                      {intelLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Rafraîchir l'intelligence</TooltipContent>
                </Tooltip>

                {/* Brief expand */}
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

              {/* ⚡ TOP ACTIONS (from Intelligence) */}
              <div id="actions-prioritaires">
                <TopActionsWidget actions={intelligence?.top_actions} isLoading={intelLoading} navigate={navigate} />
              </div>

              {/* ⚡ ACTION PROPOSALS (from Chatbot AI) */}
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
                    <div className="space-y-0.5">{todayTasks.map(task => <TaskRow key={task.id} task={task} navigate={navigate} />)}</div>
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
                    <div className="space-y-1">
                      {todayBookings.slice(0, 4).map((b: any) => (
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

              {/* 🔗 CROSS SIGNALS (from Intelligence) */}
              <CrossSignalsWidget signals={intelligence?.cross_signals} isLoading={intelLoading} navigate={navigate} />

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
                              <span className="font-medium">{STAGE_LABELS[stage]}</span>
                              <span>{data.count} · {formatCurrency(data.value)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* 🔮 PREDICTIONS (from Intelligence) */}
              <PredictionsWidget predictions={intelligence?.predictions} isLoading={intelLoading} navigate={navigate} />

              {/* Health overview from intelligence */}
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
                      <div className="text-[10px] text-destructive">
                        📉 {intelligence.health_overview.degrading.join(', ')}
                      </div>
                    )}
                    {intelligence.health_overview.improving.length > 0 && (
                      <div className="text-[10px] text-emerald-600">
                        📈 {intelligence.health_overview.improving.join(', ')}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Scoring from raw intelligence data */}
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

              {/* Stagnant Widget */}
              <StagnantWidget onSuggestFollowUp={(entityId) => suggestNextStep.mutate(entityId)} suggestNextStep={suggestNextStep} />
            </div>

            {/* ─── COL 3: Transcriptions + Projets + Activité + Sentinel ─── */}
            <div className="lg:col-span-4 flex flex-col gap-3">
              {/* Sentinel */}
              <SentinelWidget alerts={sentinelAlerts} lastFetched={sentinelLastFetched} />

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
                    <div className="space-y-1">
                      {recentProjects.map((p: any) => (
                        <div key={p.id}
                          className="flex items-center justify-between py-1.5 px-1.5 rounded hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => navigate(`/cockpit/projects/${p.id}`)}>
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
                  <ScrollArea className="max-h-[300px]">
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
                              <p className="text-xs font-medium truncate">{a.title}</p>
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

// ─── NEW: Top Actions Widget ───
function TopActionsWidget({ actions, isLoading, navigate }: { actions?: IntelligenceAction[]; isLoading: boolean; navigate: any }) {
  if (isLoading) return (
    <Card className="border-primary/20">
      <CardContent className="pt-3 px-3 pb-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Calcul des priorités...
        </div>
      </CardContent>
    </Card>
  );
  if (!actions?.length) return null;

  const urgencyConfig: Record<string, { bg: string; text: string; icon: string }> = {
    critical: { bg: 'bg-destructive/10 border-destructive/30', text: 'text-destructive', icon: '🔴' },
    high: { bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-700 dark:text-amber-400', icon: '🟠' },
    medium: { bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-700 dark:text-blue-400', icon: '🔵' },
    low: { bg: 'bg-muted border-border', text: 'text-muted-foreground', icon: '⚪' },
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-1 pt-3 px-3">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5" /> Actions Prioritaires
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-2">
        <div className="space-y-1.5">
          {actions.slice(0, 5).map((action, i) => {
            const cfg = urgencyConfig[action.urgency] || urgencyConfig.medium;
            const route = entityRoute(action.entity_type, action.entity_id);
            return (
              <div key={i}
                className={cn("p-2 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity", cfg.bg)}
                onClick={() => navigate(route)}>
                <div className="flex items-start gap-2">
                  <span className="text-xs mt-0.5">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-xs font-medium", cfg.text)}>{action.action}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{action.reasoning}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge variant="outline" className="text-[9px] px-1 py-0 capitalize">{action.entity_type}</Badge>
                      <span className="text-[9px] text-muted-foreground">{action.entity_name}</span>
                      {action.impact_value && action.impact_value > 0 && (
                        <span className="text-[9px] font-semibold text-primary">{formatCurrency(action.impact_value)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── NEW: Cross Signals Widget ───
function CrossSignalsWidget({ signals, isLoading, navigate }: { signals?: CrossSignal[]; isLoading: boolean; navigate: any }) {
  if (isLoading || !signals?.length) return null;

  return (
    <Card className="border-violet-500/20">
      <CardHeader className="pb-1 pt-3 px-3">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
          <Crosshair className="h-3.5 w-3.5" /> Signaux Croisés
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-2">
        <div className="space-y-1.5">
          {signals.slice(0, 4).map((signal, i) => (
            <div key={i} className={cn(
              "p-2 rounded-lg border text-xs",
              signal.severity === 'high' ? 'bg-destructive/5 border-destructive/20' :
              signal.severity === 'medium' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-muted/50 border-border'
            )}>
              <p className="font-medium leading-snug">{signal.signal}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {signal.entities.map((e, j) => (
                  <button key={j}
                    className="text-[9px] bg-background/80 border rounded px-1 py-0 hover:bg-primary/10 transition-colors"
                    onClick={() => navigate(entityRoute(e.type, e.id))}>
                    {e.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── NEW: Predictions Widget ───
function PredictionsWidget({ predictions, isLoading, navigate }: { predictions?: Prediction[]; isLoading: boolean; navigate: any }) {
  if (isLoading || !predictions?.length) return null;

  return (
    <Card className="border-cyan-500/20">
      <CardHeader className="pb-1 pt-3 px-3">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5" /> Prédictions 7j
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-2">
        <div className="space-y-1.5">
          {predictions.slice(0, 4).map((pred, i) => (
            <div key={i} className={cn(
              "p-2 rounded-lg border text-xs",
              pred.risk_type === 'risk' ? 'bg-destructive/5 border-destructive/20' : 'bg-emerald-500/5 border-emerald-500/20'
            )}>
              <div className="flex items-start gap-2">
                {pred.risk_type === 'risk' ?
                  <TrendingDown className="h-3.5 w-3.5 text-destructive flex-shrink-0 mt-0.5" /> :
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                }
                <div className="flex-1 min-w-0">
                  <p className="font-medium leading-snug">{pred.prediction}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={pred.confidence * 100} className="h-1 flex-1" />
                    <span className="text-[9px] text-muted-foreground">{Math.round(pred.confidence * 100)}%</span>
                    <span className="text-[9px] text-muted-foreground">{pred.timeframe}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Navigation helpers ───
function entityRoute(type: string, id: string): string {
  const routes: Record<string, string> = {
    lead: `/cockpit/leads/${id}`,
    opportunity: `/cockpit/pipeline`,
    project: `/cockpit/projects/${id}`,
    partner: `/cockpit/partenaires/${id}`,
    transcription: `/cockpit/transcriptions/${id}`,
    task: `/cockpit/projects`,
  };
  return routes[type] || '/cockpit';
}

function navigateToEntity(navigate: ReturnType<typeof useNavigate>, alert: SentinelAlert) {
  navigate(entityRoute(alert.entity_type, alert.entity_id));
}

function getSmartHeadline(ctx: {
  humanOverdue: number; criticalAlerts: number; todayTasks: number;
  todayBookings: number; overdueAi: number; staleQueue: number;
}): string {
  if (ctx.criticalAlerts > 0) return `⚠️ ${ctx.criticalAlerts} alerte${ctx.criticalAlerts > 1 ? 's' : ''} critique${ctx.criticalAlerts > 1 ? 's' : ''}`;
  if (ctx.humanOverdue >= 3) return `🔴 ${ctx.humanOverdue} tâches en retard`;
  if (ctx.todayBookings > 0 && ctx.todayTasks > 0) return `${ctx.todayTasks} tâche${ctx.todayTasks > 1 ? 's' : ''} et ${ctx.todayBookings} RDV aujourd'hui`;
  if (ctx.todayTasks > 0) return `${ctx.todayTasks} tâche${ctx.todayTasks > 1 ? 's' : ''} au programme`;
  if (ctx.overdueAi > 20) return `🌾 ${ctx.overdueAi} tâches IA à récolter`;
  if (ctx.staleQueue > 0) return `🔄 ${ctx.staleQueue} synthèses à mettre à jour`;
  return 'Analyse en cours...';
}

// ─── Sentinel Widget ───
function SentinelWidget({ alerts, lastFetched }: { alerts: SentinelAlert[]; lastFetched: Date | null }) {
  const navigate = useNavigate();
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  if (alerts.length === 0) return null;

  return (
    <Card className={cn("flex-shrink-0", criticalCount > 0 ? "border-destructive/30" : "border-amber-500/20")}>
      <CardHeader className="pb-1 pt-3 px-3">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
          <Radar className={cn("h-3.5 w-3.5", criticalCount > 0 ? "text-destructive" : "text-amber-500")} />
          <span className={criticalCount > 0 ? "text-destructive" : "text-amber-600"}>Sentinelle</span>
          <Badge variant={criticalCount > 0 ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0 ml-1">{alerts.length}</Badge>
          {lastFetched && <span className="text-[9px] text-muted-foreground ml-auto font-normal">{formatDistanceToNow(lastFetched, { addSuffix: true, locale: fr })}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-2">
        <div className="space-y-1">
          {alerts.slice(0, 3).map(alert => (
            <button key={alert.id}
              className={cn("w-full text-left flex items-start gap-2 p-1.5 rounded text-xs hover:bg-muted/50 transition-colors",
                alert.severity === 'critical' ? "text-destructive" : "text-muted-foreground"
              )}
              onClick={() => navigateToEntity(navigate, alert)}>
              {alert.severity === 'critical' ? <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0 text-amber-500" />}
              <span className="truncate">{alert.entity_name}: {alert.question}</span>
            </button>
          ))}
          {alerts.length > 3 && <p className="text-[10px] text-muted-foreground text-center">+{alerts.length - 3} autres</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Sentinel Button ───
const severityConfig = {
  critical: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', badge: 'destructive' as const },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', badge: 'secondary' as const },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10', badge: 'outline' as const },
};

function SentinelButton({ alerts, isLoading, onRefresh, onDismiss, lastFetched }: {
  alerts: SentinelAlert[]; isLoading: boolean; onRefresh: () => void; onDismiss: (id: string) => void; lastFetched: Date | null;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const hasAlerts = alerts.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm"
              className={cn("h-8 px-2 relative",
                criticalCount > 0 ? "text-destructive animate-pulse" :
                hasAlerts ? "text-amber-600" : "text-muted-foreground"
              )}>
              <Radar className="h-3.5 w-3.5" />
              {hasAlerts && (
                <span className={cn("absolute -top-1 -right-1 text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center",
                  criticalCount > 0 ? "bg-destructive text-destructive-foreground" : "bg-amber-500 text-white"
                )}>{alerts.length > 9 ? '9+' : alerts.length}</span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {hasAlerts ? `Sentinelle : ${alerts.length} anomalie${alerts.length > 1 ? 's' : ''}` : 'Sentinelle — Aucune anomalie'}
          </TooltipContent>
        </Tooltip>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Radar className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">IA Sentinelle</span>
            {alerts.length > 0 && <Badge variant="secondary" className="text-[10px]">{alerts.length}</Badge>}
          </div>
          <div className="flex items-center gap-1">
            {lastFetched && <span className="text-[9px] text-muted-foreground">{formatDistanceToNow(lastFetched, { addSuffix: true, locale: fr })}</span>}
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onRefresh} disabled={isLoading}>
              <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
        <ScrollArea className="max-h-[350px]">
          {alerts.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Radar className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Aucune anomalie</p>
            </div>
          ) : (
            <div className="p-2 space-y-1.5">
              {alerts.map(alert => {
                const config = severityConfig[alert.severity as keyof typeof severityConfig] ?? severityConfig.info;
                const Icon = config.icon;
                return (
                  <div key={alert.id} className={cn("p-2.5 rounded-lg border transition-colors hover:bg-muted/50", config.bg)}>
                    <div className="flex items-start gap-2">
                      <Icon className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", config.color)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium leading-snug">{alert.question}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{alert.entity_name} · {alert.entity_type}</p>
                        <div className="flex gap-1 mt-1">
                          <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]"
                            onClick={() => { setOpen(false); navigateToEntity(navigate, alert); }}>
                            Voir <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-muted-foreground"
                            onClick={() => onDismiss(alert.id)}>
                            <X className="w-2.5 h-2.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

// ─── Sub-components ───
function MiniStat({ icon: Icon, label, value, subtitle, loading, onClick }: {
  icon: any; label: string; value: string | number; subtitle?: string; loading: boolean; onClick?: () => void;
}) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-center justify-center p-2.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-center"
      disabled={!onClick}>
      {loading ? <Skeleton className="h-8 w-full" /> : (
        <>
          <Icon className="h-3.5 w-3.5 text-muted-foreground mb-0.5" />
          <p className="text-lg font-bold leading-tight">{value}</p>
          <p className="text-[10px] text-muted-foreground">{label}{subtitle ? ` ${subtitle}` : ''}</p>
        </>
      )}
    </button>
  );
}

function TaskRow({ task, showDate, navigate }: { task: any; showDate?: boolean; navigate: any }) {
  const provenance = task.leads?.name || task.leads?.company || task.projects?.name || '';
  const handleClick = () => {
    if (task.entity_type === 'lead' && task.entity_id) navigate(`/cockpit/leads/${task.entity_id}`);
    else if (task.entity_type === 'project' && task.entity_id) navigate(`/cockpit/projects/${task.entity_id}`);
    else if (task.lead_id) navigate(`/cockpit/leads/${task.lead_id}`);
    else if (task.project_id) navigate(`/cockpit/projects/${task.project_id}`);
  };

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer" onClick={handleClick}>
      <div className="flex-shrink-0">
        {task.priority === 'high' || task.priority === 'urgent' ? (
          <div className="h-2 w-2 rounded-full bg-destructive" />
        ) : (
          <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs truncate">{task.title}</p>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          {showDate && task.due_date && <span className="font-medium">{format(new Date(task.due_date), 'd MMM', { locale: fr })}</span>}
          {provenance && <span className="truncate">{provenance}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {task.due_time && <span className="text-[10px] text-muted-foreground font-mono">{task.due_time.slice(0, 5)}</span>}
        {task.ai_generated && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="text-[9px] px-1 py-0 cursor-help">IA</Badge>
            </TooltipTrigger>
            <TooltipContent className="text-xs max-w-[200px]">
              Tâche IA{task.entity_type && <span> · {task.entity_type}</span>}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

function StagnantWidget({ onSuggestFollowUp, suggestNextStep }: { onSuggestFollowUp: (id: string) => void; suggestNextStep: any }) {
  const navigate = useNavigate();
  const { data: stagnant = [], isLoading } = useQuery({
    queryKey: ['stagnant-opportunities'],
    queryFn: async () => {
      const ago = new Date();
      ago.setDate(ago.getDate() - 7);
      const { data } = await supabase
        .from('opportunities')
        .select('id, title, stage, updated_at, lead_id, value_amount')
        .lt('updated_at', ago.toISOString())
        .not('stage', 'in', '(closed_won,closed_lost)')
        .order('updated_at', { ascending: true })
        .limit(5);
      return data || [];
    },
    staleTime: 30 * 1000,
  });

  if (isLoading || stagnant.length === 0) return null;

  return (
    <Card className="border-destructive/20">
      <CardHeader className="pb-1.5 pt-3 px-3">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-destructive flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5" /> Inactif +7j
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 ml-auto">{stagnant.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-2">
        {stagnant.map((opp: any) => (
          <div key={opp.id} className="flex items-center justify-between py-1.5 px-1.5 rounded transition-colors group">
            <div className="min-w-0 cursor-pointer hover:bg-muted/50 flex-1" onClick={() => navigate('/cockpit/pipeline')}>
              <p className="text-xs font-medium truncate">{opp.title}</p>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="capitalize">{STAGE_LABELS[opp.stage] || opp.stage}</span>
                {opp.value_amount > 0 && <span>· {formatCurrency(opp.value_amount)}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(opp.updated_at), { locale: fr })}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); onSuggestFollowUp(opp.id); }}
                    disabled={suggestNextStep.isPending}>
                    {suggestNextStep.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3 text-primary" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>💡 Suggestion IA</TooltipContent>
              </Tooltip>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ActivityIcon({ type, isAI }: { type: string; isAI?: boolean }) {
  const icons: Record<string, React.ReactNode> = {
    note_added: <FileText className="h-3.5 w-3.5 text-primary" />,
    status_changed: <Activity className="h-3.5 w-3.5 text-accent-foreground" />,
    task_created: <CheckCircle2 className="h-3.5 w-3.5 text-primary" />,
    email_sent: <Mail className="h-3.5 w-3.5 text-primary" />,
    call_logged: <Phone className="h-3.5 w-3.5 text-primary" />,
    meeting_scheduled: <Calendar className="h-3.5 w-3.5 text-primary" />,
    new_lead: <Users className="h-3.5 w-3.5 text-emerald-500" />,
    new_opportunity: <Target className="h-3.5 w-3.5 text-amber-500" />,
    new_transcription: <Mic className="h-3.5 w-3.5 text-blue-500" />,
    new_booking: <Calendar className="h-3.5 w-3.5 text-violet-500" />,
    new_generated_document: <FileText className="h-3.5 w-3.5 text-orange-500" />,
    new_project: <TrendingUp className="h-3.5 w-3.5 text-teal-500" />,
    note: <FileText className="h-3.5 w-3.5 text-primary" />,
    ai_action: <Brain className="h-3.5 w-3.5 text-primary" />,
    synthesis_generated: <Database className="h-3.5 w-3.5 text-primary" />,
    email_draft_generated: <Mail className="h-3.5 w-3.5 text-primary" />,
  };
  if (isAI && !icons[type]) return <span className="mt-0.5 flex-shrink-0"><Brain className="h-3.5 w-3.5 text-primary/70" /></span>;
  return <span className="mt-0.5 flex-shrink-0">{icons[type] || <Activity className="h-3.5 w-3.5 text-muted-foreground" />}</span>;
}

function formatCurrency(value: number): string {
  if (value >= 1000) {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency: 'EUR',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
      notation: 'compact',
    }).format(value);
  }
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value);
}
