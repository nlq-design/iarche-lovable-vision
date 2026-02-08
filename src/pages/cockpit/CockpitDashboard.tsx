// Cockpit Dashboard v4.0 — Fully Dynamic & Realtime
import { useState } from 'react';
import { CockpitLayout } from '@/components/cockpit/CockpitLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import {
  Users, Target, Calendar, FolderKanban, TrendingUp, Clock,
  AlertCircle, CheckCircle2, Plus, FileText, Mail, Phone,
  Activity, Wheat, ArrowRight, Sparkles,
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

export default function CockpitDashboard() {
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [harvestOpen, setHarvestOpen] = useState(false);
  const navigate = useNavigate();

  // Enable realtime subscriptions for all dashboard data
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

  // Filter: only human tasks + recent AI tasks (not overdue AI bulk)
  const relevantTasks = tasks?.filter(t =>
    t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'harvested'
  ) || [];

  const todayTasks = relevantTasks.filter(t => t.due_date === today).slice(0, 6);
  const upcomingTasks = relevantTasks.filter(t =>
    t.due_date && t.due_date > today && t.due_date <= sevenDaysLimit
  ).slice(0, 4);

  // Count overdue AI tasks for harvest banner
  const overdueAiCount = tasks?.filter(t =>
    t.ai_generated && t.due_date && t.due_date < today &&
    t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'harvested'
  ).length || 0;

  // Human overdue tasks (not AI)
  const humanOverdue = relevantTasks.filter(t =>
    t.due_date && t.due_date < today && !t.ai_generated
  ).length;

  // Filter activity: exclude bulk AI task_created
  const meaningfulActivities = activities.filter(a =>
    !(a.activity_type === 'task_created' && a.is_ai_generated)
  ).slice(0, 6);

  return (
    <CockpitLayout>
      <div className="p-4 sm:p-6 space-y-4 max-w-6xl mx-auto">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {format(new Date(), 'EEEE d MMMM', { locale: fr })}
            </h1>
            <p className="text-sm text-muted-foreground">
              {taskStats.dueToday} tâche{taskStats.dueToday > 1 ? 's' : ''} aujourd'hui
              {humanOverdue > 0 && <span className="text-destructive"> · {humanOverdue} en retard</span>}
              {(todayBookings?.length || 0) > 0 && ` · ${todayBookings!.length} RDV`}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setTaskDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Tâche
          </Button>
        </div>

        {/* Harvest banner — only if overdue AI tasks exist */}
        {overdueAiCount > 0 && (
          <Sheet open={harvestOpen} onOpenChange={setHarvestOpen}>
            <SheetTrigger asChild>
              <button className="w-full flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors text-left">
                <Wheat className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {overdueAiCount} tâche{overdueAiCount > 1 ? 's' : ''} IA à récolter
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Transformez-les en connaissance ou nouvelles actions
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-primary flex-shrink-0" />
              </button>
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
                <HarvestInterviewPanel />
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* KPIs — compact row */}
        <div className="grid gap-2 grid-cols-3 lg:grid-cols-6">
          <KpiCard icon={Users} value={leadStats.total} label="Leads" loading={isLoading} onClick={() => navigate('/cockpit/leads')} />
          <KpiCard icon={Target} value={oppStats.total} label="Opportunités" loading={isLoading} onClick={() => navigate('/cockpit/pipeline')} />
          <KpiCard icon={Calendar} value={todayBookings?.length || 0} label="RDV" loading={isLoading} onClick={() => navigate('/cockpit/agenda')} />
          <KpiCard icon={FolderKanban} value={formatCurrency(oppStats.totalValue)} label="Pipeline" loading={isLoading} onClick={() => navigate('/cockpit/pipeline')} />
          <KpiCard icon={TrendingUp} value={formatCurrency(oppStats.weightedValue)} label="Pondéré" loading={isLoading} />
          <KpiCard icon={FileText} value={noteStats.thisWeek} label="Notes sem." loading={isLoading} onClick={() => navigate('/cockpit/transcriptions')} />
        </div>

        {/* Main content grid */}
        <div className="grid gap-4 lg:grid-cols-5">
          {/* Left column — Tasks (wider) */}
          <div className="lg:col-span-3 space-y-4">
            {/* Today's tasks */}
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Aujourd'hui
                  {todayTasks.length > 0 && (
                    <Badge variant="secondary" className="text-xs ml-1">{todayTasks.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {tasksLoading ? (
                  <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : todayTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Aucune tâche pour aujourd'hui</p>
                ) : (
                  <div className="space-y-1.5">
                    {todayTasks.map(task => <TaskRow key={task.id} task={task} />)}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming */}
            {upcomingTasks.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    À venir
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1.5">
                    {upcomingTasks.map(task => <TaskRow key={task.id} task={task} showDate />)}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pipeline + Stagnant — merged */}
            <PipelineCard oppStats={oppStats} isLoading={oppsLoading} />
          </div>

          {/* Right column — RDV + Activity */}
          <div className="lg:col-span-2 space-y-4">
            {/* Bookings */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Rendez-vous
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {bookingsLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : !todayBookings || todayBookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Aucun RDV aujourd'hui</p>
                ) : (
                  <div className="space-y-1.5">
                    {todayBookings.slice(0, 4).map((b: any) => (
                      <div key={b.id} className="flex items-center justify-between py-1.5">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{b.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{b.company || b.email}</p>
                        </div>
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {format(new Date(b.start_time), 'HH:mm')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  Activité récente
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {activitiesLoading ? (
                  <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
                ) : meaningfulActivities.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucune activité</p>
                ) : (
                  <div className="space-y-1">
                    {meaningfulActivities.map(a => (
                      <div key={a.id} className="flex items-start gap-2 py-1.5">
                        <ActivityIcon type={a.activity_type} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{a.title}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatDistanceToNow(new Date(a.created_at!), { addSuffix: true, locale: fr })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stagnant opps */}
            <StagnantWidget />
          </div>
        </div>

        <CreateTaskDialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen} />
      </div>
    </CockpitLayout>
  );
}

// ---------- Sub-components ----------

function KpiCard({ icon: Icon, value, label, loading, onClick }: {
  icon: any; value: string | number; label: string; loading: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center p-2.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-center"
      disabled={!onClick}
    >
      {loading ? (
        <Skeleton className="h-8 w-full" />
      ) : (
        <>
          <Icon className="h-3.5 w-3.5 text-muted-foreground mb-1" />
          <p className="text-base font-semibold leading-tight">{value}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
        </>
      )}
    </button>
  );
}

function TaskRow({ task, showDate }: { task: any; showDate?: boolean }) {
  const provenance = task.leads?.name || task.leads?.company || task.projects?.name || '';

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors group">
      <div className="flex-shrink-0">
        {task.priority === 'high' || task.priority === 'urgent' ? (
          <div className="h-2 w-2 rounded-full bg-destructive" />
        ) : (
          <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{task.title}</p>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {showDate && task.due_date && (
            <span>{format(new Date(task.due_date), 'd MMM', { locale: fr })}</span>
          )}
          {provenance && <span className="truncate">{provenance}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {task.due_time && <span className="text-[11px] text-muted-foreground">{task.due_time.slice(0, 5)}</span>}
        {task.ai_generated && <Badge variant="secondary" className="text-[10px] px-1 py-0">IA</Badge>}
      </div>
    </div>
  );
}

function PipelineCard({ oppStats, isLoading }: { oppStats: any; isLoading: boolean }) {
  const navigate = useNavigate();
  return (
    <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate('/cockpit/pipeline')}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <Skeleton className="h-12 w-full" />
        ) : (
          <div className="flex items-baseline gap-4">
            <div>
              <p className="text-2xl font-bold">{formatCurrency(oppStats.totalValue)}</p>
              <p className="text-xs text-muted-foreground">{oppStats.total} opportunités</p>
            </div>
            <Separator orientation="vertical" className="h-8" />
            <div>
              <p className="text-lg font-semibold text-muted-foreground">{formatCurrency(oppStats.weightedValue)}</p>
              <p className="text-xs text-muted-foreground">pondéré</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
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
        .not('stage', 'in', '(won,lost)')
        .order('updated_at', { ascending: true })
        .limit(4);
      return data || [];
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  if (isLoading || stagnant.length === 0) return null;

  return (
    <Card className="border-destructive/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          Inactif +7j
          <Badge variant="destructive" className="text-[10px] ml-auto">{stagnant.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-1">
        {stagnant.map((opp: any) => (
          <div key={opp.id} className="flex items-center justify-between py-1 cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1" onClick={() => navigate('/cockpit/pipeline')}>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{opp.title}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{opp.stage}</p>
            </div>
            <span className="text-[10px] text-muted-foreground flex-shrink-0">
              {formatDistanceToNow(new Date(opp.updated_at), { locale: fr })}
            </span>
          </div>
        ))}
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
  };
  return <span className="mt-0.5">{icons[type] || <Activity className="h-3.5 w-3.5 text-muted-foreground" />}</span>;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value);
}
