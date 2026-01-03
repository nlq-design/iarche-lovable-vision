import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, ChevronRight, Plus, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface LinkedTranscriptionsSectionProps {
  entityType: 'lead' | 'project' | 'partner' | 'solution';
  entityId: string | undefined;
  title?: string;
}

export function LinkedTranscriptionsSection({ 
  entityType, 
  entityId, 
  title = "Transcriptions" 
}: LinkedTranscriptionsSectionProps) {
  const navigate = useNavigate();

  const { data: transcriptions = [], isLoading } = useQuery({
    queryKey: ['linked-transcriptions', entityType, entityId],
    queryFn: async () => {
      if (!entityId) return [];
      
      let query = supabase
        .from('voice_transcriptions')
        .select('id, title, slug, source, status, created_at, transcription_date, summary')
        .eq('status', 'done')
        .order('created_at', { ascending: false });

      // Filter by entity type
      if (entityType === 'lead') {
        query = query.eq('lead_id', entityId);
      } else if (entityType === 'project') {
        query = query.eq('project_id', entityId);
      } else if (entityType === 'solution') {
        query = query.eq('solution_id', entityId);
      } else if (entityType === 'partner') {
        // Partners use junction table
        const { data: links } = await supabase
          .from('transcription_partners')
          .select('transcription_id')
          .eq('partner_id', entityId);
        
        if (!links || links.length === 0) return [];
        
        const { data, error } = await supabase
          .from('voice_transcriptions')
          .select('id, title, slug, source, status, created_at, transcription_date, summary')
          .in('id', links.map(l => l.transcription_id))
          .eq('status', 'done')
          .order('created_at', { ascending: false });
        
        if (error) return [];
        return data;
      }

      const { data, error } = await query;
      if (error) return [];
      return data;
    },
    enabled: !!entityId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mic className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Mic className="h-4 w-4" />
            {title} {transcriptions.length > 0 && `(${transcriptions.length})`}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/cockpit/transcriptions')}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {transcriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune transcription liée
          </p>
        ) : (
          <div className="space-y-2">
            {transcriptions.map((trans: any) => (
              <div
                key={trans.id}
                className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                onClick={() => navigate(`/cockpit/transcriptions/${trans.slug || trans.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {trans.title || `Transcription ${trans.source || 'audio'}`}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {trans.source || 'audio'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(trans.transcription_date || trans.created_at), 'dd MMM yyyy', { locale: fr })}
                      </span>
                    </div>
                    {trans.summary?.title && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {trans.summary.title}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
