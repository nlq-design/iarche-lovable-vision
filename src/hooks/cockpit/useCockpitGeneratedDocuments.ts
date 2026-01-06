import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const QUERY_KEY = 'cockpit-generated-documents';

export type DocumentType = 'quote' | 'proposal' | 'spec' | 'report' | 'email' | 'contract';
export type DocumentStatus = 'draft' | 'review' | 'approved' | 'final' | 'sent' | 'cancelled';

export interface GeneratedDocument {
  id: string;
  workspace_id: string;
  document_type: DocumentType;
  title: string;
  project_id: string | null;
  opportunity_id: string | null;
  lead_id: string | null;
  specification_id: string | null;
  content_json: Record<string, unknown>;
  version: string;
  status: DocumentStatus;
  supersedes_document_id: string | null;
  output_format: string | null;
  output_storage_path: string | null;
  ai_generated: boolean;
  ai_metadata: Record<string, unknown>;
  ai_documents_summary: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  sent_at: string | null;
  sent_to: string | null;
  created_at: string;
  updated_at: string;
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  quote: 'Devis',
  proposal: 'Proposition',
  spec: 'Cahier des charges',
  report: 'Rapport',
  email: 'Email',
  contract: 'Contrat',
};

export const DOCUMENT_STATUS_CONFIG: Record<DocumentStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Brouillon', variant: 'secondary' },
  review: { label: 'En révision', variant: 'default' },
  approved: { label: 'Approuvé', variant: 'default' },
  final: { label: 'Final', variant: 'default' },
  sent: { label: 'Envoyé', variant: 'default' },
  cancelled: { label: 'Annulé', variant: 'destructive' },
};

export function useCockpitGeneratedDocuments(projectId?: string, opportunityId?: string) {
  const queryClient = useQueryClient();

  // Fetch documents
  const { data: documents = [], isLoading, error, refetch } = useQuery({
    queryKey: [QUERY_KEY, projectId, opportunityId],
    queryFn: async () => {
      let query = supabase
        .from('generated_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      if (opportunityId) {
        query = query.eq('opportunity_id', opportunityId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as GeneratedDocument[];
    },
  });

  // Generate document
  const generateDocument = useMutation({
    mutationFn: async (input: {
      project_id?: string;
      opportunity_id?: string;
      lead_id?: string;
      document_type: 'quote' | 'spec' | 'proposal';
      custom_instructions?: string;
      context?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase.functions.invoke('generate-document', {
        body: input,
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Generation failed');
      return data.document as GeneratedDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Document généré avec succès');
    },
    onError: (error: Error) => {
      if (error.message.includes('rate_limited')) {
        toast.error('Limite de requêtes atteinte, réessayez plus tard');
      } else if (error.message.includes('credits_exhausted')) {
        toast.error('Crédits IA épuisés');
      } else {
        toast.error(`Erreur: ${error.message}`);
      }
    },
  });

  // Update document
  const updateDocument = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { title?: string; status?: DocumentStatus; version?: string } }) => {
      const { data, error } = await supabase
        .from('generated_documents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as GeneratedDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Document mis à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Delete document
  const deleteDocument = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('generated_documents')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Document supprimé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Approve document
  const approveDocument = useMutation({
    mutationFn: async ({ id, approvedBy }: { id: string; approvedBy?: string }) => {
      const { data, error } = await supabase
        .from('generated_documents')
        .update({
          status: 'approved' as const,
          approved_at: new Date().toISOString(),
          approved_by: approvedBy || null,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as GeneratedDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Document approuvé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  return {
    documents,
    isLoading,
    error,
    refetch,
    generateDocument,
    updateDocument,
    deleteDocument,
    approveDocument,
  };
}
