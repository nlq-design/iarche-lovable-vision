import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CockpitLayout } from "@/components/cockpit/CockpitLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Search,
  Loader2,
  FileText,
  Mail,
  Phone,
  Building2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCockpitSolutionLeads, useCockpitLeads } from "@/hooks/cockpit";
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
      .select("id, title, slug, excerpt, content, cover_image_url, published, created_at")
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/cockpit/solutions")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{solution.title}</h1>
              <Badge variant={solution.published ? "default" : "secondary"}>
                {solution.published ? "Publiée" : "Brouillon"}
              </Badge>
            </div>
            {solution.excerpt && (
              <p className="text-muted-foreground mt-1">{solution.excerpt}</p>
            )}
          </div>
          <Button variant="outline" asChild>
            <a href={`/solutions/${solution.slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Voir la page
            </a>
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="leads" className="space-y-6">
          <TabsList>
            <TabsTrigger value="leads" className="gap-2">
              <Users className="h-4 w-4" />
              Leads intéressés ({solutionLeads.length})
            </TabsTrigger>
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          </TabsList>

          {/* Leads Tab */}
          <TabsContent value="leads" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Leads intéressés par cette solution</h2>
              <Popover open={addLeadOpen} onOpenChange={setAddLeadOpen}>
                <PopoverTrigger asChild>
                  <Button disabled={availableLeads.length === 0}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Ajouter un lead
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[350px]" align="end">
                  <Command>
                    <CommandInput placeholder="Rechercher un lead..." />
                    <CommandList>
                      <CommandEmpty>Aucun lead disponible</CommandEmpty>
                      <CommandGroup>
                        {availableLeads.map((lead: any) => (
                          <CommandItem
                            key={lead.id}
                            value={`${lead.name} ${lead.email} ${lead.company || ''}`}
                            onSelect={() => handleAddLead(lead.id)}
                            className="flex flex-col items-start gap-1 py-3"
                          >
                            <span className="font-medium">{lead.name}</span>
                            <span className="text-xs text-muted-foreground">{lead.email}</span>
                            {lead.company && (
                              <span className="text-xs text-muted-foreground">{lead.company}</span>
                            )}
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
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="font-medium text-muted-foreground">Aucun lead lié</p>
                  <p className="text-sm text-muted-foreground">Ajoutez des leads intéressés par cette solution</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {solutionLeads.map((sl: any) => (
                  <Card key={sl.id} className="hover:bg-muted/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{sl.lead?.name || 'Lead inconnu'}</h3>
                            <Select
                              value={sl.interest_level || 'interested'}
                              onValueChange={(v) => handleUpdateInterest(sl.id, v)}
                            >
                              <SelectTrigger className="w-[140px] h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {INTEREST_LEVELS.map(level => (
                                  <SelectItem key={level.value} value={level.value}>
                                    {level.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            {sl.lead?.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {sl.lead.email}
                              </span>
                            )}
                            {sl.lead?.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {sl.lead.phone}
                              </span>
                            )}
                            {sl.lead?.company && (
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {sl.lead.company}
                              </span>
                            )}
                          </div>

                          {sl.created_at && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Ajouté le {format(new Date(sl.created_at), 'dd MMM yyyy', { locale: fr })}
                            </p>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteLink(sl.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {solution.cover_image_url && (
                  <img
                    src={solution.cover_image_url}
                    alt={solution.title}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Créée le</p>
                    <p className="font-medium">
                      {solution.created_at && format(new Date(solution.created_at), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Leads intéressés</p>
                    <p className="font-medium">{solutionLeads.length}</p>
                  </div>
                </div>

                {solution.excerpt && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Description</p>
                    <p>{solution.excerpt}</p>
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
