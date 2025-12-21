import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Calendar, 
  DollarSign, 
  Trash2, 
  Save, 
  Clock,
  CheckCircle2,
  PauseCircle,
  AlertCircle,
  FileText,
  ListTodo,
  MessageSquare,
} from "lucide-react";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCockpitProjects } from '@/hooks/cockpit';
import { useCockpitTasks } from '@/hooks/cockpit/useCockpitTasks';
import { useCockpitMeetingNotes } from '@/hooks/cockpit/useCockpitMeetingNotes';
import { useCockpitSpecifications } from '@/hooks/cockpit/useCockpitSpecifications';
import { ProjectTimeline } from './ProjectTimeline';
import type { Database } from '@/integrations/supabase/types';

type Project = Database['public']['Tables']['projects']['Row'];

interface ProjectDetailSheetProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_OPTIONS = [
  { value: 'planning', label: 'Planification', icon: Clock },
  { value: 'in_progress', label: 'En cours', icon: Clock },
  { value: 'on_hold', label: 'En pause', icon: PauseCircle },
  { value: 'completed', label: 'Terminé', icon: CheckCircle2 },
  { value: 'cancelled', label: 'Annulé', icon: AlertCircle },
];

const HEALTH_OPTIONS = [
  { value: 'healthy', label: 'Sain', color: 'bg-green-500' },
  { value: 'at_risk', label: 'À risque', color: 'bg-yellow-500' },
  { value: 'critical', label: 'Critique', color: 'bg-red-500' },
];

export function ProjectDetailSheet({ project, open, onOpenChange }: ProjectDetailSheetProps) {
  const { updateProject, updateStatus, updateHealthStatus, deleteProject } = useCockpitProjects();
  const { tasks } = useCockpitTasks();
  const { meetingNotes } = useCockpitMeetingNotes();
  const { useSpecificationsByProject } = useCockpitSpecifications();
  
  const { data: projectSpecs = [] } = useSpecificationsByProject(project?.id || '');
  
  const [formData, setFormData] = useState<Partial<Project>>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description,
        budget_amount: project.budget_amount,
        consumed_amount: project.consumed_amount,
        start_date: project.start_date,
        target_end_date: project.target_end_date,
      });
      setHasChanges(false);
    }
  }, [project]);

  const handleChange = (field: keyof Project, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (project && hasChanges) {
      updateProject.mutate({ id: project.id, updates: formData }, {
        onSuccess: () => setHasChanges(false)
      });
    }
  };

  const handleStatusChange = (status: string) => {
    if (project) {
      updateStatus.mutate({ id: project.id, status });
    }
  };

  const handleHealthChange = (healthStatus: string) => {
    if (project) {
      updateHealthStatus.mutate({ id: project.id, healthStatus });
    }
  };

  const handleDelete = () => {
    if (project) {
      deleteProject.mutate(project.id, {
        onSuccess: () => {
          setShowDeleteDialog(false);
          onOpenChange(false);
        }
      });
    }
  };

  const projectTasks = tasks?.filter(t => t.project_id === project?.id) || [];
  const projectNotes = meetingNotes?.filter(n => n.project_id === project?.id) || [];

  const formatCurrency = (value: number | null) => {
    if (!value) return '0 €';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const budgetProgress = project?.budget_amount 
    ? Math.min(100, ((Number(project.consumed_amount) || 0) / Number(project.budget_amount)) * 100)
    : 0;

  if (!project) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl">{project.name}</SheetTitle>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${HEALTH_OPTIONS.find(h => h.value === project.health_status)?.color || 'bg-muted'}`} />
                <Badge variant="outline">
                  {STATUS_OPTIONS.find(s => s.value === project.status)?.label || project.status}
                </Badge>
              </div>
            </div>
            <SheetDescription>
              Créé le {project.created_at && format(new Date(project.created_at), 'dd MMMM yyyy', { locale: fr })}
            </SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="details" className="mt-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">Détails</TabsTrigger>
              <TabsTrigger value="specs">
                CDC
                {projectSpecs.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-xs py-0 px-1.5">
                    {projectSpecs.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="tasks">
                Tâches
                {projectTasks.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-xs py-0 px-1.5">
                    {projectTasks.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="notes">
                Notes
                {projectNotes.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-xs py-0 px-1.5">
                    {projectNotes.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-6 mt-4">
              {/* Timeline */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Timeline du projet
                </h3>
                <ProjectTimeline
                  startDate={project.start_date}
                  targetEndDate={project.target_end_date}
                  actualEndDate={project.actual_end_date}
                  status={project.status}
                  healthStatus={project.health_status}
                />
              </div>

              {/* Status & Health */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={project.status} onValueChange={handleStatusChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <opt.icon className="h-4 w-4" />
                            {opt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>État de santé</Label>
                  <Select value={project.health_status} onValueChange={handleHealthChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HEALTH_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${opt.color}`} />
                            {opt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Basic Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom du projet</Label>
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => handleChange('name', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => handleChange('description', e.target.value || null)}
                    placeholder="Description du projet..."
                    className="min-h-[80px]"
                  />
                </div>
              </div>

              <Separator />

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Date de début</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date || ''}
                    onChange={(e) => handleChange('start_date', e.target.value || null)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target_end_date">Date cible</Label>
                  <Input
                    id="target_end_date"
                    type="date"
                    value={formData.target_end_date || ''}
                    onChange={(e) => handleChange('target_end_date', e.target.value || null)}
                  />
                </div>
              </div>

              <Separator />

              {/* Budget */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Budget
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="budget_amount">Budget alloué (€)</Label>
                    <Input
                      id="budget_amount"
                      type="number"
                      value={formData.budget_amount || ''}
                      onChange={(e) => handleChange('budget_amount', e.target.value ? Number(e.target.value) : null)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="consumed_amount">Consommé (€)</Label>
                    <Input
                      id="consumed_amount"
                      type="number"
                      value={formData.consumed_amount || ''}
                      onChange={(e) => handleChange('consumed_amount', e.target.value ? Number(e.target.value) : null)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progression</span>
                    <span>{formatCurrency(Number(project.consumed_amount) || 0)} / {formatCurrency(Number(project.budget_amount) || 0)}</span>
                  </div>
                  <Progress value={budgetProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-right">
                    {Math.round(budgetProgress)}% utilisé
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Specifications Tab */}
            <TabsContent value="specs" className="mt-4">
              {projectSpecs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FileText className="h-10 w-10 mb-3 opacity-50" />
                  <p className="font-medium">Aucun cahier des charges</p>
                  <p className="text-sm">Les CDC liés à ce projet apparaîtront ici</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {projectSpecs.map(spec => (
                    <div 
                      key={spec.id}
                      className="p-3 border rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{spec.title}</h4>
                        <Badge variant={
                          spec.status === 'approved' ? 'default' :
                          spec.status === 'in_review' ? 'secondary' : 'outline'
                        }>
                          {spec.status === 'approved' ? 'Approuvé' :
                           spec.status === 'in_review' ? 'En révision' :
                           spec.status === 'archived' ? 'Archivé' : 'Brouillon'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>v{spec.version}</span>
                        {spec.updated_at && (
                          <span>
                            Modifié le {format(new Date(spec.updated_at), 'dd MMM yyyy', { locale: fr })}
                          </span>
                        )}
                        {spec.ai_generated && (
                          <Badge variant="outline" className="text-xs">IA</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Tasks Tab */}
            <TabsContent value="tasks" className="mt-4">
              {projectTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <ListTodo className="h-10 w-10 mb-3 opacity-50" />
                  <p className="font-medium">Aucune tâche</p>
                  <p className="text-sm">Les tâches liées à ce projet apparaîtront ici</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {projectTasks.map(task => (
                    <div 
                      key={task.id}
                      className="p-3 border rounded-lg flex items-start gap-3"
                    >
                      <div className={`mt-0.5 w-2 h-2 rounded-full ${
                        task.status === 'completed' ? 'bg-green-500' :
                        task.status === 'in_progress' ? 'bg-blue-500' :
                        'bg-muted-foreground'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </p>
                        {task.due_date && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Échéance: {format(new Date(task.due_date), 'dd MMM yyyy', { locale: fr })}
                          </p>
                        )}
                      </div>
                      <Badge variant={
                        task.priority === 'high' ? 'destructive' :
                        task.priority === 'medium' ? 'default' : 'secondary'
                      } className="text-xs">
                        {task.priority === 'high' ? 'Haute' : task.priority === 'medium' ? 'Moyenne' : 'Basse'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="mt-4">
              {projectNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mb-3 opacity-50" />
                  <p className="font-medium">Aucune note de réunion</p>
                  <p className="text-sm">Les notes liées à ce projet apparaîtront ici</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {projectNotes.map(note => (
                    <div 
                      key={note.id}
                      className="p-3 border rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-muted-foreground">
                          {note.created_at && format(new Date(note.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                        </p>
                        {note.duration_minutes && (
                          <Badge variant="outline" className="text-xs">
                            {note.duration_minutes} min
                          </Badge>
                        )}
                      </div>
                      {note.objectives && (
                        <p className="text-sm font-medium mb-1">{note.objectives}</p>
                      )}
                      {note.notes && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{note.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex gap-3 pt-6 mt-6 border-t">
            <Button
              variant="default"
              className="flex-1"
              onClick={handleSave}
              disabled={!hasChanges || updateProject.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {updateProject.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce projet ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le projet "{project.name}" et toutes ses données associées seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
