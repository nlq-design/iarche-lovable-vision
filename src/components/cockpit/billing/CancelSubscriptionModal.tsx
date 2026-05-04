import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId: string | null;
  onSuccess: () => void;
}

const REASONS: Array<{ value: string; label: string }> = [
  { value: 'too_expensive', label: 'Trop cher' },
  { value: 'missing_features', label: 'Manque une fonctionnalité' },
  { value: 'low_quality', label: 'Pas adapté à mon usage' },
  { value: 'other', label: 'Autre raison' },
];

export function CancelSubscriptionModal({ open, onOpenChange, workspaceId, onSuccess }: Props) {
  const [reason, setReason] = useState<string>('other');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!workspaceId) {
      toast.error('Workspace introuvable');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-cancel', {
        body: { workspace_id: workspaceId, reason },
      });
      if (error) {
        toast.error(error.message ?? "Échec de l'annulation");
        return;
      }
      toast.success('Abonnement annulé. Vous gardez l’accès jusqu’à la fin de la période.');
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erreur inattendue');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Annuler votre abonnement</DialogTitle>
          <DialogDescription>
            Votre accès reste actif jusqu’à la fin de la période en cours. Vous pourrez réactiver
            votre abonnement à tout moment depuis vos paramètres.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <p className="mb-3 text-sm font-medium text-foreground">Pourquoi nous quittez-vous ?</p>
          <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
            {REASONS.map((r) => (
              <div key={r.value} className="flex items-center space-x-2">
                <RadioGroupItem value={r.value} id={`reason-${r.value}`} />
                <Label htmlFor={`reason-${r.value}`} className="text-sm font-normal">
                  {r.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Garder mon abonnement
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmer l’annulation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
