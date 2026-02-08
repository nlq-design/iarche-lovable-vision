import { useState, useEffect, useCallback } from 'react';
import {
  Loader2, Wheat, MessageSquare, CheckCircle2, Archive,
  RotateCcw, Plus, Send, Sparkles, ChevronRight,
  ArrowRight, Zap, Eye, EyeOff, Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { useCockpitAICopilot } from '@/hooks/cockpit/useCockpitAICopilot';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface HarvestInterviewPanelProps {
  workspaceId?: string;
  autoStart?: boolean;
}

type HarvestAction = 'harvested' | 'done_offplatform' | 'new_task' | 'keep_update';

const actionConfig: Record<HarvestAction, {
  label: string;
  icon: typeof Archive;
  color: string;
  description: string;
  shortLabel: string;
}> = {
  harvested: {
    label: 'Archiver & enrichir',
    shortLabel: 'Archiver',
    icon: Archive,
    color: 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100',
    description: 'Stocker la connaissance, clôturer',
  },
  done_offplatform: {
    label: 'Déjà fait',
    shortLabel: 'Fait',
    icon: CheckCircle2,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
    description: 'Réalisé hors plateforme',
  },
  new_task: {
    label: 'Remplacer par une nouvelle tâche',
    shortLabel: 'Remplacer',
    icon: Plus,
    color: 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100',
    description: 'L\'IA crée une tâche fraîche',
  },
  keep_update: {
    label: 'Reporter +7 jours',
    shortLabel: 'Reporter',
    icon: RotateCcw,
    color: 'text-violet-600 bg-violet-50 border-violet-200 hover:bg-violet-100',
    description: 'Toujours pertinent, reporter',
  },
};

export function HarvestInterviewPanel({ workspaceId, autoStart = false }: HarvestInterviewPanelProps) {
  const { harvest, harvestRespond } = useCockpitAICopilot(workspaceId);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [selectedActions, setSelectedActions] = useState<Record<number, HarvestAction>>({});
  const [processedEntities, setProcessedEntities] = useState(0);
  const [showTasks, setShowTasks] = useState(false);
  const [justCompleted, setJustCompleted] = useState<number | null>(null);

  const interview = harvest.data?.current_interview;
  const groups = harvest.data?.groups || [];
  const total = harvest.data?.total || 0;

  // Auto-start harvest when panel opens
  useEffect(() => {
    if (autoStart && !harvest.data && !harvest.isPending) {
      harvest.mutate(undefined);
    }
  }, [autoStart]);

  const handleStartHarvest = useCallback(() => {
    harvest.mutate(undefined);
    setProcessedEntities(0);
    setCurrentQuestionIndex(0);
    setResponses({});
    setSelectedActions({});
    setJustCompleted(null);
  }, [harvest]);

  const handleSubmitAnswer = useCallback((questionIndex: number) => {
    if (!interview) return;
    const question = interview.questions[questionIndex];
    const response = responses[questionIndex] || '';
    const action = selectedActions[questionIndex] || 'harvested';

    harvestRespond.mutate(
      { taskIds: question.related_task_ids, response, action },
      {
        onSuccess: () => {
          setJustCompleted(questionIndex);
          
          setTimeout(() => {
            if (questionIndex < interview.questions.length - 1) {
              setCurrentQuestionIndex(questionIndex + 1);
              setJustCompleted(null);
            } else {
              // All questions done for this entity
              setProcessedEntities(prev => prev + 1);
              harvest.mutate(undefined);
              setResponses({});
              setSelectedActions({});
              setCurrentQuestionIndex(0);
              setJustCompleted(null);
            }
          }, 600);
        },
      }
    );
  }, [interview, responses, selectedActions, harvestRespond, harvest]);

  const handleBulkAction = useCallback((action: HarvestAction) => {
    if (!interview) return;
    harvestRespond.mutate(
      { taskIds: interview.task_ids, response: `Action groupée: ${action}`, action },
      {
        onSuccess: () => {
          setProcessedEntities(prev => prev + 1);
          harvest.mutate(undefined);
          setResponses({});
          setSelectedActions({});
          setCurrentQuestionIndex(0);
        },
      }
    );
  }, [interview, harvestRespond, harvest]);

  // Initial state
  if (!harvest.data && !harvest.isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="relative mb-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Wheat className="h-7 w-7 text-primary" />
          </div>
          <Sparkles className="h-4 w-4 text-primary absolute -top-1 -right-1 animate-pulse" />
        </div>
        <h3 className="text-sm font-semibold mb-1">Récolte intelligente</h3>
        <p className="text-xs text-muted-foreground mb-5 max-w-[280px] leading-relaxed">
          L'IA analyse vos tâches en retard, regroupe par entité, et vous guide pour transformer chaque sujet en connaissance ou action concrète.
        </p>
        <Button onClick={handleStartHarvest} className="gap-2 shadow-sm">
          <Wheat className="h-4 w-4" />
          Lancer la récolte
        </Button>
      </div>
    );
  }

  // Loading
  if (harvest.isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="relative mb-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <Wheat className="h-4 w-4 text-primary absolute top-3 left-3" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">Analyse en cours…</p>
        <p className="text-xs text-muted-foreground">Regroupement des tâches par entité</p>
      </div>
    );
  }

  // All done
  if (harvest.data?.message || total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>
        <h3 className="text-sm font-semibold mb-1">Récolte terminée !</h3>
        <p className="text-xs text-muted-foreground">
          {processedEntities > 0
            ? `${processedEntities} entité(s) traitée(s). Base de connaissances enrichie.`
            : harvest.data?.message || 'Aucune tâche à récolter'
          }
        </p>
      </div>
    );
  }

  // Interview mode
  const totalEntities = groups.length + processedEntities;
  const progressPct = totalEntities > 0 ? (processedEntities / totalEntities) * 100 : 0;
  const questionsProgress = interview
    ? ((currentQuestionIndex + (justCompleted !== null ? 1 : 0)) / interview.questions.length) * 100
    : 0;

  return (
    <div className="space-y-3">
      {/* Progress header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-foreground flex items-center gap-1.5">
            <Wheat className="h-3.5 w-3.5 text-primary" />
            {total} tâche{total > 1 ? 's' : ''} · {groups.length} entité{groups.length > 1 ? 's' : ''}
          </span>
          <span className="text-muted-foreground">
            {processedEntities}/{totalEntities} traitées
          </span>
        </div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      {/* Current entity interview */}
      {interview && (
        <Card className="border-primary/20 shadow-sm">
          <CardContent className="p-0">
            {/* Entity header */}
            <div className="p-3 bg-primary/5 border-b border-primary/10 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className="text-[10px] font-medium shrink-0 capitalize">
                    {interview.entity_type}
                  </Badge>
                  <span className="font-medium text-sm truncate">{interview.entity_name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-[10px]">
                    {interview.task_ids.length} tâche{interview.task_ids.length > 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>

              {interview.summary && (
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {interview.summary}
                </p>
              )}
            </div>

            {/* Task details (collapsible) */}
            <Collapsible open={showTasks} onOpenChange={setShowTasks}>
              <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors border-b">
                <span className="flex items-center gap-1.5">
                  {showTasks ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {showTasks ? 'Masquer' : 'Voir'} les tâches concernées
                </span>
                <ChevronRight className={cn("h-3 w-3 transition-transform", showTasks && "rotate-90")} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-3 py-2 space-y-1 bg-muted/20 border-b">
                  {groups[0]?.tasks?.map((task: any) => (
                    <div key={task.id} className="flex items-start gap-2 py-1 text-xs">
                      <div className={cn(
                        "h-1.5 w-1.5 rounded-full mt-1.5 shrink-0",
                        task.priority === 'high' || task.priority === 'urgent' ? 'bg-destructive' : 'bg-muted-foreground/30'
                      )} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-foreground">{task.title}</p>
                        <p className="text-muted-foreground/70">
                          Échéance : {task.due_date} · {formatDistanceToNow(new Date(task.due_date), { addSuffix: true, locale: fr })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Questions flow */}
            <div className="p-3 space-y-3">
              {/* Question progress mini-bar */}
              <div className="flex items-center gap-1.5">
                {interview.questions.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors duration-300",
                      i < currentQuestionIndex || justCompleted === i
                        ? 'bg-primary'
                        : i === currentQuestionIndex
                        ? 'bg-primary/40'
                        : 'bg-muted'
                    )}
                  />
                ))}
              </div>

              {/* Current question */}
              {interview.questions.map((q, i) => {
                if (i !== currentQuestionIndex) return null;
                const isCompleting = justCompleted === i;

                return (
                  <div
                    key={i}
                    className={cn(
                      "space-y-3 transition-opacity duration-300",
                      isCompleting ? 'opacity-30' : 'opacity-100'
                    )}
                  >
                    {/* Question */}
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium leading-snug">{q.question}</p>
                        {q.context && (
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{q.context}</p>
                        )}
                      </div>
                    </div>

                    {/* Quick-fill chips */}
                    {q.suggested_actions?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {q.suggested_actions.map((sa, j) => (
                          <button
                            key={j}
                            className={cn(
                              "px-2.5 py-1 rounded-full text-xs border transition-colors",
                              responses[i] === sa
                                ? 'bg-primary/10 border-primary/40 text-primary font-medium'
                                : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
                            )}
                            onClick={() => setResponses(prev => ({ ...prev, [i]: sa }))}
                          >
                            {sa}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Response */}
                    <Textarea
                      placeholder="Votre réponse (optionnel pour archiver/reporter)…"
                      value={responses[i] || ''}
                      onChange={(e) => setResponses(prev => ({ ...prev, [i]: e.target.value }))}
                      className="min-h-[56px] text-sm resize-none"
                    />

                    {/* Action picker */}
                    <div className="grid grid-cols-2 gap-1.5">
                      {(Object.entries(actionConfig) as [HarvestAction, typeof actionConfig[HarvestAction]][]).map(([key, config]) => {
                        const Icon = config.icon;
                        const isSelected = (selectedActions[i] || 'harvested') === key;
                        return (
                          <button
                            key={key}
                            className={cn(
                              "flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition-all duration-200",
                              isSelected ? config.color + ' shadow-sm' : 'border-border text-muted-foreground hover:border-primary/20'
                            )}
                            onClick={() => setSelectedActions(prev => ({ ...prev, [i]: key }))}
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium truncate">{config.shortLabel}</p>
                              <p className="text-[10px] opacity-60 truncate">{config.description}</p>
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
                      disabled={harvestRespond.isPending || isCompleting}
                    >
                      {harvestRespond.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                      Valider
                      {i < interview.questions.length - 1 && (
                        <span className="text-xs opacity-70 ml-1">→ question suivante</span>
                      )}
                      {i === interview.questions.length - 1 && (
                        <span className="text-xs opacity-70 ml-1">→ entité suivante</span>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick bulk actions */}
      {interview && interview.task_ids.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground shrink-0">Actions rapides :</span>
          <div className="flex gap-1.5 flex-wrap">
            <button
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] border border-border text-muted-foreground hover:text-foreground hover:border-primary/20 transition-colors"
              onClick={() => handleBulkAction('harvested')}
              disabled={harvestRespond.isPending}
            >
              <Package className="h-3 w-3" />
              Tout archiver
            </button>
            <button
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] border border-border text-muted-foreground hover:text-foreground hover:border-primary/20 transition-colors"
              onClick={() => handleBulkAction('keep_update')}
              disabled={harvestRespond.isPending}
            >
              <RotateCcw className="h-3 w-3" />
              Tout reporter +7j
            </button>
            <button
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] border border-border text-muted-foreground hover:text-foreground hover:border-primary/20 transition-colors"
              onClick={() => handleBulkAction('done_offplatform')}
              disabled={harvestRespond.isPending}
            >
              <CheckCircle2 className="h-3 w-3" />
              Tout marquer fait
            </button>
          </div>
        </div>
      )}

      {/* Remaining entities queue */}
      {groups.length > 1 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider px-1">
            File d'attente ({groups.length - 1})
          </p>
          {groups.slice(1, 5).map((g, i) => (
            <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-muted/30 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                <Badge variant="outline" className="text-[9px] capitalize shrink-0">{g.entity_type}</Badge>
                <span className="text-muted-foreground truncate">{g.entity_name}</span>
              </div>
              <span className="text-muted-foreground/60 shrink-0">{g.task_count}</span>
            </div>
          ))}
          {groups.length > 5 && (
            <p className="text-[10px] text-muted-foreground/50 text-center">
              +{groups.length - 5} autre{groups.length - 5 > 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );
}