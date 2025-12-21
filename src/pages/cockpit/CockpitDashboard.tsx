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

export default function CockpitDashboard() {
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const { stats: leadStats, isLoading: leadsLoading } = useCockpitLeads();
  const { stats: oppStats, isLoading: oppsLoading } = useCockpitOpportunities();
  const { tasks, stats: taskStats, isLoading: tasksLoading } = useCockpitTasks();
  const { stats: bookingStats, todayBookings, isLoading: bookingsLoading } = useCockpitBookings();
  const { stats: noteStats, isLoading: notesLoading } = useCockpitMeetingNotes();
  const { activities, isLoading: activitiesLoading } = useCockpitActivityLog();

  const isLoading = leadsLoading || oppsLoading || tasksLoading || bookingsLoading;

  // Get today's tasks
  const today = new Date().toISOString().split('T')[0];
  const todayTasks = tasks?.filter(t => 
    t.due_date === today && t.status !== 'completed' && t.status !== 'cancelled'
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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Bonjour 👋</h1>
          <p className="text-muted-foreground">
            Voici votre aperçu commercial du {format(new Date(), 'EEEE d MMMM', { locale: fr })}
          </p>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold">{stat.value}</div>
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
                    <div 
                      key={task.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {task.priority === 'high' || task.priority === 'urgent' ? (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{task.title}</p>
                          <p className="text-xs text-muted-foreground capitalize">{task.task_type}</p>
                        </div>
                      </div>
                      {task.due_time && (
                        <Badge variant="outline">{task.due_time.slice(0, 5)}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Leads */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Répartition des leads
              </CardTitle>
              <CardDescription>{leadStats.total} leads au total</CardDescription>
            </CardHeader>
            <CardContent>
              {leadsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <LeadStatRow label="Nouveaux" value={leadStats.new} color="bg-blue-500" />
                  <LeadStatRow label="Contactés" value={leadStats.contacted} color="bg-yellow-500" />
                  <LeadStatRow label="Qualifiés" value={leadStats.qualified} color="bg-green-500" />
                  <LeadStatRow label="Convertis" value={leadStats.converted} color="bg-purple-500" />
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
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-2 rounded border">
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
