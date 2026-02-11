// Cockpit Dashboard v7.0 — Fully Dynamic & Interconnected Command Center
import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import {
  useCockpitLeads, useCockpitOpportunities, useCockpitTasks,
  useCockpitBookings, useCockpitMeetingNotes, useCockpitActivityLog,
} from '@/hooks/cockpit';
import { useDashboardRealtime } from '@/hooks/cockpit/useDashboardRealtime';
import { useCockpitAICopilot } from '@/hooks/cockpit/useCockpitAICopilot';
import { useAISentinel, SentinelAlert } from '@/hooks/cockpit/useAISentinel';
import { useAutoConsulte } from '@/hooks/cockpit/useAutoConsulte';
import { CreateTaskDialog } from '@/components/cockpit/dialogs';
import { HarvestInterviewPanel } from '@/components/cockpit/HarvestInterviewPanel';
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
  const [briefOpen, setBriefOpen] = useState(false);
  const navigate = useNavigate();

  useDashboardRealtime();

  // ─── Data hooks ───
  const { leads, stats: leadStats, isLoading: leadsLoading } = useCockpitLeads();
  const { opportunities, stats: oppStats, isLoading: oppsLoading } = useCockpitOpportunities();
  const { tasks, stats: taskStats, isLoading: tasksLoading } = useCockpitTasks();
  const { todayBookings, upcomingBookings, isLoading: bookingsLoading } = useCockpitBookings();
  const { stats: noteStats } = useCockpitMeetingNotes();
  const { activities, isLoading: activitiesLoading } = useCockpitActivityLog();

  // ─── AI hooks ───
  const { morningBrief, opportunityScore, healthCheck, suggestNextStep, suggestTasks, winLossAnalysis } = useCockpitAICopilot();
  const { alerts: sentinelAlerts, isLoading: sentinelLoading, refresh: refreshSentinel, dismissAlert, lastFetched: sentinelLastFetched } = useAISentinel();
  const { isRunning: isAutoRunning, triggerAutoConsulte, triggerAutoHarvest } = useAutoConsulte();

  // ─── Recent transcriptions (dynamic) ───
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

  // ─── Recent projects (dynamic) ───
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

  // ─── Win/Loss stats (dynamic) ───
  const { data: winLossStats } = useQuery({
    queryKey: ['dashboard-win-loss'],
    queryFn: async () => {
      const { data: won } = await supabase
        .from('opportunities')
        .select('id, value_amount', { count: 'exact', head: false })
        .eq('stage', 'closed_won');
      const { data: lost } = await supabase
        .from('opportunities')
        .select('id', { count: 'exact', head: false })
        .eq('stage', 'closed_lost');
      const wonCount = won?.length || 0;
      const lostCount = lost?.length || 0;
      const total = wonCount + lostCount;
      const wonValue = won?.reduce((s, o) => s + (Number(o.value_amount) || 0), 0) || 0;
      return {
        won: wonCount, lost: lostCount, total,
        winRate: total > 0 ? Math.round((wonCount / total) * 100) : 0,
        wonValue,
      };
    },
    staleTime: 60_000,
  });

  // ─── Synthesis stale queue count ───
  const { data: staleCount = 0, refetch: refetchStale } = useQuery({
    queryKey: ['synthesis-stale-count'],
    queryFn: async () => {
      const tables = ['leads', 'projects', 'partners'] as const;
      let total = 0;
      for (const table of tables) {
        const { count } = await supabase
          .from(table)
          .select('id', { count: 'exact', head: true })
          .eq('synthesis_stale', true);
        total += count || 0;
      }
      return total;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
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

  const overdueAiCount = tasks?.filter(t =>
    t.ai_generated && t.due_date && t.due_date < today &&
    t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'harvested'
  ).length || 0;

  const humanOverdue = relevantTasks.filter(t =>
    t.due_date && t.due_date < today && !t.ai_generated
  ).length;

  const NOISE_ACTIVITY_TYPES = ['new_task', 'task_created'];
  const meaningfulActivities = activities.filter(a =>
    !NOISE_ACTIVITY_TYPES.includes(a.activity_type)
  ).slice(0, 12);

  // ─── Conditional AI context ───
  const criticalAlerts = sentinelAlerts.filter(a => a.severity === 'critical');
  const hasUrgentContext = humanOverdue > 0 || criticalAlerts.length > 0 || overdueAiCount > 10;

  // Auto-fetch morning brief on mount
  const [briefFetched, setBriefFetched] = useState(false);
  useEffect(() => {
    if (!briefFetched && !morningBrief.isPending && !morningBrief.data) {
      const timer = setTimeout(() => {
        morningBrief.mutate();
        setBriefFetched(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [briefFetched, morningBrief]);

  // Auto-trigger health check on mount
  const [healthFetched, setHealthFetched] = useState(false);
  useEffect(() => {
    if (!healthFetched && !healthCheck.isPending && !healthCheck.data) {
      const timer = setTimeout(() => {
        healthCheck.mutate();
        setHealthFetched(true);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [healthFetched, healthCheck]);

  // Auto-trigger opportunity scoring
  const [scoreFetched, setScoreFetched] = useState(false);
  useEffect(() => {
    if (!scoreFetched && !opportunityScore.isPending && !opportunityScore.data) {
      const timer = setTimeout(() => {
        opportunityScore.mutate();
        setScoreFetched(true);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [scoreFetched, opportunityScore]);

  const handleAutoConsulte = async () => {
    try {
      await triggerAutoConsulte();
      refetchStale();
    } catch {}
  };

  return (
    <CockpitLayout>
      <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">

        {/* ─── AI BAND ─── */}
        <div className="flex-shrink-0 border-b bg-muted/30">
          {/* Row 1: Main header */}
          <div className="px-4 py-2.5">
            <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-3">
              {/* Left: AI brain + smart summary */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                  hasUrgentContext ? "bg-destructive/10" : "bg-primary/10"
                )}>
                  {morningBrief.isPending ? (
                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  ) : (
                    <Brain className={cn("h-4 w-4", hasUrgentContext ? "text-destructive" : "text-primary")} />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">
                    {getSmartHeadline({
                      humanOverdue,
                      criticalAlerts: criticalAlerts.length,
                      todayTasks: todayTasks.length,
                      todayBookings: todayBookings?.length || 0,
                      overdueAi: overdueAiCount,
                      staleQueue: staleCount,
                      recentTranscriptions: recentTranscriptions.length,
                      activeProjects: recentProjects.length,
                    })}
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
                    {winLossStats && winLossStats.total > 0 && (
                      <span className="text-muted-foreground"> · {winLossStats.winRate}% win</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Right: action buttons */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Auto-Consulte sync */}
                {staleCount > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline" size="sm"
                        className="h-8 gap-1.5 border-blue-500/30 text-blue-600 hover:bg-blue-500/10"
                        onClick={handleAutoConsulte}
                        disabled={isAutoRunning}
                      >
                        {isAutoRunning ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Database className="h-3.5 w-3.5" />
                        )}
                        <span className="text-xs font-semibold">{staleCount}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{staleCount} entités à re-synthétiser — Cliquez pour lancer</TooltipContent>
                  </Tooltip>
                )}

                {/* Morning Brief expand */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost" size="sm"
                      className="h-8 px-2"
                      onClick={() => {
                        if (!morningBrief.data && !morningBrief.isPending) morningBrief.mutate();
                        setBriefOpen(!briefOpen);
                      }}
                    >
                      {morningBrief.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Morning Brief IA — Résumé narratif quotidien</TooltipContent>
                </Tooltip>

                {/* Sentinel */}
                <SentinelButton
                  alerts={sentinelAlerts}
                  isLoading={sentinelLoading}
                  onRefresh={refreshSentinel}
                  onDismiss={dismissAlert}
                  lastFetched={sentinelLastFetched}
                />

                {/* Harvest */}
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
                        <TooltipContent side="bottom">{overdueAiCount} tâches IA en retard — Cliquez pour récolter et traiter</TooltipContent>
                      </Tooltip>
                    </SheetTrigger>
                    <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                      <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                          <Wheat className="h-5 w-5" /> Récolte IA
                        </SheetTitle>
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

          {/* Row 2: Condensed brief preview (always visible if data) */}
          {!briefOpen && morningBrief.data?.brief && (
            <div className="border-t bg-card/30 px-4 py-1.5 cursor-pointer hover:bg-card/50 transition-colors"
              onClick={() => setBriefOpen(true)}>
              <div className="max-w-[1600px] mx-auto flex items-center gap-2">
                <Sparkles className="h-3 w-3 text-primary flex-shrink-0" />
                <p className="text-xs text-muted-foreground truncate">
                  {morningBrief.data.brief.split('\n').filter((l: string) => l.trim()).slice(0, 2).join(' · ').slice(0, 150)}...
                </p>
                <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              </div>
            </div>
          )}

          {/* Row 2b: Morning Brief expanded */}
          {briefOpen && (
            <div className="border-t bg-card/50 px-4 py-3">
              <div className="max-w-[1600px] mx-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Morning Brief</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => morningBrief.mutate()} disabled={morningBrief.isPending}>
                      <RefreshCw className={cn("h-3 w-3", morningBrief.isPending && "animate-spin")} />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => setBriefOpen(false)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {morningBrief.isPending ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Préparation du briefing IA...
                  </div>
                ) : morningBrief.data?.brief ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed max-h-40 overflow-y-auto">
                    <ReactMarkdown>{morningBrief.data.brief}</ReactMarkdown>
                  </div>
                ) : morningBrief.isError ? (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    Erreur — <Button variant="link" size="sm" className="px-0 h-auto" onClick={() => morningBrief.mutate()}>Réessayer</Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Chargement...</p>
                )}
              </div>
            </div>
          )}

          {/* Row 3: Critical sentinel alerts inline */}
          {criticalAlerts.length > 0 && !briefOpen && (
            <div className="border-t bg-destructive/5 px-4 py-1.5">
              <div className="max-w-[1600px] mx-auto flex items-center gap-3 overflow-x-auto">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                {criticalAlerts.slice(0, 3).map(alert => (
                  <button
                    key={alert.id}
                    className="text-xs text-destructive hover:underline truncate flex-shrink-0"
                    onClick={() => navigateToEntity(navigate, alert)}
                  >
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

            {/* ─── COL 1: Tâches + RDV ─── */}
            <div className="lg:col-span-4 flex flex-col gap-3">
              {/* Today tasks */}
              <Card>
                <CardHeader className="pb-1.5 pt-3 px-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Aujourd'hui
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
                        onClick={() => suggestTasks.mutate({})}
                        disabled={suggestTasks.isPending}>
                        {suggestTasks.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                        Suggestions IA
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-0.5">{todayTasks.map(task => <TaskRow key={task.id} task={task} navigate={navigate} />)}</div>
                  )}
                </CardContent>
              </Card>

              {/* Upcoming tasks */}
              <Card>
                <CardHeader className="pb-1.5 pt-3 px-3">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    À venir (7j)
                    {upcomingTasks.length > 0 && <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-1">{upcomingTasks.length}</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-3 pb-2">
                  {upcomingTasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-3 text-center">RAS — votre agenda est clair</p>
                  ) : (
                    <div className="space-y-0.5">{upcomingTasks.map(task => <TaskRow key={task.id} task={task} showDate navigate={navigate} />)}</div>
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
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {format(new Date(b.start_time), 'HH:mm')}
                            </Badge>
                            {b.booking_types?.name && (
                              <span className="text-[9px] text-muted-foreground">{b.booking_types.name}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ─── COL 2: Pipeline + Projects + Scoring ─── */}
            <div className="lg:col-span-4 flex flex-col gap-3">
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

              {/* Opportunity Scoring (dynamic from AI) */}
              <OpportunityScoringWidget opportunityScore={opportunityScore} navigate={navigate} />

              {/* Health Check Widget */}
              <HealthCheckWidget healthCheck={healthCheck} navigate={navigate} />

              {/* Win/Loss quick stats */}
              {winLossStats && winLossStats.total > 0 && (
                <Card>
                  <CardContent className="pt-3 px-3 pb-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Trophy className="h-3.5 w-3.5" /> Conversion
                      </span>
                      <span className="text-lg font-bold text-primary">{winLossStats.winRate}%</span>
                    </div>
                    <div className="flex gap-2 text-[11px]">
                      <div className="flex-1 text-center p-1 rounded bg-emerald-500/10">
                        <span className="font-semibold text-emerald-600">{winLossStats.won}</span>
                        <span className="text-muted-foreground ml-1">gagnées</span>
                      </div>
                      <div className="flex-1 text-center p-1 rounded bg-destructive/10">
                        <span className="font-semibold text-destructive">{winLossStats.lost}</span>
                        <span className="text-muted-foreground ml-1">perdues</span>
                      </div>
                      {winLossStats.wonValue > 0 && (
                        <div className="flex-1 text-center p-1 rounded bg-primary/10">
                          <span className="font-semibold text-primary">{formatCurrency(winLossStats.wonValue)}</span>
                        </div>
                      )}
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
              {/* Sentinel summary widget */}
              <SentinelWidget alerts={sentinelAlerts} lastFetched={sentinelLastFetched} />

              {/* Recent Transcriptions — NEW dynamic widget */}
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
                            t.status === 'done' ? 'text-emerald-500' :
                            t.status === 'error' ? 'text-destructive' : 'text-primary'
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">
                              {t.title || t.summary?.title || t.original_filename || 'Sans titre'}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              {t.lead?.name && <span className="truncate">🎯 {t.lead.name}</span>}
                              {t.project?.name && <span className="truncate">📁 {t.project.name}</span>}
                              <span>{formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: fr })}</span>
                            </div>
                          </div>
                          {t.status !== 'done' && (
                            <Badge variant={t.status === 'error' ? 'destructive' : 'secondary'} className="text-[9px] px-1 py-0">
                              {t.status}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Active Projects — NEW dynamic widget */}
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
                              // Navigate to the related entity
                              const entityRoutes: Record<string, string> = {
                                lead: `/cockpit/leads/${a.entity_id}`,
                                opportunity: `/cockpit/pipeline`,
                                project: `/cockpit/projects/${a.entity_id}`,
                                transcription: `/cockpit/transcriptions/${a.entity_id}`,
                                partner: `/cockpit/partenaires/${a.entity_id}`,
                                task: `/cockpit/projects`,
                              };
                              const route = entityRoutes[a.entity_type] || '/cockpit';
                              navigate(route);
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

// ─── Navigation helper ───
function navigateToEntity(navigate: ReturnType<typeof useNavigate>, alert: SentinelAlert) {
  const routes: Record<string, string> = {
    lead: `/cockpit/leads/${alert.entity_id}`,
    opportunity: `/cockpit/pipeline`,
    project: `/cockpit/projects/${alert.entity_id}`,
    partner: `/cockpit/partenaires/${alert.entity_id}`,
  };
  navigate(routes[alert.entity_type] || '/cockpit');
}

// ─── AI Smart Headline (enriched) ───
function getSmartHeadline(ctx: {
  humanOverdue: number;
  criticalAlerts: number;
  todayTasks: number;
  todayBookings: number;
  overdueAi: number;
  staleQueue: number;
  recentTranscriptions: number;
  activeProjects: number;
}): string {
  if (ctx.criticalAlerts > 0) {
    return `⚠️ ${ctx.criticalAlerts} alerte${ctx.criticalAlerts > 1 ? 's' : ''} critique${ctx.criticalAlerts > 1 ? 's' : ''} à traiter`;
  }
  if (ctx.humanOverdue >= 3) {
    return `🔴 ${ctx.humanOverdue} tâches en retard — à prioriser`;
  }
  if (ctx.humanOverdue > 0 && ctx.todayBookings > 0) {
    return `${ctx.humanOverdue} retard · ${ctx.todayBookings} RDV · ${ctx.todayTasks} tâche${ctx.todayTasks > 1 ? 's' : ''}`;
  }
  if (ctx.todayBookings > 0 && ctx.todayTasks > 0) {
    return `${ctx.todayTasks} tâche${ctx.todayTasks > 1 ? 's' : ''} et ${ctx.todayBookings} RDV aujourd'hui`;
  }
  if (ctx.todayTasks > 0) {
    return `${ctx.todayTasks} tâche${ctx.todayTasks > 1 ? 's' : ''} au programme`;
  }
  if (ctx.overdueAi > 20) {
    return `🌾 ${ctx.overdueAi} tâches IA à récolter`;
  }
  if (ctx.staleQueue > 0) {
    return `🔄 ${ctx.staleQueue} synthèses à mettre à jour`;
  }
  if (ctx.todayBookings > 0) {
    return `${ctx.todayBookings} rendez-vous aujourd'hui`;
  }
  if (ctx.activeProjects > 0) {
    return `${ctx.activeProjects} projets actifs — tout est calme`;
  }
  return 'Tout est calme — bon moment pour prospecter';
}

// ─── Opportunity Scoring Widget (NEW) ───
function OpportunityScoringWidget({ opportunityScore, navigate }: { opportunityScore: any; navigate: any }) {
  if (!opportunityScore.data?.scores?.length) return null;
  const scores = opportunityScore.data.scores as any[];
  const topScores = scores.sort((a: any, b: any) => b.conversion_score - a.conversion_score).slice(0, 4);

  return (
    <Card>
      <CardHeader className="pb-1 pt-3 px-3">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5" /> Scoring Prédictif
          {opportunityScore.isPending && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-2">
        <div className="space-y-1.5">
          {topScores.map((s: any) => (
            <div key={s.opportunity_id}
              className="flex items-center gap-2 py-1 px-1.5 rounded hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => navigate('/cockpit/pipeline')}>
              <div className="flex-shrink-0 w-8 text-center">
                <span className={cn("text-xs font-bold",
                  s.conversion_score >= 70 ? "text-emerald-600" :
                  s.conversion_score >= 40 ? "text-amber-600" : "text-destructive"
                )}>{s.conversion_score}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs truncate">{s.opportunity_title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{s.recommended_action}</p>
              </div>
              <Badge variant={
                s.risk_level === 'low' ? 'secondary' :
                s.risk_level === 'medium' ? 'outline' : 'destructive'
              } className="text-[9px] px-1 py-0">
                {s.risk_level === 'low' ? '🟢' : s.risk_level === 'medium' ? '🟡' : '🔴'}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Health Check Widget ───
function HealthCheckWidget({ healthCheck, navigate }: { healthCheck: any; navigate: any }) {
  if (!healthCheck.data?.summary) return null;
  const { summary } = healthCheck.data;
  return (
    <Card>
      <CardHeader className="pb-1 pt-3 px-3">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5" /> Santé Projets
          {healthCheck.isPending && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-2">
        <div className="flex gap-2">
          <div className="flex-1 text-center p-1.5 rounded bg-emerald-500/10">
            <p className="text-lg font-bold text-emerald-600">{summary.on_track}</p>
            <p className="text-[10px] text-muted-foreground">🟢 OK</p>
          </div>
          <div className="flex-1 text-center p-1.5 rounded bg-amber-500/10">
            <p className="text-lg font-bold text-amber-600">{summary.at_risk}</p>
            <p className="text-[10px] text-muted-foreground">🟡 Risque</p>
          </div>
          <div className="flex-1 text-center p-1.5 rounded bg-destructive/10">
            <p className="text-lg font-bold text-destructive">{summary.off_track}</p>
            <p className="text-[10px] text-muted-foreground">🔴 Danger</p>
          </div>
        </div>
        {healthCheck.data.projects?.filter((p: any) => p.computed_health !== 'on_track').slice(0, 3).map((p: any) => (
          <div key={p.project_id}
            className="flex items-center gap-2 mt-1.5 text-xs cursor-pointer hover:bg-muted/30 rounded p-0.5"
            onClick={() => navigate(`/cockpit/projects/${p.project_id}`)}>
            {p.computed_health === 'off_track' ?
              <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0" /> :
              <AlertCircle className="h-3 w-3 text-amber-500 flex-shrink-0" />
            }
            <span className="truncate text-muted-foreground">{p.project_name}</span>
            <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-auto">{p.risk_factors?.[0]}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Sentinel Widget (col 3) ───
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
          <Badge variant={criticalCount > 0 ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0 ml-1">
            {alerts.length}
          </Badge>
          {lastFetched && (
            <span className="text-[9px] text-muted-foreground ml-auto font-normal">
              {formatDistanceToNow(lastFetched, { addSuffix: true, locale: fr })}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-2">
        <div className="space-y-1">
          {alerts.slice(0, 3).map(alert => {
            const isCritical = alert.severity === 'critical';
            return (
              <button key={alert.id}
                className={cn(
                  "w-full text-left flex items-start gap-2 p-1.5 rounded text-xs hover:bg-muted/50 transition-colors",
                  isCritical ? "text-destructive" : "text-muted-foreground"
                )}
                onClick={() => navigateToEntity(navigate, alert)}
              >
                {isCritical ? <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0 text-amber-500" />}
                <span className="truncate">{alert.entity_name}: {alert.question}</span>
              </button>
            );
          })}
          {alerts.length > 3 && (
            <p className="text-[10px] text-muted-foreground text-center">+{alerts.length - 3} autres</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Sentinel Button (inline in header) ───
const severityConfig = {
  critical: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', badge: 'destructive' as const },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', badge: 'secondary' as const },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10', badge: 'outline' as const },
};

function SentinelButton({ alerts, isLoading, onRefresh, onDismiss, lastFetched }: {
  alerts: SentinelAlert[];
  isLoading: boolean;
  onRefresh: () => void;
  onDismiss: (id: string) => void;
  lastFetched: Date | null;
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
            <Button
              variant="ghost" size="sm"
              className={cn("h-8 px-2 relative",
                criticalCount > 0 ? "text-destructive animate-pulse" :
                hasAlerts ? "text-amber-600" : "text-muted-foreground"
              )}
            >
              <Radar className="h-3.5 w-3.5" />
              {hasAlerts && (
                <span className={cn(
                  "absolute -top-1 -right-1 text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center",
                  criticalCount > 0 ? "bg-destructive text-destructive-foreground" : "bg-amber-500 text-white"
                )}>
                  {alerts.length > 9 ? '9+' : alerts.length}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {hasAlerts
              ? `IA Sentinelle : ${alerts.length} anomalie${alerts.length > 1 ? 's' : ''} détectée${alerts.length > 1 ? 's' : ''}`
              : 'IA Sentinelle — Aucune anomalie'
            }
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
            {lastFetched && (
              <span className="text-[9px] text-muted-foreground">
                {formatDistanceToNow(lastFetched, { addSuffix: true, locale: fr })}
              </span>
            )}
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
              <p className="text-xs mt-1">Vérification toutes les 5 min</p>
            </div>
          ) : (
            <div className="p-2 space-y-1.5">
              {alerts.map(alert => {
                const config = severityConfig[alert.severity];
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
    // Navigate to the entity linked to the task
    if (task.entity_type === 'lead' && task.entity_id) navigate(`/cockpit/leads/${task.entity_id}`);
    else if (task.entity_type === 'project' && task.entity_id) navigate(`/cockpit/projects/${task.entity_id}`);
    else if (task.lead_id) navigate(`/cockpit/leads/${task.lead_id}`);
    else if (task.project_id) navigate(`/cockpit/projects/${task.project_id}`);
  };

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={handleClick}>
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
              Tâche générée par l'IA
              {task.entity_type && <span> · Liée à: {task.entity_type}</span>}
              {task.ai_source && <span> · Source: {task.ai_source}</span>}
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
          <div key={opp.id}
            className="flex items-center justify-between py-1.5 px-1.5 rounded transition-colors group">
            <div className="min-w-0 cursor-pointer hover:bg-muted/50 flex-1" onClick={() => navigate('/cockpit/pipeline')}>
              <p className="text-xs font-medium truncate">{opp.title}</p>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="capitalize">{STAGE_LABELS[opp.stage] || opp.stage}</span>
                {opp.value_amount > 0 && <span>· {formatCurrency(opp.value_amount)}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(opp.updated_at), { locale: fr })}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost" size="sm"
                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); onSuggestFollowUp(opp.id); }}
                    disabled={suggestNextStep.isPending}
                  >
                    {suggestNextStep.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Zap className="h-3 w-3 text-primary" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>💡 Suggestion IA de relance</TooltipContent>
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

  if (isAI && !icons[type]) {
    return <span className="mt-0.5 flex-shrink-0"><Brain className="h-3.5 w-3.5 text-primary/70" /></span>;
  }
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
