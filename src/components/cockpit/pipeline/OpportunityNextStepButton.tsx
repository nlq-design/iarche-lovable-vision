import { useState } from 'react';
import { Sparkles, Loader2, Zap, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface NextStepResponse {
  suggestion?: {
    next_action: string;
    reasoning: string;
    talking_points?: string[];
    urgency?: string;
    action_type?: string;
    suggested_stage?: string;
  };
  cache?: { hit: boolean; similarity?: number; ageSeconds?: number; fingerprintMatch?: boolean };
}

interface Props {
  opportunityId: string;
  workspaceId?: string;
}

const URGENCY_COLOR: Record<string, string> = {
  immediate: 'bg-destructive/10 text-destructive border-destructive/30',
  high: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  medium: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  low: 'bg-muted text-muted-foreground border-border',
};

export function OpportunityNextStepButton({ opportunityId, workspaceId }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<NextStepResponse | null>(null);

  const fetchSuggestion = async () => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke('cockpit-ai-copilot', {
        body: {
          mode: 'next-step',
          entityType: 'opportunity',
          entityId: opportunityId,
          workspaceId,
        },
      });
      if (error) throw error;
      if (res?.error) throw new Error(res.error);
      setData(res as NextStepResponse);
    } catch (e) {
      toast.error("Impossible d'obtenir la suggestion IA");
      console.error('[next-step]', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && !data) fetchSuggestion();
  };

  const cache = data?.cache;
  const suggestion = data?.suggestion;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-primary/10"
              onClick={(e) => e.stopPropagation()}
              aria-label="Prochaine étape IA"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Prochaine étape IA</p>
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        className="w-96 p-0"
        align="end"
        side="bottom"
        sideOffset={6}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-sm font-semibold">Prochaine étape IA</span>
          </div>
          {cache && (
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] h-5 px-1.5 gap-1',
                cache.hit
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'border-border text-muted-foreground'
              )}
            >
              {cache.hit ? <Zap className="h-2.5 w-2.5" /> : <Database className="h-2.5 w-2.5" />}
              {cache.hit
                ? `HIT ${(cache.similarity ?? 0) === 1 ? 'fp' : `${Math.round((cache.similarity ?? 0) * 100)}%`} · ${cache.ageSeconds ?? 0}s`
                : 'MISS'}
            </Badge>
          )}
        </div>

        <div className="p-3 space-y-2.5 max-h-[420px] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-xs">Analyse en cours…</span>
            </div>
          )}

          {!loading && suggestion && (
            <>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-snug flex-1">{suggestion.next_action}</p>
                {suggestion.urgency && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] h-5 px-1.5 capitalize shrink-0',
                      URGENCY_COLOR[suggestion.urgency] ?? URGENCY_COLOR.medium
                    )}
                  >
                    {suggestion.urgency}
                  </Badge>
                )}
              </div>

              {suggestion.reasoning && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {suggestion.reasoning}
                </p>
              )}

              {suggestion.talking_points && suggestion.talking_points.length > 0 && (
                <div className="pt-1">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">
                    Points clés
                  </p>
                  <ul className="space-y-1">
                    {suggestion.talking_points.map((p, i) => (
                      <li key={i} className="text-xs text-foreground/80 flex gap-1.5">
                        <span className="text-primary shrink-0">•</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(suggestion.suggested_stage || suggestion.action_type) && (
                <div className="flex flex-wrap gap-1 pt-1 border-t">
                  {suggestion.suggested_stage && (
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                      → {suggestion.suggested_stage}
                    </Badge>
                  )}
                  {suggestion.action_type && (
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                      {suggestion.action_type}
                    </Badge>
                  )}
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs mt-1"
                onClick={() => {
                  setData(null);
                  fetchSuggestion();
                }}
              >
                Régénérer
              </Button>
            </>
          )}

          {!loading && !suggestion && data && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Aucune suggestion disponible
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
