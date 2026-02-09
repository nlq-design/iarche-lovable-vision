// Cockpit Dashboard v5.1 — Command Center with AI Logic
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
import {
  Users, Target, Calendar, TrendingUp, Clock,
  CheckCircle2, Plus, FileText, Mail, Phone,
  Activity, Wheat, ArrowRight, Sparkles, AlertCircle,
  ChevronRight, Radar, Brain, RefreshCw, Loader2,
  AlertTriangle, Info, XCircle, X,
} from 'lucide-react';
import {
  useCockpitLeads, useCockpitOpportunities, useCockpitTasks,
  useCockpitBookings, useCockpitMeetingNotes, useCockpitActivityLog,
} from '@/hooks/cockpit';
import { useDashboardRealtime } from '@/hooks/cockpit/useDashboardRealtime';
import { useCockpitAICopilot } from '@/hooks/cockpit/useCockpitAICopilot';
import { useAISentinel, SentinelAlert } from '@/hooks/cockpit/useAISentinel';
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
  const { stats: leadStats, isLoading: leadsLoading } = useCockpitLeads();
  const { stats: oppStats, isLoading: oppsLoading } = useCockpitOpportunities();
  const { tasks, stats: taskStats, isLoading: tasksLoading } = useCockpitTasks();
  const { todayBookings, isLoading: bookingsLoading } = useCockpitBookings();
  const { stats: noteStats } = useCockpitMeetingNotes();
  const { activities, isLoading: activitiesLoading } = useCockpitActivityLog();

  // ─── AI hooks ───
  const { morningBrief } = useCockpitAICopilot();
  const { alerts: sentinelAlerts, isLoading: sentinelLoading, refresh: refreshSentinel, dismissAlert } = useAISentinel();

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
    !NOISE_ACTIVITY_TYPES.includes(a.activity_type) && !a.is_ai_generated
  ).slice(0, 12);

  // ─── Conditional AI: determine what's important ───
  const criticalAlerts = sentinelAlerts.filter(a => a.severity === 'critical');
  const warningAlerts = sentinelAlerts.filter(a => a.severity === 'warning');
  const hasUrgentContext = humanOverdue > 0 || criticalAlerts.length > 0 || overdueAiCount > 10;

  // Auto-fetch morning brief on mount (once per session)
  const [briefFetched, setBriefFetched] = useState(false);
  useEffect(() => {
    if (!briefFetched && !morningBrief.isPending && !morningBrief.data) {
      // Delay to let dashboard data load first
      const timer = setTimeout(() => {
        morningBrief.mutate();
        setBriefFetched(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [briefFetched, morningBrief]);

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
                  {/* Smart one-liner based on context */}
                  <p className="text-sm font-semibold truncate">
                    {getSmartHeadline({
                      humanOverdue,
                      criticalAlerts: criticalAlerts.length,
                      todayTasks: todayTasks.length,
                      todayBookings: todayBookings?.length || 0,
                      overdueAi: overdueAiCount,
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
                    {oppStats.weightedValue > 0 && (
                      <span className="text-muted-foreground"> ({formatCurrency(oppStats.weightedValue)} pond.)</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Right: action buttons */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
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
                  <TooltipContent>Morning Brief IA</TooltipContent>
                </Tooltip>

                {/* Sentinel */}
                <SentinelButton
                  alerts={sentinelAlerts}
                  isLoading={sentinelLoading}
                  onRefresh={refreshSentinel}
                  onDismiss={dismissAlert}
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
                        <TooltipContent>{overdueAiCount} tâches IA à récolter</TooltipContent>
                      </Tooltip>
                    </SheetTrigger>
                    <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                      <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                          <Wheat className="h-5 w-5" /> Récolte IA
                        </SheetTitle>
                        <SheetDescription>Transformez les tâches IA en retard en actions</SheetDescription>
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

          {/* Row 2: Morning Brief expanded (conditional) */}
          {briefOpen && (
            <div className="border-t bg-card/50 px-4 py-3">
              <div className="max-w-[1600px] mx-auto">
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
                    Erreur lors du briefing — <Button variant="link" size="sm" className="px-0 h-auto" onClick={() => morningBrief.mutate()}>Réessayer</Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Chargement...</p>
                )}
              </div>
            </div>
          )}

          {/* Row 3: Critical sentinel alerts inline (conditional) */}
          {criticalAlerts.length > 0 && !briefOpen && (
            <div className="border-t bg-destructive/5 px-4 py-1.5">
              <div className="max-w-[1600px] mx-auto flex items-center gap-3 overflow-x-auto">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                {criticalAlerts.slice(0, 3).map(alert => (
                  <button
                    key={alert.id}
                    className="text-xs text-destructive hover:underline truncate flex-shrink-0"
                    onClick={() => {
                      const routes: Record<string, string> = {
                        lead: `/cockpit/leads/${alert.entity_id}`,
                        opportunity: `/cockpit/leads`,
                        project: `/cockpit/projects/${alert.entity_id}`,
                      };
                      navigate(routes[alert.entity_type] || '/cockpit');
                    }}
                  >
                    {alert.entity_name}: {alert.question}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── COMMAND CENTER GRID ─── */}
        <div className="flex-1 overflow-hidden p-3 sm:p-4">
          <div className="h-full max-w-[1600px] mx-auto grid gap-3 grid-cols-1 lg:grid-cols-12">

            {/* ─── COL 1: Tâches + RDV ─── */}
            <div className="lg:col-span-4 flex flex-col gap-3 min-h-0">
              <Card className="flex flex-col min-h-0 flex-1">
                <CardHeader className="pb-1.5 pt-3 px-3 flex-shrink-0 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Aujourd'hui
                    {todayTasks.length > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">{todayTasks.length}</Badge>}
                    {humanOverdue > 0 && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{humanOverdue} retard</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-3 pb-2 flex-1 min-h-0">
                  <ScrollArea className="h-full">
                    {tasksLoading ? (
                      <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
                    ) : todayTasks.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-6 text-center">Aucune tâche pour aujourd'hui</p>
                    ) : (
                      <div className="space-y-0.5">{todayTasks.map(task => <TaskRow key={task.id} task={task} />)}</div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="flex flex-col min-h-0 flex-1">
                <CardHeader className="pb-1.5 pt-3 px-3 flex-shrink-0">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    À venir
                    {upcomingTasks.length > 0 && <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-1">{upcomingTasks.length}</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-3 pb-2 flex-1 min-h-0">
                  <ScrollArea className="h-full">
                    {upcomingTasks.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">RAS</p>
                    ) : (
                      <div className="space-y-0.5">{upcomingTasks.map(task => <TaskRow key={task.id} task={task} showDate />)}</div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="flex-shrink-0">
                <CardHeader className="pb-1.5 pt-3 px-3">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Rendez-vous
                    {(todayBookings?.length || 0) > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">{todayBookings!.length}</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-3 pb-2">
                  {bookingsLoading ? <Skeleton className="h-10 w-full" /> : !todayBookings || todayBookings.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-3 text-center">Aucun RDV</p>
                  ) : (
                    <div className="space-y-1">
                      {todayBookings.slice(0, 3).map((b: any) => (
                        <div key={b.id} className="flex items-center justify-between py-1">
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{b.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{b.company || b.email}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px] flex-shrink-0 font-mono">
                            {format(new Date(b.start_time), 'HH:mm')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ─── COL 2: Pipeline ─── */}
            <div className="lg:col-span-4 flex flex-col gap-3 min-h-0">
              <Card className="flex-shrink-0 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate('/cockpit/pipeline')}>
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

              <div className="grid grid-cols-3 gap-2 flex-shrink-0">
                <MiniStat icon={Users} label="Leads" value={leadStats.total} loading={leadsLoading} onClick={() => navigate('/cockpit/leads')} />
                <MiniStat icon={Target} label="Opps" value={oppStats.total} loading={oppsLoading} onClick={() => navigate('/cockpit/pipeline')} />
                <MiniStat icon={FileText} label="Notes" value={noteStats.thisWeek} subtitle="sem." loading={false} onClick={() => navigate('/cockpit/transcriptions')} />
              </div>

              <StagnantWidget />
            </div>

            {/* ─── COL 3: Activité ─── */}
            <div className="lg:col-span-4 flex flex-col min-h-0">
              <Card className="flex flex-col flex-1 min-h-0">
                <CardHeader className="pb-1.5 pt-3 px-3 flex-shrink-0">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" /> Activité récente
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-3 pb-2 flex-1 min-h-0">
                  <ScrollArea className="h-full">
                    {activitiesLoading ? (
                      <div className="space-y-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
                    ) : meaningfulActivities.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8">Aucune activité</p>
                    ) : (
                      <div className="space-y-0.5">
                        {meaningfulActivities.map(a => (
                          <div key={a.id} className="flex items-start gap-2 py-1.5 px-1.5 rounded hover:bg-muted/50 transition-colors">
                            <ActivityIcon type={a.activity_type} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{a.title}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {formatDistanceToNow(new Date(a.created_at!), { addSuffix: true, locale: fr })}
                              </p>
                            </div>
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

// ─── AI Smart Headline ───

function getSmartHeadline(ctx: {
  humanOverdue: number;
  criticalAlerts: number;
  todayTasks: number;
  todayBookings: number;
  overdueAi: number;
}): string {
  // Priority-based conditional logic
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
    return `🌾 ${ctx.overdueAi} tâches IA à récolter — pensez à les traiter`;
  }
  if (ctx.todayBookings > 0) {
    return `${ctx.todayBookings} rendez-vous aujourd'hui`;
  }
  return 'Tout est calme — bon moment pour prospecter';
}

// ─── Sentinel Button (inline in header) ───

const severityConfig = {
  critical: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', badge: 'destructive' as const },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', badge: 'secondary' as const },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10', badge: 'outline' as const },
};

function SentinelButton({ alerts, isLoading, onRefresh, onDismiss }: {
  alerts: SentinelAlert[];
  isLoading: boolean;
  onRefresh: () => void;
  onDismiss: (id: string) => void;
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
          <TooltipContent>
            {hasAlerts ? `${alerts.length} point${alerts.length > 1 ? 's' : ''} Sentinelle` : 'Sentinelle — RAS'}
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
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
          </Button>
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
                            onClick={() => {
                              setOpen(false);
                              const routes: Record<string, string> = {
                                lead: `/cockpit/leads/${alert.entity_id}`,
                                opportunity: '/cockpit/leads',
                                project: `/cockpit/projects/${alert.entity_id}`,
                              };
                              navigate(routes[alert.entity_type] || '/cockpit');
                            }}>
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

function TaskRow({ task, showDate }: { task: any; showDate?: boolean }) {
  const provenance = task.leads?.name || task.leads?.company || task.projects?.name || '';
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors">
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
        {task.ai_generated && <Badge variant="secondary" className="text-[9px] px-1 py-0">IA</Badge>}
      </div>
    </div>
  );
}

function StagnantWidget() {
  const navigate = useNavigate();
  const { data: stagnant = [], isLoading } = useQuery({
    queryKey: ['stagnant-opportunities'],
    queryFn: async () => {
      const ago = new Date();
      ago.setDate(ago.getDate() - 7);
      const { data } = await supabase
        .from('opportunities')
        .select('id, title, stage, updated_at')
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
    <Card className="border-destructive/20 flex-1 min-h-0 flex flex-col">
      <CardHeader className="pb-1.5 pt-3 px-3 flex-shrink-0">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-destructive flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5" /> Inactif +7j
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 ml-auto">{stagnant.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-2 flex-1 min-h-0">
        <ScrollArea className="h-full">
          {stagnant.map((opp: any) => (
            <div key={opp.id}
              className="flex items-center justify-between py-1.5 px-1.5 cursor-pointer hover:bg-muted/50 rounded transition-colors"
              onClick={() => navigate('/cockpit/pipeline')}>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{opp.title}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{STAGE_LABELS[opp.stage] || opp.stage}</p>
              </div>
              <span className="text-[10px] text-muted-foreground flex-shrink-0">
                {formatDistanceToNow(new Date(opp.updated_at), { locale: fr })}
              </span>
            </div>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    note_added: <FileText className="h-3.5 w-3.5 text-primary" />,
    status_changed: <Activity className="h-3.5 w-3.5 text-accent-foreground" />,
    task_created: <CheckCircle2 className="h-3.5 w-3.5 text-primary" />,
    email_sent: <Mail className="h-3.5 w-3.5 text-primary" />,
    call_logged: <Phone className="h-3.5 w-3.5 text-primary" />,
    meeting_scheduled: <Calendar className="h-3.5 w-3.5 text-primary" />,
    new_lead: <Users className="h-3.5 w-3.5 text-emerald-500" />,
    new_opportunity: <Target className="h-3.5 w-3.5 text-amber-500" />,
    new_transcription: <FileText className="h-3.5 w-3.5 text-blue-500" />,
    new_booking: <Calendar className="h-3.5 w-3.5 text-violet-500" />,
    new_generated_document: <FileText className="h-3.5 w-3.5 text-orange-500" />,
    new_project: <TrendingUp className="h-3.5 w-3.5 text-teal-500" />,
    note: <FileText className="h-3.5 w-3.5 text-primary" />,
  };
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
