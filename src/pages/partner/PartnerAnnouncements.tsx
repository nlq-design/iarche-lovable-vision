import { PartnerLayout } from '@/components/partner/PartnerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, Pin, Calendar } from 'lucide-react';
import { usePartnerAnnouncements } from '@/hooks/partner/usePartnerAnnouncements';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function PartnerAnnouncements() {
  const { data: announcements, isLoading, error } = usePartnerAnnouncements();

  return (
    <PartnerLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Annonces</h1>
          <p className="text-muted-foreground">
            Communications de l'équipe IArche
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-destructive">Erreur lors du chargement des annonces</p>
            </CardContent>
          </Card>
        ) : !announcements || announcements.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Dernières annonces</CardTitle>
              <CardDescription>
                Actualités, mises à jour et informations importantes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Bell className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">Aucune annonce pour le moment</p>
                <p className="text-sm max-w-md">
                  Les communications de l'équipe apparaîtront ici.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <Card 
                key={announcement.id} 
                className={`hover:shadow-md transition-shadow ${announcement.is_pinned ? 'border-primary/50 bg-primary/5' : ''}`}
              >
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2">
                        {announcement.is_pinned && (
                          <Pin className="h-4 w-4 text-primary" />
                        )}
                        <h3 className="font-semibold text-lg">{announcement.title}</h3>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {announcement.published_at 
                            ? format(new Date(announcement.published_at), 'dd MMM yyyy', { locale: fr })
                            : format(new Date(announcement.created_at), 'dd MMM yyyy', { locale: fr })
                          }
                        </span>
                      </div>
                    </div>
                    
                    <div 
                      className="text-sm text-muted-foreground prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: announcement.content }}
                    />

                    {announcement.is_pinned && (
                      <Badge variant="outline" className="mt-2">
                        <Pin className="h-3 w-3 mr-1" />
                        Épinglée
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PartnerLayout>
  );
}
