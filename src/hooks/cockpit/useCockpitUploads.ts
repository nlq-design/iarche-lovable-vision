import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UploadedFile {
  id: string;
  workspace_id: string;
  original_filename: string;
  file_type: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  storage_path: string | null;
  content_hash: string | null;
  version: number;
  parent_file_id: string | null;
  is_latest: boolean;
  extracted_content: string | null;
  ai_summary: string | null;
  ai_metadata: Record<string, unknown>;
  ocr_required: boolean;
  ocr_provider: string | null;
  ocr_confidence: number | null;
  project_ids: string[];
  solution_ids: string[];
  lead_ids: string[];
  generated_document_id: string | null;
  category: string | null;
  tags: string[];
  share_token: string | null;
  share_expires_at: string | null;
  download_count: number;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed' | 'needs_ocr';
  processing_error: string | null;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadFileParams {
  file: File;
  projectIds?: string[];
  solutionIds?: string[];
  leadIds?: string[];
  documentId?: string;
  category?: string;
  tags?: string[];
  extractedText?: string; // Client-side extracted text
}

export interface UploadTextParams {
  content: string;
  filename: string;
  projectIds?: string[];
  solutionIds?: string[];
  leadIds?: string[];
  documentId?: string;
  category?: string;
  tags?: string[];
}

// Compute SHA-256 hash of file
async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Get file type from MIME type
function getFileType(mimeType: string): string {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'docx';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'xlsx';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('text/')) return 'txt';
  return 'other';
}

export function useCockpitUploads(filters?: {
  projectId?: string;
  leadId?: string;
  solutionId?: string;
  status?: string;
  category?: string;
}) {
  const queryClient = useQueryClient();

  // Fetch uploaded files
  const { data: uploads, isLoading, error, refetch } = useQuery({
    queryKey: ['cockpit-uploads', filters],
    queryFn: async () => {
      let query = supabase
        .from('uploaded_files')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.projectId) {
        query = query.contains('project_ids', [filters.projectId]);
      }
      if (filters?.leadId) {
        query = query.contains('lead_ids', [filters.leadId]);
      }
      if (filters?.solutionId) {
        query = query.contains('solution_ids', [filters.solutionId]);
      }
      if (filters?.status) {
        query = query.eq('processing_status', filters.status);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as UploadedFile[];
    },
  });

  // Upload file mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (params: UploadFileParams) => {
      const { file, projectIds = [], solutionIds = [], leadIds = [], documentId, category, tags = [], extractedText } = params;

      // 1. Compute hash for deduplication
      const contentHash = await computeFileHash(file);

      // 2. Check if file already exists
      const { data: existing } = await supabase
        .from('uploaded_files')
        .select('id, original_filename')
        .eq('content_hash', contentHash)
        .maybeSingle();

      if (existing) {
        toast.info(`Fichier déjà uploadé: ${existing.original_filename}`);
        return { duplicate: true, existingId: existing.id, file: existing };
      }

      // 3. Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // 4. Generate storage path
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${user?.id || 'anonymous'}/${timestamp}_${safeName}`;

      // 5. Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('cockpit-uploads')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      // 6. Create database record
      const fileType = getFileType(file.type);
      const { data: record, error: insertError } = await supabase
        .from('uploaded_files')
        .insert({
          workspace_id: '00000000-0000-0000-0000-000000000001', // Default workspace
          original_filename: file.name,
          file_type: fileType,
          mime_type: file.type,
          file_size_bytes: file.size,
          storage_path: storagePath,
          content_hash: contentHash,
          project_ids: projectIds,
          solution_ids: solutionIds,
          lead_ids: leadIds,
          generated_document_id: documentId || null,
          category,
          tags,
          extracted_content: extractedText || null,
          uploaded_by: user?.id,
          processing_status: extractedText ? 'processing' : 'pending',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 7. Trigger processing (async)
      supabase.functions.invoke('process-uploaded-file', {
        body: {
          file_id: record.id,
          extracted_text: extractedText,
        },
      }).catch(err => {
        console.error('Processing trigger failed:', err);
      });

      return { duplicate: false, file: record };
    },
    onSuccess: (result) => {
      if (!result.duplicate) {
        toast.success('Fichier uploadé avec succès');
      }
      queryClient.invalidateQueries({ queryKey: ['cockpit-uploads'] });
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast.error("Erreur lors de l'upload");
    },
  });

  // Upload pasted text mutation
  const uploadTextMutation = useMutation({
    mutationFn: async (params: UploadTextParams) => {
      const { content, filename, projectIds = [], solutionIds = [], leadIds = [], documentId, category, tags = [] } = params;

      const { data: { user } } = await supabase.auth.getUser();

      // Compute hash of text content
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const { data: record, error } = await supabase
        .from('uploaded_files')
        .insert({
          workspace_id: '00000000-0000-0000-0000-000000000001', // Default workspace
          original_filename: filename || `texte_${Date.now()}.txt`,
          file_type: 'pasted_text',
          mime_type: 'text/plain',
          file_size_bytes: content.length,
          storage_path: null, // No storage for pasted text
          content_hash: contentHash,
          project_ids: projectIds,
          solution_ids: solutionIds,
          lead_ids: leadIds,
          generated_document_id: documentId || null,
          category,
          tags,
          extracted_content: content,
          uploaded_by: user?.id,
          processing_status: 'processing',
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger processing
      supabase.functions.invoke('process-uploaded-file', {
        body: {
          file_id: record.id,
          extracted_text: content,
        },
      }).catch(err => {
        console.error('Processing trigger failed:', err);
      });

      return record;
    },
    onSuccess: () => {
      toast.success('Texte enregistré avec succès');
      queryClient.invalidateQueries({ queryKey: ['cockpit-uploads'] });
    },
    onError: (error) => {
      console.error('Text upload error:', error);
      toast.error("Erreur lors de l'enregistrement");
    },
  });

  // Update links mutation
  const updateLinksMutation = useMutation({
    mutationFn: async ({
      fileId,
      projectIds,
      solutionIds,
      leadIds,
    }: {
      fileId: string;
      projectIds?: string[];
      solutionIds?: string[];
      leadIds?: string[];
    }) => {
      const updates: Record<string, unknown> = {};
      if (projectIds !== undefined) updates.project_ids = projectIds;
      if (solutionIds !== undefined) updates.solution_ids = solutionIds;
      if (leadIds !== undefined) updates.lead_ids = leadIds;

      const { error } = await supabase
        .from('uploaded_files')
        .update(updates)
        .eq('id', fileId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Liaisons mises à jour');
      queryClient.invalidateQueries({ queryKey: ['cockpit-uploads'] });
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });

  // Async version for external use
  const updateLinksAsync = async (params: {
    fileId: string;
    projectIds?: string[];
    solutionIds?: string[];
    leadIds?: string[];
  }) => {
    return updateLinksMutation.mutateAsync(params);
  };

  // Reprocess file mutation
  const reprocessMutation = useMutation({
    mutationFn: async ({ fileId, forceOcr }: { fileId: string; forceOcr?: boolean }) => {
      await supabase
        .from('uploaded_files')
        .update({
          processing_status: 'processing',
          processing_error: null,
          processing_started_at: new Date().toISOString(),
        })
        .eq('id', fileId);

      const { error } = await supabase.functions.invoke('process-uploaded-file', {
        body: {
          file_id: fileId,
          force_ocr: forceOcr,
        },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Traitement relancé');
      queryClient.invalidateQueries({ queryKey: ['cockpit-uploads'] });
    },
    onError: () => {
      toast.error('Erreur lors du retraitement');
    },
  });

  // Generate share link mutation
  const generateShareLinkMutation = useMutation({
    mutationFn: async ({
      fileId,
      expiresInDays = 7,
      password,
    }: {
      fileId: string;
      expiresInDays?: number;
      password?: string;
    }) => {
      const { data, error } = await supabase.rpc('generate_file_share_link', {
        p_file_id: fileId,
        p_expires_in_days: expiresInDays,
        p_password: password || null,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: (token) => {
      const shareUrl = `${window.location.origin}/share/${token}`;
      navigator.clipboard.writeText(shareUrl);
      toast.success('Lien de partage copié!');
      queryClient.invalidateQueries({ queryKey: ['cockpit-uploads'] });
    },
    onError: () => {
      toast.error('Erreur lors de la génération du lien');
    },
  });

  // Delete file mutation
  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      // Get file info first
      const { data: file } = await supabase
        .from('uploaded_files')
        .select('storage_path')
        .eq('id', fileId)
        .single();

      // Delete from storage if exists
      if (file?.storage_path) {
        await supabase.storage
          .from('cockpit-uploads')
          .remove([file.storage_path]);
      }

      // Delete record
      const { error } = await supabase
        .from('uploaded_files')
        .delete()
        .eq('id', fileId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Fichier supprimé');
      queryClient.invalidateQueries({ queryKey: ['cockpit-uploads'] });
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  // Download file
  const downloadFile = async (file: UploadedFile) => {
    if (!file.storage_path) {
      // For pasted text, create blob
      if (file.extracted_content) {
        const blob = new Blob([file.extracted_content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.original_filename;
        a.click();
        URL.revokeObjectURL(url);
      }
      return;
    }

    const { data, error } = await supabase.storage
      .from('cockpit-uploads')
      .createSignedUrl(file.storage_path, 3600);

    if (error) {
      toast.error('Erreur lors du téléchargement');
      return;
    }

    window.open(data.signedUrl, '_blank');
  };

  return {
    uploads,
    isLoading,
    error,
    refetch,
    uploadFile: uploadFileMutation.mutate,
    uploadFileAsync: uploadFileMutation.mutateAsync,
    isUploading: uploadFileMutation.isPending,
    uploadText: uploadTextMutation.mutate,
    uploadTextAsync: uploadTextMutation.mutateAsync,
    isUploadingText: uploadTextMutation.isPending,
    updateLinks: updateLinksAsync,
    reprocess: reprocessMutation.mutate,
    generateShareLink: generateShareLinkMutation.mutate,
    deleteFile: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    downloadFile,
  };
}
