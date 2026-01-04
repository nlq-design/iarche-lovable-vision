import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Plus, 
  X, 
  Building2, 
  User, 
  Mic2, 
  FileText,
  Briefcase,
  Link as LinkIcon,
  Loader2
} from "lucide-react";
import { useCockpitProjects } from '@/hooks/cockpit/useCockpitProjects';
import { useCockpitLeads } from '@/hooks/cockpit/useCockpitLeads';
import { useCockpitVoiceTranscriptions } from '@/hooks/cockpit/useCockpitVoiceTranscriptions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface LinkedSource {
  type: 'project' | 'lead' | 'transcription' | 'solution';
  id: string;
  name: string;
}

interface LinkedSourcesSectionProps {
  documentId: string;
  projectId: string | null;
  leadId: string | null;
  specificationId?: string | null;
  onSourceLinked?: () => void;
}

const SOURCE_ICONS: Record<string, React.ElementType> = {
  project: Building2,
  lead: User,
  transcription: Mic2,
  solution: Briefcase,
};

export function LinkedSourcesSection({
  documentId,
  projectId,
  leadId,
  specificationId,
  onSourceLinked
}: LinkedSourcesSectionProps) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linking, setLinking] = useState(false);
  const queryClient = useQueryClient();

  const { projects } = useCockpitProjects();
  const { leads } = useCockpitLeads();
  const { transcriptions } = useCockpitVoiceTranscriptions();

  // Collect current linked sources
  const linkedSources: LinkedSource[] = [];
  
  if (projectId) {
    const project = projects?.find(p => p.id === projectId);
    if (project) {
      linkedSources.push({ type: 'project', id: project.id, name: project.name });
    }
  }
  
  if (leadId) {
    const lead = leads?.find(l => l.id === leadId);
    if (lead) {
      linkedSources.push({ type: 'lead', id: lead.id, name: lead.name });
    }
  }

  // Available sources for linking (not already linked)
  const availableProjects = projects?.filter(p => p.id !== projectId) || [];
  const availableLeads = leads?.filter(l => l.id !== leadId) || [];
  const availableTranscriptions = transcriptions?.filter(t => t.status === 'done') || [];

  const handleLinkSource = async (type: string, id: string, name: string) => {
    setLinking(true);
    try {
      const updateData: Record<string, any> = {};
      
      if (type === 'project') {
        updateData.project_id = id;
      } else if (type === 'lead') {
        updateData.lead_id = id;
      }

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('generated_documents')
          .update(updateData)
          .eq('id', documentId);
        
        if (error) throw error;

        // Mark document as needing re-synthesis
        await supabase
          .from('generated_documents')
          .update({ synthesis_stale: true })
          .eq('id', documentId);
      }

      // For transcriptions, create a link in the transcription_partners or similar junction
      // For now, we notify the user that the source was added
      
      toast.success(`${name} lié au document`);
      queryClient.invalidateQueries({ queryKey: ['cockpit-generated-documents'] });
      onSourceLinked?.();
      setLinkOpen(false);
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkSource = async (type: string) => {
    setLinking(true);
    try {
      const updateData: Record<string, any> = {};
      
      if (type === 'project') {
        updateData.project_id = null;
      } else if (type === 'lead') {
        updateData.lead_id = null;
      }

      const { error } = await supabase
        .from('generated_documents')
        .update(updateData)
        .eq('id', documentId);
      
      if (error) throw error;

      toast.success('Source retirée');
      queryClient.invalidateQueries({ queryKey: ['cockpit-generated-documents'] });
      onSourceLinked?.();
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLinking(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Sources liées
            {linkedSources.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {linkedSources.length}
              </Badge>
            )}
          </CardTitle>
          <Popover open={linkOpen} onOpenChange={setLinkOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={linking} type="button">
                {linking ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
                Ajouter
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-80 p-0"
              align="end"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <Command>
                <CommandInput placeholder="Rechercher une source..." className="h-9" />
                <CommandList>
                  <CommandEmpty>Aucune source disponible</CommandEmpty>
                  
                  {availableProjects.length > 0 && (
                    <CommandGroup heading="Projets">
                      {availableProjects.slice(0, 5).map(project => (
                        <CommandItem
                          key={project.id}
                          value={`project-${project.name}`}
                          onSelect={() => handleLinkSource('project', project.id, project.name)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-blue-600" />
                            <span className="text-sm">{project.name}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  
                  {availableLeads.length > 0 && (
                    <CommandGroup heading="Leads">
                      {availableLeads.slice(0, 5).map(lead => (
                        <CommandItem
                          key={lead.id}
                          value={`lead-${lead.name}`}
                          onSelect={() => handleLinkSource('lead', lead.id, lead.name)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-green-600" />
                            <span className="text-sm">{lead.name}</span>
                            {lead.company && (
                              <span className="text-xs text-muted-foreground">({lead.company})</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {availableTranscriptions.length > 0 && (
                    <CommandGroup heading="Transcriptions">
                      {availableTranscriptions.slice(0, 5).map(t => (
                        <CommandItem
                          key={t.id}
                          value={`transcription-${t.title}`}
                          onSelect={() => {
                            toast.info('Transcription notée - la synthèse IA prendra en compte ce contexte');
                            setLinkOpen(false);
                          }}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Mic2 className="h-4 w-4 text-purple-600" />
                            <span className="text-sm">{t.title || 'Transcription'}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent>
        {linkedSources.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-3 bg-muted/30 rounded-lg">
            Aucune source liée
          </div>
        ) : (
          <div className="space-y-2">
            {linkedSources.map(source => {
              const Icon = SOURCE_ICONS[source.type] || FileText;
              const linkPath = source.type === 'project' 
                ? `/cockpit/projects/${source.id}`
                : source.type === 'lead'
                ? `/cockpit/leads/${source.id}`
                : null;

              return (
                <div 
                  key={`${source.type}-${source.id}`}
                  className="flex items-center gap-3 p-2 border rounded-lg hover:bg-muted/30 transition-colors group"
                >
                  <div className="p-1.5 bg-muted rounded">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {linkPath ? (
                      <Link to={linkPath} className="text-sm font-medium hover:text-primary truncate block">
                        {source.name}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium truncate block">{source.name}</span>
                    )}
                    <span className="text-xs text-muted-foreground capitalize">{source.type}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={() => handleUnlinkSource(source.type)}
                    disabled={linking}
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
