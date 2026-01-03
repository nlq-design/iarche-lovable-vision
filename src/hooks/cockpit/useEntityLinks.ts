import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type EntityType = 'lead' | 'project' | 'solution' | 'partner' | 'transcription' | 'document';
export type ExtendedEntityType = EntityType | 'upload';

export interface LinkedEntity {
  id: string;
  type: ExtendedEntityType;
  name: string;
  slug?: string;
  context?: string;
  role?: string;
  created_at?: string;
}

export interface EntityLinksData {
  leads: LinkedEntity[];
  projects: LinkedEntity[];
  solutions: LinkedEntity[];
  partners: LinkedEntity[];
  transcriptions: LinkedEntity[];
  documents: LinkedEntity[];
  uploads: LinkedEntity[];
}

interface UseEntityLinksResult {
  links: EntityLinksData;
  totalCount: number;
  isLoading: boolean;
  refetch: () => void;
  isStale: boolean;
}

export function useEntityLinks(entityType: EntityType, entityId: string | undefined): UseEntityLinksResult {
  const queryClient = useQueryClient();
  const [isStale, setIsStale] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['entity-links', entityType, entityId],
    queryFn: async () => {
      if (!entityId) return null;

      const links: EntityLinksData = {
        leads: [],
        projects: [],
        solutions: [],
        partners: [],
        transcriptions: [],
        documents: [],
        uploads: []
      };

      // Fetch based on entity type
      switch (entityType) {
        case 'lead':
          await fetchLeadLinks(entityId, links);
          break;
        case 'project':
          await fetchProjectLinks(entityId, links);
          break;
        case 'solution':
          await fetchSolutionLinks(entityId, links);
          break;
        case 'partner':
          await fetchPartnerLinks(entityId, links);
          break;
        case 'transcription':
          await fetchTranscriptionLinks(entityId, links);
          break;
        case 'document':
          await fetchDocumentLinks(entityId, links);
          break;
      }

      return links;
    },
    enabled: !!entityId,
    staleTime: 30000,
  });

  // Realtime subscriptions for auto-refresh
  useEffect(() => {
    if (!entityId) return;

    const tables = getRelevantTables(entityType);
    const channels: ReturnType<typeof supabase.channel>[] = [];

    tables.forEach(table => {
      const channel = supabase
        .channel(`entity-links-${entityType}-${table}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table 
        }, () => {
          setIsStale(true);
          queryClient.invalidateQueries({ queryKey: ['entity-links', entityType, entityId] });
        })
        .subscribe();
      
      channels.push(channel);
    });

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [entityType, entityId, queryClient]);

  const links = data || {
    leads: [],
    projects: [],
    solutions: [],
    partners: [],
    transcriptions: [],
    documents: [],
    uploads: []
  };

  const totalCount = 
    links.leads.length + 
    links.projects.length + 
    links.solutions.length + 
    links.partners.length + 
    links.transcriptions.length + 
    links.documents.length +
    links.uploads.length;

  return { links, totalCount, isLoading, refetch, isStale };
}

function getRelevantTables(entityType: EntityType): string[] {
  const commonTables = ['lead_partners', 'project_partners', 'solution_partners', 'document_partners', 'transcription_partners'];
  
  switch (entityType) {
    case 'lead':
      return [...commonTables, 'opportunities', 'projects', 'voice_transcriptions', 'generated_documents', 'solution_leads'];
    case 'project':
      return [...commonTables, 'voice_transcriptions', 'generated_documents', 'specifications'];
    case 'solution':
      return [...commonTables, 'solution_leads', 'voice_transcriptions'];
    case 'partner':
      return commonTables;
    case 'transcription':
      return [...commonTables, 'voice_transcriptions'];
    case 'document':
      return [...commonTables, 'generated_documents'];
    default:
      return commonTables;
  }
}

async function fetchLeadLinks(leadId: string, links: EntityLinksData) {
  // Projects via opportunities
  const { data: opps } = await supabase
    .from('opportunities')
    .select('id, title, projects(id, name, status)')
    .eq('lead_id', leadId);

  opps?.forEach((opp: any) => {
    opp.projects?.forEach((p: any) => {
      if (!links.projects.find(x => x.id === p.id)) {
        links.projects.push({ id: p.id, type: 'project', name: p.name, context: `via ${opp.title}` });
      }
    });
  });

  // Partners
  const { data: partners } = await supabase
    .from('lead_partners')
    .select('partner:partners(id, name, slug, partner_type), role, created_at')
    .eq('lead_id', leadId);

  partners?.forEach((p: any) => {
    if (p.partner) {
      links.partners.push({ 
        id: p.partner.id, 
        type: 'partner', 
        name: p.partner.name, 
        slug: p.partner.slug,
        role: p.role,
        context: p.partner.partner_type,
        created_at: p.created_at
      });
    }
  });

  // Transcriptions
  const { data: trans } = await supabase
    .from('voice_transcriptions')
    .select('id, title, slug, created_at')
    .eq('lead_id', leadId)
    .eq('status', 'completed');

  trans?.forEach(t => {
    links.transcriptions.push({ id: t.id, type: 'transcription', name: t.title || 'Transcription', slug: t.slug, created_at: t.created_at });
  });

  // Documents
  const { data: docs } = await supabase
    .from('generated_documents')
    .select('id, title, document_type, created_at')
    .eq('lead_id', leadId);

  docs?.forEach(d => {
    links.documents.push({ id: d.id, type: 'document', name: d.title, context: d.document_type, created_at: d.created_at });
  });

  // Solutions
  const { data: sols } = await supabase
    .from('solution_leads')
    .select('solution:articles(id, title, slug), interest_level, created_at')
    .eq('lead_id', leadId);

  sols?.forEach((s: any) => {
    if (s.solution) {
      links.solutions.push({ id: s.solution.id, type: 'solution', name: s.solution.title, slug: s.solution.slug, context: s.interest_level, created_at: s.created_at });
    }
  });

  // Uploaded files
  const { data: files } = await supabase
    .from('uploaded_files')
    .select('id, original_filename, file_type, created_at')
    .contains('lead_ids', [leadId]);

  files?.forEach(f => {
    links.uploads.push({ id: f.id, type: 'upload', name: f.original_filename, context: f.file_type, created_at: f.created_at });
  });
}

async function fetchProjectLinks(projectId: string, links: EntityLinksData) {
  // Lead via opportunity
  const { data: project } = await supabase
    .from('projects')
    .select('opportunity:opportunities(lead:leads(id, name, company))')
    .eq('id', projectId)
    .single();

  if ((project as any)?.opportunity?.lead) {
    const lead = (project as any).opportunity.lead;
    links.leads.push({ id: lead.id, type: 'lead', name: lead.company || lead.name });
  }

  // Partners
  const { data: partners } = await supabase
    .from('project_partners')
    .select('partner:partners(id, name, slug, partner_type), role, created_at')
    .eq('project_id', projectId);

  partners?.forEach((p: any) => {
    if (p.partner) {
      links.partners.push({ id: p.partner.id, type: 'partner', name: p.partner.name, slug: p.partner.slug, role: p.role, context: p.partner.partner_type, created_at: p.created_at });
    }
  });

  // Transcriptions
  const { data: trans } = await supabase
    .from('voice_transcriptions')
    .select('id, title, slug, created_at')
    .eq('project_id', projectId)
    .eq('status', 'completed');

  trans?.forEach(t => {
    links.transcriptions.push({ id: t.id, type: 'transcription', name: t.title || 'Transcription', slug: t.slug, created_at: t.created_at });
  });

  // Documents
  const { data: docs } = await supabase
    .from('generated_documents')
    .select('id, title, document_type, created_at')
    .eq('project_id', projectId);

  docs?.forEach(d => {
    links.documents.push({ id: d.id, type: 'document', name: d.title, context: d.document_type, created_at: d.created_at });
  });

  // Uploaded files
  const { data: files } = await supabase
    .from('uploaded_files')
    .select('id, original_filename, file_type, created_at')
    .contains('project_ids', [projectId]);

  files?.forEach(f => {
    links.uploads.push({ id: f.id, type: 'upload', name: f.original_filename, context: f.file_type, created_at: f.created_at });
  });
}

async function fetchSolutionLinks(solutionId: string, links: EntityLinksData) {
  // Leads
  const { data: sols } = await supabase
    .from('solution_leads')
    .select('lead:leads(id, name, company), interest_level, created_at')
    .eq('solution_id', solutionId);

  sols?.forEach((s: any) => {
    if (s.lead) {
      links.leads.push({ id: s.lead.id, type: 'lead', name: s.lead.company || s.lead.name, context: s.interest_level, created_at: s.created_at });
    }
  });

  // Partners
  const { data: partners } = await supabase
    .from('solution_partners')
    .select('partner:partners(id, name, slug, partner_type), role, created_at')
    .eq('solution_id', solutionId);

  partners?.forEach((p: any) => {
    if (p.partner) {
      links.partners.push({ id: p.partner.id, type: 'partner', name: p.partner.name, slug: p.partner.slug, role: p.role, context: p.partner.partner_type, created_at: p.created_at });
    }
  });

  // Transcriptions
  const { data: trans } = await supabase
    .from('voice_transcriptions')
    .select('id, title, slug, created_at')
    .eq('solution_id', solutionId)
    .eq('status', 'completed');

  trans?.forEach(t => {
    links.transcriptions.push({ id: t.id, type: 'transcription', name: t.title || 'Transcription', slug: t.slug, created_at: t.created_at });
  });

  // Uploaded files
  const { data: files } = await supabase
    .from('uploaded_files')
    .select('id, original_filename, file_type, created_at')
    .contains('solution_ids', [solutionId]);

  files?.forEach(f => {
    links.uploads.push({ id: f.id, type: 'upload', name: f.original_filename, context: f.file_type, created_at: f.created_at });
  });
}

async function fetchPartnerLinks(partnerId: string, links: EntityLinksData) {
  // Leads
  const { data: leadLinks } = await supabase
    .from('lead_partners')
    .select('lead:leads(id, name, company), role, created_at')
    .eq('partner_id', partnerId);

  leadLinks?.forEach((l: any) => {
    if (l.lead) {
      links.leads.push({ id: l.lead.id, type: 'lead', name: l.lead.company || l.lead.name, role: l.role, created_at: l.created_at });
    }
  });

  // Projects
  const { data: projLinks } = await supabase
    .from('project_partners')
    .select('project:projects(id, name, status), role, created_at')
    .eq('partner_id', partnerId);

  projLinks?.forEach((p: any) => {
    if (p.project) {
      links.projects.push({ id: p.project.id, type: 'project', name: p.project.name, role: p.role, context: p.project.status, created_at: p.created_at });
    }
  });

  // Solutions
  const { data: solLinks } = await supabase
    .from('solution_partners')
    .select('solution:articles(id, title, slug), role, created_at')
    .eq('partner_id', partnerId);

  solLinks?.forEach((s: any) => {
    if (s.solution) {
      links.solutions.push({ id: s.solution.id, type: 'solution', name: s.solution.title, slug: s.solution.slug, role: s.role, created_at: s.created_at });
    }
  });

  // Transcriptions
  const { data: transLinks } = await supabase
    .from('transcription_partners')
    .select('transcription:voice_transcriptions(id, title, slug), created_at')
    .eq('partner_id', partnerId);

  transLinks?.forEach((t: any) => {
    if (t.transcription) {
      links.transcriptions.push({ id: t.transcription.id, type: 'transcription', name: t.transcription.title || 'Transcription', slug: t.transcription.slug, created_at: t.created_at });
    }
  });

  // Documents
  const { data: docLinks } = await supabase
    .from('document_partners')
    .select('document:generated_documents(id, title, document_type), created_at')
    .eq('partner_id', partnerId);

  docLinks?.forEach((d: any) => {
    if (d.document) {
      links.documents.push({ id: d.document.id, type: 'document', name: d.document.title, context: d.document.document_type, created_at: d.created_at });
    }
  });

  // Uploaded files
  const { data: files } = await supabase
    .from('uploaded_files')
    .select('id, original_filename, file_type, created_at')
    .contains('partner_ids', [partnerId]);

  files?.forEach(f => {
    links.uploads.push({ id: f.id, type: 'upload', name: f.original_filename, context: f.file_type, created_at: f.created_at });
  });
}

async function fetchTranscriptionLinks(transcriptionId: string, links: EntityLinksData) {
  const { data: trans } = await supabase
    .from('voice_transcriptions')
    .select('lead:leads(id, name, company), project:projects(id, name), solution:articles(id, title, slug)')
    .eq('id', transcriptionId)
    .single();

  if (trans) {
    if ((trans as any).lead) {
      const l = (trans as any).lead;
      links.leads.push({ id: l.id, type: 'lead', name: l.company || l.name });
    }
    if ((trans as any).project) {
      const p = (trans as any).project;
      links.projects.push({ id: p.id, type: 'project', name: p.name });
    }
    if ((trans as any).solution) {
      const s = (trans as any).solution;
      links.solutions.push({ id: s.id, type: 'solution', name: s.title, slug: s.slug });
    }
  }

  // Partners
  const { data: partners } = await supabase
    .from('transcription_partners')
    .select('partner:partners(id, name, slug, partner_type), created_at')
    .eq('transcription_id', transcriptionId);

  partners?.forEach((p: any) => {
    if (p.partner) {
      links.partners.push({ id: p.partner.id, type: 'partner', name: p.partner.name, slug: p.partner.slug, context: p.partner.partner_type, created_at: p.created_at });
    }
  });
}

async function fetchDocumentLinks(documentId: string, links: EntityLinksData) {
  const { data: doc } = await supabase
    .from('generated_documents')
    .select('lead:leads(id, name, company), project:projects(id, name)')
    .eq('id', documentId)
    .single();

  if (doc) {
    if ((doc as any).lead) {
      const l = (doc as any).lead;
      links.leads.push({ id: l.id, type: 'lead', name: l.company || l.name });
    }
    if ((doc as any).project) {
      const p = (doc as any).project;
      links.projects.push({ id: p.id, type: 'project', name: p.name });
    }
  }

  // Partners
  const { data: partners } = await supabase
    .from('document_partners')
    .select('partner:partners(id, name, slug, partner_type), created_at')
    .eq('document_id', documentId);

  partners?.forEach((p: any) => {
    if (p.partner) {
      links.partners.push({ id: p.partner.id, type: 'partner', name: p.partner.name, slug: p.partner.slug, context: p.partner.partner_type, created_at: p.created_at });
    }
  });
}
