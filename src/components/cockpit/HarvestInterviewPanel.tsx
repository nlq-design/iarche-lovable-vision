import { useState } from 'react';
import {
  Loader2, Wheat, MessageSquare, CheckCircle2, Archive,
  RotateCcw, Plus, ChevronDown, ChevronUp, Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCockpitAICopilot } from '@/hooks/cockpit/useCockpitAICopilot';

interface HarvestInterviewPanelProps {
  workspaceId?: string;
}

type HarvestAction = 'harvested' | 'done_offplatform' | 'new_task' | 'keep_update';

const actionConfig: Record<HarvestAction, { label: string; icon: typeof Archive; variant: 'default' | 'secondary' | 'outline' | 'destructive'; description: string }> = {
  harvested: { label: 'Archiver enrichi', icon: Archive, variant: 'secondary', description: 'Clôturer et stocker la connaissance' },
  done_offplatform: { label: 'Déjà fait', icon: CheckCircle2, variant: 'default', description: 'Marquer comme fait hors plateforme' },
  new_task: { label: 'Nouvelle tâche', icon: Plus, variant: 'outline', description: 'Remplacer par une tâche actualisée' },
  keep_update: { label: 'Reporter +7j', icon: RotateCcw, variant: 'outline', description: 'Toujours pertinent, repousser l\'échéance' },
};

export function HarvestInterviewPanel({ workspaceId }: HarvestInterviewPanelProps) {
  const { harvest, harvestRespond } = useCockpitAICopilot(workspaceId);
  const [expandedQuestion, setExpandedQuestion] = useState<number>(0);
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [selectedActions, setSelectedActions] = useState<Record<number, HarvestAction>>({});

  const interview = harvest.data?.current_interview;
  const groups = harvest.data?.groups || [];
  const total = harvest.data?.total || 0;

  const handleStartHarvest = () => {
    harvest.mutate(undefined);
  };

  const handleSubmitAnswer = (questionIndex: number) => {
    if (!interview) return;
    const question = interview.questions[questionIndex];
    const response = responses[questionIndex] || '';
    const action = selectedActions[questionIndex] || 'harvested';

    harvestRespond.mutate(
      {
        taskIds: question.related_task_ids,
        response,
        action,
      },
      {
        onSuccess: () => {
          // Move to next question or reload
          if (questionIndex < interview.questions.length - 1) {
            setExpandedQuestion(questionIndex + 1);
          } else {
            // All questions answered, load next entity
            harvest.mutate(undefined);
            setResponses({});
            setSelectedActions({});
            setExpandedQuestion(0);
          }
        },
      }
    );
  };

  // Initial state — no harvest started
  if (!harvest.data && !harvest.isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Wheat className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground mb-1">Récolter les tâches IA en retard</p>
        <p className="text-xs text-muted-foreground/70 mb-4 max-w-xs">
          L'IA interroge vos tâches périmées pour en extraire de la connaissance et créer de nouvelles actions pertinentes.
        </p>
        <Button onClick={handleStartHarvest} className="gap-2">
          <Wheat className="h-4 w-4" />
          Lancer la récolte
        </Button>
      </div>
    );
  }

  // Loading
  if (harvest.isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Analyse des tâches en retard…</p>
      </div>
    );
  }

  // No overdue tasks
  if (harvest.data?.message || total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle2 className="h-10 w-10 text-primary mb-3" />
        <p className="text-sm text-muted-foreground">{harvest.data?.message || 'Aucune tâche à récolter'}</p>
      </div>
    );
  }

  // Interview mode
  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-center gap-2">
          <Wheat className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{total} tâche(s) à récolter</span>
          <span className="text-xs text-muted-foreground">
            · {groups.length} entité(s)
          </span>
        </div>
        <Button size="sm" variant="ghost" onClick={handleStartHarvest} disabled={harvest.isPending}>
          <RotateCcw className="h-3 w-3" />
        </Button>
      </div>

      {/* Current interview entity */}
      {interview && (
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Entity header */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">{interview.entity_type}</Badge>
              <span className="font-medium text-sm">{interview.entity_name}</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {interview.task_ids.length} tâche(s)
              </span>
            </div>

            {interview.summary && (
              <p className="text-xs text-muted-foreground italic bg-muted/30 p-2 rounded-md">
                📋 {interview.summary}
              </p>
            )}

            <Separator />

            {/* Questions */}
            {interview.questions.map((q, i) => {
              const isExpanded = expandedQuestion === i;
              const isAnswered = harvestRespond.isSuccess && expandedQuestion > i;

              return (
                <div key={i} className={`rounded-lg border transition-colors ${isExpanded ? 'border-primary/50 bg-primary/5' : 'border-border'}`}>
                  {/* Question header */}
                  <button
                    className="w-full flex items-center justify-between p-3 text-left"
                    onClick={() => setExpandedQuestion(isExpanded ? -1 : i)}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <MessageSquare className={`h-4 w-4 flex-shrink-0 ${isAnswered ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="text-sm font-medium truncate">{q.question}</span>
                    </div>
                    {isAnswered && <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mr-2" />}
                    {isExpanded ? <ChevronUp className="h-3 w-3 flex-shrink-0" /> : <ChevronDown className="h-3 w-3 flex-shrink-0" />}
                  </button>

                  {/* Expanded answer area */}
                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-3">
                      {/* Context */}
                      {q.context && (
                        <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                          {q.context}
                        </p>
                      )}

                      {/* Suggested actions chips */}
                      {q.suggested_actions?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {q.suggested_actions.map((sa, j) => (
                            <Badge key={j} variant="outline" className="text-xs cursor-pointer hover:bg-primary/10"
                              onClick={() => setResponses(prev => ({ ...prev, [i]: sa }))}>
                              {sa}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Response textarea */}
                      <Textarea
                        placeholder="Votre réponse…"
                        value={responses[i] || ''}
                        onChange={(e) => setResponses(prev => ({ ...prev, [i]: e.target.value }))}
                        className="min-h-[60px] text-sm"
                      />

                      {/* Action selector */}
                      <div className="grid grid-cols-2 gap-2">
                        {(Object.entries(actionConfig) as [HarvestAction, typeof actionConfig[HarvestAction]][]).map(([key, config]) => {
                          const Icon = config.icon;
                          const isSelected = (selectedActions[i] || 'harvested') === key;
                          return (
                            <button
                              key={key}
                              className={`flex items-center gap-2 p-2 rounded-md border text-left text-xs transition-colors ${
                                isSelected
                                  ? 'border-primary bg-primary/10 text-foreground'
                                  : 'border-border text-muted-foreground hover:border-primary/30'
                              }`}
                              onClick={() => setSelectedActions(prev => ({ ...prev, [i]: key }))}
                            >
                              <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                              <div>
                                <div className="font-medium">{config.label}</div>
                                <div className="text-[10px] opacity-70">{config.description}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Submit */}
                      <Button
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => handleSubmitAnswer(i)}
                        disabled={harvestRespond.isPending}
                      >
                        {harvestRespond.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Send className="h-3 w-3" />
                        )}
                        Valider cette réponse
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Entity list (remaining groups) */}
      {groups.length > 1 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium px-1">Entités suivantes</p>
          {groups.slice(1, 6).map((g, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-md border border-border text-xs">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{g.entity_type}</Badge>
                <span className="text-muted-foreground">{g.entity_name}</span>
              </div>
              <span className="text-muted-foreground">{g.task_count} tâches</span>
            </div>
          ))}
          {groups.length > 6 && (
            <p className="text-xs text-muted-foreground/60 text-center">+{groups.length - 6} autres…</p>
          )}
        </div>
      )}
    </div>
  );
}
