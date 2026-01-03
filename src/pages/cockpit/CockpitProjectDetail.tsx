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
  Users,
  Mail,
  Phone,
  Globe,
  Target,
  Tag,
  X,
  Lightbulb,
  Mic,
  Sparkles,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCockpitProjects } from '@/hooks/cockpit';
import { useCockpitTasks } from '@/hooks/cockpit/useCockpitTasks';
import { useCockpitMeetingNotes } from '@/hooks/cockpit/useCockpitMeetingNotes';
import { useCockpitVoiceTranscriptions } from '@/hooks/cockpit/useCockpitVoiceTranscriptions';
import { useCockpitSpecifications } from '@/hooks/cockpit/useCockpitSpecifications';
import { useCockpitProjectDocuments } from '@/hooks/cockpit/useCockpitProjectDocuments';
import { useCockpitProjectNotes } from '@/hooks/cockpit/useCockpitProjectNotes';
import { LeadSelector } from '@/components/cockpit/LeadSelector';
import { ContentEditor } from '@/components/cockpit/ContentEditor';
import { FileUploader } from '@/components/cockpit/FileUploader';
import { SpecificationEditor } from '@/components/cockpit/SpecificationEditor';
import { CreateTaskDialog } from '@/components/cockpit/dialogs/CreateTaskDialog';
import { DocumentGenerator } from '@/components/cockpit/DocumentGenerator';
import { ConsulteTab } from '@/components/cockpit/ConsulteTab';
import { LinkedFilesSection } from '@/components/cockpit/LinkedFilesSection';
import { LinkedTranscriptionsSection } from '@/components/cockpit/LinkedTranscriptionsSection';
import { LinkedPartnersSection } from '@/components/cockpit/LinkedPartnersSection';

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
  const { transcriptions } = useCockpitVoiceTranscriptions();
  const { useSpecificationsByProject } = useCockpitSpecifications();
  const { documents, createDocument, deleteDocument } = useCockpitProjectDocuments(id);
  const { notes: projectNotes, createNote, updateNote, deleteNote } = useCockpitProjectNotes(id);
  
  const { data: projectSpecs = [] } = useSpecificationsByProject(id || '');

  // State
  const [formData, setFormData] = useState<Partial<Project> & { lead_id?: string | null; solution_id?: string | null }>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Dialog states for adding items
  const [showAddNoteDialog, setShowAddNoteDialog] = useState(false);
  const [showAddDocDialog, setShowAddDocDialog] = useState(false);
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  
  // New item form states
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteFiles, setNewNoteFiles] = useState<File | File[] | null>(null);
  const [newNoteTags, setNewNoteTags] = useState<string[]>([]);
  const [newNoteTagInput, setNewNoteTagInput] = useState('');
  
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocFiles, setNewDocFiles] = useState<File | File[] | null>(null);
  const [newDocTags, setNewDocTags] = useState<string[]>([]);
  const [newDocTagInput, setNewDocTagInput] = useState('');
  

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

  // Fetch solutions for linking
  const { data: solutions = [] } = useQuery({
    queryKey: ["solutions-for-project"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title")
        .eq("resource_type", "solution")
        .eq("published", true)
        .order("title");
      if (error) throw error;
      return data;
    },
  });

  // Fetch linked solution
  const { data: linkedSolution } = useQuery({
    queryKey: ['project-solution', (project as any)?.solution_id],
    queryFn: async () => {
      const solutionId = (project as any)?.solution_id;
      if (!solutionId) return null;
      const { data, error } = await supabase
        .from('articles')
        .select('id, title, slug')
        .eq('id', solutionId)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!(project as any)?.solution_id,
  });

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description,
        lead_id: (project as any)?.lead_id || null,
        solution_id: (project as any)?.solution_id || null,
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
      tags: newNoteTags.length > 0 ? newNoteTags : null,
    }, {
      onSuccess: () => {
        setNewNoteTitle('');
        setNewNoteContent('');
        setNewNoteFiles(null);
        setNewNoteTags([]);
        setNewNoteTagInput('');
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
      tags: newDocTags.length > 0 ? newDocTags : null,
    }, {
      onSuccess: () => {
        setNewDocTitle('');
        setNewDocFiles(null);
        setNewDocTags([]);
        setNewDocTagInput('');
        setShowAddDocDialog(false);
      }
    });
  };

  // Tag handlers
  const addTag = (type: 'note' | 'doc') => {
    const input = type === 'note' ? newNoteTagInput : newDocTagInput;
    const tags = type === 'note' ? newNoteTags : newDocTags;
    const setTags = type === 'note' ? setNewNoteTags : setNewDocTags;
    const setInput = type === 'note' ? setNewNoteTagInput : setNewDocTagInput;
    
    const tag = input.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setInput('');
  };

  const removeTag = (tag: string, type: 'note' | 'doc') => {
    const setTags = type === 'note' ? setNewNoteTags : setNewDocTags;
    const tags = type === 'note' ? newNoteTags : newDocTags;
    setTags(tags.filter(t => t !== tag));
  };

  const handleTagKeyPress = (e: React.KeyboardEvent, type: 'note' | 'doc') => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(type);
    }
  };


  const projectTasks = tasks?.filter(t => t.project_id === id) || [];
  const projectMeetingNotes = meetingNotes?.filter(n => n.project_id === id) || [];
  const projectTranscriptions = transcriptions?.filter(t => t.project_id === id) || [];

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
      <div className="p-4 sm:p-5 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/cockpit/projects')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-semibold text-foreground truncate">{project.name || 'Nouveau projet'}</h1>
              <p className="text-xs text-muted-foreground">
                Créé le {project.created_at && format(new Date(project.created_at), 'dd MMM yyyy', { locale: fr })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              className="h-8 text-sm"
              onClick={handleSave}
              disabled={!hasChanges || updateProject.isPending}
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline">Enregistrer</span>
            </Button>
            <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6 h-9 overflow-x-auto">
            <TabsTrigger value="overview" className="flex items-center gap-1 text-xs sm:text-sm h-7 px-2">
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Aperçu</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-1 text-xs sm:text-sm h-7 px-2">
              <StickyNote className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Notes</span>
              {(projectNotes?.length || 0) > 0 && (
                <Badge variant="secondary" className="text-xs py-0 px-1 h-4 hidden sm:inline-flex">{projectNotes?.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-1 text-xs sm:text-sm h-7 px-2">
              <FileUp className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Docs</span>
              {(documents?.length || 0) > 0 && (
                <Badge variant="secondary" className="text-xs py-0 px-1 h-4 hidden sm:inline-flex">{documents?.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="specs" className="flex items-center gap-1 text-xs sm:text-sm h-7 px-2">
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">CDC</span>
              {projectSpecs.length > 0 && (
                <Badge variant="secondary" className="text-xs py-0 px-1 h-4 hidden sm:inline-flex">{projectSpecs.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="consulte" className="flex items-center gap-1 text-xs sm:text-sm h-7 px-2">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Consulte</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-1 text-xs sm:text-sm h-7 px-2">
              <ListTodo className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Activité</span>
              {(projectTasks.length + projectMeetingNotes.length) > 0 && (
                <Badge variant="secondary" className="text-xs py-0 px-1 h-4 hidden sm:inline-flex">
                  {projectTasks.length + projectMeetingNotes.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab - Enrichi */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Informations projet */}
              <Card className="border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Edit3 className="h-4 w-4" />
                    Projet
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nom du projet</Label>
                    <Input
                      value={formData.name || ''}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="Nom du projet"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Description</Label>
                    <Textarea
                      value={formData.description || ''}
                      onChange={(e) => handleChange('description', e.target.value || null)}
                      placeholder="Description..."
                      className="min-h-[80px] resize-y text-sm"
                    />
                  </div>
                  {/* Solution IArche */}
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5">
                      <Lightbulb className="h-3 w-3" />
                      Solution IArche
                    </Label>
                    <Select 
                      value={(formData as any).solution_id || "none"} 
                      onValueChange={(v) => handleChange('solution_id', v === "none" ? null : v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Aucune solution liée" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucune</SelectItem>
                        {solutions.map(sol => (
                          <SelectItem key={sol.id} value={sol.id}>
                            {sol.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {linkedSolution && (
                      <p className="text-xs text-primary mt-1">{linkedSolution.title}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Statut</p>
                      <Badge variant="outline" className="mt-1">{project.status}</Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Santé</p>
                      <Badge variant={project.health_status === 'on_track' ? 'default' : 'destructive'} className="mt-1">
                        {project.health_status === 'on_track' ? 'En bonne voie' : project.health_status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact principal */}
              <Card className="border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Contact attribué</Label>
                    <LeadSelector
                      value={formData.lead_id || null}
                      onChange={(leadId) => handleChange('lead_id', leadId)}
                    />
                  </div>
                  
                  {linkedLead && (
                    <div className="pt-2 space-y-2 border-t">
                      <div className="pt-2">
                        <p className="font-medium text-sm">{linkedLead.name}</p>
                        {(linkedLead as any).position && (
                          <p className="text-xs text-muted-foreground">{(linkedLead as any).position}</p>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        {linkedLead.email && (
                          <a href={`mailto:${linkedLead.email}`} className="flex items-center gap-2 text-primary hover:underline text-xs">
                            <Mail className="h-3 w-3" />
                            {linkedLead.email}
                          </a>
                        )}
                        {linkedLead.phone && (
                          <a href={`tel:${linkedLead.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-xs">
                            <Phone className="h-3 w-3" />
                            {linkedLead.phone}
                          </a>
                        )}
                        {(linkedLead as any).linkedin_url && (
                          <a href={(linkedLead as any).linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline text-xs">
                            <ExternalLink className="h-3 w-3" />
                            LinkedIn
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Société */}
              <Card className="border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Société
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {linkedLead ? (
                    <div className="space-y-3">
                      <div>
                        <p className="font-medium">{linkedLead.company || 'Non renseigné'}</p>
                        {(linkedLead as any).siret && (
                          <p className="text-xs text-muted-foreground">SIRET: {(linkedLead as any).siret}</p>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
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
                        {(linkedLead as any).revenue_range && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground">CA estimé</p>
                            <p className="font-medium">{(linkedLead as any).revenue_range}</p>
                          </div>
                        )}
                      </div>

                      {((linkedLead as any).address || (linkedLead as any).city) && (
                        <div className="pt-2 border-t text-xs">
                          <p className="text-muted-foreground mb-1">Adresse</p>
                          <p>{(linkedLead as any).address}</p>
                          <p>{(linkedLead as any).postal_code} {(linkedLead as any).city}</p>
                          <p>{(linkedLead as any).country}</p>
                        </div>
                      )}

                      {(linkedLead as any).website && (
                        <a 
                          href={(linkedLead as any).website.startsWith('http') ? (linkedLead as any).website : `https://${(linkedLead as any).website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-primary hover:underline text-xs pt-2 border-t"
                        >
                          <Globe className="h-3 w-3" />
                          {(linkedLead as any).website}
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Sélectionnez un contact pour voir les infos société
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Partenaires */}
              <Card className="border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Partenaires
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <LinkedPartnersSection entityType="project" entityId={id} />
                </CardContent>
              </Card>
            </div>

            {/* Budget & Timeline */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Planning
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Début</p>
                      <p className="font-medium">
                        {project.start_date 
                          ? format(new Date(project.start_date), 'dd MMM yyyy', { locale: fr })
                          : 'Non défini'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Échéance</p>
                      <p className="font-medium">
                        {project.target_end_date 
                          ? format(new Date(project.target_end_date), 'dd MMM yyyy', { locale: fr })
                          : 'Non définie'}
                      </p>
                    </div>
                  </div>
                  {project.actual_end_date && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">Terminé le</p>
                      <p className="font-medium text-sm">
                        {format(new Date(project.actual_end_date), 'dd MMM yyyy', { locale: fr })}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Budget
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Budget alloué</p>
                      <p className="font-semibold text-lg">
                        {project.budget_amount 
                          ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(project.budget_amount))
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Consommé</p>
                      <p className="font-semibold text-lg">
                        {project.consumed_amount 
                          ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(project.consumed_amount))
                          : '0 €'}
                      </p>
                    </div>
                  </div>
                  {project.budget_amount && Number(project.budget_amount) > 0 && (
                    <div className="pt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Progression</span>
                        <span>{Math.round((Number(project.consumed_amount || 0) / Number(project.budget_amount)) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${Math.min(100, (Number(project.consumed_amount || 0) / Number(project.budget_amount)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Linked Transcriptions */}
            <LinkedTranscriptionsSection entityType="project" entityId={id} />

            {/* Documents IA Generator */}
            <DocumentGenerator projectId={id} />

            {/* Quick Summary */}
            <Card className="bg-muted/30 border">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between text-sm flex-wrap gap-4">
                  <div className="flex items-center gap-5">
                    <div className="flex items-center gap-2">
                      <StickyNote className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Notes</span>
                      <span className="font-semibold">{projectNotes?.length || 0}</span>
                    </div>
                    <div className="h-6 w-px bg-border" />
                    <div className="flex items-center gap-2">
                      <FileUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Documents</span>
                      <span className="font-semibold">{documents?.length || 0}</span>
                    </div>
                    <div className="h-6 w-px bg-border" />
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">CDC</span>
                      <span className="font-semibold">{projectSpecs.length}</span>
                    </div>
                    <div className="h-6 w-px bg-border" />
                    <div className="flex items-center gap-2">
                      <ListTodo className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Tâches</span>
                      <span className="font-semibold">{projectTasks.length}</span>
                    </div>
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
                      {/* Tags */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Tag className="h-3.5 w-3.5" />
                          Tags
                        </Label>
                        <div className="flex flex-wrap gap-1.5 p-2 border rounded-md min-h-[40px] bg-background">
                          {newNoteTags.map(tag => (
                            <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                              {tag}
                              <X 
                                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                                onClick={() => removeTag(tag, 'note')}
                              />
                            </Badge>
                          ))}
                          <Input
                            value={newNoteTagInput}
                            onChange={(e) => setNewNoteTagInput(e.target.value)}
                            onKeyDown={(e) => handleTagKeyPress(e, 'note')}
                            onBlur={() => addTag('note')}
                            placeholder={newNoteTags.length === 0 ? "Ajouter des tags..." : ""}
                            className="border-0 p-0 h-6 text-sm flex-1 min-w-[100px] focus-visible:ring-0 shadow-none"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Appuyez sur Entrée pour ajouter</p>
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
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {note.tags.map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        )}
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
            {/* Transcriptions liées */}
            <LinkedTranscriptionsSection entityType="project" entityId={id!} />

            {/* Uploaded Files from cockpit-uploads */}
            <LinkedFilesSection entityType="project" entityId={id!} title="Fichiers importés" />

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
                      {/* Tags */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Tag className="h-3.5 w-3.5" />
                          Tags
                        </Label>
                        <div className="flex flex-wrap gap-1.5 p-2 border rounded-md min-h-[40px] bg-background">
                          {newDocTags.map(tag => (
                            <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                              {tag}
                              <X 
                                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                                onClick={() => removeTag(tag, 'doc')}
                              />
                            </Badge>
                          ))}
                          <Input
                            value={newDocTagInput}
                            onChange={(e) => setNewDocTagInput(e.target.value)}
                            onKeyDown={(e) => handleTagKeyPress(e, 'doc')}
                            onBlur={() => addTag('doc')}
                            placeholder={newDocTags.length === 0 ? "Ajouter des tags..." : ""}
                            className="border-0 p-0 h-6 text-sm flex-1 min-w-[100px] focus-visible:ring-0 shadow-none"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Appuyez sur Entrée pour ajouter</p>
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
                            {doc.tags && doc.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {doc.tags.map(tag => (
                                  <Badge key={tag} variant="secondary" className="text-xs py-0">{tag}</Badge>
                                ))}
                              </div>
                            )}
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
            <SpecificationEditor projectId={id || ''} specifications={projectSpecs} />
          </TabsContent>

          {/* Consulte Tab */}
          <TabsContent value="consulte">
            <ConsulteTab
              entityType="project"
              entityId={id!}
              entityName={project.name || 'Projet'}
              summary={project.ai_documents_summary || null}
              onSynthesisComplete={() => queryClient.invalidateQueries({ queryKey: ['project-detail', id] })}
            />
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
                <Button size="sm" variant="outline" onClick={() => setShowAddTaskDialog(true)}>
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

            {/* Transcriptions vocales */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mic className="h-5 w-5" />
                  Transcriptions vocales
                </CardTitle>
              </CardHeader>
              <CardContent>
                {projectTranscriptions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Mic className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">Aucune transcription liée</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projectTranscriptions.map(transcription => (
                      <div key={transcription.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {(transcription.summary as any)?.title || 'Transcription'}
                            </span>
                            <Badge variant={transcription.status === 'done' ? 'default' : 'secondary'} className="text-xs">
                              {transcription.status === 'done' ? 'Terminée' : transcription.status}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(transcription.created_at), 'dd MMM yyyy', { locale: fr })}
                          </span>
                        </div>
                        {(transcription.summary as any)?.executive_summary && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {(transcription.summary as any).executive_summary}
                          </p>
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

      {/* Task Dialog */}
      <CreateTaskDialog
        open={showAddTaskDialog}
        onOpenChange={setShowAddTaskDialog}
        defaultEntityType="project"
        defaultEntityId={id}
      />
    </CockpitLayout>
  );
};

export default CockpitProjectDetail;
