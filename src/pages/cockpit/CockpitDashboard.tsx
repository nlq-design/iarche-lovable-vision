// Cockpit Dashboard v5.0 — Command Center
import { useState } from 'react';
import { CockpitLayout } from '@/components/cockpit/CockpitLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Users, Target, Calendar, TrendingUp, Clock,
  CheckCircle2, Plus, FileText, Mail, Phone,
  Activity, Wheat, ArrowRight, Sparkles, AlertCircle,
  ChevronRight,
} from 'lucide-react';
import {
  useCockpitLeads, useCockpitOpportunities, useCockpitTasks,
  useCockpitBookings, useCockpitMeetingNotes, useCockpitActivityLog,
} from '@/hooks/cockpit';
import { useDashboardRealtime } from '@/hooks/cockpit/useDashboardRealtime';
import { CreateTaskDialog } from '@/components/cockpit/dialogs';
import { HarvestInterviewPanel } from '@/components/cockpit/HarvestInterviewPanel';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();

  useDashboardRealtime();

  const { stats: leadStats, isLoading: leadsLoading } = useCockpitLeads();
  const { stats: oppStats, isLoading: oppsLoading } = useCockpitOpportunities();
  const { tasks, stats: taskStats, isLoading: tasksLoading } = useCockpitTasks();
  const { todayBookings, isLoading: bookingsLoading } = useCockpitBookings();
  const { stats: noteStats } = useCockpitMeetingNotes();
  const { activities, isLoading: activitiesLoading } = useCockpitActivityLog();

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
  ).slice(0, 10);

  return (
    <CockpitLayout>
      <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">

        {/* ─── BANDE IA ─── */}
        <div className="flex-shrink-0 border-b bg-muted/30 px-4 py-2.5">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
            {/* Left: date + summary */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold capitalize">
                    {format(new Date(), 'EEEE d MMMM', { locale: fr })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {taskStats.dueToday > 0
                      ? `${taskStats.dueToday} tâche${taskStats.dueToday > 1 ? 's' : ''}`
                      : 'Aucune tâche'}
                    {humanOverdue > 0 && <span className="text-destructive font-medium"> · {humanOverdue} en retard</span>}
                    {(todayBookings?.length || 0) > 0 && ` · ${todayBookings!.length} RDV`}
                    {' · '}
                    <span className="cursor-pointer hover:text-foreground" onClick={() => navigate('/cockpit/leads')}>
                      {leadStats.total} leads
                    </span>
                    {' · '}
                    <span className="cursor-pointer hover:text-foreground" onClick={() => navigate('/cockpit/pipeline')}>
                      {formatCurrency(oppStats.totalValue)} pipeline
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Harvest badge */}
              {overdueAiCount > 0 && (
                <Sheet open={harvestOpen} onOpenChange={setHarvestOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10">
                      <Wheat className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{overdueAiCount} à récolter</span>
                      <span className="sm:hidden">{overdueAiCount}</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle className="flex items-center gap-2">
                        <Wheat className="h-5 w-5" />
                        Récolte des tâches IA
                      </SheetTitle>
                      <SheetDescription>
                        Transformez les tâches IA en retard en connaissance ou nouvelles actions
                      </SheetDescription>
                    </SheetHeader>
                    <div className="mt-4">
                      <HarvestInterviewPanel autoStart />
                    </div>
                  </SheetContent>
                </Sheet>
              )}

              <Button size="sm" variant="outline" onClick={() => setTaskDialogOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Tâche
              </Button>
            </div>
          </div>
        </div>

        {/* ─── COMMAND CENTER GRID ─── */}
        <div className="flex-1 overflow-hidden p-3 sm:p-4">
          <div className="h-full max-w-[1600px] mx-auto grid gap-3 grid-cols-1 lg:grid-cols-12 grid-rows-[auto_1fr]">

            {/* ─── COL 1: Tâches + RDV ─── */}
            <div className="lg:col-span-4 flex flex-col gap-3 min-h-0">
              {/* Today's tasks */}
              <Card className="flex flex-col min-h-0 flex-1">
                <CardHeader className="pb-1.5 pt-3 px-3 flex-shrink-0 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Aujourd'hui
                    {todayTasks.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">{todayTasks.length}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-3 pb-2 flex-1 min-h-0">
                  <ScrollArea className="h-full">
                    {tasksLoading ? (
                      <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
                    ) : todayTasks.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-6 text-center">Aucune tâche pour aujourd'hui</p>
                    ) : (
                      <div className="space-y-0.5">
                        {todayTasks.map(task => <TaskRow key={task.id} task={task} />)}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Upcoming */}
              <Card className="flex flex-col min-h-0 flex-1">
                <CardHeader className="pb-1.5 pt-3 px-3 flex-shrink-0">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    À venir
                    {upcomingTasks.length > 0 && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-1">{upcomingTasks.length}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-3 pb-2 flex-1 min-h-0">
                  <ScrollArea className="h-full">
                    {upcomingTasks.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">RAS</p>
                    ) : (
                      <div className="space-y-0.5">
                        {upcomingTasks.map(task => <TaskRow key={task.id} task={task} showDate />)}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* RDV */}
              <Card className="flex-shrink-0">
                <CardHeader className="pb-1.5 pt-3 px-3">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Rendez-vous
                    {(todayBookings?.length || 0) > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">{todayBookings!.length}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-3 pb-2">
                  {bookingsLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : !todayBookings || todayBookings.length === 0 ? (
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
              {/* Pipeline summary */}
              <Card className="flex-shrink-0 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate('/cockpit/pipeline')}>
                <CardHeader className="pb-1.5 pt-3 px-3">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Pipeline
                    <ChevronRight className="h-3 w-3 ml-auto" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-3 pb-3">
                  {isLoading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : (
                    <>
                      <div className="flex items-baseline gap-2 mb-3">
                        <p className="text-2xl font-bold tracking-tight">{formatCurrency(oppStats.totalValue)}</p>
                        <p className="text-sm text-muted-foreground">
                          · {formatCurrency(oppStats.weightedValue)} pondéré
                        </p>
                      </div>

                      {/* Mini Kanban bar */}
                      <div className="flex gap-1 h-2 rounded-full overflow-hidden mb-2.5">
                        {['lead', 'r1', 'r2', 'pause'].map(stage => {
                          const count = oppStats.byStage?.[stage]?.count || 0;
                          const total = oppStats.total || 1;
                          return (
                            <div
                              key={stage}
                              className={`transition-all ${stage === 'lead' ? 'bg-blue-500' : stage === 'r1' ? 'bg-amber-500' : stage === 'r2' ? 'bg-orange-500' : 'bg-muted-foreground/30'}`}
                              style={{ width: `${Math.max((count / total) * 100, 2)}%` }}
                            />
                          );
                        })}
                      </div>

                      {/* Stage breakdown */}
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

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-2 flex-shrink-0">
                <MiniStat
                  icon={Users} label="Leads" value={leadStats.total}
                  loading={leadsLoading} onClick={() => navigate('/cockpit/leads')}
                />
                <MiniStat
                  icon={Target} label="Opps" value={oppStats.total}
                  loading={oppsLoading} onClick={() => navigate('/cockpit/pipeline')}
                />
                <MiniStat
                  icon={FileText} label="Notes" value={noteStats.thisWeek}
                  subtitle="sem." loading={false} onClick={() => navigate('/cockpit/transcriptions')}
                />
              </div>

              {/* Stagnant */}
              <StagnantWidget />
            </div>

            {/* ─── COL 3: Activité ─── */}
            <div className="lg:col-span-4 flex flex-col min-h-0">
              <Card className="flex flex-col flex-1 min-h-0">
                <CardHeader className="pb-1.5 pt-3 px-3 flex-shrink-0">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" />
                    Activité récente
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

// ─── Sub-components ───

function MiniStat({ icon: Icon, label, value, subtitle, loading, onClick }: {
  icon: any; label: string; value: string | number; subtitle?: string; loading: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center p-2.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-center"
      disabled={!onClick}
    >
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
          {showDate && task.due_date && (
            <span className="font-medium">{format(new Date(task.due_date), 'd MMM', { locale: fr })}</span>
          )}
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
    refetchOnWindowFocus: true,
  });

  if (isLoading || stagnant.length === 0) return null;

  return (
    <Card className="border-destructive/20 flex-1 min-h-0 flex flex-col">
      <CardHeader className="pb-1.5 pt-3 px-3 flex-shrink-0">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-destructive flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5" />
          Inactif +7j
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 ml-auto">{stagnant.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-2 flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="space-y-0.5">
            {stagnant.map((opp: any) => (
              <div
                key={opp.id}
                className="flex items-center justify-between py-1.5 px-1.5 cursor-pointer hover:bg-muted/50 rounded transition-colors"
                onClick={() => navigate('/cockpit/pipeline')}
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{opp.title}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{STAGE_LABELS[opp.stage] || opp.stage}</p>
                </div>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">
                  {formatDistanceToNow(new Date(opp.updated_at), { locale: fr })}
                </span>
              </div>
            ))}
          </div>
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
