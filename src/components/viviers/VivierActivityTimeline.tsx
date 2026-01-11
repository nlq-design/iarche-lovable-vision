import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock, 
  MessageSquare, 
  Sparkles, 
  Eye, 
  ListPlus, 
  Send, 
  Upload,
  Phone,
  Mail,
  RefreshCw,
  Plus,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useState } from 'react';
import { toast } from 'sonner';

interface VivierActivityTimelineProps {
  vivierId: string;
}

// Activity type config
const ACTIVITY_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  view: { icon: Eye, label: 'Consultation', color: 'bg-blue-500' },
  note: { icon: MessageSquare, label: 'Note', color: 'bg-yellow-500' },
  enrichment: { icon: Sparkles, label: 'Enrichissement', color: 'bg-purple-500' },
  added_to_list: { icon: ListPlus, label: 'Ajout liste', color: 'bg-green-500' },
  export: { icon: Send, label: 'Export', color: 'bg-orange-500' },
  import: { icon: Upload, label: 'Import', color: 'bg-gray-500' },
  call: { icon: Phone, label: 'Appel', color: 'bg-teal-500' },
  email: { icon: Mail, label: 'Email', color: 'bg-indigo-500' },
  status_change: { icon: RefreshCw, label: 'Statut', color: 'bg-pink-500' },
  scoring: { icon: Sparkles, label: 'Scoring IA', color: 'bg-violet-500' },
};

export function VivierActivityTimeline({ vivierId }: VivierActivityTimelineProps) {
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Fetch activities for this vivier
  const { data: activities, isLoading } = useQuery({
    queryKey: ['vivier-activities', vivierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('entity_type', 'vivier')
        .eq('entity_id', vivierId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: !!vivierId,
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from('activity_log').insert({
        entity_type: 'vivier',
        entity_id: vivierId,
        activity_type: 'note',
        title: 'Note ajoutée',
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vivier-activities', vivierId] });
      setNewNote('');
      setIsAddingNote(false);
      toast.success('Note ajoutée');
    },
    onError: (err: any) => {
      toast.error(`Erreur: ${err.message}`);
    },
  });

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNoteMutation.mutate(newNote.trim());
  };

  // Group by date
  const groupedActivities = activities?.reduce((acc, activity) => {
    const date = format(new Date(activity.created_at!), 'dd MMMM yyyy', { locale: fr });
    if (!acc[date]) acc[date] = [];
    acc[date].push(activity);
    return acc;
  }, {} as Record<string, typeof activities>) || {};

  const getConfig = (type: string) => {
    return ACTIVITY_CONFIG[type] || { icon: Clock, label: type, color: 'bg-gray-400' };
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5" />
            Historique
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsAddingNote(!isAddingNote)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Note
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add note form */}
        {isAddingNote && (
          <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
            <Textarea
              placeholder="Ajouter une note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={2}
            />
            <div className="flex gap-2 justify-end">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => { setIsAddingNote(false); setNewNote(''); }}
              >
                Annuler
              </Button>
              <Button 
                size="sm"
                onClick={handleAddNote}
                disabled={!newNote.trim() || addNoteMutation.isPending}
              >
                {addNoteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Ajouter'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Timeline */}
        <ScrollArea className="h-[300px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : Object.keys(groupedActivities).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucune activité enregistrée</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedActivities).map(([date, dateActivities]) => (
                <div key={date}>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                    {date}
                  </h4>
                  <div className="space-y-3 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-border">
                    {dateActivities?.map((activity) => {
                      const config = getConfig(activity.activity_type);
                      const Icon = config.icon;
                      return (
                        <div key={activity.id} className="flex gap-3 relative">
                          <div className={`w-6 h-6 rounded-full ${config.color} flex items-center justify-center flex-shrink-0 z-10`}>
                            <Icon className="w-3 h-3 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{activity.title || config.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(activity.created_at!), 'HH:mm')}
                              </span>
                              {activity.is_ai_generated && (
                                <Badge variant="outline" className="text-xs px-1">IA</Badge>
                              )}
                            </div>
                            {activity.content && (
                              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                                {activity.content}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
