import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCockpitTasks, useCockpitLeads, useCockpitOpportunities, useCockpitProjects } from "@/hooks/cockpit";
import { Loader2 } from "lucide-react";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEntityType?: string;
  defaultEntityId?: string;
}

export const CreateTaskDialog = ({ open, onOpenChange, defaultEntityType, defaultEntityId }: CreateTaskDialogProps) => {
  const { createTask, TASK_TYPES, TASK_PRIORITIES } = useCockpitTasks();
  const { leads } = useCockpitLeads();
  const { opportunities } = useCockpitOpportunities();
  const { projects } = useCockpitProjects();
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    task_type: "follow_up",
    priority: "medium",
    due_date: "",
    due_time: "",
    entity_type: defaultEntityType || "",
    entity_id: defaultEntityId || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const taskData: any = {
      title: formData.title,
      description: formData.description || undefined,
      task_type: formData.task_type,
      priority: formData.priority,
      due_date: formData.due_date || undefined,
      due_time: formData.due_time || undefined,
    };

    // Set the correct FK based on entity type
    if (formData.entity_type === "lead" && formData.entity_id) {
      taskData.lead_id = formData.entity_id;
    } else if (formData.entity_type === "opportunity" && formData.entity_id) {
      taskData.opportunity_id = formData.entity_id;
    } else if (formData.entity_type === "project" && formData.entity_id) {
      taskData.project_id = formData.entity_id;
    }

    await createTask.mutateAsync(taskData);

    setFormData({
      title: "",
      description: "",
      task_type: "follow_up",
      priority: "medium",
      due_date: "",
      due_time: "",
      entity_type: defaultEntityType || "",
      entity_id: defaultEntityId || "",
    });
    onOpenChange(false);
  };

  const getEntityOptions = () => {
    switch (formData.entity_type) {
      case "lead":
        return leads.map((l) => ({ id: l.id, label: `${l.name} - ${l.company || l.email}` }));
      case "opportunity":
        return opportunities.map((o) => ({ id: o.id, label: o.title }));
      case "project":
        return projects.map((p) => ({ id: p.id, label: p.name }));
      default:
        return [];
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nouvelle tâche</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Envoyer proposition commerciale"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={formData.task_type} onValueChange={(v) => setFormData({ ...formData, task_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type === "follow_up" ? "Suivi" :
                       type === "call" ? "Appel" :
                       type === "meeting" ? "Réunion" :
                       type === "email" ? "Email" :
                       type === "proposal" ? "Proposition" :
                       type === "other" ? "Autre" : type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priorité</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority === "low" ? "Basse" :
                       priority === "medium" ? "Moyenne" :
                       priority === "high" ? "Haute" :
                       priority === "urgent" ? "Urgente" : priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="due_date">Date d'échéance</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_time">Heure</Label>
              <Input
                id="due_time"
                type="time"
                value={formData.due_time}
                onChange={(e) => setFormData({ ...formData, due_time: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entity_type">Lié à</Label>
              <Select 
                value={formData.entity_type} 
                onValueChange={(v) => setFormData({ ...formData, entity_type: v, entity_id: "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optionnel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="opportunity">Opportunité</SelectItem>
                  <SelectItem value="project">Projet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.entity_type && (
              <div className="space-y-2">
                <Label htmlFor="entity">Sélectionner</Label>
                <Select value={formData.entity_id} onValueChange={(v) => setFormData({ ...formData, entity_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getEntityOptions().map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Détails de la tâche..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createTask.isPending}>
              {createTask.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
