import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CockpitLayout } from "@/components/cockpit/CockpitLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
  ArrowLeft,
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
  Plus,
  User,
  FolderOpen,
  FileUp,
  StickyNote,
  LayoutDashboard,
} from "lucide-react";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCockpitProjects } from '@/hooks/cockpit';
import { useCockpitTasks } from '@/hooks/cockpit/useCockpitTasks';
import { useCockpitMeetingNotes } from '@/hooks/cockpit/useCockpitMeetingNotes';
import { useCockpitSpecifications } from '@/hooks/cockpit/useCockpitSpecifications';
import { useCockpitProjectDocuments } from '@/hooks/cockpit/useCockpitProjectDocuments';
import { useCockpitProjectNotes } from '@/hooks/cockpit/useCockpitProjectNotes';
import { ProjectTimeline } from '@/components/cockpit/ProjectTimeline';
import type { Database } from '@/integrations/supabase/types';

type Project = Database['public']['Tables']['projects']['Row'];
type Lead = Database['public']['Tables']['leads']['Row'];

const STATUS_OPTIONS = [
  { value: 'planning', label: 'Planification', icon: Clock },
  { value: 'in_progress', label: 'En cours', icon: Clock },
  { value: 'on_hold', label: 'En pause', icon: PauseCircle },
  { value: 'completed', label: 'Terminé', icon: CheckCircle2 },
  { value: 'cancelled', label: 'Annulé', icon: AlertCircle },
];

const HEALTH_OPTIONS = [
  { value: 'on_track', label: 'Sur les rails', color: 'bg-green-500' },
  { value: 'at_risk', label: 'À risque', color: 'bg-yellow-500' },
  { value: 'off_track', label: 'En difficulté', color: 'bg-red-500' },
];

const CockpitProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateProject, updateStatus, updateHealthStatus, deleteProject } = useCockpitProjects();
  const { tasks } = useCockpitTasks();
  const { meetingNotes } = useCockpitMeetingNotes();
  const { useSpecificationsByProject } = useCockpitSpecifications();
  const { documents, createDocument } = useCockpitProjectDocuments(id);
  const { notes: projectNotes, createNote } = useCockpitProjectNotes(id);
  
  const { data: projectSpecs = [] } = useSpecificationsByProject(id || '');

  // Fetch project
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project-detail', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Project & { lead_id?: string };
    },
    enabled: !!id,
  });

  // Fetch lead if linked
  const { data: linkedLead } = useQuery({
    queryKey: ['project-lead', (project as any)?.lead_id],
    queryFn: async () => {
      const leadId = (project as any)?.lead_id;
      if (!leadId) return null;
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();
      if (error) return null;
      return data as Lead;
    },
    enabled: !!(project as any)?.lead_id,
  });

  const [formData, setFormData] = useState<Partial<Project>>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [newNoteName, setNewNoteName] = useState('');
  const [newDocName, setNewDocName] = useState('');

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
          navigate('/cockpit/projects');
        }
      });
    }
  };

  const handleAddNote = () => {
    if (newNoteName.trim() && id) {
      createNote.mutate({
        project_id: id,
        workspace_id: '00000000-0000-0000-0000-000000000001',
        title: newNoteName,
        content: '',
        note_type: 'synthesis',
        created_by: null,
      });
      setNewNoteName('');
    }
  };

  const handleAddDocument = () => {
    if (newDocName.trim() && id) {
      createDocument.mutate({
        project_id: id,
        workspace_id: '00000000-0000-0000-0000-000000000001',
        name: newDocName,
        description: null,
        file_url: null,
        file_type: null,
        file_size_bytes: null,
        category: 'document',
        uploaded_by: null,
      });
      setNewDocName('');
    }
  };

  const projectTasks = tasks?.filter(t => t.project_id === id) || [];
  const projectMeetingNotes = meetingNotes?.filter(n => n.project_id === id) || [];

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

  if (projectLoading) {
    return (
      <CockpitLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </CockpitLayout>
    );
  }

  if (!project) {
    return (
      <CockpitLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold mb-2">Projet introuvable</h2>
            <Button onClick={() => navigate('/cockpit/projects')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux projets
            </Button>
          </div>
        </div>
      </CockpitLayout>
    );
  }

  return (
    <CockpitLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/cockpit/projects')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
                <div className={`w-3 h-3 rounded-full ${HEALTH_OPTIONS.find(h => h.value === project.health_status)?.color || 'bg-muted'}`} />
                <Badge variant="outline">
                  {STATUS_OPTIONS.find(s => s.value === project.status)?.label || project.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Créé le {project.created_at && format(new Date(project.created_at), 'dd MMMM yyyy', { locale: fr })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || updateProject.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              Enregistrer
            </Button>
            <Button variant="destructive" size="icon" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Contact attribué */}
        {linkedLead && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Contact attribué</p>
                  <p className="font-medium">{linkedLead.name}</p>
                  <p className="text-sm text-muted-foreground">{linkedLead.email} {linkedLead.company && `• ${linkedLead.company}`}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 h-auto">
            <TabsTrigger value="overview" className="flex items-center gap-2 py-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Vue d'ensemble</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2 py-2">
              <StickyNote className="h-4 w-4" />
              <span className="hidden sm:inline">Synthèses</span>
              {(projectNotes?.length || 0) > 0 && (
                <Badge variant="secondary" className="text-xs py-0 px-1.5">{projectNotes?.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2 py-2">
              <FileUp className="h-4 w-4" />
              <span className="hidden sm:inline">Documents</span>
              {(documents?.length || 0) > 0 && (
                <Badge variant="secondary" className="text-xs py-0 px-1.5">{documents?.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="specs" className="flex items-center gap-2 py-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">CDC</span>
              {projectSpecs.length > 0 && (
                <Badge variant="secondary" className="text-xs py-0 px-1.5">{projectSpecs.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2 py-2">
              <ListTodo className="h-4 w-4" />
              <span className="hidden sm:inline">Actions</span>
              {projectTasks.length > 0 && (
                <Badge variant="secondary" className="text-xs py-0 px-1.5">{projectTasks.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="meetings" className="flex items-center gap-2 py-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Réunions</span>
              {projectMeetingNotes.length > 0 && (
                <Badge variant="secondary" className="text-xs py-0 px-1.5">{projectMeetingNotes.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Timeline Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ProjectTimeline
                    startDate={project.start_date}
                    targetEndDate={project.target_end_date}
                    actualEndDate={project.actual_end_date}
                    status={project.status}
                    healthStatus={project.health_status}
                  />
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="space-y-2">
                      <Label>Date de début</Label>
                      <Input
                        type="date"
                        value={formData.start_date || ''}
                        onChange={(e) => handleChange('start_date', e.target.value || null)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date cible</Label>
                      <Input
                        type="date"
                        value={formData.target_end_date || ''}
                        onChange={(e) => handleChange('target_end_date', e.target.value || null)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status & Info Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                      <Label>Santé</Label>
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
                  <div className="space-y-2">
                    <Label>Nom du projet</Label>
                    <Input
                      value={formData.name || ''}
                      onChange={(e) => handleChange('name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description || ''}
                      onChange={(e) => handleChange('description', e.target.value || null)}
                      placeholder="Description du projet..."
                      className="min-h-[80px]"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Budget Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Budget
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Budget alloué (€)</Label>
                    <Input
                      type="number"
                      value={formData.budget_amount || ''}
                      onChange={(e) => handleChange('budget_amount', e.target.value ? Number(e.target.value) : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Consommé (€)</Label>
                    <Input
                      type="number"
                      value={formData.consumed_amount || ''}
                      onChange={(e) => handleChange('consumed_amount', e.target.value ? Number(e.target.value) : null)}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label>Progression</Label>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{formatCurrency(Number(project.consumed_amount) || 0)}</span>
                        <span className="text-muted-foreground">/ {formatCurrency(Number(project.budget_amount) || 0)}</span>
                      </div>
                      <Progress value={budgetProgress} className="h-2" />
                      <p className="text-xs text-muted-foreground">{Math.round(budgetProgress)}% utilisé</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notes/Synthèses Tab */}
          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Synthèses et notes</CardTitle>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Titre de la synthèse..."
                    value={newNoteName}
                    onChange={(e) => setNewNoteName(e.target.value)}
                    className="w-64"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                  />
                  <Button size="sm" onClick={handleAddNote} disabled={!newNoteName.trim()}>
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!projectNotes?.length ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <StickyNote className="h-10 w-10 mb-3 opacity-50" />
                    <p className="font-medium">Aucune synthèse</p>
                    <p className="text-sm">Ajoutez votre première synthèse pour ce projet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projectNotes.map(note => (
                      <div key={note.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{note.title}</h4>
                          <Badge variant="outline">{note.note_type}</Badge>
                        </div>
                        {note.content && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{note.content}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(note.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Documents</CardTitle>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Nom du document..."
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    className="w-64"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddDocument()}
                  />
                  <Button size="sm" onClick={handleAddDocument} disabled={!newDocName.trim()}>
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!documents?.length ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <FileUp className="h-10 w-10 mb-3 opacity-50" />
                    <p className="font-medium">Aucun document</p>
                    <p className="text-sm">Ajoutez des documents liés à ce projet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documents.map(doc => (
                      <div key={doc.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{doc.name}</h4>
                            {doc.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">{doc.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: fr })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Specifications Tab */}
          <TabsContent value="specs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cahiers des charges</CardTitle>
              </CardHeader>
              <CardContent>
                {projectSpecs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <FileText className="h-10 w-10 mb-3 opacity-50" />
                    <p className="font-medium">Aucun cahier des charges</p>
                    <p className="text-sm">Les CDC liés à ce projet apparaîtront ici</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projectSpecs.map(spec => (
                      <div key={spec.id} className="p-4 border rounded-lg">
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
                            <span>Modifié le {format(new Date(spec.updated_at), 'dd MMM yyyy', { locale: fr })}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Actions et tâches</CardTitle>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  Nouvelle tâche
                </Button>
              </CardHeader>
              <CardContent>
                {projectTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <ListTodo className="h-10 w-10 mb-3 opacity-50" />
                    <p className="font-medium">Aucune tâche</p>
                    <p className="text-sm">Les tâches liées à ce projet apparaîtront ici</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projectTasks.map(task => (
                      <div key={task.id} className="p-3 border rounded-lg flex items-start gap-3">
                        <div className={`mt-1 w-2 h-2 rounded-full ${
                          task.status === 'completed' ? 'bg-green-500' :
                          task.status === 'in_progress' ? 'bg-blue-500' : 'bg-muted-foreground'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Meetings Tab */}
          <TabsContent value="meetings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Comptes rendus de réunion</CardTitle>
              </CardHeader>
              <CardContent>
                {projectMeetingNotes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <MessageSquare className="h-10 w-10 mb-3 opacity-50" />
                    <p className="font-medium">Aucun compte rendu</p>
                    <p className="text-sm">Les notes de réunion liées à ce projet apparaîtront ici</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projectMeetingNotes.map(note => (
                      <div key={note.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">
                            {note.created_at && format(new Date(note.created_at), 'dd MMMM yyyy', { locale: fr })}
                          </span>
                          {note.duration_minutes && (
                            <Badge variant="outline">{note.duration_minutes} min</Badge>
                          )}
                        </div>
                        {note.objectives && (
                          <p className="text-sm text-muted-foreground mb-2">{note.objectives}</p>
                        )}
                        {note.notes && (
                          <p className="text-sm line-clamp-2">{note.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

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
    </CockpitLayout>
  );
};

export default CockpitProjectDetail;
