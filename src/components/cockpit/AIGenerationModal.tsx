import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Sparkles, 
  Clipboard, 
  Mic, 
  Building2, 
  User, 
  Lightbulb,
  Loader2,
  Receipt
} from "lucide-react";
import { useCockpitProjects } from '@/hooks/cockpit/useCockpitProjects';
import { useCockpitLeads } from '@/hooks/cockpit/useCockpitLeads';
import { useCockpitVoiceTranscriptions } from '@/hooks/cockpit/useCockpitVoiceTranscriptions';
import { useBillingEntities } from '@/hooks/cockpit/useBillingEntities';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: 'quote' | 'spec' | 'proposal';
  onGenerated: () => void;
}

export function AIGenerationModal({ 
  open, 
  onOpenChange, 
  documentType,
  onGenerated 
}: AIGenerationModalProps) {
  // Source selections
  const [usePasteContent, setUsePasteContent] = useState(false);
  const [pasteContent, setPasteContent] = useState('');
  const [useTranscription, setUseTranscription] = useState(false);
  const [selectedTranscriptionId, setSelectedTranscriptionId] = useState<string>('');
  const [useProject, setUseProject] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [useLead, setUseLead] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [useSolution, setUseSolution] = useState(false);
  const [selectedSolutionId, setSelectedSolutionId] = useState<string>('');
  const [selectedBillingEntityId, setSelectedBillingEntityId] = useState<string>('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [solutions, setSolutions] = useState<Array<{ id: string; title: string; slug: string }>>([]);

  const { projects } = useCockpitProjects();
  const { leads } = useCockpitLeads();
  const { transcriptions } = useCockpitVoiceTranscriptions();
  const { entities: billingEntities, isLoading: loadingEntities } = useBillingEntities();

  const doneTranscriptions = transcriptions.filter(t => t.status === 'done');

  // Auto-select default billing entity
  useEffect(() => {
    if (billingEntities && billingEntities.length > 0 && !selectedBillingEntityId) {
      const defaultEntity = billingEntities.find(e => e.is_default) || billingEntities[0];
      if (defaultEntity) {
        setSelectedBillingEntityId(defaultEntity.id);
      }
    }
  }, [billingEntities, selectedBillingEntityId]);

  // Fetch solutions
  useEffect(() => {
    const fetchSolutions = async () => {
      const { data } = await supabase
        .from('articles')
        .select('id, title, slug')
        .eq('resource_type', 'solution')
        .eq('published', true)
        .order('title');
      if (data) setSolutions(data);
    };
    fetchSolutions();
  }, []);

  const hasAnySources = usePasteContent || useTranscription || useProject || useLead || useSolution;

  const handleGenerate = async () => {
    if (!hasAnySources) {
      toast.error('Sélectionnez au moins une source');
      return;
    }

    setIsGenerating(true);
    try {
      // Build context from selected sources
      let contextData: Record<string, any> = {};
      
      if (usePasteContent && pasteContent.trim()) {
        contextData.pastedContent = pasteContent;
      }
      
      if (useProject && selectedProjectId) {
        const project = projects?.find(p => p.id === selectedProjectId);
        if (project) {
          contextData.project = {
            name: project.name,
            description: project.description,
            status: project.status,
            budget: project.budget_amount,
          };
        }
      }
      
      if (useLead && selectedLeadId) {
        const lead = leads?.find(l => l.id === selectedLeadId);
        if (lead) {
          contextData.lead = {
            name: lead.name,
            company: lead.company,
            message: lead.message,
            industry: lead.industry,
          };
        }
      }
      
      if (useSolution && selectedSolutionId) {
        const { data: solutionData } = await supabase
          .from('articles')
          .select('title, content, excerpt')
          .eq('id', selectedSolutionId)
          .single();
        if (solutionData) {
          contextData.solution = solutionData;
        }
      }
      
      if (useTranscription && selectedTranscriptionId) {
        const transcription = doneTranscriptions.find(t => t.id === selectedTranscriptionId);
        if (transcription?.summary) {
          contextData.transcription = {
            summary: transcription.summary.executive_summary,
            keyPoints: transcription.summary.key_points,
            decisions: transcription.summary.decisions,
            nextSteps: transcription.summary.next_steps,
          };
        }
      }

      // Generate document with context
      const { data, error } = await supabase.functions.invoke('generate-document', {
        body: {
          document_type: documentType,
          context: contextData,
          project_id: useProject && selectedProjectId ? selectedProjectId : undefined,
          lead_id: useLead && selectedLeadId ? selectedLeadId : undefined,
          billing_entity_id: selectedBillingEntityId || undefined,
        },
      });

      if (error) throw error;
      
      toast.success('Document généré avec succès');
      onOpenChange(false);
      onGenerated();
      
      // Reset form
      setUsePasteContent(false);
      setPasteContent('');
      setUseTranscription(false);
      setSelectedTranscriptionId('');
      setUseProject(false);
      setSelectedProjectId('');
      setUseLead(false);
      setSelectedLeadId('');
      setUseSolution(false);
      setSelectedSolutionId('');
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('Erreur lors de la génération');
    } finally {
      setIsGenerating(false);
    }
  };

  const documentTypeLabels = {
    quote: 'Devis',
    spec: 'Cahier des charges',
    proposal: 'Proposition commerciale',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Générer un {documentTypeLabels[documentType]} avec IA
          </DialogTitle>
          <DialogDescription>
            Sélectionnez une ou plusieurs sources pour générer votre document
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Billing Entity Selector - Always visible for quotes */}
          {documentType === 'quote' && (
            <div className="p-3 rounded-lg bg-muted/50 border space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Receipt className="h-4 w-4" />
                Société émettrice
              </Label>
              {loadingEntities ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement...
                </div>
              ) : billingEntities && billingEntities.length > 0 ? (
                <Select value={selectedBillingEntityId} onValueChange={setSelectedBillingEntityId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une société" />
                  </SelectTrigger>
                  <SelectContent>
                    {billingEntities.map(entity => (
                      <SelectItem key={entity.id} value={entity.id}>
                        <span className="flex items-center gap-2">
                          {entity.name}
                          {entity.is_default && (
                            <Badge variant="secondary" className="text-xs">Par défaut</Badge>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucune société configurée. <a href="/cockpit/documents/settings" className="text-primary underline">Configurer</a>
                </p>
              )}
            </div>
          )}

          {/* Paste Content */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="paste" 
                checked={usePasteContent}
                onCheckedChange={(checked) => setUsePasteContent(checked === true)}
              />
              <Label htmlFor="paste" className="flex items-center gap-2 cursor-pointer">
                <Clipboard className="h-4 w-4" />
                Coller du contenu textuel
              </Label>
            </div>
            {usePasteContent && (
              <Textarea
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                rows={4}
                placeholder="Collez ici vos notes, emails, transcriptions..."
                className="mt-2 text-sm"
              />
            )}
          </div>

          {/* Transcription */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="transcription" 
                checked={useTranscription}
                onCheckedChange={(checked) => setUseTranscription(checked === true)}
                disabled={doneTranscriptions.length === 0}
              />
              <Label 
                htmlFor="transcription" 
                className={`flex items-center gap-2 cursor-pointer ${doneTranscriptions.length === 0 ? 'text-muted-foreground' : ''}`}
              >
                <Mic className="h-4 w-4" />
                Transcription audio
                <Badge variant="secondary" className="text-xs ml-1">
                  {doneTranscriptions.length}
                </Badge>
              </Label>
            </div>
            {useTranscription && doneTranscriptions.length > 0 && (
              <Select value={selectedTranscriptionId} onValueChange={setSelectedTranscriptionId}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Sélectionner une transcription" />
                </SelectTrigger>
                <SelectContent>
                  {doneTranscriptions.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.summary?.title || `Transcription du ${new Date(t.created_at).toLocaleDateString('fr-FR')}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Project */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="project" 
                checked={useProject}
                onCheckedChange={(checked) => setUseProject(checked === true)}
                disabled={!projects?.length}
              />
              <Label 
                htmlFor="project" 
                className={`flex items-center gap-2 cursor-pointer ${!projects?.length ? 'text-muted-foreground' : ''}`}
              >
                <Building2 className="h-4 w-4" />
                Projet
              </Label>
            </div>
            {useProject && projects?.length > 0 && (
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Sélectionner un projet" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Lead */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="lead" 
                checked={useLead}
                onCheckedChange={(checked) => setUseLead(checked === true)}
                disabled={!leads?.length}
              />
              <Label 
                htmlFor="lead" 
                className={`flex items-center gap-2 cursor-pointer ${!leads?.length ? 'text-muted-foreground' : ''}`}
              >
                <User className="h-4 w-4" />
                Lead
              </Label>
            </div>
            {useLead && leads?.length > 0 && (
              <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Sélectionner un lead" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map(l => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} {l.company && `- ${l.company}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Solution */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="solution" 
                checked={useSolution}
                onCheckedChange={(checked) => setUseSolution(checked === true)}
                disabled={solutions.length === 0}
              />
              <Label 
                htmlFor="solution" 
                className={`flex items-center gap-2 cursor-pointer ${solutions.length === 0 ? 'text-muted-foreground' : ''}`}
              >
                <Lightbulb className="h-4 w-4" />
                Solution
              </Label>
            </div>
            {useSolution && solutions.length > 0 && (
              <Select value={selectedSolutionId} onValueChange={setSelectedSolutionId}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Sélectionner une solution" />
                </SelectTrigger>
                <SelectContent>
                  {solutions.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleGenerate}
            disabled={!hasAnySources || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Générer le document
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
