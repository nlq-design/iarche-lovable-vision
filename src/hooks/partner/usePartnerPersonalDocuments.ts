import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePartnerAuth } from './usePartnerAuth';
import { toast } from 'sonner';

export interface PartnerPersonalDocument {
  id: string;
  partner_id: string;
  title: string;
  description: string | null;
  category: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  lead_id: string | null;
  project_id: string | null;
  status: string;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
}

export const DOCUMENT_CATEGORIES = [
  { value: 'contrat', label: 'Contrat' },
  { value: 'facture', label: 'Facture' },
  { value: 'administratif', label: 'Administratif' },
  { value: 'technique', label: 'Technique' },
  { value: 'autre', label: 'Autre' },
] as const;

export function usePartnerPersonalDocuments() {
  const { partnerId } = usePartnerAuth();

  return useQuery({
    queryKey: ['partner-personal-documents', partnerId],
    queryFn: async (): Promise<PartnerPersonalDocument[]> => {
      if (!partnerId) return [];

      const { data, error } = await supabase
        .from('partner_documents')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!partnerId,
  });
}

export function useUploadPartnerDocument() {
  const { partnerId, user } = usePartnerAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      title,
      description,
      category,
      validFrom,
      validUntil,
    }: {
      file: File;
      title: string;
      description?: string;
      category: string;
      validFrom?: string;
      validUntil?: string;
    }) => {
      if (!partnerId || !user) throw new Error('Non authentifié');

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('partner-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create document record
      const { data, error } = await supabase
        .from('partner_documents')
        .insert({
          partner_id: partnerId,
          title,
          description: description || null,
          category,
          file_name: file.name,
          file_path: filePath,
          file_size_bytes: file.size,
          mime_type: file.type,
          valid_from: validFrom || null,
          valid_until: validUntil || null,
        })
        .select()
        .single();

      if (error) {
        // Rollback storage upload
        await supabase.storage.from('partner-documents').remove([filePath]);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-personal-documents'] });
      toast.success('Document ajouté avec succès');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useDeletePartnerDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (document: PartnerPersonalDocument) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('partner-documents')
        .remove([document.file_path]);

      if (storageError) throw storageError;

      // Delete record
      const { error } = await supabase
        .from('partner_documents')
        .delete()
        .eq('id', document.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-personal-documents'] });
      toast.success('Document supprimé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useDownloadPartnerDocument() {
  return useMutation({
    mutationFn: async (document: PartnerPersonalDocument) => {
      const { data, error } = await supabase.storage
        .from('partner-documents')
        .download(document.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.file_name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    onError: (error: Error) => {
      toast.error(`Erreur de téléchargement: ${error.message}`);
    },
  });
}
