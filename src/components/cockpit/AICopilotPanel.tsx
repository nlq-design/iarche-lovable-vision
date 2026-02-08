import { useState } from 'react';
import {
  Brain, Zap, Shield, Sun, ArrowRight, CheckCircle2, AlertTriangle,
  Clock, Sparkles, Plus, Loader2, Calendar, BarChart3, Target, MessageSquare,
  ChevronDown, ChevronUp, TrendingUp, GitBranch,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useCockpitAICopilot } from '@/hooks/cockpit/useCockpitAICopilot';
import ReactMarkdown from 'react-markdown';

interface AICopilotPanelProps {
  workspaceId?: string;
  entityType?: string;
  entityId?: string;
  compact?: boolean;
}

type TabKey = 'brief' | 'tasks' | 'alerts' | 'health' | 'scoring' | 'winloss' | 'deadlines';

export function AICopilotPanel({ workspaceId, entityType, entityId, compact = false }: AICopilotPanelProps) {
  const {
    suggestTasks, detectInactivity, healthCheck, morningBrief,
    suggestNextStep, meetingPrep, opportunityScore, winLossAnalysis,
    deadlineCascade, createTasksFromSuggestions,
  } = useCockpitAICopilot(workspaceId);

  const [selectedSuggestions, setSelectedSuggestions] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('brief');
  const [meetingBookingId, setMeetingBookingId] = useState('');

  const toggleSuggestion = (index: number) => {
    setSelectedSuggestions((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleCreateSelected = () => {
    if (!suggestTasks.data) return;
    const selected = selectedSuggestions.map((i) => suggestTasks.data[i]);
    createTasksFromSuggestions.mutate(selected);
    setSelectedSuggestions([]);
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const severityIcon = (s: string) => s === 'high' ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <Clock className="h-4 w-4 text-muted-foreground" />;

  const healthIcon = (h: string) => {
    switch (h) {
      case 'on_track': return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case 'at_risk': return <AlertTriangle className="h-4 w-4 text-accent-foreground" />;
      case 'off_track': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default: return null;
    }
  };

  const riskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 70) return 'text-primary';
    if (score >= 50) return 'text-accent-foreground';
    if (score >= 30) return 'text-secondary-foreground';
    return 'text-destructive';
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => suggestTasks.mutate({ entityType, entityId })} disabled={suggestTasks.isPending}>
            {suggestTasks.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
            Suggestions IA
          </Button>
          {entityType === 'opportunity' && entityId && (
            <Button size="sm" variant="outline" onClick={() => suggestNextStep.mutate(entityId)} disabled={suggestNextStep.isPending}>
              {suggestNextStep.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ArrowRight className="h-3 w-3 mr-1" />}
              Next step
            </Button>
          )}
          {entityType === 'booking' && entityId && (
            <Button size="sm" variant="outline" onClick={() => meetingPrep.mutate(entityId)} disabled={meetingPrep.isPending}>
              {meetingPrep.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Calendar className="h-3 w-3 mr-1" />}
              Préparer le RDV
            </Button>
          )}
        </div>

        {/* Task suggestions inline */}
        {suggestTasks.data && (
          <div className="space-y-2 mt-3">
            {suggestTasks.data.map((s, i) => (
              <div key={i} className={`p-2 rounded-md border cursor-pointer transition-colors ${selectedSuggestions.includes(i) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`} onClick={() => toggleSuggestion(i)}>
                <div className="flex items-center gap-2">
                  <Badge variant={priorityColor(s.priority)} className="text-xs">{s.priority}</Badge>
                  <span className="text-sm font-medium">{s.title}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{s.reasoning}</p>
              </div>
            ))}
            {selectedSuggestions.length > 0 && (
              <Button size="sm" onClick={handleCreateSelected} disabled={createTasksFromSuggestions.isPending}>
                <Plus className="h-3 w-3 mr-1" />
                Créer {selectedSuggestions.length} tâche(s)
              </Button>
            )}
          </div>
        )}

        {/* Next step inline */}
        {suggestNextStep.data?.suggestion && (
          <Card className="mt-3">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">{suggestNextStep.data.suggestion.next_action}</span>
              </div>
              <p className="text-xs text-muted-foreground">{suggestNextStep.data.suggestion.reasoning}</p>
              {suggestNextStep.data.suggestion.talking_points?.length > 0 && (
                <ul className="mt-2 text-xs space-y-1">
                  {suggestNextStep.data.suggestion.talking_points.map((tp, i) => (
                    <li key={i} className="flex items-start gap-1"><span className="text-primary">•</span> {tp}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {/* Meeting prep inline */}
        {meetingPrep.data?.briefing && <MeetingPrepCard briefing={meetingPrep.data.briefing} booking={meetingPrep.data.booking} />}
      </div>
    );
  }

  // Full panel (dashboard view)
  const tabs: Array<{ key: TabKey; label: string; icon: any; action: () => void; loading: boolean }> = [
    { key: 'brief', label: 'Briefing', icon: Sun, action: () => morningBrief.mutate(), loading: morningBrief.isPending },
    { key: 'tasks', label: 'Suggestions', icon: Sparkles, action: () => suggestTasks.mutate({}), loading: suggestTasks.isPending },
    { key: 'scoring', label: 'Pipeline', icon: BarChart3, action: () => opportunityScore.mutate(), loading: opportunityScore.isPending },
    { key: 'winloss', label: 'Win/Loss', icon: TrendingUp, action: () => winLossAnalysis.mutate(), loading: winLossAnalysis.isPending },
    { key: 'alerts', label: 'Alertes', icon: Zap, action: () => detectInactivity.mutate(), loading: detectInactivity.isPending },
    { key: 'health', label: 'Santé', icon: Shield, action: () => healthCheck.mutate(), loading: healthCheck.isPending },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Copilote IA</CardTitle>
        </div>
        <CardDescription>Intelligence commerciale proactive</CardDescription>
      </CardHeader>

      <div className="px-6 flex gap-1 flex-wrap">
        {tabs.map(({ key, label, icon: Icon, action, loading }) => (
          <Button key={key} variant={activeTab === key ? 'default' : 'ghost'} size="sm" className="gap-1"
            onClick={() => { setActiveTab(key); action(); }} disabled={loading}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Icon className="h-3 w-3" />}
            {label}
          </Button>
        ))}
      </div>

      <Separator className="my-3" />

      <CardContent className="pt-0">
        <ScrollArea className="h-[500px]">
          {/* MORNING BRIEF */}
          {activeTab === 'brief' && (
            <div>
              {morningBrief.isPending && <LoadingState text="Préparation du briefing..." />}
              {morningBrief.data?.brief && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{morningBrief.data.brief}</ReactMarkdown>
                </div>
              )}
              {!morningBrief.data && !morningBrief.isPending && (
                <EmptyState text="Cliquez sur Briefing pour générer votre synthèse du jour" />
              )}
            </div>
          )}

          {/* TASK SUGGESTIONS */}
          {activeTab === 'tasks' && (
            <div className="space-y-3">
              {suggestTasks.isPending && <LoadingState text="Analyse du contexte..." />}
              {suggestTasks.data?.map((s, i) => (
                <div key={i} className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedSuggestions.includes(i) ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/50'}`} onClick={() => toggleSuggestion(i)}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={priorityColor(s.priority)} className="text-xs">{s.priority}</Badge>
                      <Badge variant="outline" className="text-xs">{s.task_type}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">J+{s.due_in_days}</span>
                  </div>
                  <h4 className="font-medium text-sm">{s.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
                  <p className="text-xs text-muted-foreground/70 italic mt-1">💡 {s.reasoning}</p>
                </div>
              ))}
              {selectedSuggestions.length > 0 && (
                <Button onClick={handleCreateSelected} disabled={createTasksFromSuggestions.isPending} className="w-full">
                  {createTasksFromSuggestions.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Créer {selectedSuggestions.length} tâche(s) sélectionnée(s)
                </Button>
              )}
              {!suggestTasks.data && !suggestTasks.isPending && (
                <EmptyState text="Cliquez sur Suggestions pour obtenir des recommandations" />
              )}
            </div>
          )}

          {/* OPPORTUNITY SCORING (Phase 2) */}
          {activeTab === 'scoring' && (
            <div className="space-y-3">
              {opportunityScore.isPending && <LoadingState text="Scoring du pipeline..." />}
              {opportunityScore.data?.summary && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="p-3 rounded-lg border border-border">
                    <div className="text-2xl font-bold text-foreground">{opportunityScore.data.summary.avg_score}<span className="text-sm font-normal text-muted-foreground">/100</span></div>
                    <div className="text-xs text-muted-foreground">Score moyen</div>
                  </div>
                  <div className="p-3 rounded-lg border border-border">
                    <div className="text-2xl font-bold text-destructive">{opportunityScore.data.summary.high_risk}</div>
                    <div className="text-xs text-muted-foreground">À risque</div>
                  </div>
                  <div className="p-3 rounded-lg border border-border">
                    <div className="text-2xl font-bold text-foreground">{(opportunityScore.data.summary.pipeline_value || 0).toLocaleString('fr-FR')}€</div>
                    <div className="text-xs text-muted-foreground">Pipeline total</div>
                  </div>
                  <div className="p-3 rounded-lg border border-border">
                    <div className="text-2xl font-bold text-primary">{(opportunityScore.data.summary.weighted_value || 0).toLocaleString('fr-FR')}€</div>
                    <div className="text-xs text-muted-foreground">Valeur pondérée</div>
                  </div>
                </div>
              )}
              {opportunityScore.data?.scores.map((s, i) => (
                <div key={i} className="p-3 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${scoreColor(s.conversion_score)}`}>{s.conversion_score}</span>
                      <div>
                        <h4 className="font-medium text-sm">{s.opportunity_title}</h4>
                        <span className="text-xs text-muted-foreground">{s.stage} · {s.days_in_stage}j</span>
                      </div>
                    </div>
                    <Badge variant={riskColor(s.risk_level)} className="text-xs">{s.risk_level}</Badge>
                  </div>
                  <Progress value={s.conversion_score} className="h-1.5 mb-2" />
                  {s.primary_risk && <p className="text-xs text-muted-foreground">⚠️ {s.primary_risk}</p>}
                  <p className="text-xs text-muted-foreground mt-1">→ {s.recommended_action}</p>
                  {s.value_amount > 0 && <span className="text-xs text-muted-foreground/60">{s.value_amount.toLocaleString('fr-FR')}€</span>}
                </div>
              ))}
              {!opportunityScore.data && !opportunityScore.isPending && (
                <EmptyState text="Cliquez sur Pipeline pour scorer vos opportunités" />
              )}
            </div>
          )}

          {/* INACTIVITY ALERTS */}
          {activeTab === 'alerts' && (
            <div className="space-y-2">
              {detectInactivity.isPending && <LoadingState text="Scan d'inactivité..." />}
              {detectInactivity.data?.alerts.map((a, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                  {severityIcon(a.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">{a.entity_type}</Badge>
                      <span className="font-medium text-sm truncate">{a.entity_name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{a.suggestion}</p>
                    <span className="text-xs text-muted-foreground/60">{a.days_inactive}j d'inactivité</span>
                  </div>
                </div>
              ))}
              {detectInactivity.data?.total === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-sm">Aucune alerte d'inactivité</p>
                </div>
              )}
              {!detectInactivity.data && !detectInactivity.isPending && (
                <EmptyState text="Cliquez sur Alertes pour scanner l'inactivité" />
              )}
            </div>
          )}

          {/* HEALTH CHECK */}
          {activeTab === 'health' && (
            <div className="space-y-3">
              {healthCheck.isPending && <LoadingState text="Diagnostic projets..." />}
              {healthCheck.data?.summary && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center p-2 rounded-lg bg-primary/10">
                    <div className="text-lg font-bold text-primary">{healthCheck.data.summary.on_track}</div>
                    <div className="text-xs text-muted-foreground">En bonne voie</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-secondary">
                    <div className="text-lg font-bold text-secondary-foreground">{healthCheck.data.summary.at_risk}</div>
                    <div className="text-xs text-muted-foreground">À risque</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-destructive/10">
                    <div className="text-lg font-bold text-destructive">{healthCheck.data.summary.off_track}</div>
                    <div className="text-xs text-muted-foreground">En danger</div>
                  </div>
                </div>
              )}
              {healthCheck.data?.projects.map((p, i) => (
                <div key={i} className="p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    {healthIcon(p.computed_health)}
                    <span className="font-medium text-sm">{p.project_name}</span>
                  </div>
                  {p.risk_factors.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {p.risk_factors.map((r, j) => (
                        <Badge key={j} variant="outline" className="text-xs">{r}</Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Budget: {p.budget_status.consumed_pct}%</span>
                    <span>Tâches: {p.task_status.completed}/{p.task_status.total}</span>
                    <span>Retard: {p.task_status.overdue}</span>
                  </div>
                </div>
              ))}
              {!healthCheck.data && !healthCheck.isPending && (
                <EmptyState text="Cliquez sur Santé pour diagnostiquer vos projets" />
              )}
            </div>
          )}

          {/* WIN/LOSS ANALYSIS (Phase 3) */}
          {activeTab === 'winloss' && (
            <div className="space-y-3">
              {winLossAnalysis.isPending && <LoadingState text="Analyse win/loss en cours..." />}
              {winLossAnalysis.data?.message && !winLossAnalysis.data.analysis && (
                <EmptyState text={winLossAnalysis.data.message} />
              )}
              {winLossAnalysis.data?.stats && winLossAnalysis.data.analysis && (
                <>
                  {/* Stats summary */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="p-3 rounded-lg border border-border text-center">
                      <div className="text-2xl font-bold text-primary">{winLossAnalysis.data.stats.win_rate}%</div>
                      <div className="text-xs text-muted-foreground">Taux de conversion</div>
                    </div>
                    <div className="p-3 rounded-lg border border-border text-center">
                      <div className="text-2xl font-bold text-foreground">{winLossAnalysis.data.stats.won}</div>
                      <div className="text-xs text-muted-foreground">Gagnées</div>
                    </div>
                    <div className="p-3 rounded-lg border border-border text-center">
                      <div className="text-2xl font-bold text-destructive">{winLossAnalysis.data.stats.lost}</div>
                      <div className="text-xs text-muted-foreground">Perdues</div>
                    </div>
                  </div>

                  {/* Win patterns */}
                  <CollapsibleSection title="✅ Patterns de victoire" items={winLossAnalysis.data.analysis.win_patterns} />
                  <CollapsibleSection title="❌ Patterns de perte" items={winLossAnalysis.data.analysis.loss_patterns} />
                  <CollapsibleSection title="🔑 Différenciateurs clés" items={winLossAnalysis.data.analysis.key_differentiators} />
                  <CollapsibleSection title="🎯 Sources performantes" items={winLossAnalysis.data.analysis.best_sources} />
                  <CollapsibleSection title="💡 Recommandations" items={winLossAnalysis.data.analysis.recommendations} />

                  {winLossAnalysis.data.analysis.critical_stage && (
                    <div className="p-3 rounded-lg bg-muted/50 border border-border">
                      <span className="text-xs font-medium">Stage critique : </span>
                      <Badge variant="secondary">{winLossAnalysis.data.analysis.critical_stage}</Badge>
                    </div>
                  )}
                </>
              )}
              {!winLossAnalysis.data && !winLossAnalysis.isPending && (
                <EmptyState text="Cliquez sur Win/Loss pour analyser vos patterns de conversion" />
              )}
            </div>
          )}

          {/* DEADLINE CASCADE (Phase 3) — available in compact/project mode */}
          {activeTab === 'deadlines' && (
            <div className="space-y-3">
              {deadlineCascade.isPending && <LoadingState text="Analyse des deadlines..." />}
              {deadlineCascade.data?.cascade && (
                <>
                  <div className="p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={
                        deadlineCascade.data.cascade.deadline_feasibility === 'on_track' ? 'default' :
                        deadlineCascade.data.cascade.deadline_feasibility === 'at_risk' ? 'secondary' : 'destructive'
                      }>
                        {deadlineCascade.data.cascade.deadline_feasibility === 'on_track' ? 'Tenable' :
                         deadlineCascade.data.cascade.deadline_feasibility === 'at_risk' ? 'À risque' : 'Impossible'}
                      </Badge>
                      {deadlineCascade.data.cascade.days_at_risk > 0 && (
                        <span className="text-xs text-destructive font-medium">+{deadlineCascade.data.cascade.days_at_risk}j de retard estimé</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{deadlineCascade.data.cascade.overall_status}</p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <div className="text-lg font-bold">{deadlineCascade.data.stats.total_tasks}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-primary/10">
                      <div className="text-lg font-bold text-primary">{deadlineCascade.data.stats.completed}</div>
                      <div className="text-xs text-muted-foreground">Faites</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <div className="text-lg font-bold">{deadlineCascade.data.stats.pending}</div>
                      <div className="text-xs text-muted-foreground">En cours</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-destructive/10">
                      <div className="text-lg font-bold text-destructive">{deadlineCascade.data.stats.overdue}</div>
                      <div className="text-xs text-muted-foreground">Retard</div>
                    </div>
                  </div>

                  <CollapsibleSection title="🔴 Chemin critique" items={deadlineCascade.data.cascade.critical_path} />

                  {/* Tasks to reschedule */}
                  {deadlineCascade.data.cascade.tasks_to_reschedule?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center gap-1"><Calendar className="h-3 w-3" /> Tâches à replanifier</h4>
                      {deadlineCascade.data.cascade.tasks_to_reschedule.map((t, i) => (
                        <div key={i} className="p-2 rounded-md border border-border text-xs">
                          <div className="font-medium">{t.task_title}</div>
                          <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                            <span className="line-through">{t.current_due}</span>
                            <ArrowRight className="h-3 w-3" />
                            <span className="text-primary font-medium">{t.suggested_due}</span>
                          </div>
                          <p className="text-muted-foreground/70 mt-1">{t.reason}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {deadlineCascade.data.cascade.impact_on_opportunities && (
                    <div className="p-3 rounded-lg bg-muted/50 border border-border">
                      <span className="text-xs font-medium">Impact opportunités : </span>
                      <span className="text-xs text-muted-foreground">{deadlineCascade.data.cascade.impact_on_opportunities}</span>
                    </div>
                  )}

                  <CollapsibleSection title="💡 Recommandations" items={deadlineCascade.data.cascade.recommendations} />
                </>
              )}
              {!deadlineCascade.data && !deadlineCascade.isPending && (
                <EmptyState text="Sélectionnez un projet pour analyser les deadlines" />
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Meeting Prep Card (used in both compact and full modes)
// =============================================================================

function MeetingPrepCard({ briefing, booking }: { briefing: any; booking: any }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const sections = [
    { key: 'summary', label: '📋 Résumé', content: briefing.summary, type: 'text' as const },
    { key: 'key_facts', label: '🔑 Faits clés', content: briefing.key_facts, type: 'list' as const },
    { key: 'objectives', label: '🎯 Objectifs', content: briefing.objectives, type: 'list' as const },
    { key: 'talking_points', label: '💬 Points à aborder', content: briefing.talking_points, type: 'list' as const },
    { key: 'questions_to_ask', label: '❓ Questions stratégiques', content: briefing.questions_to_ask, type: 'list' as const },
    { key: 'risks', label: '⚠️ Vigilance', content: briefing.risks, type: 'list' as const },
    { key: 'preparation_checklist', label: '✅ Check-list', content: briefing.preparation_checklist, type: 'list' as const },
  ];

  return (
    <Card>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">Briefing : {booking?.name || 'RDV'}</CardTitle>
        </div>
        {booking?.company && <CardDescription className="text-xs">{booking.company} · {booking.type || ''}</CardDescription>}
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-1">
        {sections.map(({ key, label, content, type }) => {
          if (!content || (Array.isArray(content) && content.length === 0)) return null;
          const isOpen = expanded === key;
          return (
            <div key={key} className="border border-border rounded-md">
              <button className="w-full flex items-center justify-between p-2 text-left text-sm font-medium hover:bg-muted/50 transition-colors"
                onClick={() => setExpanded(isOpen ? null : key)}>
                <span>{label}</span>
                {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              {isOpen && (
                <div className="px-3 pb-2">
                  {type === 'text' ? (
                    <p className="text-xs text-muted-foreground">{content}</p>
                  ) : (
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {(content as string[]).map((item, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function CollapsibleSection({ title, items }: { title: string; items?: string[] }) {
  const [open, setOpen] = useState(false);
  if (!items?.length) return null;
  return (
    <div className="border border-border rounded-md">
      <button className="w-full flex items-center justify-between p-2 text-left text-sm font-medium hover:bg-muted/50 transition-colors"
        onClick={() => setOpen(!open)}>
        <span>{title}</span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {open && (
        <ul className="px-3 pb-2 text-xs text-muted-foreground space-y-1">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="text-primary mt-0.5">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LoadingState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Brain className="h-8 w-8 text-muted-foreground/40 mb-3" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
