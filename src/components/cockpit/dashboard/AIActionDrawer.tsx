/**
 * AIActionDrawer — Sheet pour interagir avec un élément IA du dashboard.
 * Permet : changer statut, ajouter contexte texte libre, mettre à jour
 * des champs structurés (deadline, montant, contact) avec push optionnel
 * vers l'entité réelle (lead/opp/projet).
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  CheckCircle2, Clock, Eye, XCircle, ExternalLink, Send, Calendar,
  Euro, User, Loader2, MessageSquare, Sparkles,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { entityRoute, formatCurrency } from './helpers';
import { useAIAction, type AIActionSnapshot, type AIActionStatus } from '@/hooks/cockpit/useAIAction';

interface AIActionDrawerProps {
  snapshot: AIActionSnapshot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig: Record<AIActionStatus, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-muted text-muted-foreground' },
  acknowledged: { label: 'Vu', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
  snoozed: { label: 'Reporté', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  done: { label: 'Traité', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  dismissed: { label: 'Ignoré', color: 'bg-destructive/10 text-destructive' },
};

export function AIActionDrawer({ snapshot, open, onOpenChange }: AIActionDrawerProps) {
  const navigate = useNavigate();
  const { row, isLoading, updateStatus, addNote, applyStructuredUpdate } = useAIAction(snapshot);

  const [noteText, setNoteText] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newContact, setNewContact] = useState('');
  const [pushToEntity, setPushToEntity] = useState(true);

  if (!snapshot) return null;

  const currentStatus = row?.status ?? 'pending';
  const notes = row?.user_notes ?? [];
  const structured = row?.structured_updates ?? {};

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

  const handleApplyStructured = () => {
    const updates: Record<string, unknown> = {};
    if (newDeadline) updates.new_deadline = newDeadline;
    if (newAmount && !isNaN(Number(newAmount))) updates.new_amount = Number(newAmount);
    if (newContact.trim()) updates.new_contact = newContact.trim();
    if (Object.keys(updates).length === 0) return;
    applyStructuredUpdate.mutate(
      { updates, pushToEntity },
      {
        onSuccess: () => {
          setNewDeadline('');
          setNewAmount('');
          setNewContact('');
        },
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <Badge variant="outline" className="text-[10px] capitalize">{snapshot.source.replace('_', ' ')}</Badge>
            {snapshot.urgency && (
              <Badge variant={snapshot.urgency === 'critical' ? 'destructive' : 'secondary'} className="text-[10px] capitalize">
                {snapshot.urgency}
              </Badge>
            )}
            <Badge className={cn('text-[10px] ml-auto', statusConfig[currentStatus].color)}>
              {statusConfig[currentStatus].label}
            </Badge>
          </div>
          <SheetTitle className="text-base leading-snug pr-4">{snapshot.action_text}</SheetTitle>
          {snapshot.reasoning && (
            <SheetDescription className="text-xs leading-relaxed">{snapshot.reasoning}</SheetDescription>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-5">
            {/* Entité liée */}
            {snapshot.entity_type && snapshot.entity_id && (
              <div className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Entité</p>
                  <p className="text-sm font-medium truncate">{snapshot.entity_name || snapshot.entity_id}</p>
                </div>
                <div className="flex items-center gap-2">
                  {snapshot.impact_value && snapshot.impact_value > 0 && (
                    <span className="text-xs font-semibold text-primary">{formatCurrency(snapshot.impact_value)}</span>
                  )}
                  <Button size="sm" variant="ghost" onClick={handleNavigateToEntity}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Actions rapides — Statut */}
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Statut</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button size="sm" variant={currentStatus === 'acknowledged' ? 'default' : 'outline'}
                  onClick={() => updateStatus.mutate({ status: 'acknowledged' })} disabled={updateStatus.isPending}>
                  <Eye className="h-3.5 w-3.5 mr-1.5" /> Vu
                </Button>
                <Button size="sm" variant={currentStatus === 'done' ? 'default' : 'outline'}
                  onClick={() => updateStatus.mutate({ status: 'done' })} disabled={updateStatus.isPending}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Traité
                </Button>
                <Button size="sm" variant={currentStatus === 'snoozed' ? 'default' : 'outline'}
                  onClick={() => updateStatus.mutate({ status: 'snoozed', snoozeDays: 1 })} disabled={updateStatus.isPending}>
                  <Clock className="h-3.5 w-3.5 mr-1.5" /> Reporter 1j
                </Button>
                <Button size="sm" variant={currentStatus === 'snoozed' ? 'default' : 'outline'}
                  onClick={() => updateStatus.mutate({ status: 'snoozed', snoozeDays: 7 })} disabled={updateStatus.isPending}>
                  <Clock className="h-3.5 w-3.5 mr-1.5" /> Reporter 7j
                </Button>
                <Button size="sm" variant="outline" className="col-span-2 text-destructive hover:text-destructive"
                  onClick={() => updateStatus.mutate({ status: 'dismissed' })} disabled={updateStatus.isPending}>
                  <XCircle className="h-3.5 w-3.5 mr-1.5" /> Pas pertinent
                </Button>
              </div>
              {row?.snooze_until && currentStatus === 'snoozed' && (
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  Rappel le {format(new Date(row.snooze_until), 'dd MMM HH:mm', { locale: fr })}
                </p>
              )}
            </div>

            <Separator />

            {/* Champs structurés */}
            {snapshot.entity_type && snapshot.entity_id && (
              <>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Mise à jour structurée
                  </Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <Input type="date" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)}
                        placeholder="Nouvelle deadline" className="h-8 text-xs" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Euro className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <Input type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)}
                        placeholder="Nouveau montant (€)" className="h-8 text-xs" />
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <Input value={newContact} onChange={(e) => setNewContact(e.target.value)}
                        placeholder="Nouveau contact / téléphone" className="h-8 text-xs" />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <Label htmlFor="push-toggle" className="text-[11px] text-muted-foreground cursor-pointer">
                        Appliquer aussi à l'entité
                      </Label>
                      <Switch id="push-toggle" checked={pushToEntity} onCheckedChange={setPushToEntity} />
                    </div>
                    <Button size="sm" className="w-full" onClick={handleApplyStructured}
                      disabled={applyStructuredUpdate.isPending || (!newDeadline && !newAmount && !newContact.trim())}>
                      {applyStructuredUpdate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Enregistrer'}
                    </Button>
                  </div>

                  {/* Historique des updates structurés */}
                  {Object.keys(structured).length > 0 && (
                    <div className="mt-3 p-2 bg-muted/30 rounded text-[11px] space-y-0.5">
                      <p className="font-medium text-muted-foreground mb-1">Mises à jour précédentes</p>
                      {structured.new_deadline ? <p>📅 Deadline : {structured.new_deadline as string}</p> : null}
                      {structured.new_amount ? <p>💶 Montant : {formatCurrency(structured.new_amount as number)}</p> : null}
                      {structured.new_contact ? <p>📞 Contact : {structured.new_contact as string}</p> : null}
                    </div>
                  )}
                </div>
                <Separator />
              </>
            )}

            {/* Notes libres / timeline */}
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MessageSquare className="h-3 w-3" /> Contexte ({notes.length})
              </Label>
              <div className="mt-2 space-y-2">
                <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Ajouter une note, contexte, suivi... (sera réinjecté dans le prochain brief IA)"
                  rows={3} className="text-xs resize-none" />
                <Button size="sm" className="w-full" onClick={handleAddNote}
                  disabled={addNote.isPending || !noteText.trim()}>
                  {addNote.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Send className="h-3.5 w-3.5 mr-1.5" /> Ajouter</>}
                </Button>
              </div>

              {/* Timeline */}
              {notes.length > 0 && (
                <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                  {[...notes].reverse().map((note, i) => (
                    <div key={i} className="bg-muted/30 rounded-lg p-2 text-xs">
                      <p className="leading-relaxed whitespace-pre-wrap">{note.text}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {note.by && <span>{note.by} · </span>}
                        {formatDistanceToNow(new Date(note.at), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-4 text-muted-foreground text-xs">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Chargement...
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
