/**
 * AIActionDrawer — Drawer interactif sur les éléments IA du dashboard.
 *
 * UX v2 (refonte P0+P1+P2) :
 *  - Auto-acknowledge à l'ouverture (statut "vu" implicite)
 *  - Bloc "Pourquoi" + entité avec valeurs courantes (montant, deadline, stage)
 *  - Timeline contexte placée en tête (mémoire active visible)
 *  - 1 CTA primaire contextuel ("Mettre à jour le montant à 8 000 €" / "Marquer traité")
 *  - Reporter regroupé dans un Popover compact
 *  - "Pas pertinent" en action discrète
 *  - Champs structurés pré-remplis avec valeurs actuelles
 *  - Push entité = toujours actif (suppression du toggle)
 *  - Raccourci Cmd/Ctrl+Enter pour valider la note
 *  - Badge "Reporté jusqu'au …" en header une fois snoozé
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  CheckCircle2, Clock, XCircle, ExternalLink, Send, Calendar,
  Euro, User, Loader2, MessageSquare, Sparkles, Lightbulb,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { entityRoute, formatCurrency, STAGE_LABELS } from './helpers';
import { useAIAction, type AIActionSnapshot, type AIActionStatus } from '@/hooks/cockpit/useAIAction';
import { useEntitySnapshot } from '@/hooks/cockpit/useEntitySnapshot';

interface AIActionDrawerProps {
  snapshot: AIActionSnapshot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig: Record<AIActionStatus, { label: string; className: string }> = {
  pending: { label: 'En attente', className: 'bg-muted text-muted-foreground' },
  acknowledged: { label: 'Vu', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30' },
  snoozed: { label: 'Reporté', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30' },
  done: { label: 'Traité', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  dismissed: { label: 'Ignoré', className: 'bg-destructive/10 text-destructive border-destructive/30' },
};

export function AIActionDrawer({ snapshot, open, onOpenChange }: AIActionDrawerProps) {
  const navigate = useNavigate();
  const { row, isLoading, updateStatus, addNote, applyStructuredUpdate } = useAIAction(snapshot);
  const { data: entity } = useEntitySnapshot(snapshot?.entity_type, snapshot?.entity_id);

  const [noteText, setNoteText] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newAmount, setNewAmount] = useState<string>('');
  const [newContact, setNewContact] = useState('');

  const currentStatus = row?.status ?? 'pending';
  const notes = row?.user_notes ?? [];

  // Auto-acknowledge silencieux à l'ouverture (1 fois, si encore pending)
  useEffect(() => {
    if (open && row && currentStatus === 'pending' && !updateStatus.isPending) {
      updateStatus.mutate({ status: 'acknowledged', silent: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, row?.id]);

  // Reset à la fermeture
  useEffect(() => {
    if (!open) {
      setNoteText('');
      setNewDeadline('');
      setNewAmount('');
      setNewContact('');
    }
  }, [open]);

  // Détection automatique du champ manquant le plus critique → CTA contextuel
  const missingField = useMemo<'amount' | 'deadline' | 'contact' | null>(() => {
    if (!snapshot?.entity_type) return null;
    const text = (snapshot.action_text + ' ' + (snapshot.reasoning || '')).toLowerCase();
    if (snapshot.entity_type === 'opportunity' && !entity?.amount && (text.includes('montant') || text.includes('pipeline'))) {
      return 'amount';
    }
    if (!entity?.deadline && (text.includes('deadline') || text.includes('échéance') || text.includes('date'))) {
      return 'deadline';
    }
    if (snapshot.entity_type === 'lead' && !entity?.contact && text.includes('contact')) {
      return 'contact';
    }
    return null;
  }, [snapshot, entity]);

  if (!snapshot) return null;

  const handleNavigateToEntity = () => {
    if (snapshot.entity_type && snapshot.entity_id) {
      onOpenChange(false);
      navigate(entityRoute(snapshot.entity_type, snapshot.entity_id));
    }
  };

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    addNote.mutate(noteText, { onSuccess: () => setNoteText('') });
  };

  const handleNoteKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleAddNote();
    }
  };

  const buildStructuredUpdates = () => {
    const updates: Record<string, unknown> = {};
    if (newDeadline && newDeadline !== entity?.deadline) updates.new_deadline = newDeadline;
    if (newAmount && !isNaN(Number(newAmount)) && Number(newAmount) !== entity?.amount) {
      updates.new_amount = Number(newAmount);
    }
    if (newContact.trim() && newContact.trim() !== entity?.contact) updates.new_contact = newContact.trim();
    return updates;
  };

  const pendingUpdates = buildStructuredUpdates();
  const hasUpdates = Object.keys(pendingUpdates).length > 0;

  // Label dynamique du CTA primaire
  const primaryCtaLabel = useMemo(() => {
    if (hasUpdates) {
      const parts: string[] = [];
      if (pendingUpdates.new_amount) parts.push(`montant à ${formatCurrency(pendingUpdates.new_amount as number)}`);
      if (pendingUpdates.new_deadline) parts.push(`deadline ${format(new Date(pendingUpdates.new_deadline as string), 'dd MMM', { locale: fr })}`);
      if (pendingUpdates.new_contact) parts.push('contact');
      return `Mettre à jour ${parts.join(' · ')}`;
    }
    return 'Marquer comme traité';
  }, [hasUpdates, pendingUpdates]);

  const handlePrimaryCta = () => {
    if (hasUpdates) {
      applyStructuredUpdate.mutate(
        { updates: pendingUpdates, pushToEntity: true },
        {
          onSuccess: () => {
            setNewDeadline('');
            setNewAmount('');
            setNewContact('');
            updateStatus.mutate({ status: 'done' });
          },
        },
      );
    } else {
      updateStatus.mutate({ status: 'done' });
    }
  };

  const handleSnooze = (days: number) => {
    updateStatus.mutate({ status: 'snoozed', snoozeDays: days });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col p-0 gap-0">
        {/* HEADER */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b space-y-2 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <Badge variant="outline" className="text-[10px] capitalize">
              {snapshot.source.replace('_', ' ')}
            </Badge>
            {snapshot.urgency && (
              <Badge
                variant={snapshot.urgency === 'critical' ? 'destructive' : 'secondary'}
                className="text-[10px] capitalize"
              >
                {snapshot.urgency}
              </Badge>
            )}
            <Badge variant="outline" className={cn('text-[10px] ml-auto', statusConfig[currentStatus].className)}>
              {statusConfig[currentStatus].label}
              {currentStatus === 'snoozed' && row?.snooze_until && (
                <span className="ml-1">· {format(new Date(row.snooze_until), 'dd MMM', { locale: fr })}</span>
              )}
            </Badge>
          </div>
          <SheetTitle className="text-base leading-snug pr-4">{snapshot.action_text}</SheetTitle>
          {snapshot.entity_name && (
            <SheetDescription className="text-xs">
              {snapshot.entity_type && <span className="capitalize">{snapshot.entity_type} · </span>}
              <span className="font-medium">{snapshot.entity_name}</span>
              {entity?.amount ? <span> · {formatCurrency(entity.amount)}</span> : null}
              {entity?.stage ? <span> · {STAGE_LABELS[entity.stage] || entity.stage}</span> : null}
            </SheetDescription>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-5 space-y-5">
            {/* POURQUOI — reasoning IA */}
            {snapshot.reasoning && (
              <div className="rounded-lg border bg-primary/5 border-primary/20 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Lightbulb className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                    Pourquoi cette action
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-foreground/90">{snapshot.reasoning}</p>
              </div>
            )}

            {/* ENTITÉ — état courant */}
            {snapshot.entity_type && snapshot.entity_id && (
              <div className="rounded-lg border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    État actuel
                  </Label>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={handleNavigateToEntity}>
                    Ouvrir <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Montant</p>
                    <p className="font-medium">{entity?.amount ? formatCurrency(entity.amount) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Échéance</p>
                    <p className="font-medium">
                      {entity?.deadline ? format(new Date(entity.deadline), 'dd MMM yy', { locale: fr }) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Contact</p>
                    <p className="font-medium truncate">{entity?.contact || '—'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* TIMELINE — contexte (en haut, mémoire active) */}
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
                <MessageSquare className="h-3 w-3" /> Contexte ({notes.length})
              </Label>

              {notes.length > 0 && (
                <div className="space-y-1.5 mb-2 max-h-48 overflow-y-auto">
                  {[...notes].reverse().map((note, i) => (
                    <div key={i} className="bg-muted/40 rounded-md p-2 text-xs">
                      <p className="leading-relaxed whitespace-pre-wrap">{note.text}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {note.by && <span>{note.by} · </span>}
                        {formatDistanceToNow(new Date(note.at), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={handleNoteKeyDown}
                placeholder="Ajouter du contexte (sera réinjecté dans le prochain brief IA)... ⌘+↵ pour envoyer"
                rows={2}
                className="text-xs resize-none"
              />
              <Button
                size="sm"
                variant="ghost"
                className="w-full mt-1 h-7 text-xs"
                onClick={handleAddNote}
                disabled={addNote.isPending || !noteText.trim()}
              >
                {addNote.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Send className="h-3 w-3 mr-1.5" /> Ajouter au contexte
                  </>
                )}
              </Button>
            </div>

            <Separator />

            {/* CHAMPS STRUCTURÉS — pré-remplis */}
            {snapshot.entity_type && snapshot.entity_id && (
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 block">
                  Mettre à jour {missingField && (
                    <span className="text-primary normal-case ml-1">
                      · le champ "{missingField === 'amount' ? 'montant' : missingField === 'deadline' ? 'échéance' : 'contact'}" est manquant
                    </span>
                  )}
                </Label>
                <div className="space-y-2">
                  {(snapshot.entity_type === 'opportunity') && (
                    <div className="flex items-center gap-2">
                      <Euro className={cn('h-3.5 w-3.5 shrink-0', missingField === 'amount' ? 'text-primary' : 'text-muted-foreground')} />
                      <Input
                        type="number"
                        value={newAmount}
                        onChange={(e) => setNewAmount(e.target.value)}
                        placeholder={entity?.amount ? `Actuel: ${entity.amount} €` : 'Montant (€)'}
                        autoFocus={missingField === 'amount'}
                        className={cn('h-8 text-xs', missingField === 'amount' && 'border-primary')}
                      />
                    </div>
                  )}
                  {(snapshot.entity_type === 'opportunity' || snapshot.entity_type === 'project') && (
                    <div className="flex items-center gap-2">
                      <Calendar className={cn('h-3.5 w-3.5 shrink-0', missingField === 'deadline' ? 'text-primary' : 'text-muted-foreground')} />
                      <Input
                        type="date"
                        value={newDeadline}
                        onChange={(e) => setNewDeadline(e.target.value)}
                        autoFocus={missingField === 'deadline'}
                        className={cn('h-8 text-xs', missingField === 'deadline' && 'border-primary')}
                      />
                    </div>
                  )}
                  {snapshot.entity_type === 'lead' && (
                    <div className="flex items-center gap-2">
                      <User className={cn('h-3.5 w-3.5 shrink-0', missingField === 'contact' ? 'text-primary' : 'text-muted-foreground')} />
                      <Input
                        value={newContact}
                        onChange={(e) => setNewContact(e.target.value)}
                        placeholder={entity?.contact ? `Actuel: ${entity.contact}` : 'Téléphone ou email'}
                        autoFocus={missingField === 'contact'}
                        className={cn('h-8 text-xs', missingField === 'contact' && 'border-primary')}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {isLoading && (
              <div className="flex items-center justify-center py-2 text-muted-foreground text-xs">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Chargement...
              </div>
            )}
          </div>
        </ScrollArea>

        {/* FOOTER — actions */}
        <div className="border-t bg-background px-6 py-3 space-y-2">
          <Button
            className="w-full"
            size="sm"
            onClick={handlePrimaryCta}
            disabled={updateStatus.isPending || applyStructuredUpdate.isPending}
          >
            {(updateStatus.isPending || applyStructuredUpdate.isPending) ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : hasUpdates ? (
              primaryCtaLabel
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> {primaryCtaLabel}
              </>
            )}
          </Button>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline" className="flex-1" disabled={updateStatus.isPending}>
                  <Clock className="h-3.5 w-3.5 mr-1.5" /> Reporter
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1" align="start">
                <Button size="sm" variant="ghost" className="w-full justify-start text-xs" onClick={() => handleSnooze(1)}>
                  Demain
                </Button>
                <Button size="sm" variant="ghost" className="w-full justify-start text-xs" onClick={() => handleSnooze(3)}>
                  Dans 3 jours
                </Button>
                <Button size="sm" variant="ghost" className="w-full justify-start text-xs" onClick={() => handleSnooze(7)}>
                  Dans 1 semaine
                </Button>
                <Button size="sm" variant="ghost" className="w-full justify-start text-xs" onClick={() => handleSnooze(30)}>
                  Dans 1 mois
                </Button>
              </PopoverContent>
            </Popover>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => updateStatus.mutate({ status: 'dismissed' })}
              disabled={updateStatus.isPending}
            >
              <XCircle className="h-3.5 w-3.5 mr-1.5" /> Pas pertinent
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
