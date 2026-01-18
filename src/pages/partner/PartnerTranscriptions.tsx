import { PartnerLayout } from '@/components/partner/PartnerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileAudio, Calendar, Users, FolderKanban, ExternalLink } from 'lucide-react';
import { usePartnerTranscriptions } from '@/hooks/partner/usePartnerTranscriptions';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending: { label: 'En attente', variant: 'outline' },
  processing: { label: 'En cours', variant: 'secondary' },
  done: { label: 'Terminée', variant: 'default' },
  failed: { label: 'Échec', variant: 'destructive' },
};

export default function PartnerTranscriptions() {
  const { data: transcriptions, isLoading, error } = usePartnerTranscriptions();

  return (
    <PartnerLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Transcriptions</h1>
            <p className="text-muted-foreground">
              Transcriptions audio liées à vos projets et leads
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-destructive">Erreur lors du chargement des transcriptions</p>
            </CardContent>
          </Card>
        ) : !transcriptions || transcriptions.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Transcriptions audio</CardTitle>
              <CardDescription>
                Les transcriptions de vos réunions et échanges apparaîtront ici
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <FileAudio className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">Aucune transcription pour le moment</p>
                <p className="text-sm max-w-md">
                  Les transcriptions de vos échanges avec les clients seront disponibles ici.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {transcriptions.map((transcription) => {
              const statusInfo = STATUS_LABELS[transcription.status] || { 
                label: transcription.status, 
                variant: 'outline' as const 
              };

              return (
                <Card key={transcription.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <FileAudio className="h-5 w-5 text-muted-foreground" />
                          <h3 className="font-semibold text-lg">
                            {transcription.title || 'Transcription sans titre'}
                          </h3>
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                          {transcription.is_own && (
                            <Badge className="bg-primary/10 text-primary border-primary/20">
                              Créée par vous
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          {transcription.lead && (
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              <span>Lead: {transcription.lead.name}</span>
                            </div>
                          )}
                          {transcription.project && (
                            <div className="flex items-center gap-1">
                              <FolderKanban className="h-4 w-4" />
                              <span>Projet: {transcription.project.name}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 items-end">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {format(
                              new Date(transcription.transcription_date || transcription.created_at),
                              'dd MMM yyyy',
                              { locale: fr }
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PartnerLayout>
  );
}
