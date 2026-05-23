import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  CheckCircle2, XCircle, Loader2, Zap, Brain,
  ListTodo, Mail, UserCheck, Calendar, StickyNote,
  ChevronDown, ChevronUp, ShieldAlert, Clock, Ban,
} from 'lucide-react';
import { useActionProposals, ActionProposal } from '@/hooks/cockpit/useActionProposals';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const ACTION_ICONS: Record<string, typeof Zap> = {
  create_task: ListTodo,
  send_email: Mail,
  update_lead: UserCheck,
  schedule_meeting: Calendar,
  create_note: StickyNote,
};

const ACTION_LABELS: Record<string, string> = {
  create_task: 'Créer une tâche',
  send_email: 'Envoyer un email',
  update_lead: 'Mettre à jour un lead',
  schedule_meeting: 'Planifier un RDV',
  create_note: 'Créer une note',
};

interface ActionProposalsListProps {
  workspaceId?: string;
  compact?: boolean;
}

export function ActionProposalsList({ workspaceId, compact = false }: ActionProposalsListProps) {
  const { pendingProposals, executedProposals, isLoading, validateAction, rejectAction, cancelAutoAction } = useActionProposals(workspaceId);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (pendingProposals.length === 0 && !compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Actions proposées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune action en attente. Utilisez le chatbot pour générer des propositions.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (pendingProposals.length === 0 && compact) {
    return null;
  }

  const handleValidate = (proposal: ActionProposal) => {
    validateAction.mutate({ id: proposal.id });
  };

  const handleReject = (proposalId: string) => {
    rejectAction.mutate({ id: proposalId, notes: rejectNotes });
    setRejectingId(null);
    setRejectNotes('');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Actions proposées
          {pendingProposals.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {pendingProposals.length} en attente
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {pendingProposals.map((proposal) => {
          const Icon = ACTION_ICONS[proposal.action_type] || Zap;
          const isExpanded = expandedId === proposal.id;
          const isRejecting = rejectingId === proposal.id;

          return (
            <div
              key={proposal.id}
              className="border rounded-lg p-3 space-y-2 transition-colors hover:bg-accent/30"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-primary/10 p-1.5 mt-0.5">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium truncate">{proposal.action_label}</p>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {ACTION_LABELS[proposal.action_type] || proposal.action_type}
                    </Badge>
                    {proposal.ai_reasoning?.startsWith('[Sentinelle]') && (
                      <Badge variant="secondary" className="text-[10px] shrink-0 gap-0.5">
                        <ShieldAlert className="h-2.5 w-2.5" />
                        Sentinelle
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(proposal.created_at), { addSuffix: true, locale: fr })}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-primary hover:bg-primary/10"
                        onClick={() => handleValidate(proposal)}
                        disabled={validateAction.isPending}
                      >
                        {validateAction.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Valider et exécuter</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={() => setRejectingId(isRejecting ? null : proposal.id)}
                        disabled={rejectAction.isPending}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Rejeter</TooltipContent>
                  </Tooltip>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => setExpandedId(isExpanded ? null : proposal.id)}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Phase IA-2J — Bandeau auto-exécution planifiée */}
              {proposal.auto_execute_status === 'scheduled' && proposal.auto_execute_at && (
                <div className="ml-9 p-2 rounded border border-amber-300 bg-amber-50 text-xs flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                  <span className="text-amber-900 flex-1">
                    Envoi auto {formatDistanceToNow(new Date(proposal.auto_execute_at), { addSuffix: true, locale: fr })}
                    {typeof proposal.confidence_score === 'number' && (
                      <span className="ml-1.5 opacity-70">
                        (confiance {Math.round(proposal.confidence_score * 100)}%)
                      </span>
                    )}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[11px] gap-1 border-amber-400 text-amber-900 hover:bg-amber-100"
                    onClick={() => cancelAutoAction.mutate({ id: proposal.id })}
                    disabled={cancelAutoAction.isPending}
                  >
                    <Ban className="h-3 w-3" />
                    Annuler l'envoi auto
                  </Button>
                </div>
              )}
              {proposal.auto_execute_status === 'cancelled' && (
                <div className="ml-9 text-[11px] text-muted-foreground italic">
                  Envoi automatique annulé — validation manuelle requise.
                </div>
              )}

              {/* AI Reasoning */}
              {isExpanded && proposal.ai_reasoning && (
                <div className="ml-9 p-2 rounded bg-accent/50 text-xs text-muted-foreground flex items-start gap-1.5">
                  <Brain className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                  <span>{proposal.ai_reasoning}</span>
                </div>
              )}

              {/* Expanded payload */}
              {isExpanded && (
                <div className="ml-9 p-2 rounded bg-muted/50 text-xs font-mono">
                  <pre className="whitespace-pre-wrap break-all">
                    {JSON.stringify(proposal.action_payload, null, 2)}
                  </pre>
                </div>
              )}

              {/* Reject form */}
              {isRejecting && (
                <div className="ml-9 space-y-2">
                  <Textarea
                    value={rejectNotes}
                    onChange={(e) => setRejectNotes(e.target.value)}
                    placeholder="Raison du rejet (optionnel)..."
                    className="min-h-[60px] text-xs"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-xs"
                      onClick={() => handleReject(proposal.id)}
                      disabled={rejectAction.isPending}
                    >
                      Confirmer le rejet
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => { setRejectingId(null); setRejectNotes(''); }}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Recently executed */}
        {!compact && executedProposals.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Récemment exécutées</p>
            {executedProposals.slice(0, 3).map((p) => (
              <div key={p.id} className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-primary" />
                <span className="truncate">{p.action_label}</span>
                {(p as any).auto_execute && (
                  <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200 shrink-0">
                    ⚡ Auto
                  </Badge>
                )}
                {(p as any).source === 'sentinel' && (
                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 shrink-0">
                    🛡️ Sentinelle
                  </Badge>
                )}
                <span className="ml-auto shrink-0">
                  {p.executed_at && formatDistanceToNow(new Date(p.executed_at), { addSuffix: true, locale: fr })}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
