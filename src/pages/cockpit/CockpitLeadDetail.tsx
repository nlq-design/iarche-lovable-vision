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
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Calendar,
  MessageSquare,
  Trash2,
  Save,
  User,
  Briefcase,
  Tag,
  FolderPlus,
  FolderOpen,
  ChevronRight,
  Link2,
  Package,
  History,
  CheckSquare,
  FileText,
  Bot,
  Mic,
  Globe,
  Linkedin,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCockpitLeads, useCockpitProjects, useCockpitTasks, useCockpitBookings, useCockpitUploads } from '@/hooks/cockpit';
import { useLeads } from '@/hooks/shared/useLeads';
import { LinkedFilesSection } from '@/components/cockpit/LinkedFilesSection';
import { DocumentsSynthesisSection } from '@/components/cockpit/DocumentsSynthesisSection';
import { LinkedPartnersSection } from '@/components/cockpit/LinkedPartnersSection';
import { useCockpitPartners } from '@/hooks/cockpit/useCockpitPartners';
import { useEntityPartners } from '@/hooks/cockpit/usePartnerLinks';
import type { Database } from '@/integrations/supabase/types';
import { LeadContactsSection } from '@/components/cockpit/LeadContactsSection';
import { Users } from 'lucide-react';

type Lead = Database['public']['Tables']['leads']['Row'];

const SOURCE_LABELS: Record<string, string> = {
  'contact': 'Formulaire Contact',
  'newsletter': 'Newsletter',
  'atelier-webinaire': 'Atelier/Webinaire',
  'livre-blanc': 'Livre blanc',
  'formulaire': 'Formulaire',
};

const COMPANY_SIZES = [
  { value: '1-10', label: '1-10 employés' },
  { value: '11-50', label: '11-50 employés' },
  { value: '51-200', label: '51-200 employés' },
  { value: '201-500', label: '201-500 employés' },
  { value: '500+', label: '500+ employés' },
];

const INDUSTRIES = [
  'Agriculture', 'Agroalimentaire', 'Automobile', 'BTP / Construction',
  'Commerce / Distribution', 'Conseil', 'Éducation / Formation', 'Énergie',
  'Finance / Banque', 'Immobilier', 'Industrie', 'IT / Numérique',
  'Logistique / Transport', 'Santé', 'Services', 'Tourisme / Hôtellerie', 'Autre',
];

const CockpitLeadDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { updateLead } = useCockpitLeads();
  const { createProject, projects } = useCockpitProjects();
  const { deleteLead } = useLeads();
  const { tasks } = useCockpitTasks();
  const { bookings } = useCockpitBookings();
  const { uploads: linkedFiles } = useCockpitUploads(id ? { leadId: id } : undefined);

  const [formData, setFormData] = useState<Partial<Lead>>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [linkProjectOpen, setLinkProjectOpen] = useState(false);
  const [linkSolutionOpen, setLinkSolutionOpen] = useState(false);
  const [linkPartnerOpen, setLinkPartnerOpen] = useState(false);

  // Partners
  const { partners: allPartners } = useCockpitPartners();
  const { partners: linkedPartners, linkPartner, unlinkPartner } = useEntityPartners('lead', id);
  const linkedPartnerIds = linkedPartners?.map((lp: any) => lp.partner_id) || [];
  const availablePartners = allPartners?.filter(p => !linkedPartnerIds.includes(p.id) && p.is_active) || [];

  const handleLinkPartner = async (partnerId: string) => {
    await linkPartner.mutateAsync({ partnerId });
    setLinkPartnerOpen(false);
  };

  // Filter tasks linked to this lead
  const leadTasks = tasks?.filter(t => t.lead_id === id) || [];
  
  // Filter bookings linked to this lead
  const leadBookings = bookings?.filter(b => b.lead_id === id) || [];

  // Fetch transcriptions linked to this lead
  const { data: leadTranscriptions = [] } = useQuery({
    queryKey: ['lead-transcriptions', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('voice_transcriptions')
        .select('id, source, status, created_at, summary')
        .eq('lead_id', id)
        .order('created_at', { ascending: false });
      if (error) return [];
      return data;
    },
    enabled: !!id,
  });

  // Fetch generated documents linked to this lead
  const { data: leadDocuments = [] } = useQuery({
    queryKey: ['lead-documents', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('generated_documents')
        .select('id, title, document_type, status, created_at')
        .eq('lead_id', id)
        .order('created_at', { ascending: false });
      if (error) return [];
      return data;
    },
    enabled: !!id,
  });

  // Fetch lead
  const { data: lead, isLoading, refetch: refetchLead } = useQuery({
    queryKey: ['lead-detail', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Lead & { ai_documents_summary?: string | null };
    },
    enabled: !!id,
  });

  // Fetch projects linked to this lead
  const { data: linkedProjects = [], refetch: refetchLinkedProjects } = useQuery({
    queryKey: ['lead-projects', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status, created_at')
        .eq('lead_id', id)
        .order('created_at', { ascending: false });
      if (error) return [];
      return data;
    },
    enabled: !!id,
  });

  // Fetch solutions linked to this lead
  const { data: linkedSolutions = [], refetch: refetchLinkedSolutions } = useQuery({
    queryKey: ['lead-solutions', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('solution_leads')
        .select(`
          id,
          solution_id,
          interest_level,
          notes,
          created_at,
          solution:articles(id, title, slug)
        `)
        .eq('lead_id', id)
        .order('created_at', { ascending: false });
      if (error) return [];
      return data;
    },
    enabled: !!id,
  });

  // Fetch available solutions
  const { data: allSolutions = [] } = useQuery({
    queryKey: ['solutions-for-lead-linking'],
    queryFn: async () => {
      const { data } = await supabase
        .from('articles')
        .select('id, title, slug')
        .eq('resource_type', 'solution')
        .eq('published', true)
        .order('title');
      return data ?? [];
    },
  });

  const availableSolutions = allSolutions.filter(
    (s: any) => !linkedSolutions.some((ls: any) => ls.solution_id === s.id)
  );

  const availableProjects = (projects || []).filter(
    (p: any) => !linkedProjects.some((lp: any) => lp.id === p.id)
  );

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        position: lead.position,
        company: lead.company,
        company_size: lead.company_size,
        industry: lead.industry,
        website: lead.website,
        linkedin_url: lead.linkedin_url,
        address: lead.address,
        city: lead.city,
        postal_code: lead.postal_code,
        siret: lead.siret,
        message: lead.message,
      });
      setHasChanges(false);
    }
  }, [lead]);

  const handleChange = (field: keyof Lead, value: string | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (lead && hasChanges) {
      updateLead.mutate({ id: lead.id, ...formData }, {
        onSuccess: () => {
          setHasChanges(false);
          queryClient.invalidateQueries({ queryKey: ['lead-detail', id] });
        }
      });
    }
  };

  const handleDelete = () => {
    if (lead) {
      deleteLead.mutate(lead.id, {
        onSuccess: () => {
          navigate('/cockpit/leads');
        }
      });
    }
  };

  const handleLinkToSolution = async (solutionId: string) => {
    if (!lead) return;
    const { error } = await supabase
      .from('solution_leads')
      .insert({
        solution_id: solutionId,
        lead_id: lead.id,
        interest_level: 'interested',
      });
    if (!error) {
      refetchLinkedSolutions();
      setLinkSolutionOpen(false);
    }
  };

  const handleLinkToProject = async (projectId: string) => {
    if (!lead) return;
    const { error } = await supabase
      .from('projects')
      .update({ lead_id: lead.id })
      .eq('id', projectId);
    if (!error) {
      refetchLinkedProjects();
      setLinkProjectOpen(false);
    }
  };

  const handleCreateProject = async () => {
    if (!lead) return;
    const newProject = await createProject.mutateAsync({
      name: `Projet - ${lead.company || lead.name}`,
      status: 'planning',
      health_status: 'on_track',
      lead_id: lead.id,
    } as any);
    if (newProject) {
      navigate(`/cockpit/projects/${newProject.id}`);
    }
  };

  if (isLoading) {
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

  if (!lead) {
    return (
      <CockpitLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold mb-2">Lead introuvable</h2>
            <Button onClick={() => navigate('/cockpit/leads')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux leads
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
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/cockpit/leads')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-semibold text-foreground truncate">{lead.name}</h1>
                <Badge variant="secondary" className="text-xs">
                  {SOURCE_LABELS[lead.source] || lead.source}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Créé le {lead.created_at && format(new Date(lead.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              className="h-8 text-sm"
              onClick={handleSave}
              disabled={!hasChanges || updateLead.isPending}
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline">{updateLead.isPending ? 'Enregistrement...' : 'Enregistrer'}</span>
            </Button>
            <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column - Contact Info */}
          <div className="lg:col-span-2 space-y-4">
            {/* Contact Principal (1er interlocuteur = le lead) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Contact principal
                  <Badge variant="secondary" className="text-xs ml-auto">1er interlocuteur</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Actions rapides */}
                {(formData.email || formData.phone) && (
                  <div className="flex flex-wrap gap-2 pb-2 border-b">
                    {formData.email && (
                      <Button variant="outline" size="sm" asChild className="h-7 text-xs">
                        <a href={`mailto:${formData.email}`}>
                          <Mail className="h-3 w-3 mr-1.5" />
                          Envoyer un email
                        </a>
                      </Button>
                    )}
                    {formData.phone && (
                      <Button variant="outline" size="sm" asChild className="h-7 text-xs">
                        <a href={`tel:${formData.phone}`}>
                          <Phone className="h-3 w-3 mr-1.5" />
                          Appeler
                        </a>
                      </Button>
                    )}
                    {formData.linkedin_url && (
                      <Button variant="outline" size="sm" asChild className="h-7 text-xs">
                        <a href={formData.linkedin_url} target="_blank" rel="noopener noreferrer">
                          <Linkedin className="h-3 w-3 mr-1.5" />
                          LinkedIn
                          <ExternalLink className="h-2.5 w-2.5 ml-1" />
                        </a>
                      </Button>
                    )}
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nom complet</Label>
                    <Input
                      value={formData.name || ''}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Poste / Fonction</Label>
                    <Input
                      value={formData.position || ''}
                      onChange={(e) => handleChange('position', e.target.value || null)}
                      placeholder="Ex: Directeur Commercial"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5">
                      <Mail className="h-3 w-3" />
                      Email
                    </Label>
                    <Input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5">
                      <Phone className="h-3 w-3" />
                      Téléphone
                    </Label>
                    <Input
                      value={formData.phone || ''}
                      onChange={(e) => handleChange('phone', e.target.value || null)}
                      placeholder="Non renseigné"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs flex items-center gap-1.5">
                      <Linkedin className="h-3 w-3" />
                      Profil LinkedIn
                    </Label>
                    <Input
                      value={formData.linkedin_url || ''}
                      onChange={(e) => handleChange('linkedin_url', e.target.value || null)}
                      placeholder="https://linkedin.com/in/..."
                      className="h-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Entreprise */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Entreprise
                  {formData.website && (
                    <a 
                      href={formData.website.startsWith('http') ? formData.website : `https://${formData.website}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-auto text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <Globe className="h-3 w-3" />
                      Site web
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nom de l'entreprise</Label>
                    <Input
                      value={formData.company || ''}
                      onChange={(e) => handleChange('company', e.target.value || null)}
                      placeholder="Non renseigné"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">SIRET</Label>
                    <Input
                      value={formData.siret || ''}
                      onChange={(e) => handleChange('siret', e.target.value || null)}
                      placeholder="123 456 789 00012"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Taille</Label>
                    <Select
                      value={formData.company_size || ''}
                      onValueChange={(value) => handleChange('company_size', value || null)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPANY_SIZES.map(size => (
                          <SelectItem key={size.value} value={size.value}>
                            {size.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5">
                      <Briefcase className="h-3 w-3" />
                      Secteur
                    </Label>
                    <Select
                      value={formData.industry || ''}
                      onValueChange={(value) => handleChange('industry', value || null)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map(industry => (
                          <SelectItem key={industry} value={industry}>
                            {industry}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs flex items-center gap-1.5">
                      <Globe className="h-3 w-3" />
                      Site web
                    </Label>
                    <Input
                      value={formData.website || ''}
                      onChange={(e) => handleChange('website', e.target.value || null)}
                      placeholder="https://..."
                      className="h-9"
                    />
                  </div>
                </div>

                {/* Adresse */}
                <div className="pt-2 border-t">
                  <Label className="text-xs flex items-center gap-1.5 mb-2">
                    <MapPin className="h-3 w-3" />
                    Adresse
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-3 space-y-1.5">
                      <Input
                        value={formData.address || ''}
                        onChange={(e) => handleChange('address', e.target.value || null)}
                        placeholder="Rue, numéro..."
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Input
                        value={formData.postal_code || ''}
                        onChange={(e) => handleChange('postal_code', e.target.value || null)}
                        placeholder="Code postal"
                        className="h-9"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <Input
                        value={formData.city || ''}
                        onChange={(e) => handleChange('city', e.target.value || null)}
                        placeholder="Ville"
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Message / Context */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Message / Contexte
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {lead.source_context && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Contexte source</p>
                    <p className="text-sm">{lead.source_context}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Notes / Message</Label>
                  <Textarea
                    value={formData.message || ''}
                    onChange={(e) => handleChange('message', e.target.value || null)}
                    placeholder="Notes sur ce lead..."
                    className="min-h-[100px]"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Metadata & Links */}
          <div className="space-y-4">
            {/* Metadata */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Métadonnées
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Score</p>
                    <Badge variant={lead.lead_score && lead.lead_score >= 70 ? 'default' : 'secondary'}>
                      {lead.lead_score || 0} pts
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Marketing</p>
                    <Badge variant={lead.consent_marketing ? 'default' : 'outline'}>
                      {lead.consent_marketing ? 'Oui' : 'Non'}
                    </Badge>
                  </div>
                </div>
                {lead.last_contacted_at && (
                  <div>
                    <p className="text-xs text-muted-foreground">Dernier contact</p>
                    <p className="text-sm">{format(new Date(lead.last_contacted_at), 'dd MMMM yyyy', { locale: fr })}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={handleCreateProject}
                  disabled={createProject.isPending}
                >
                  <FolderPlus className="h-4 w-4 mr-2" />
                  {createProject.isPending ? 'Création...' : 'Nouveau projet'}
                </Button>

                <Popover open={linkProjectOpen} onOpenChange={setLinkProjectOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-start" disabled={availableProjects.length === 0}>
                      <Link2 className="h-4 w-4 mr-2" />
                      Lier à un projet
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[280px]" align="start">
                    <Command>
                      <CommandInput placeholder="Rechercher..." className="h-9" />
                      <CommandList>
                        <CommandEmpty>Aucun projet</CommandEmpty>
                        <CommandGroup>
                          {availableProjects.map((project: any) => (
                            <CommandItem
                              key={project.id}
                              value={project.name}
                              onSelect={() => handleLinkToProject(project.id)}
                              className="text-sm"
                            >
                              <FolderOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                              {project.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                <Popover open={linkSolutionOpen} onOpenChange={setLinkSolutionOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-start" disabled={availableSolutions.length === 0}>
                      <Package className="h-4 w-4 mr-2" />
                      Lier à une solution
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[280px]" align="start">
                    <Command>
                      <CommandInput placeholder="Rechercher..." className="h-9" />
                      <CommandList>
                        <CommandEmpty>Aucune solution</CommandEmpty>
                        <CommandGroup>
                          {availableSolutions.map((solution: any) => (
                            <CommandItem
                              key={solution.id}
                              value={solution.title}
                              onSelect={() => handleLinkToSolution(solution.id)}
                              className="text-sm"
                            >
                              <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                              {solution.title}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                <Popover open={linkPartnerOpen} onOpenChange={setLinkPartnerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-start" disabled={availablePartners.length === 0}>
                      <Users className="h-4 w-4 mr-2" />
                      Lier à un partenaire
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[280px]" align="start">
                    <Command>
                      <CommandInput placeholder="Rechercher..." className="h-9" />
                      <CommandList>
                        <CommandEmpty>Aucun partenaire</CommandEmpty>
                        <CommandGroup>
                          {availablePartners.map((partner: any) => (
                            <CommandItem
                              key={partner.id}
                              value={partner.name}
                              onSelect={() => handleLinkPartner(partner.id)}
                              className="text-sm"
                            >
                              <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                              {partner.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </CardContent>
            </Card>

            {/* Linked Partners */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Partenaires liés
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LinkedPartnersSection entityType="lead" entityId={id} />
              </CardContent>
            </Card>

            {/* Linked Projects */}
            {linkedProjects.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FolderOpen className="h-4 w-4" />
                    Projets liés ({linkedProjects.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {linkedProjects.map((project: any) => (
                    <div
                      key={project.id}
                      className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors flex items-center justify-between"
                      onClick={() => navigate(`/cockpit/projects/${project.id}`)}
                    >
                      <div>
                        <p className="font-medium text-sm">{project.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {project.created_at && format(new Date(project.created_at), 'dd MMM yyyy', { locale: fr })}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Linked Solutions */}
            {linkedSolutions.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Solutions liées ({linkedSolutions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {linkedSolutions.map((sl: any) => (
                    <div
                      key={sl.id}
                      className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors flex items-center justify-between"
                      onClick={() => navigate(`/cockpit/solutions/${sl.solution_id}`)}
                    >
                      <div>
                        <p className="font-medium text-sm">{sl.solution?.title || 'Solution'}</p>
                        <p className="text-xs text-muted-foreground">
                          {sl.interest_level === 'hot' ? '🔥 Chaud' : sl.interest_level === 'warm' ? '🌡️ Tiède' : '❄️ Froid'}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* AI Synthesis - show if files exist OR synthesis already exists */}
            <DocumentsSynthesisSection
              entityType="lead"
              entityId={id!}
              summary={(lead as any)?.ai_documents_summary || null}
              documentsCount={linkedFiles?.length || 0}
              onSynthesisComplete={refetchLead}
            />

            {/* Contacts (interlocuteurs) */}
            <LeadContactsSection leadId={id!} />

            {/* Linked Files */}
            <LinkedFilesSection entityType="lead" entityId={id!} title="Documents" />

            {/* Complete History */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Historique complet
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {/* Tasks */}
                    {leadTasks.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                          <CheckSquare className="h-3 w-3" />
                          Tâches ({leadTasks.length})
                        </p>
                        {leadTasks.slice(0, 5).map((task: any) => (
                          <div key={task.id} className="p-2 border rounded mb-1 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="truncate">{task.title}</span>
                              {task.ai_generated && (
                                <Badge variant="secondary" className="text-xs ml-1">
                                  <Bot className="h-2.5 w-2.5 mr-1" />
                                  IA
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {task.due_date && format(new Date(task.due_date), 'dd MMM', { locale: fr })}
                              {task.due_time && ` à ${task.due_time.slice(0, 5)}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Bookings */}
                    {leadBookings.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Rendez-vous ({leadBookings.length})
                        </p>
                        {leadBookings.slice(0, 5).map((booking: any) => (
                          <div key={booking.id} className="p-2 border rounded mb-1 text-sm">
                            <span className="truncate">{booking.name}</span>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(booking.start_time), 'dd MMM à HH:mm', { locale: fr })}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Transcriptions */}
                    {leadTranscriptions.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                          <Mic className="h-3 w-3" />
                          Transcriptions ({leadTranscriptions.length})
                        </p>
                        {leadTranscriptions.slice(0, 3).map((trans: any) => (
                          <div key={trans.id} className="p-2 border rounded mb-1 text-sm">
                            <span className="truncate capitalize">{trans.source}</span>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(trans.created_at), 'dd MMM', { locale: fr })}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Documents */}
                    {leadDocuments.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          Documents ({leadDocuments.length})
                        </p>
                        {leadDocuments.slice(0, 3).map((doc: any) => (
                          <div key={doc.id} className="p-2 border rounded mb-1 text-sm">
                            <span className="truncate">{doc.title}</span>
                            <p className="text-xs text-muted-foreground capitalize">
                              {doc.document_type} • {doc.status}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Empty state */}
                    {leadTasks.length === 0 && leadBookings.length === 0 && leadTranscriptions.length === 0 && leadDocuments.length === 0 && (
                      <div className="text-center py-6 text-muted-foreground">
                        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Aucune activité liée</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce lead ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le lead "{lead.name}" sera définitivement supprimé.
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

export default CockpitLeadDetail;
