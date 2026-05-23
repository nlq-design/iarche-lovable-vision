import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type WorkspaceBranding = {
  workspace_id: string;
  brand_name: string | null;
  tagline: string | null;
  logo_url: string | null;
  logo_dark_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  background_color: string | null;
  text_color: string | null;
  heading_font: string | null;
  body_font: string | null;
  footer_text: string | null;
  email_signature_html: string | null;
  document_header_html: string | null;
  document_footer_html: string | null;
};

const EMPTY = (id: string): WorkspaceBranding => ({
  workspace_id: id,
  brand_name: null, tagline: null,
  logo_url: null, logo_dark_url: null, favicon_url: null,
  primary_color: null, secondary_color: null, accent_color: null,
  background_color: null, text_color: null,
  heading_font: null, body_font: null,
  footer_text: null, email_signature_html: null,
  document_header_html: null, document_footer_html: null,
});

export function useWorkspaceBranding(workspaceId: string | null) {
  const qc = useQueryClient();

  const query = useQuery<WorkspaceBranding>({
    queryKey: ['workspace_branding', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_branding')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .maybeSingle();
      if (error) throw error;
      return (data as WorkspaceBranding) ?? EMPTY(workspaceId!);
    },
  });

  const upsert = useMutation({
    mutationFn: async (patch: Partial<Omit<WorkspaceBranding, 'workspace_id'>>) => {
      if (!workspaceId) throw new Error('Workspace non identifié');
      const merged = { ...(query.data ?? EMPTY(workspaceId)), ...patch, workspace_id: workspaceId };
      const { error } = await supabase
        .from('workspace_branding')
        .upsert(merged, { onConflict: 'workspace_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Identité visuelle enregistrée');
      qc.invalidateQueries({ queryKey: ['workspace_branding', workspaceId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadAsset = useMutation({
    mutationFn: async ({ file, kind }: { file: File; kind: 'logo' | 'logo_dark' | 'favicon' }) => {
      if (!workspaceId) throw new Error('Workspace non identifié');
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `${workspaceId}/${kind}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('workspace-branding')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('workspace-branding').getPublicUrl(path);
      const col = kind === 'logo' ? 'logo_url' : kind === 'logo_dark' ? 'logo_dark_url' : 'favicon_url';
      await upsert.mutateAsync({ [col]: data.publicUrl } as Partial<WorkspaceBranding>);
      return data.publicUrl;
    },
    onError: (e: Error) => toast.error(`Upload : ${e.message}`),
  });

  return { ...query, upsert, uploadAsset };
}
