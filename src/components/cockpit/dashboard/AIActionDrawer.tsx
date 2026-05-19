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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
  Pencil, Activity, ChevronDown, ChevronRight, Wand2, Mail, Copy,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { formatCurrency, STAGE_LABELS, safeNavigateToEntity } from './helpers';
import { useAIAction, type AIActionSnapshot, type AIActionStatus, type AIActionNote, type AIActionArtifact, type AIActionArtifactStatus } from '@/hooks/cockpit/useAIAction';
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
  const {
    row, isLoading, updateStatus, addNote, applyStructuredUpdate,
    generateArtifact, saveArtifactEdit, markArtifactSent,
  } = useAIAction(snapshot);
  const { data: entity } = useEntitySnapshot(snapshot?.entity_type, snapshot?.entity_id);

  const [noteText, setNoteText] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newAmount, setNewAmount] = useState<string>('');
  const [newContact, setNewContact] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'status'>('all');
  const [dismissReason, setDismissReason] = useState('');
  const [artifactModalOpen, setArtifactModalOpen] = useState(false);
  const [editedArtifact, setEditedArtifact] = useState<Record<string, string>>({});

  const currentStatus = row?.status ?? 'pending';
  const notes = row?.user_notes ?? [];
  const filteredNotes = useMemo(
    () => (historyFilter === 'status' ? notes.filter((n) => n.kind === 'status') : notes),
    [notes, historyFilter],
  );

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

  const handleNavigateToEntity = () => {
    onOpenChange(false);
    safeNavigateToEntity(navigate, snapshot.entity_type, snapshot.entity_id, snapshot.entity_name ?? undefined);
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

  // ── Validation stricte des champs critiques ─────────────────────────────
  // Erreurs renvoyées seulement si le champ est rempli (pas d'erreur si vide).
  const validationErrors = useMemo(() => {
    const errs: { amount?: string; deadline?: string; contact?: string } = {};

    if (newAmount.trim()) {
      const n = Number(newAmount);
      if (!/^-?\d+([.,]\d+)?$/.test(newAmount.replace(',', '.'))) {
        errs.amount = 'Format invalide (chiffres uniquement)';
      } else if (isNaN(n)) {
        errs.amount = 'Montant non numérique';
      } else if (n <= 0) {
        errs.amount = 'Le montant doit être supérieur à 0';
      } else if (n > 10_000_000) {
        errs.amount = 'Montant suspect (> 10 M€)';
      }
    }

    if (newDeadline.trim()) {
      // Input type="date" renvoie YYYY-MM-DD ; on tolère aussi un parsing libre.
      const d = new Date(newDeadline);
      if (isNaN(d.getTime())) {
        errs.deadline = 'Date invalide (format AAAA-MM-JJ attendu)';
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const min = new Date(today);
        min.setFullYear(min.getFullYear() - 1);
        const max = new Date(today);
        max.setFullYear(max.getFullYear() + 5);
        if (d < min) errs.deadline = 'Date trop ancienne (> 1 an dans le passé)';
        else if (d > max) errs.deadline = 'Date trop lointaine (> 5 ans)';
      }
    }

    if (newContact.trim()) {
      const c = newContact.trim();
      if (c.length < 4) {
        errs.contact = 'Trop court (minimum 4 caractères)';
      } else if (c.length > 120) {
        errs.contact = 'Trop long (maximum 120 caractères)';
      } else {
        // Doit ressembler à un email ou à un téléphone (chiffres + symboles tel)
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c);
        const isPhone = /^[+()\d\s.\-]{6,}$/.test(c);
        if (!isEmail && !isPhone) {
          errs.contact = 'Email ou téléphone attendu';
        }
      }
    }

    return errs;
  }, [newAmount, newDeadline, newContact]);






  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  const buildStructuredUpdates = () => {
    const updates: Record<string, unknown> = {};
    if (newDeadline && !validationErrors.deadline && newDeadline !== entity?.deadline) {
      updates.new_deadline = newDeadline;
    }
    if (newAmount && !validationErrors.amount) {
      const n = Number(newAmount.replace(',', '.'));
      if (n !== entity?.amount) updates.new_amount = n;
    }
    if (newContact.trim() && !validationErrors.contact && newContact.trim() !== entity?.contact) {
      updates.new_contact = newContact.trim();
    }
    return updates;
  };

  const pendingUpdates = buildStructuredUpdates();
  const hasUpdates = Object.keys(pendingUpdates).length > 0;

  // Libellé entité (ex: "l'opportunité R'U'SAFE", "le lead Parham")
  const entityTypeLabel = useMemo(() => {
    switch (snapshot?.entity_type) {
      case 'opportunity': return "l'opportunité";
      case 'lead': return 'le lead';
      case 'project': return 'le projet';
      case 'contact': return 'le contact';
      default: return null;
    }
  }, [snapshot?.entity_type]);

  const entityDisplayName = entity?.name?.trim() || snapshot?.entity_name?.trim() || '';
  const entityRef = entityTypeLabel
    ? `${entityTypeLabel}${entityDisplayName ? ` ${entityDisplayName}` : ''}`
    : entityDisplayName || 'cette action';

  // Aperçu structuré des changements (diff before → after)
  const changePreview = useMemo(() => {
    if (!hasUpdates) return [];
    const rows: Array<{ field: string; label: string; before: string; after: string }> = [];
    if (pendingUpdates.new_amount !== undefined) {
      rows.push({
        field: 'amount',
        label: 'Montant',
        before: entity?.amount != null ? formatCurrency(entity.amount) : '—',
        after: formatCurrency(pendingUpdates.new_amount as number),
      });
    }
    if (pendingUpdates.new_deadline !== undefined) {
      rows.push({
        field: 'deadline',
        label: 'Échéance',
        before: entity?.deadline ? format(new Date(entity.deadline), 'dd MMM yyyy', { locale: fr }) : '—',
        after: format(new Date(pendingUpdates.new_deadline as string), 'dd MMM yyyy', { locale: fr }),
      });
    }
    if (pendingUpdates.new_contact !== undefined) {
      rows.push({
        field: 'contact',
        label: 'Contact',
        before: entity?.contact || '—',
        after: pendingUpdates.new_contact as string,
      });
    }
    return rows;
  }, [hasUpdates, pendingUpdates, entity]);

  // Label dynamique du CTA primaire — reflète l'entité + le nombre de changements
  const primaryCtaLabel = useMemo(() => {
    if (hasValidationErrors) return "Corriger les erreurs avant d'enregistrer";
    if (hasUpdates) {
      const n = changePreview.length;
      return `Appliquer ${n} changement${n > 1 ? 's' : ''} à ${entityRef}`;
    }
    return entityTypeLabel ? `Marquer traité sur ${entityRef}` : 'Marquer comme traité';
  }, [hasUpdates, hasValidationErrors, changePreview.length, entityRef, entityTypeLabel]);

  const handlePrimaryCta = () => {
    if (hasValidationErrors) {
      const first = Object.values(validationErrors)[0];
      toast.error(first || 'Veuillez corriger les erreurs avant d\'enregistrer');
      return;
    }
    if (hasUpdates) {
      applyStructuredUpdate.mutate(
        { updates: pendingUpdates, pushToEntity: true },
        {
          onSuccess: () => {
            setNewDeadline('');
            setNewAmount('');
            setNewContact('');
            updateStatus.mutate({
              status: 'done',
              actor: 'user',
              reason: `Action validée après mise à jour de ${entityRef}`,
            });
          },
        },
      );
    } else {
      updateStatus.mutate({
        status: 'done',
        actor: 'user',
        reason: noteText.trim() ? `Validée avec note : "${noteText.trim().slice(0, 80)}"` : 'Marquée traitée manuellement',
      });
    }
  };

  const handleSnooze = (days: number, reason?: string) => {
    updateStatus.mutate({
      status: 'snoozed',
      snoozeDays: days,
      actor: 'user',
      reason: reason || `Reporté de ${days} jour${days > 1 ? 's' : ''} par l'utilisateur`,
    });
  };

  const handleDismiss = () => {
    updateStatus.mutate({
      status: 'dismissed',
      actor: 'user',
      reason: dismissReason.trim() || 'Action jugée non pertinente (aucun motif précisé)',
    });
    setDismissReason('');
  };

  if (!snapshot) return null;

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

            {/* HISTORIQUE — timeline unifiée cliquable (notes + updates + statuts) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MessageSquare className="h-3 w-3" /> Historique ({notes.length})
                </Label>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={historyFilter === 'all' ? 'secondary' : 'ghost'}
                    className="h-5 px-1.5 text-[10px]"
                    onClick={() => setHistoryFilter('all')}
                  >
                    Tout
                  </Button>
                  <Button
                    size="sm"
                    variant={historyFilter === 'status' ? 'secondary' : 'ghost'}
                    className="h-5 px-1.5 text-[10px]"
                    onClick={() => setHistoryFilter('status')}
                  >
                    Logs statut
                  </Button>
                </div>
              </div>

              {filteredNotes.length > 0 ? (
                <div className="space-y-1.5 mb-2 max-h-64 overflow-y-auto">
                  {[...filteredNotes].reverse().map((note, i) => (
                    <TimelineEntry key={`${note.at}-${i}`} note={note} />
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground italic mb-2">
                  {historyFilter === 'status'
                    ? 'Aucun changement de statut enregistré.'
                    : 'Aucune action enregistrée. Vos notes et modifications apparaîtront ici.'}
                </p>
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

            {/* BROUILLON IA — pré-génération d'artefacts (Étape 2.3 Vague 2) */}
            <ArtifactSection
              artifact={row?.artifact ?? null}
              status={row?.artifact_status ?? 'none'}
              generating={generateArtifact.isPending}
              onGenerate={() => generateArtifact.mutate(false)}
              onRegenerate={() => generateArtifact.mutate(true)}
              onOpen={() => {
                const a = row?.artifact;
                if (!a) return;
                setEditedArtifact({
                  subject: String(a.subject || ''),
                  body: String(a.body || ''),
                  cta: String(a.cta || ''),
                  title: String(a.title || ''),
                  content: String(a.content || ''),
                });
                setArtifactModalOpen(true);
              }}
            />

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
                    <div>
                      <div className="flex items-center gap-2">
                        <Euro className={cn('h-3.5 w-3.5 shrink-0',
                          validationErrors.amount ? 'text-destructive'
                            : missingField === 'amount' ? 'text-primary' : 'text-muted-foreground')} />
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={newAmount}
                          onChange={(e) => setNewAmount(e.target.value)}
                          placeholder={entity?.amount ? `Actuel: ${entity.amount} €` : 'Montant (€)'}
                          autoFocus={missingField === 'amount'}
                          aria-invalid={!!validationErrors.amount}
                          className={cn(
                            'h-8 text-xs',
                            validationErrors.amount ? 'border-destructive focus-visible:ring-destructive'
                              : missingField === 'amount' && 'border-primary',
                          )}
                        />
                      </div>
                      {validationErrors.amount && (
                        <p className="text-[10px] text-destructive mt-1 ml-5.5 pl-1">{validationErrors.amount}</p>
                      )}
                    </div>
                  )}
                  {(snapshot.entity_type === 'opportunity' || snapshot.entity_type === 'project') && (
                    <div>
                      <div className="flex items-center gap-2">
                        <Calendar className={cn('h-3.5 w-3.5 shrink-0',
                          validationErrors.deadline ? 'text-destructive'
                            : missingField === 'deadline' ? 'text-primary' : 'text-muted-foreground')} />
                        <Input
                          type="date"
                          value={newDeadline}
                          onChange={(e) => setNewDeadline(e.target.value)}
                          autoFocus={missingField === 'deadline'}
                          aria-invalid={!!validationErrors.deadline}
                          className={cn(
                            'h-8 text-xs',
                            validationErrors.deadline ? 'border-destructive focus-visible:ring-destructive'
                              : missingField === 'deadline' && 'border-primary',
                          )}
                        />
                      </div>
                      {validationErrors.deadline && (
                        <p className="text-[10px] text-destructive mt-1 pl-1">{validationErrors.deadline}</p>
                      )}
                    </div>
                  )}
                  {snapshot.entity_type === 'lead' && (
                    <div>
                      <div className="flex items-center gap-2">
                        <User className={cn('h-3.5 w-3.5 shrink-0',
                          validationErrors.contact ? 'text-destructive'
                            : missingField === 'contact' ? 'text-primary' : 'text-muted-foreground')} />
                        <Input
                          value={newContact}
                          onChange={(e) => setNewContact(e.target.value)}
                          placeholder={entity?.contact ? `Actuel: ${entity.contact}` : 'Téléphone ou email'}
                          autoFocus={missingField === 'contact'}
                          aria-invalid={!!validationErrors.contact}
                          className={cn(
                            'h-8 text-xs',
                            validationErrors.contact ? 'border-destructive focus-visible:ring-destructive'
                              : missingField === 'contact' && 'border-primary',
                          )}
                        />
                      </div>
                      {validationErrors.contact && (
                        <p className="text-[10px] text-destructive mt-1 pl-1">{validationErrors.contact}</p>
                      )}
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
          {/* Aperçu des changements à appliquer */}
          {hasUpdates && !hasValidationErrors && (
            <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                <Pencil className="h-3 w-3" />
                Aperçu — {changePreview.length} changement{changePreview.length > 1 ? 's' : ''} sur {entityRef}
              </div>
              <div className="space-y-1">
                {changePreview.map((c) => (
                  <div key={c.field} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground w-16 shrink-0">{c.label}</span>
                    <span className="text-muted-foreground line-through truncate max-w-[35%]">{c.before}</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="font-medium text-foreground truncate">{c.after}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            className="w-full"
            size="sm"
            variant={hasValidationErrors ? 'outline' : 'default'}
            onClick={handlePrimaryCta}
            disabled={updateStatus.isPending || applyStructuredUpdate.isPending || hasValidationErrors}
          >
            {(updateStatus.isPending || applyStructuredUpdate.isPending) ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : hasValidationErrors ? (
              <span className="text-destructive">{primaryCtaLabel}</span>
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
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  disabled={updateStatus.isPending}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1.5" /> Pas pertinent
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3 space-y-2" align="end">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Motif (optionnel — logué dans l'historique)
                </Label>
                <Textarea
                  value={dismissReason}
                  onChange={(e) => setDismissReason(e.target.value)}
                  placeholder="Ex: déjà traité hors plateforme, info obsolète..."
                  rows={2}
                  className="text-xs resize-none"
                />
                <Button size="sm" variant="destructive" className="w-full" onClick={handleDismiss}>
                  <XCircle className="h-3.5 w-3.5 mr-1.5" /> Confirmer l'ignorance
                </Button>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </SheetContent>

      {/* Modal édition du brouillon IA */}
      <Dialog open={artifactModalOpen} onOpenChange={setArtifactModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              {row?.artifact?.type === 'email' ? <Mail className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
              Brouillon {row?.artifact?.type === 'email' ? 'email' : 'note'} — éditable
            </DialogTitle>
          </DialogHeader>

          {row?.artifact?.type === 'email' ? (
            <div className="space-y-3">
              {row.artifact.recipient_email && (
                <div className="text-[11px] text-muted-foreground">
                  À : <span className="font-medium text-foreground">{row.artifact.recipient_name || ''}</span>{' '}
                  &lt;{row.artifact.recipient_email}&gt;
                </div>
              )}
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Objet</Label>
                <Input
                  value={editedArtifact.subject ?? ''}
                  onChange={(e) => setEditedArtifact((s) => ({ ...s, subject: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Corps</Label>
                <Textarea
                  value={editedArtifact.body ?? ''}
                  onChange={(e) => setEditedArtifact((s) => ({ ...s, body: e.target.value }))}
                  rows={10}
                  className="text-xs font-mono leading-relaxed"
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">CTA</Label>
                <Input
                  value={editedArtifact.cta ?? ''}
                  onChange={(e) => setEditedArtifact((s) => ({ ...s, cta: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Titre</Label>
                <Input
                  value={editedArtifact.title ?? ''}
                  onChange={(e) => setEditedArtifact((s) => ({ ...s, title: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Contenu</Label>
                <Textarea
                  value={editedArtifact.content ?? ''}
                  onChange={(e) => setEditedArtifact((s) => ({ ...s, content: e.target.value }))}
                  rows={10}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const a = row?.artifact;
                if (!a) return;
                const text = a.type === 'email'
                  ? `Objet : ${editedArtifact.subject}\n\n${editedArtifact.body}\n\n${editedArtifact.cta || ''}`
                  : `${editedArtifact.title}\n\n${editedArtifact.content}`;
                navigator.clipboard.writeText(text);
                markArtifactSent.mutate();
                toast.success('Copié dans le presse-papier');
              }}
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" /> Copier
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const a = row?.artifact;
                if (!a) return;
                const merged: AIActionArtifact = { ...a, ...editedArtifact } as AIActionArtifact;
                saveArtifactEdit.mutate(merged, {
                  onSuccess: () => setArtifactModalOpen(false),
                });
              }}
              disabled={saveArtifactEdit.isPending}
            >
              {saveArtifactEdit.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (
                <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Enregistrer</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ArtifactSection — bloc "Brouillon IA" dans le drawer
// ─────────────────────────────────────────────────────────────────────────────

function ArtifactSection({
  artifact,
  status,
  generating,
  onGenerate,
  onRegenerate,
  onOpen,
}: {
  artifact: AIActionArtifact | null;
  status: AIActionArtifactStatus;
  generating: boolean;
  onGenerate: () => void;
  onRegenerate: () => void;
  onOpen: () => void;
}) {
  const hasArtifact = !!artifact && ['ready', 'edited', 'sent'].includes(status);

  const preview = artifact
    ? artifact.type === 'email'
      ? (artifact.subject || artifact.body || '').slice(0, 120)
      : (artifact.title || artifact.content || '').slice(0, 120)
    : '';

  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
        <Wand2 className="h-3 w-3" /> Brouillon IA
        {status === 'edited' && <Badge variant="outline" className="text-[9px] h-4">édité</Badge>}
        {status === 'sent' && <Badge variant="outline" className="text-[9px] h-4 border-emerald-500/40 text-emerald-700 dark:text-emerald-400">envoyé</Badge>}
        {status === 'failed' && <Badge variant="destructive" className="text-[9px] h-4">échec</Badge>}
      </Label>

      {!hasArtifact ? (
        <Button
          size="sm"
          variant="outline"
          className="w-full h-8 text-xs"
          onClick={onGenerate}
          disabled={generating}
        >
          {generating ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Génération…</>
          ) : (
            <><Wand2 className="h-3.5 w-3.5 mr-1.5" /> Générer un brouillon</>
          )}
        </Button>
      ) : (
        <div className="rounded-md border bg-card p-2.5 space-y-2">
          <div className="flex items-start gap-2">
            {artifact!.type === 'email' ? <Mail className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> : <Pencil className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">
                {artifact!.type === 'email' ? (artifact!.subject || 'Sans objet') : (artifact!.title || 'Sans titre')}
              </p>
              <p className="text-[10px] text-muted-foreground line-clamp-2">{preview}</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <Button size="sm" variant="default" className="flex-1 h-7 text-xs" onClick={onOpen}>
              Voir / éditer
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onRegenerate} disabled={generating}>
              {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Régénérer'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// TimelineEntry — entrée d'historique cliquable (notes + statuts + updates)
// ─────────────────────────────────────────────────────────────────────────────

const fieldLabelsFr: Record<string, string> = {
  new_deadline: 'Échéance',
  new_amount: 'Montant',
  new_contact: 'Contact',
  new_stage: 'Stage',
};

function formatFieldValue(field: string, value: unknown): string {
  if (value == null || value === '') return '—';
  if (field === 'new_amount' && typeof value === 'number') return formatCurrency(value);
  if (field === 'new_deadline' && typeof value === 'string') {
    try { return format(new Date(value), 'dd MMM yyyy', { locale: fr }); } catch { return String(value); }
  }
  if (field === 'new_stage' && typeof value === 'string') return STAGE_LABELS[value] || value;
  return String(value);
}

function TimelineEntry({ note }: { note: AIActionNote }) {
  const [expanded, setExpanded] = useState(false);
  const kind = note.kind ?? 'note';
  const changes = (note.meta?.changes as Array<{ field: string; before: unknown; after: unknown }>) || [];
  const hasDetails = kind === 'update' && changes.length > 0;
  const entitySynced = !!note.meta?.entity_synced;
  const entityFields = (note.meta?.entity_fields as string[]) || [];
  const entityType = note.meta?.entity_type as string | undefined;
  const actor = (note.meta?.actor as 'user' | 'system' | undefined) ?? (note.by === 'system' ? 'system' : 'user');
  const reason = note.meta?.reason as string | undefined;
  const previousStatus = note.meta?.previous_status as string | undefined;
  const newStatus = note.meta?.status as string | undefined;

  const config = {
    note: { icon: MessageSquare, color: 'text-muted-foreground', bg: 'bg-muted/40', label: 'Note' },
    status: { icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/5 border-blue-500/20', label: 'Statut' },
    update: { icon: Pencil, color: 'text-primary', bg: 'bg-primary/5 border-primary/20', label: 'Mise à jour' },
  }[kind];

  const Icon = config.icon;

  return (
    <div
      className={cn(
        'rounded-md border p-2 text-xs transition-colors',
        config.bg,
        hasDetails && 'cursor-pointer hover:bg-primary/10',
      )}
      onClick={hasDetails ? () => setExpanded((v) => !v) : undefined}
    >
      <div className="flex items-start gap-2">
        <Icon className={cn('h-3.5 w-3.5 shrink-0 mt-0.5', config.color)} />
        <div className="flex-1 min-w-0">
          <p className="leading-relaxed whitespace-pre-wrap break-words">{note.text}</p>

          {/* Badges spécifiques aux changements de statut (log événementiel) */}
          {kind === 'status' && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              <Badge
                variant="outline"
                className={cn(
                  'text-[9px] h-4 px-1.5 gap-1',
                  actor === 'system'
                    ? 'border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-400'
                    : 'border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400',
                )}
              >
                {actor === 'system' ? 'Système' : 'Utilisateur'}
              </Badge>
              {previousStatus && newStatus && previousStatus !== newStatus && (
                <Badge variant="outline" className="text-[9px] h-4 px-1.5 text-muted-foreground">
                  {previousStatus} → {newStatus}
                </Badge>
              )}
              {reason && (
                <span className="text-[10px] text-muted-foreground italic truncate max-w-full">
                  « {reason} »
                </span>
              )}
            </div>
          )}

          {/* Badge de confirmation de sync entité — visible immédiatement */}
          {kind === 'update' && entitySynced && (
            <div className="flex items-center gap-1 mt-1">
              <Badge
                variant="outline"
                className="text-[9px] h-4 px-1.5 gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              >
                <CheckCircle2 className="h-2.5 w-2.5" />
                {entityType ? `Synchronisé sur ${entityType}` : 'Synchronisé'}
                {entityFields.length > 0 && ` · ${entityFields.join(', ')}`}
              </Badge>
            </div>
          )}
          {kind === 'update' && !entitySynced && note.meta?.pushed === false && (
            <div className="flex items-center gap-1 mt-1">
              <Badge variant="outline" className="text-[9px] h-4 px-1.5 text-muted-foreground">
                Action IA seulement
              </Badge>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground mt-0.5">
            <span className="font-medium">{config.label}</span>
            {note.by && <span> · {note.by}</span>}
            <span> · {formatDistanceToNow(new Date(note.at), { addSuffix: true, locale: fr })}</span>
            <span className="ml-1 opacity-60">({format(new Date(note.at), 'dd/MM HH:mm', { locale: fr })})</span>
          </p>

          {expanded && hasDetails && (
            <div className="mt-2 pt-2 border-t border-border/40 space-y-1">
              {changes.map((c, i) => (
                <div key={i} className="flex items-baseline gap-1 text-[11px]">
                  <span className="font-medium text-muted-foreground w-16 shrink-0">
                    {fieldLabelsFr[c.field] || c.field}
                  </span>
                  <span className="text-muted-foreground line-through opacity-70">
                    {formatFieldValue(c.field, c.before)}
                  </span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
                  <span className="font-medium text-foreground">
                    {formatFieldValue(c.field, c.after)}
                  </span>
                </div>
              ))}
              {entitySynced && (
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Champs poussés en base : {entityFields.join(', ') || '—'}
                </p>
              )}
            </div>
          )}
        </div>
        {hasDetails && (
          <ChevronDown
            className={cn('h-3 w-3 text-muted-foreground shrink-0 mt-1 transition-transform', expanded && 'rotate-180')}
          />
        )}
      </div>
    </div>
  );
}
