import { CockpitLayout } from '@/components/cockpit/CockpitLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Target, 
  Calendar, 
  FolderKanban, 
  TrendingUp, 
  Clock,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

// Placeholder data - will be replaced with real data from hooks
const stats = [
  { label: 'Leads qualifiés', value: 12, change: '+3', icon: Users, trend: 'up' },
  { label: 'Opportunités actives', value: 8, change: '+2', icon: Target, trend: 'up' },
  { label: 'RDV cette semaine', value: 5, change: '0', icon: Calendar, trend: 'neutral' },
  { label: 'Projets en cours', value: 4, change: '+1', icon: FolderKanban, trend: 'up' },
];

const todayTasks = [
  { id: 1, title: 'Relancer Acme Corp', type: 'call', priority: 'high', due: '10:00' },
  { id: 2, title: 'Préparer démo TechStart', type: 'meeting', priority: 'medium', due: '14:00' },
  { id: 3, title: 'Envoyer proposition Globex', type: 'email', priority: 'high', due: '16:00' },
];

const upcomingMeetings = [
  { id: 1, title: 'Call découverte - StartupXYZ', time: '14:00', contact: 'Marie Dupont' },
  { id: 2, title: 'Démo produit - TechCorp', time: '16:30', contact: 'Jean Martin' },
];

export default function CockpitDashboard() {
  return (
    <CockpitLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Bonjour 👋</h1>
          <p className="text-muted-foreground">Voici votre aperçu commercial du jour</p>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <Badge 
                    variant={stat.trend === 'up' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {stat.change}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Actions du jour */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Actions du jour
              </CardTitle>
              <CardDescription>Vos tâches prioritaires</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todayTasks.map((task) => (
                  <div 
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {task.priority === 'high' ? (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{task.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{task.type}</p>
                      </div>
                    </div>
                    <Badge variant="outline">{task.due}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* RDV à venir */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                RDV à venir
              </CardTitle>
              <CardDescription>Vos prochains rendez-vous</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingMeetings.map((meeting) => (
                  <div 
                    key={meeting.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{meeting.title}</p>
                      <p className="text-xs text-muted-foreground">{meeting.contact}</p>
                    </div>
                    <Badge variant="secondary">{meeting.time}</Badge>
                  </div>
                ))}
              </div>
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
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg">
              <div>
                <p className="text-3xl font-bold">125 000 €</p>
                <p className="text-sm text-muted-foreground">8 opportunités actives</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-green-600">+15%</p>
                <p className="text-xs text-muted-foreground">vs mois dernier</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CockpitLayout>
  );
}
