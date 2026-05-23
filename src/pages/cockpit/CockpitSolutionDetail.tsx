import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CockpitLayout } from "@/components/cockpit/CockpitLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ExternalLink, 
  Users, 
  UserPlus,
  Trash2,
  Loader2,
  FileText,
  Mail,
  Building2,
  FileUp,
  Sparkles,
  BarChart3,
} from "lucide-react";
import { SaasSubscriptionsTab } from "@/components/cockpit/SaasSubscriptionsTab";
import { supabase } from "@/integrations/supabase/client";
import { useCockpitSolutionLeads, useCockpitLeads, useCockpitUploads } from "@/hooks/cockpit";
import { LinkedFilesSection } from "@/components/cockpit/LinkedFilesSection";
import { LinkedTranscriptionsSection } from "@/components/cockpit/LinkedTranscriptionsSection";
import { ConsulteTab } from "@/components/cockpit/ConsulteTab";
import { LinkedPartnersSection } from "@/components/cockpit/LinkedPartnersSection";
import { LinkedGeneratedDocumentsSection } from "@/components/cockpit/LinkedGeneratedDocumentsSection";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Solution {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  published: boolean | null;
  created_at: string | null;
  ai_documents_summary: string | null;
}

const INTEREST_LEVELS = [
  { value: 'interested', label: 'Intéressé', color: 'bg-blue-500' },
  { value: 'evaluating', label: 'En évaluation', color: 'bg-yellow-500' },
  { value: 'negotiation', label: 'Négociation', color: 'bg-orange-500' },
  { value: 'pending', label: 'En attente', color: 'bg-gray-500' },
];

export default function CockpitSolutionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [solution, setSolution] = useState<Solution | null>(null);
  const [loading, setLoading] = useState(true);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [deleteLink, setDeleteLink] = useState<string | null>(null);

  const { solutionLeads, isLoading: leadsLoading, linkLead, unlinkLead, updateLink } = useCockpitSolutionLeads(id);
  const { leads } = useCockpitLeads();
  const { uploads: linkedFiles } = useCockpitUploads(id ? { solutionId: id } : undefined);

  // Filter leads that are NOT already linked
  const availableLeads = (leads || []).filter(
    (l: any) => !solutionLeads.some((sl: any) => sl.lead_id === l.id)
  );

  useEffect(() => {
    if (id) loadSolution();
  }, [id]);

  const loadSolution = async () => {
    const { data, error } = await supabase
      .from("articles")
      .select("id, title, slug, excerpt, content, cover_image_url, published, created_at, ai_documents_summary")
      .eq("id", id)
      .eq("resource_type", "solution")
      .single();

    if (!error && data) {
      setSolution(data);
    }
    setLoading(false);
  };

  const handleAddLead = (leadId: string) => {
    if (!id) return;
    linkLead.mutate({ solutionId: id, leadId });
    setAddLeadOpen(false);
  };

  const handleRemoveLead = () => {
    if (deleteLink) {
      unlinkLead.mutate(deleteLink);
      setDeleteLink(null);
    }
  };

  const handleUpdateInterest = (linkId: string, level: string) => {
    updateLink.mutate({ linkId, interestLevel: level });
  };

  if (loading) {
    return (
      <CockpitLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </CockpitLayout>
    );
  }

  if (!solution) {
    return (
      <CockpitLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Solution non trouvée</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/cockpit/solutions")}>
            Retour aux solutions
          </Button>
        </div>
      </CockpitLayout>
    );
  }

  return (
    <CockpitLayout>
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/cockpit/solutions")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold truncate">{solution.title}</h1>
              <Badge variant={solution.published ? "default" : "secondary"} className="text-xs h-5 px-1.5">
                {solution.published ? "Publiée" : "Brouillon"}
              </Badge>
            </div>
            {solution.excerpt && (
              <p className="text-sm text-muted-foreground truncate">{solution.excerpt}</p>
            )}
          </div>
          <Button variant="outline" size="sm" className="h-8 text-sm" asChild>
            <a href={`/solutions/${solution.slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Voir
            </a>
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="leads" className="space-y-4">
          <TabsList className="h-9">
            <TabsTrigger value="leads" className="gap-1.5 text-sm h-7">
              <Users className="h-3.5 w-3.5" />
              Leads ({solutionLeads.length})
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5 text-sm h-7">
              <FileUp className="h-3.5 w-3.5" />
              Documents ({linkedFiles?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="consulte" className="gap-1.5 text-sm h-7">
              <Sparkles className="h-3.5 w-3.5" />
              Consulte
            </TabsTrigger>
            <TabsTrigger value="overview" className="text-sm h-7">Aperçu</TabsTrigger>
          </TabsList>

          {/* Leads Tab */}
          <TabsContent value="leads" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">Leads intéressés</h2>
              <Popover open={addLeadOpen} onOpenChange={setAddLeadOpen}>
                <PopoverTrigger asChild>
                  <Button size="sm" className="h-8 text-sm" disabled={availableLeads.length === 0}>
                    <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                    Ajouter
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[300px]" align="end">
                  <Command>
                    <CommandInput placeholder="Rechercher..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>Aucun lead</CommandEmpty>
                      <CommandGroup>
                        {availableLeads.map((lead: any) => (
                          <CommandItem
                            key={lead.id}
                            value={`${lead.name} ${lead.email} ${lead.company || ''}`}
                            onSelect={() => handleAddLead(lead.id)}
                            className="text-sm"
                          >
                            <span className="font-medium">{lead.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">{lead.company || lead.email}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {leadsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : solutionLeads.length === 0 ? (
              <Card className="border">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                  <p className="text-sm text-muted-foreground">Aucun lead lié</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {solutionLeads.map((sl: any) => (
                  <Card key={sl.id} className="border hover:bg-muted/30 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-sm">{sl.lead?.name || 'Lead inconnu'}</h3>
                            <Select
                              value={sl.interest_level || 'interested'}
                              onValueChange={(v) => handleUpdateInterest(sl.id, v)}
                            >
                              <SelectTrigger className="w-[120px] h-6 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {INTEREST_LEVELS.map(level => (
                                  <SelectItem key={level.value} value={level.value} className="text-xs">
                                    {level.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            {sl.lead?.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {sl.lead.email}
                              </span>
                            )}
                            {sl.lead?.company && (
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {sl.lead.company}
                              </span>
                            )}
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteLink(sl.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-3">
            {/* Transcriptions liées */}
            <LinkedTranscriptionsSection entityType="solution" entityId={id!} />

            {/* Fichiers importés */}
            <LinkedFilesSection entityType="solution" entityId={id!} title="Fichiers importés" />

            {/* Documents liés from cockpit-documents */}
            <LinkedGeneratedDocumentsSection entityType="solution" entityId={id!} title="Documents liés" />
            
            {/* Partenaires liés */}
            <LinkedPartnersSection entityType="solution" entityId={id} />
          </TabsContent>

          {/* Consulte Tab */}
          <TabsContent value="consulte">
            <ConsulteTab
              entityType="solution"
              entityId={id!}
              entityName={solution.title}
              summary={solution.ai_documents_summary}
              onSynthesisComplete={loadSolution}
            />
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-3">
            <Card className="border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {solution.cover_image_url && (
                  <img
                    src={solution.cover_image_url}
                    alt={solution.title}
                    className="w-full h-40 object-cover rounded-lg"
                  />
                )}
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Créée le</p>
                    <p className="font-medium">
                      {solution.created_at && format(new Date(solution.created_at), 'dd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Leads</p>
                    <p className="font-medium">{solutionLeads.length}</p>
                  </div>
                </div>

                {solution.excerpt && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Description</p>
                    <p className="text-sm">{solution.excerpt}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteLink} onOpenChange={() => setDeleteLink(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce lead ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ce lead sera retiré de la liste des intéressés pour cette solution.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveLead}>
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CockpitLayout>
  );
}
