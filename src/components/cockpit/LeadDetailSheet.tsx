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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
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
  Link2
} from "lucide-react";
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
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useCockpitLeads } from '@/hooks/cockpit';
import { useCockpitProjects } from '@/hooks/cockpit';
import { useLeads } from '@/hooks/shared/useLeads';
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
import { Separator } from "@/components/ui/separator";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  company_size?: string | null;
  industry?: string | null;
  source: string;
  source_context?: string | null;
  message?: string | null;
  qualification_status?: string | null;
  lead_score?: number | null;
  consent_marketing?: boolean | null;
  created_at?: string | null;
  last_contacted_at?: string | null;
}

interface LeadDetailSheetProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
  'Agriculture',
  'Agroalimentaire',
  'Automobile',
  'BTP / Construction',
  'Commerce / Distribution',
  'Conseil',
  'Éducation / Formation',
  'Énergie',
  'Finance / Banque',
  'Immobilier',
  'Industrie',
  'IT / Numérique',
  'Logistique / Transport',
  'Santé',
  'Services',
  'Tourisme / Hôtellerie',
  'Autre',
];

export function LeadDetailSheet({ lead, open, onOpenChange }: LeadDetailSheetProps) {
  const { updateLead } = useCockpitLeads();
  const { createProject, projects } = useCockpitProjects();
  const { deleteLead } = useLeads();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Partial<Lead>>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [linkProjectOpen, setLinkProjectOpen] = useState(false);

  // Fetch projects linked to this lead
  const { data: linkedProjects = [], refetch: refetchLinkedProjects } = useQuery({
    queryKey: ['lead-projects', lead?.id],
    queryFn: async () => {
      if (!lead?.id) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status, created_at')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false });
      if (error) return [];
      return data;
    },
    enabled: !!lead?.id,
  });

  // Filter projects that are NOT already linked to this lead
  const availableProjects = (projects || []).filter(
    (p: any) => !linkedProjects.some((lp: any) => lp.id === p.id)
  );

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
      onOpenChange(false);
      navigate(`/cockpit/projects/${newProject.id}`);
    }
  };

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        company_size: lead.company_size,
        industry: lead.industry,
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
        }
      });
    }
  };

  const handleDelete = () => {
    if (lead) {
      deleteLead.mutate(lead.id, {
        onSuccess: () => {
          setShowDeleteDialog(false);
          onOpenChange(false);
        }
      });
    }
  };

  if (!lead) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col h-full p-0">
          <SheetHeader className="px-6 py-4 border-b bg-background sticky top-0 z-10 space-y-1">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-semibold">{lead.name}</SheetTitle>
              <Badge variant="secondary" className="text-xs font-medium">
                {SOURCE_LABELS[lead.source] || lead.source}
              </Badge>
            </div>
            <SheetDescription className="flex items-center gap-1.5 text-xs">
              <Calendar className="h-3 w-3" />
              Créé le {lead.created_at && format(new Date(lead.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {/* Contact Info Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <User className="h-4 w-4" />
                Informations de contact
              </h3>
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom complet</Label>
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => handleChange('name', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-3 w-3" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-3 w-3" />
                    Téléphone
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone || ''}
                    onChange={(e) => handleChange('phone', e.target.value || null)}
                    placeholder="Non renseigné"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Company Info Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Entreprise
              </h3>
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company">Nom de l'entreprise</Label>
                  <Input
                    id="company"
                    value={formData.company || ''}
                    onChange={(e) => handleChange('company', e.target.value || null)}
                    placeholder="Non renseigné"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_size">Taille de l'entreprise</Label>
                  <Select
                    value={formData.company_size || ''}
                    onValueChange={(value) => handleChange('company_size', value || null)}
                  >
                    <SelectTrigger>
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

                <div className="space-y-2">
                  <Label htmlFor="industry" className="flex items-center gap-2">
                    <Briefcase className="h-3 w-3" />
                    Secteur d'activité
                  </Label>
                  <Select
                    value={formData.industry || ''}
                    onValueChange={(value) => handleChange('industry', value || null)}
                  >
                    <SelectTrigger>
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
              </div>
            </div>

            <Separator />

            {/* Message Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Message / Contexte
              </h3>
              
              {lead.source_context && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Contexte source</p>
                  <p className="text-sm">{lead.source_context}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="message">Notes / Message</Label>
                <Textarea
                  id="message"
                  value={formData.message || ''}
                  onChange={(e) => handleChange('message', e.target.value || null)}
                  placeholder="Notes sur ce lead..."
                  className="min-h-[100px]"
                />
              </div>
            </div>

            <Separator />

            {/* Linked Projects Section */}
            {linkedProjects.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Projets liés ({linkedProjects.length})
                </h3>
                <div className="space-y-2">
                  {linkedProjects.map((project: any) => (
                    <div
                      key={project.id}
                      className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors flex items-center justify-between"
                      onClick={() => {
                        onOpenChange(false);
                        navigate(`/cockpit/projects/${project.id}`);
                      }}
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
                </div>
              </div>
            )}

            <Separator />

            {/* Metadata Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Métadonnées
              </h3>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Score</p>
                  <Badge variant={lead.lead_score && lead.lead_score >= 70 ? 'default' : 'secondary'}>
                    {lead.lead_score || 0} pts
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Consentement marketing</p>
                  <Badge variant={lead.consent_marketing ? 'default' : 'outline'}>
                    {lead.consent_marketing ? 'Oui' : 'Non'}
                  </Badge>
                </div>
                {lead.last_contacted_at && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Dernier contact</p>
                    <p>{format(new Date(lead.last_contacted_at), 'dd MMMM yyyy', { locale: fr })}</p>
                  </div>
                )}
              </div>
            </div>

          </div>
          
          {/* Sticky Actions Footer */}
          <div className="px-6 py-4 border-t bg-background sticky bottom-0 space-y-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleCreateProject}
                disabled={createProject.isPending}
              >
                <FolderPlus className="h-4 w-4 mr-1.5" />
                {createProject.isPending ? 'Création...' : 'Nouveau projet'}
              </Button>
              
              <Popover open={linkProjectOpen} onOpenChange={setLinkProjectOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1" disabled={availableProjects.length === 0}>
                    <Link2 className="h-4 w-4 mr-1.5" />
                    Lier projet
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
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={handleSave}
                disabled={!hasChanges || updateLead.isPending}
              >
                <Save className="h-4 w-4 mr-1.5" />
                {updateLead.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce lead ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le lead "{lead.name}" sera définitivement supprimé 
              de la base de données.
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
