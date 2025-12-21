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
        <SheetContent className="w-full sm:max-w-xl flex flex-col h-full p-0">
          <SheetHeader className="px-5 py-3 border-b bg-background sticky top-0 z-10 space-y-0.5">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base font-semibold">{project.name}</SheetTitle>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${HEALTH_OPTIONS.find(h => h.value === project.health_status)?.color || 'bg-muted'}`} />
                <Badge variant="outline" className="text-xs h-5 px-1.5">
                  {STATUS_OPTIONS.find(s => s.value === project.status)?.label || project.status}
                </Badge>
              </div>
            </div>
            <SheetDescription className="text-xs">
              {project.created_at && format(new Date(project.created_at), 'dd MMM yyyy', { locale: fr })}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            <Tabs defaultValue="details" className="h-full">
              <div className="px-5 pt-3">
                <TabsList className="grid w-full grid-cols-4 h-8">
                  <TabsTrigger value="details" className="text-xs h-6">Détails</TabsTrigger>
                  <TabsTrigger value="specs" className="text-xs h-6">
                    CDC
                    {projectSpecs.length > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs py-0 px-1 h-4">{projectSpecs.length}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="text-xs h-6">
                    Tâches
                    {projectTasks.length > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs py-0 px-1 h-4">{projectTasks.length}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="text-xs h-6">
                    Notes
                    {projectNotes.length > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs py-0 px-1 h-4">{projectNotes.length}</Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Details Tab */}
              <TabsContent value="details" className="px-5 py-4 space-y-4">
                {/* Timeline */}
                <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                  <h3 className="text-xs font-semibold flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    Timeline
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Statut</Label>
                    <Select value={project.status} onValueChange={handleStatusChange}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              <opt.icon className="h-3.5 w-3.5" />
                              {opt.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Santé</Label>
                    <Select value={project.health_status} onValueChange={handleHealthChange}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HEALTH_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${opt.color}`} />
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
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs">Nom du projet</Label>
                    <Input
                      id="name"
                      value={formData.name || ''}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="description" className="text-xs">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description || ''}
                      onChange={(e) => handleChange('description', e.target.value || null)}
                      placeholder="Description..."
                      className="min-h-[60px] text-sm"
                    />
                  </div>
                </div>

                <Separator />

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="start_date" className="text-xs">Date début</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date || ''}
                      onChange={(e) => handleChange('start_date', e.target.value || null)}
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="target_end_date" className="text-xs">Date cible</Label>
                    <Input
                      id="target_end_date"
                      type="date"
                      value={formData.target_end_date || ''}
                      onChange={(e) => handleChange('target_end_date', e.target.value || null)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                <Separator />

                {/* Budget */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold flex items-center gap-2">
                    <DollarSign className="h-3.5 w-3.5" />
                    Budget
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="budget_amount" className="text-xs">Alloué (€)</Label>
                      <Input
                        id="budget_amount"
                        type="number"
                        value={formData.budget_amount || ''}
                        onChange={(e) => handleChange('budget_amount', e.target.value ? Number(e.target.value) : null)}
                        className="h-8 text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="consumed_amount" className="text-xs">Consommé (€)</Label>
                      <Input
                        id="consumed_amount"
                        type="number"
                        value={formData.consumed_amount || ''}
                        onChange={(e) => handleChange('consumed_amount', e.target.value ? Number(e.target.value) : null)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Progression</span>
                      <span>{formatCurrency(Number(project.consumed_amount) || 0)} / {formatCurrency(Number(project.budget_amount) || 0)}</span>
                    </div>
                    <Progress value={budgetProgress} className="h-1.5" />
                  </div>
                </div>
              </TabsContent>

              {/* Specifications Tab */}
              <TabsContent value="specs" className="px-5 py-4">
                {projectSpecs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <FileText className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">Aucun cahier des charges</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {projectSpecs.map(spec => (
                      <div key={spec.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-sm">{spec.title}</h4>
                          <Badge variant={
                            spec.status === 'approved' ? 'default' :
                            spec.status === 'in_review' ? 'secondary' : 'outline'
                          } className="text-xs h-5 px-1.5">
                            {spec.status === 'approved' ? 'Approuvé' :
                             spec.status === 'in_review' ? 'En révision' : 'Brouillon'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>v{spec.version}</span>
                          {spec.updated_at && (
                            <span>{format(new Date(spec.updated_at), 'dd MMM yyyy', { locale: fr })}</span>
                          )}
                          {spec.ai_generated && (
                            <Badge variant="outline" className="text-xs h-4 px-1">IA</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Tasks Tab */}
              <TabsContent value="tasks" className="px-5 py-4">
                {projectTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <ListTodo className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">Aucune tâche</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {projectTasks.map(task => (
                      <div key={task.id} className="p-2.5 border rounded-lg flex items-start gap-2">
                        <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                          task.status === 'completed' ? 'bg-green-500' :
                          task.status === 'in_progress' ? 'bg-blue-500' :
                          'bg-muted-foreground'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm truncate ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                          </p>
                          {task.due_date && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {format(new Date(task.due_date), 'dd MMM yyyy', { locale: fr })}
                            </p>
                          )}
                        </div>
                        <Badge variant={
                          task.priority === 'high' ? 'destructive' :
                          task.priority === 'medium' ? 'default' : 'secondary'
                        } className="text-xs h-5 px-1.5">
                          {task.priority === 'high' ? 'Haute' : task.priority === 'medium' ? 'Moy.' : 'Basse'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Notes Tab */}
              <TabsContent value="notes" className="px-5 py-4">
                {projectNotes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">Aucune note</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {projectNotes.map(note => (
                      <div key={note.id} className="p-2.5 border rounded-lg">
                        <p className="font-medium text-sm">{note.booking_id ? 'Note de réunion' : 'Note'}</p>
                        {note.notes && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{note.notes}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {note.created_at && format(new Date(note.created_at), 'dd MMM yyyy', { locale: fr })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Actions Footer */}
          <div className="px-5 py-3 border-t bg-background sticky bottom-0 flex gap-2">
            <Button
              size="sm"
              className="flex-1 h-8 text-sm"
              onClick={handleSave}
              disabled={!hasChanges || updateProject.isPending}
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Enregistrer
            </Button>
            <Button
              variant="destructive"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce projet ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
}
