import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCockpitOpportunities, useCockpitLeads } from "@/hooks/cockpit";
import { Loader2 } from "lucide-react";

interface CreateOpportunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STAGES = ["lead", "r1", "r2", "pause", "won", "lost"] as const;

export const CreateOpportunityDialog = ({ open, onOpenChange }: CreateOpportunityDialogProps) => {
  const { createOpportunity } = useCockpitOpportunities();
  const { leads = [] } = useCockpitLeads();
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    lead_id: "",
    value_amount: "",
    probability: "50",
    stage: "lead",
    expected_close_date: "",
    source: "",
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      lead_id: "",
      value_amount: "",
      probability: "50",
      stage: "lead",
      expected_close_date: "",
      source: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createOpportunity.mutateAsync({
        title: formData.title,
        description: formData.description || undefined,
        lead_id: formData.lead_id || undefined,
        value_amount: formData.value_amount ? parseFloat(formData.value_amount) : undefined,
        probability: parseInt(formData.probability),
        stage: formData.stage,
        expected_close_date: formData.expected_close_date || undefined,
        source: formData.source || undefined,
      });
      resetForm();
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nouvelle opportunité</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Refonte site web"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="value">Montant (€)</Label>
              <Input
                id="value"
                type="number"
                value={formData.value_amount}
                onChange={(e) => setFormData({ ...formData, value_amount: e.target.value })}
                placeholder="15000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="probability">Probabilité (%)</Label>
              <Input
                id="probability"
                type="number"
                min="0"
                max="100"
                value={formData.probability}
                onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stage">Étape</Label>
              <Select value={formData.stage} onValueChange={(v) => setFormData({ ...formData, stage: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage === "lead" ? "Lead" :
                       stage === "r1" ? "R1" :
                       stage === "r2" ? "R2" :
                       stage === "pause" ? "Pause" :
                       stage === "won" ? "Gagné" :
                       stage === "lost" ? "Perdu" : stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="close_date">Date de clôture prévue</Label>
              <Input
                id="close_date"
                type="date"
                value={formData.expected_close_date}
                onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
              />
            </div>
          </div>

          {leads.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="lead">Lead associé</Label>
              <Select value={formData.lead_id} onValueChange={(v) => setFormData({ ...formData, lead_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un lead" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.name} - {lead.company || lead.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Détails de l'opportunité..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createOpportunity.isPending}>
              {createOpportunity.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
