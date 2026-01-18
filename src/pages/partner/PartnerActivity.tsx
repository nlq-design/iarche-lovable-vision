import { PartnerLayout } from '@/components/partner/PartnerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  usePartnerActivityFeed, 
  usePartnerActivityStats 
} from '@/hooks/partner/usePartnerActivityFeed';
import { 
  Activity, 
  MessageSquare, 
  Clock, 
  FileAudio, 
  UserPlus, 
  FolderPlus,
  Filter
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const activityIcons: Record<string, React.ReactNode> = {
  transcription: <FileAudio className="h-4 w-4" />,
  comment: <MessageSquare className="h-4 w-4" />,
  time_entry: <Clock className="h-4 w-4" />,
  lead_created: <UserPlus className="h-4 w-4" />,
  project_created: <FolderPlus className="h-4 w-4" />,
};

const activityColors: Record<string, string> = {
  transcription: 'bg-purple-100 text-purple-600',
  comment: 'bg-blue-100 text-blue-600',
  time_entry: 'bg-orange-100 text-orange-600',
  lead_created: 'bg-green-100 text-green-600',
  project_created: 'bg-indigo-100 text-indigo-600',
};

const activityLabels: Record<string, string> = {
  transcription: 'Transcription',
  comment: 'Commentaire',
  time_entry: 'Saisie de temps',
  lead_created: 'Lead créé',
  project_created: 'Projet créé',
};

export default function PartnerActivity() {
  const [filter, setFilter] = useState<string>('');
  
  const { data: activities, isLoading } = usePartnerActivityFeed({
    activityTypes: filter ? [filter] : undefined,
  });
  const { data: stats } = usePartnerActivityStats();

  const statCards = [
    { label: 'Total', value: stats?.total ?? 0, icon: Activity },
    { label: 'Transcriptions', value: stats?.transcriptions ?? 0, icon: FileAudio },
    { label: 'Commentaires', value: stats?.comments ?? 0, icon: MessageSquare },
    { label: 'Temps', value: stats?.timeEntries ?? 0, icon: Clock },
    { label: 'Leads', value: stats?.leadsCreated ?? 0, icon: UserPlus },
    { label: 'Projets', value: stats?.projectsCreated ?? 0, icon: FolderPlus },
  ];

  return (
    <PartnerLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Mon activité
          </h1>
          <p className="text-muted-foreground">
            Historique de toutes vos actions
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {statCards.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-3 text-center">
                <stat.icon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Flux d'activité</CardTitle>
                <CardDescription>
                  Vos actions récentes par ordre chronologique
                </CardDescription>
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Tous les types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tous les types</SelectItem>
                  <SelectItem value="transcription">Transcriptions</SelectItem>
                  <SelectItem value="comment">Commentaires</SelectItem>
                  <SelectItem value="time_entry">Saisies de temps</SelectItem>
                  <SelectItem value="lead_created">Leads créés</SelectItem>
                  <SelectItem value="project_created">Projets créés</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-start gap-4">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-5 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !activities || activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Activity className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">Aucune activité</p>
                <p className="text-sm">Vos actions apparaîtront ici</p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                
                <div className="space-y-6">
                  {activities.map((activity) => (
                    <div key={activity.id} className="relative flex items-start gap-4 pl-10">
                      {/* Timeline dot */}
                      <div className={`absolute left-0 p-2 rounded-full ${activityColors[activity.activity_type] || 'bg-gray-100 text-gray-600'}`}>
                        {activityIcons[activity.activity_type] || <Activity className="h-4 w-4" />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {activityLabels[activity.activity_type] || activity.activity_type}
                          </Badge>
                          {activity.entity_type && (
                            <Badge variant="secondary" className="text-xs capitalize">
                              {activity.entity_type}
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium">{activity.title}</p>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {activity.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(activity.created_at), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PartnerLayout>
  );
}
