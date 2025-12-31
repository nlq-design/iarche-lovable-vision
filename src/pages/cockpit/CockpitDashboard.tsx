import { useState } from 'react';
import { CockpitLayout } from '@/components/cockpit/CockpitLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  Target, 
  Calendar, 
  FolderKanban, 
  TrendingUp, 
  Clock,
  AlertCircle,
  CheckCircle2,
  Plus,
  FileText,
  Mail,
  Phone,
  Activity
} from 'lucide-react';
import { 
  useCockpitLeads, 
  useCockpitOpportunities, 
  useCockpitTasks,
  useCockpitBookings,
  useCockpitMeetingNotes,
  useCockpitActivityLog
} from '@/hooks/cockpit';
import { CreateTaskDialog } from '@/components/cockpit/dialogs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function CockpitDashboard() {
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const { stats: leadStats, isLoading: leadsLoading } = useCockpitLeads();
  const { stats: oppStats, isLoading: oppsLoading } = useCockpitOpportunities();
  const { tasks, stats: taskStats, isLoading: tasksLoading } = useCockpitTasks();
  const { stats: bookingStats, todayBookings, isLoading: bookingsLoading } = useCockpitBookings();
  const { stats: noteStats, isLoading: notesLoading } = useCockpitMeetingNotes();
  const { activities, isLoading: activitiesLoading } = useCockpitActivityLog();

  const isLoading = leadsLoading || oppsLoading || tasksLoading || bookingsLoading;

  // Get today's tasks, upcoming tasks (next 7 days), and backlog (no date)
  const today = new Date().toISOString().split('T')[0];
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const sevenDaysLimit = sevenDaysFromNow.toISOString().split('T')[0];

  // Tâches du jour
  const todayTasks = tasks?.filter(t => 
    t.due_date === today && t.status !== 'completed' && t.status !== 'cancelled'
  ).slice(0, 5) || [];
  
  // Tâches à venir (7 prochains jours, hors aujourd'hui)
  const upcomingTasks = tasks?.filter(t => 
    t.due_date && t.due_date > today && t.due_date <= sevenDaysLimit && 
    t.status !== 'completed' && t.status !== 'cancelled'
  ).slice(0, 5) || [];

  // Tâches sans date (backlog / Actions à faire)
  const backlogTasks = tasks?.filter(t => 
    !t.due_date && t.status !== 'completed' && t.status !== 'cancelled'
  ).slice(0, 5) || [];

  // Recent activities (last 10)
  const recentActivities = activities.slice(0, 8);

  const stats = [
    { label: 'Leads qualifiés', value: leadStats.qualified, icon: Users },
    { label: 'Opportunités actives', value: oppStats.total, icon: Target },
    { label: 'RDV aujourd\'hui', value: todayBookings?.length || 0, icon: Calendar },
    { label: 'Pipeline total', value: formatCurrency(oppStats.totalValue), icon: FolderKanban },
    { label: 'Tâches du jour', value: taskStats.dueToday, icon: Clock },
    { label: 'Notes de réunion', value: noteStats.thisWeek, icon: FileText },
  ];

  return (
    <CockpitLayout>
      <div className="p-5 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-foreground">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), 'EEEE d MMMM', { locale: fr })}
          </p>
        </div>

        {/* KPIs inline */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((stat) => (
            <Card key={stat.label} className="border shadow-sm">
              <CardContent className="p-3">
                {isLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <div className="flex items-center gap-2 sm:gap-3">
                    <stat.icon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-base sm:text-lg font-semibold truncate">{stat.value}</p>
                      <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Actions du jour */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Actions du jour
                </CardTitle>
                <CardDescription>
                  {taskStats.dueToday} tâches • {taskStats.overdue} en retard
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setTaskDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Tâche
              </Button>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : todayTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">Aucune tâche pour aujourd'hui</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              )}

              {/* Upcoming tasks section */}
              {upcomingTasks.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium text-muted-foreground mb-3">À venir (7 jours)</p>
                  <div className="space-y-2">
                    {upcomingTasks.map((task) => (
                      <TaskCard key={task.id} task={task} showDate />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions à faire (backlog sans date) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Actions à faire
              </CardTitle>
              <CardDescription>
                {backlogTasks.length} tâches sans échéance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : backlogTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">Aucune action en attente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {backlogTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        {/* Prochains RDV */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Prochains rendez-vous
            </CardTitle>
            <CardDescription>{todayBookings?.length || 0} RDV aujourd'hui</CardDescription>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !todayBookings || todayBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Calendar className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Aucun RDV aujourd'hui</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayBookings.slice(0, 4).map((booking: any) => (
                  <div key={booking.id} className="flex items-center justify-between p-2 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{booking.name}</p>
                        <p className="text-xs text-muted-foreground">{booking.company || booking.email}</p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {format(new Date(booking.start_time), 'HH:mm', { locale: fr })}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

        {/* Pipeline preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Aperçu Pipeline
            </CardTitle>
            <CardDescription>Valeur totale des opportunités en cours</CardDescription>
          </CardHeader>
          <CardContent>
            {oppsLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg">
                <div>
                  <p className="text-3xl font-bold">{formatCurrency(oppStats.totalValue)}</p>
                  <p className="text-sm text-muted-foreground">{oppStats.total} opportunités actives</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-muted-foreground">Pondéré</p>
                  <p className="text-xl font-bold">{formatCurrency(oppStats.weightedValue)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Log */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activité récente
            </CardTitle>
            <CardDescription>Dernières interactions</CardDescription>
          </CardHeader>
          <CardContent>
            {activitiesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune activité récente</p>
            ) : (
              <ScrollArea className="h-[240px] -mx-2 px-2">
                <div className="space-y-2 pr-2">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-2 rounded border bg-background">
                      <ActivityIcon type={activity.activity_type} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(activity.created_at!), 'dd/MM HH:mm', { locale: fr })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Stagnant entities alert */}
        <StagnantEntitiesWidget />

        <CreateTaskDialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen} />
      </div>
    </CockpitLayout>
  );
}

function LeadStatRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg border">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <Badge variant="secondary">{value}</Badge>
    </div>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    note_added: <FileText className="h-4 w-4 text-blue-500" />,
    status_changed: <Activity className="h-4 w-4 text-orange-500" />,
    task_created: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    email_sent: <Mail className="h-4 w-4 text-purple-500" />,
    call_logged: <Phone className="h-4 w-4 text-teal-500" />,
    meeting_scheduled: <Calendar className="h-4 w-4 text-primary" />,
  };
  return icons[type] || <Activity className="h-4 w-4 text-muted-foreground" />;
}

function TaskCard({ task, showDate }: { task: any; showDate?: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        {task.priority === 'high' || task.priority === 'urgent' ? (
          <AlertCircle className="h-4 w-4 text-destructive" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        )}
        <div>
          <p className="font-medium text-sm">{task.title}</p>
          <p className="text-xs text-muted-foreground capitalize">
            {task.task_type}
            {showDate && task.due_date && (
              <span className="ml-2">
                • {format(new Date(task.due_date), 'd MMM', { locale: fr })}
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {task.due_time && (
          <Badge variant="outline">{task.due_time.slice(0, 5)}</Badge>
        )}
        {task.ai_generated && (
          <Badge variant="secondary" className="text-xs">IA</Badge>
        )}
      </div>
    </div>
  );
}

function StagnantEntitiesWidget() {
  const { data: stagnantOpportunities = [], isLoading } = useQuery({
    queryKey: ['stagnant-opportunities'],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from('opportunities')
        .select('id, title, stage, updated_at')
        .lt('updated_at', sevenDaysAgo.toISOString())
        .not('stage', 'in', '(won,lost)')
        .order('updated_at', { ascending: true })
        .limit(5);
      
      if (error) return [];
      return data;
    },
  });

  if (isLoading || stagnantOpportunities.length === 0) return null;

  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <AlertCircle className="h-4 w-4" />
          Opportunités sans activité récente
        </CardTitle>
        <CardDescription className="text-amber-600/80 dark:text-amber-500/80">
          Ces opportunités n'ont pas eu d'activité depuis plus de 7 jours
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {stagnantOpportunities.map((opp: any) => (
            <div key={opp.id} className="flex items-center justify-between p-2 rounded border bg-background">
              <div>
                <p className="text-sm font-medium">{opp.title}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {opp.stage} • Màj {format(new Date(opp.updated_at), 'dd MMM', { locale: fr })}
                </p>
              </div>
              <Badge variant="outline" className="text-amber-600">Inactif</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
