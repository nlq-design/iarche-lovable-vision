import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CockpitLayout } from "@/components/cockpit/CockpitLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Trash2, 
  Save, 
  FileText,
  ListTodo,
  MessageSquare,
  Plus,
  FolderOpen,
  FileUp,
  StickyNote,
  LayoutDashboard,
  Building2,
  Calendar,
  Edit3,
  ExternalLink,
  Clock,
} from "lucide-react";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCockpitProjects } from '@/hooks/cockpit';
import { useCockpitTasks } from '@/hooks/cockpit/useCockpitTasks';
import { useCockpitMeetingNotes } from '@/hooks/cockpit/useCockpitMeetingNotes';
import { useCockpitSpecifications } from '@/hooks/cockpit/useCockpitSpecifications';
import { useCockpitProjectDocuments } from '@/hooks/cockpit/useCockpitProjectDocuments';
import { useCockpitProjectNotes } from '@/hooks/cockpit/useCockpitProjectNotes';
import { LeadSelector } from '@/components/cockpit/LeadSelector';
import { ContentEditor } from '@/components/cockpit/ContentEditor';
import { FileUploader } from '@/components/cockpit/FileUploader';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Project = Database['public']['Tables']['projects']['Row'];
type Lead = Database['public']['Tables']['leads']['Row'];

const CockpitProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { updateProject, deleteProject } = useCockpitProjects();
  const { tasks } = useCockpitTasks();
  const { meetingNotes } = useCockpitMeetingNotes();
  const { useSpecificationsByProject, createSpecification } = useCockpitSpecifications();
  const { documents, createDocument, deleteDocument } = useCockpitProjectDocuments(id);
  const { notes: projectNotes, createNote, updateNote, deleteNote } = useCockpitProjectNotes(id);
  
  const { data: projectSpecs = [] } = useSpecificationsByProject(id || '');

  // State
  const [formData, setFormData] = useState<Partial<Project> & { lead_id?: string | null }>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Dialog states for adding items
  const [showAddNoteDialog, setShowAddNoteDialog] = useState(false);
  const [showAddDocDialog, setShowAddDocDialog] = useState(false);
  const [showAddSpecDialog, setShowAddSpecDialog] = useState(false);
  
  // New item form states
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteFiles, setNewNoteFiles] = useState<File | File[] | null>(null);
  
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocFiles, setNewDocFiles] = useState<File | File[] | null>(null);
  
  const [newSpecTitle, setNewSpecTitle] = useState('');
  const [newSpecContent, setNewSpecContent] = useState('');
  const [newSpecFiles, setNewSpecFiles] = useState<File | File[] | null>(null);

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

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description,
        lead_id: (project as any)?.lead_id || null,
      });
      setHasChanges(false);
    }
  }, [project]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (project && hasChanges) {
      updateProject.mutate({ id: project.id, updates: formData as any }, {
        onSuccess: () => {
          setHasChanges(false);
          queryClient.invalidateQueries({ queryKey: ['project-detail', id] });
          queryClient.invalidateQueries({ queryKey: ['project-lead'] });
        }
      });
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

  // Add handlers
  const handleAddNote = () => {
    if (!newNoteTitle.trim() || !id) return;
    
    createNote.mutate({
      project_id: id,
      workspace_id: '00000000-0000-0000-0000-000000000001',
      title: newNoteTitle,
      content: newNoteContent || null,
      note_type: 'synthesis',
      created_by: null,
    }, {
      onSuccess: () => {
        setNewNoteTitle('');
        setNewNoteContent('');
        setNewNoteFiles(null);
        setShowAddNoteDialog(false);
      }
    });
  };

  const handleAddDocument = () => {
    if (!newDocTitle.trim() || !id) return;
    
    createDocument.mutate({
      project_id: id,
      workspace_id: '00000000-0000-0000-0000-000000000001',
      name: newDocTitle,
      description: null,
      file_url: null,
      file_type: newDocFiles && !Array.isArray(newDocFiles) ? newDocFiles.type : null,
      file_size_bytes: newDocFiles && !Array.isArray(newDocFiles) ? newDocFiles.size : null,
      category: 'document',
      uploaded_by: null,
    }, {
      onSuccess: () => {
        setNewDocTitle('');
        setNewDocFiles(null);
        setShowAddDocDialog(false);
      }
    });
  };

  const handleAddSpec = () => {
    if (!newSpecTitle.trim() || !id) return;
    
    createSpecification.mutate({
      title: newSpecTitle,
      project_id: id,
      content: newSpecContent ? { text: newSpecContent } : {},
    }, {
      onSuccess: () => {
        setNewSpecTitle('');
        setNewSpecContent('');
        setNewSpecFiles(null);
        setShowAddSpecDialog(false);
      }
    });
  };

  const projectTasks = tasks?.filter(t => t.project_id === id) || [];
  const projectMeetingNotes = meetingNotes?.filter(n => n.project_id === id) || [];

  if (projectLoading) {
    return (
      <CockpitLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48" />
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
              <h1 className="text-2xl font-bold text-foreground">{project.name || 'Nouveau projet'}</h1>
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

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 h-auto">
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
            <TabsTrigger value="activity" className="flex items-center gap-2 py-2">
              <ListTodo className="h-4 w-4" />
              <span className="hidden sm:inline">Activité</span>
              {(projectTasks.length + projectMeetingNotes.length) > 0 && (
                <Badge variant="secondary" className="text-xs py-0 px-1.5">
                  {projectTasks.length + projectMeetingNotes.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab - Simplified */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Informations principales */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Edit3 className="h-5 w-5" />
                    Informations du projet
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nom du projet *</Label>
                    <Input
                      value={formData.name || ''}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="Nom du projet"
                      className="text-lg font-medium"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description || ''}
                      onChange={(e) => handleChange('description', e.target.value || null)}
                      placeholder="Décrivez le projet, ses objectifs, son contexte..."
                      className="min-h-[120px] resize-y"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Contact lié */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Contact & Entreprise
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Contact attribué</Label>
                    <LeadSelector
                      value={formData.lead_id || null}
                      onChange={(leadId) => handleChange('lead_id', leadId)}
                    />
                  </div>
                  
                  {linkedLead && (
                    <div className="pt-2 space-y-3">
                      <Separator />
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {linkedLead.company && (
                          <div>
                            <p className="text-muted-foreground">Entreprise</p>
                            <p className="font-medium">{linkedLead.company}</p>
                          </div>
                        )}
                        {linkedLead.industry && (
                          <div>
                            <p className="text-muted-foreground">Secteur</p>
                            <p className="font-medium">{linkedLead.industry}</p>
                          </div>
                        )}
                        {linkedLead.company_size && (
                          <div>
                            <p className="text-muted-foreground">Taille</p>
                            <p className="font-medium">{linkedLead.company_size}</p>
                          </div>
                        )}
                        {linkedLead.phone && (
                          <div>
                            <p className="text-muted-foreground">Téléphone</p>
                            <p className="font-medium">{linkedLead.phone}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Résumé</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <StickyNote className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-2xl font-bold">{projectNotes?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Synthèses</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <FileUp className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-2xl font-bold">{documents?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Documents</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <FileText className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-2xl font-bold">{projectSpecs.length}</p>
                    <p className="text-xs text-muted-foreground">Cahiers des charges</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <ListTodo className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-2xl font-bold">{projectTasks.length}</p>
                    <p className="text-xs text-muted-foreground">Tâches</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Synthèses Tab */}
          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Synthèses</CardTitle>
                <Dialog open={showAddNoteDialog} onOpenChange={setShowAddNoteDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Ajouter
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Nouvelle synthèse</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Titre *</Label>
                        <Input
                          value={newNoteTitle}
                          onChange={(e) => setNewNoteTitle(e.target.value)}
                          placeholder="Titre de la synthèse"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Contenu</Label>
                        <ContentEditor
                          textValue={newNoteContent}
                          onTextChange={setNewNoteContent}
                          fileValue={newNoteFiles}
                          onFileChange={setNewNoteFiles}
                          placeholder="Collez ou saisissez votre synthèse ici..."
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setShowAddNoteDialog(false)}>
                          Annuler
                        </Button>
                        <Button onClick={handleAddNote} disabled={!newNoteTitle.trim()}>
                          Ajouter
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
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
                      <div key={note.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors group">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{note.title}</h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{note.note_type}</Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => deleteNote.mutate(note.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        {note.content && (
                          <p className="text-sm text-muted-foreground line-clamp-3">{note.content}</p>
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
                <Dialog open={showAddDocDialog} onOpenChange={setShowAddDocDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Ajouter
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Nouveau document</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Nom du document *</Label>
                        <Input
                          value={newDocTitle}
                          onChange={(e) => setNewDocTitle(e.target.value)}
                          placeholder="Nom du document"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Fichier</Label>
                        <FileUploader
                          value={newDocFiles}
                          onChange={setNewDocFiles}
                          multiple={false}
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setShowAddDocDialog(false)}>
                          Annuler
                        </Button>
                        <Button onClick={handleAddDocument} disabled={!newDocTitle.trim()}>
                          Ajouter
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
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
                      <div key={doc.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors group">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center shrink-0">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{doc.name}</h4>
                            {doc.file_type && (
                              <p className="text-xs text-muted-foreground">{doc.file_type}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: fr })}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            onClick={() => deleteDocument.mutate(doc.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CDC Tab */}
          <TabsContent value="specs" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Cahiers des charges</CardTitle>
                <Dialog open={showAddSpecDialog} onOpenChange={setShowAddSpecDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Ajouter
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Nouveau cahier des charges</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Titre *</Label>
                        <Input
                          value={newSpecTitle}
                          onChange={(e) => setNewSpecTitle(e.target.value)}
                          placeholder="Titre du cahier des charges"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Contenu</Label>
                        <ContentEditor
                          textValue={newSpecContent}
                          onTextChange={setNewSpecContent}
                          fileValue={newSpecFiles}
                          onFileChange={setNewSpecFiles}
                          placeholder="Collez ou saisissez le contenu du CDC..."
                          accept=".pdf,.doc,.docx"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setShowAddSpecDialog(false)}>
                          Annuler
                        </Button>
                        <Button onClick={handleAddSpec} disabled={!newSpecTitle.trim()}>
                          Ajouter
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {projectSpecs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <FileText className="h-10 w-10 mb-3 opacity-50" />
                    <p className="font-medium">Aucun cahier des charges</p>
                    <p className="text-sm">Ajoutez vos CDC au format PDF, Word ou texte</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projectSpecs.map(spec => (
                      <div key={spec.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
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

          {/* Activity Tab - Tâches + Réunions */}
          <TabsContent value="activity" className="space-y-6">
            {/* Tâches */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ListTodo className="h-5 w-5" />
                  Tâches
                </CardTitle>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  Nouvelle tâche
                </Button>
              </CardHeader>
              <CardContent>
                {projectTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <ListTodo className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">Aucune tâche liée à ce projet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {projectTasks.map(task => (
                      <div key={task.id} className="p-3 border rounded-lg flex items-start gap-3 hover:bg-muted/50 transition-colors">
                        <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                          task.status === 'completed' ? 'bg-green-500' :
                          task.status === 'in_progress' ? 'bg-blue-500' : 'bg-muted-foreground'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                          </p>
                          {task.due_date && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                              <Calendar className="h-3 w-3" />
                              <span>{format(new Date(task.due_date), 'dd MMM yyyy', { locale: fr })}</span>
                              {task.due_time && <span>à {task.due_time}</span>}
                            </div>
                          )}
                        </div>
                        <Badge variant={
                          task.priority === 'high' ? 'destructive' :
                          task.priority === 'medium' ? 'default' : 'secondary'
                        } className="text-xs shrink-0">
                          {task.priority === 'high' ? 'Haute' : task.priority === 'medium' ? 'Moyenne' : 'Basse'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comptes rendus */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Comptes rendus de réunion
                </CardTitle>
              </CardHeader>
              <CardContent>
                {projectMeetingNotes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">Aucun compte rendu de réunion</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projectMeetingNotes.map(note => (
                      <div key={note.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">
                            {note.created_at && format(new Date(note.created_at), 'EEEE dd MMMM yyyy', { locale: fr })}
                          </span>
                          {note.duration_minutes && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {note.duration_minutes} min
                            </div>
                          )}
                        </div>
                        {note.objectives && (
                          <p className="text-sm text-muted-foreground mb-2">{note.objectives}</p>
                        )}
                        {note.notes && (
                          <p className="text-sm line-clamp-3">{note.notes}</p>
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
