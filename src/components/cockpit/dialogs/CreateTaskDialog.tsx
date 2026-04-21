import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useCockpitTasks, useCockpitLeads, useCockpitOpportunities, useCockpitProjects, useCockpitBookings } from "@/hooks/cockpit";
import { Loader2, Calendar, Bell } from "lucide-react";
import { toast } from "sonner";
import { useWorkspaceId } from "@/contexts/WorkspaceContext";
import { DEFAULT_WORKSPACE_ID } from "@/lib/constants/workspace";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEntityType?: string;
  defaultEntityId?: string;
}

const TASK_TYPES = ["follow_up", "call", "meeting", "email", "proposal", "other"] as const;
const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

const TASK_TYPE_LABELS: Record<string, string> = {
  follow_up: "Suivi",
  call: "Appel",
  meeting: "Réunion",
  email: "Email",
  proposal: "Proposition",
  other: "Autre",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  urgent: "Urgente",
};

export const CreateTaskDialog = ({ open, onOpenChange, defaultEntityType, defaultEntityId }: CreateTaskDialogProps) => {
  const { createTask } = useCockpitTasks();
  const { leads = [] } = useCockpitLeads();
  const { opportunities = [] } = useCockpitOpportunities();
  const { projects = [] } = useCockpitProjects();
  const { createBooking } = useCockpitBookings();
  const ctxWorkspaceId = useWorkspaceId();

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
  
  const [addToAgenda, setAddToAgenda] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset entity type/id when defaults change
  useEffect(() => {
    if (open) {
      setFormData(prev => ({
        ...prev,
        entity_type: defaultEntityType || prev.entity_type,
        entity_id: defaultEntityId || prev.entity_id,
      }));
    }
  }, [open, defaultEntityType, defaultEntityId]);

  // Auto-enable agenda for meetings with date+time
  useEffect(() => {
    if (formData.task_type === "meeting" && formData.due_date && formData.due_time) {
      setAddToAgenda(true);
    }
  }, [formData.task_type, formData.due_date, formData.due_time]);

  const resetForm = () => {
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
    setAddToAgenda(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const taskData: any = {
        title: formData.title,
        description: formData.description || undefined,
        task_type: formData.task_type,
        priority: formData.priority,
        due_date: formData.due_date || undefined,
        due_time: formData.due_time || undefined,
        workspace_id: ctxWorkspaceId ?? DEFAULT_WORKSPACE_ID,
      };

      // Set the correct FK based on entity type
      if (formData.entity_type === "lead" && formData.entity_id) {
        taskData.lead_id = formData.entity_id;
      } else if (formData.entity_type === "opportunity" && formData.entity_id) {
        taskData.opportunity_id = formData.entity_id;
      } else if (formData.entity_type === "project" && formData.entity_id) {
        taskData.project_id = formData.entity_id;
      }

      // Create the task
      await createTask.mutateAsync(taskData);

      // If addToAgenda and we have date+time, create a booking entry
      if (addToAgenda && formData.due_date && formData.due_time && createBooking) {
        try {
          const startTime = new Date(`${formData.due_date}T${formData.due_time}`);
          const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // +1 hour by default
          
          // Get entity info for the booking
          let bookingName = formData.title;
          let bookingEmail = "tache@iarche.fr"; // Default email for tasks
          let bookingCompany = "";
          
          if (formData.entity_type === "lead" && formData.entity_id) {
            const lead = leads.find(l => l.id === formData.entity_id);
            if (lead) {
              bookingName = `${formData.title} - ${lead.name}`;
              bookingEmail = lead.email;
              bookingCompany = lead.company || "";
            }
          }

          await createBooking.mutateAsync({
            booking_type_id: "00000000-0000-0000-0000-000000000001", // Default type
            name: bookingName,
            email: bookingEmail,
            company: bookingCompany,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            message: formData.description || `Tâche: ${formData.title}`,
            status: "confirmed",
            lead_id: formData.entity_type === "lead" ? formData.entity_id : undefined,
          });
          
          toast.success("Tâche créée et ajoutée à l'agenda");
        } catch (agendaError) {
          console.error("Erreur ajout agenda:", agendaError);
          toast.info("Tâche créée (erreur lors de l'ajout à l'agenda)");
        }
      }

      resetForm();
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const getEntityOptions = () => {
    switch (formData.entity_type) {
      case "lead":
        return leads.map((l) => ({ id: l.id, label: `${l.name}${l.company ? ` - ${l.company}` : ""}` }));
      case "opportunity":
        return opportunities.map((o) => ({ id: o.id, label: o.title }));
      case "project":
        return projects.map((p) => ({ id: p.id, label: p.name }));
      default:
        return [];
    }
  };

  const canAddToAgenda = formData.due_date && formData.due_time;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
                      {TASK_TYPE_LABELS[type]}
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
                      {PRIORITY_LABELS[priority]}
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

          {/* Add to Agenda option */}
          {canAddToAgenda && (
            <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
              <Checkbox
                id="addToAgenda"
                checked={addToAgenda}
                onCheckedChange={(checked) => setAddToAgenda(checked === true)}
              />
              <div className="flex-1">
                <Label htmlFor="addToAgenda" className="flex items-center gap-2 cursor-pointer">
                  <Calendar className="h-4 w-4 text-primary" />
                  Ajouter à l'agenda
                </Label>
                <p className="text-xs text-muted-foreground">
                  Crée également un rendez-vous dans l'agenda
                </p>
              </div>
            </div>
          )}

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
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.title.trim()}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
