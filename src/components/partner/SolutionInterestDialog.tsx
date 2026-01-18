import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreateSolutionInterest } from '@/hooks/partner/usePartnerSolutionInterests';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

interface SolutionInterestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solutionId: string;
  solutionTitle: string;
}

export function SolutionInterestDialog({
  open,
  onOpenChange,
  solutionId,
  solutionTitle,
}: SolutionInterestDialogProps) {
  const createInterest = useCreateSolutionInterest();
  
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createInterest.mutateAsync({
        solution_id: solutionId,
        client_name: clientName || undefined,
        client_email: clientEmail || undefined,
        client_company: clientCompany || undefined,
        notes: notes || undefined,
      });
      
      toast.success('Intérêt signalé avec succès');
      onOpenChange(false);
      
      // Reset form
      setClientName('');
      setClientEmail('');
      setClientCompany('');
      setNotes('');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'enregistrement');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Signaler un intérêt client</DialogTitle>
            <DialogDescription>
              Solution: <strong>{solutionTitle}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Nom du client (optionnel)</Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Jean Dupont"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientEmail">Email du client (optionnel)</Label>
              <Input
                id="clientEmail"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="jean.dupont@entreprise.fr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientCompany">Entreprise (optionnel)</Label>
              <Input
                id="clientCompany"
                value={clientCompany}
                onChange={(e) => setClientCompany(e.target.value)}
                placeholder="Nom de l'entreprise"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contexte, besoins spécifiques..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createInterest.isPending}>
              {createInterest.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Signaler l'intérêt
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
