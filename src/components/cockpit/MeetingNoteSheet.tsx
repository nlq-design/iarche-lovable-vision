import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, User, Building, Plus, Trash2, Save, FileText } from 'lucide-react';
import { useCockpitMeetingNotes } from '@/hooks/cockpit/useCockpitMeetingNotes';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';

type Booking = Database['public']['Tables']['bookings']['Row'];
type MeetingNote = Database['public']['Tables']['meeting_notes']['Row'];

interface ActionItem {
  id: string;
  text: string;
  done: boolean;
}

interface MeetingNoteSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking?: Booking | null;
  existingNote?: MeetingNote | null;
  opportunityId?: string;
  projectId?: string;
}

export function MeetingNoteSheet({ 
  open, 
  onOpenChange, 
  booking,
  existingNote,
  opportunityId,
  projectId 
}: MeetingNoteSheetProps) {
  const { createMeetingNote, updateMeetingNote } = useCockpitMeetingNotes();

  const [objectives, setObjectives] = useState('');
  const [notes, setNotes] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number | undefined>();
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [newActionItem, setNewActionItem] = useState('');

  // Pré-remplir avec les données du booking ou de la note existante
  useEffect(() => {
    if (existingNote) {
      setObjectives(existingNote.objectives || '');
      setNotes(existingNote.notes || '');
      setNextSteps(existingNote.next_steps || '');
      setDurationMinutes(existingNote.duration_minutes || undefined);
      const items = existingNote.action_items as unknown as ActionItem[];
      setActionItems(Array.isArray(items) ? items : []);
    } else if (booking) {
      // Pré-remplir avec les infos du RDV
      const bookingInfo = [
        `Participant: ${booking.name}`,
        booking.company ? `Entreprise: ${booking.company}` : null,
        booking.email ? `Email: ${booking.email}` : null,
        booking.message ? `Message initial: ${booking.message}` : null,
      ].filter(Boolean).join('\n');
      
      setObjectives(`RDV du ${format(new Date(booking.start_time), 'dd/MM/yyyy HH:mm', { locale: fr })}`);
      setNotes(bookingInfo);
      setNextSteps('');
      setDurationMinutes(undefined);
      setActionItems([]);
    } else {
      // Reset
      setObjectives('');
      setNotes('');
      setNextSteps('');
      setDurationMinutes(undefined);
      setActionItems([]);
    }
  }, [booking, existingNote, open]);

  const handleAddActionItem = () => {
    if (!newActionItem.trim()) return;
    setActionItems([...actionItems, { 
      id: crypto.randomUUID(), 
      text: newActionItem.trim(), 
      done: false 
    }]);
    setNewActionItem('');
  };

  const handleRemoveActionItem = (id: string) => {
    setActionItems(actionItems.filter(item => item.id !== id));
  };

  const handleToggleActionItem = (id: string) => {
    setActionItems(actionItems.map(item => 
      item.id === id ? { ...item, done: !item.done } : item
    ));
  };

  const handleSave = async () => {
    const noteData = {
      objectives,
      notes,
      next_steps: nextSteps,
      duration_minutes: durationMinutes,
      action_items: actionItems as unknown as Database['public']['Tables']['meeting_notes']['Row']['action_items'],
      booking_id: booking?.id || existingNote?.booking_id || null,
      opportunity_id: opportunityId || existingNote?.opportunity_id || null,
      project_id: projectId || existingNote?.project_id || null,
    };

    if (existingNote) {
      await updateMeetingNote.mutateAsync({ id: existingNote.id, updates: noteData });
    } else {
      await createMeetingNote.mutateAsync(noteData);
    }
    onOpenChange(false);
  };

  const isSubmitting = createMeetingNote.isPending || updateMeetingNote.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {existingNote ? 'Modifier le compte-rendu' : 'Nouveau compte-rendu'}
          </SheetTitle>
          <SheetDescription>
            {booking ? (
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(booking.start_time), 'dd MMM yyyy', { locale: fr })}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(booking.start_time), 'HH:mm', { locale: fr })}
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {booking.name}
                </Badge>
                {booking.company && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    {booking.company}
                  </Badge>
                )}
              </div>
            ) : (
              'Renseignez les informations de la réunion'
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Objectifs */}
          <div className="space-y-2">
            <Label htmlFor="objectives">Objectifs de la réunion</Label>
            <Textarea
              id="objectives"
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              placeholder="Quels étaient les objectifs ?"
              rows={2}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes / Compte-rendu</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ce qui a été discuté..."
              rows={6}
            />
          </div>

          {/* Durée */}
          <div className="space-y-2">
            <Label htmlFor="duration">Durée (minutes)</Label>
            <Input
              id="duration"
              type="number"
              value={durationMinutes || ''}
              onChange={(e) => setDurationMinutes(e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="30"
            />
          </div>

          <Separator />

          {/* Action items */}
          <div className="space-y-3">
            <Label>Actions à mener</Label>
            <div className="flex gap-2">
              <Input
                value={newActionItem}
                onChange={(e) => setNewActionItem(e.target.value)}
                placeholder="Ajouter une action..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddActionItem()}
              />
              <Button type="button" size="icon" variant="outline" onClick={handleAddActionItem}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {actionItems.length > 0 && (
              <div className="space-y-2">
                {actionItems.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex items-center gap-2 p-2 rounded border bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => handleToggleActionItem(item.id)}
                      className="h-4 w-4"
                    />
                    <span className={`flex-1 text-sm ${item.done ? 'line-through text-muted-foreground' : ''}`}>
                      {item.text}
                    </span>
                    <Button 
                      type="button" 
                      size="icon" 
                      variant="ghost" 
                      className="h-6 w-6"
                      onClick={() => handleRemoveActionItem(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Prochaines étapes */}
          <div className="space-y-2">
            <Label htmlFor="nextSteps">Prochaines étapes</Label>
            <Textarea
              id="nextSteps"
              value={nextSteps}
              onChange={(e) => setNextSteps(e.target.value)}
              placeholder="Quelles sont les prochaines étapes ?"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleSave} 
              disabled={isSubmitting}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
