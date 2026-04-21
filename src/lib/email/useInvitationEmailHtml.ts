import { useCallback, useState } from 'react';
import { buildEmailHtml } from './buildEmailHtml';
import { generateAndUploadQr } from './qrUpload';
import type { InvitationContentJson } from './types';

interface GenerateArgs {
  docId: string;
  slug: string;
  content: InvitationContentJson;
}

interface UseInvitationEmailHtmlResult {
  generate: (args: GenerateArgs) => Promise<{ html: string; qrUrl: string | null }>;
  loading: boolean;
  error: string | null;
}

/**
 * Orchestre la génération du HTML email :
 * 1. Upload QR dans bucket Supabase (non bloquant si échec)
 * 2. Construction HTML email-safe via buildEmailHtml
 *
 * Réutilisable depuis toute UI admin nécessitant l'export Brevo.
 */
export function useInvitationEmailHtml(): UseInvitationEmailHtmlResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async ({ docId, slug, content }: GenerateArgs) => {
    setLoading(true);
    setError(null);

    const publicUrl = `https://iarche.fr/evenements/${slug}`;
    let qrUrl: string | null = null;

    try {
      qrUrl = await generateAndUploadQr(docId, publicUrl);
    } catch (err) {
      console.error('QR upload failed, building HTML without QR:', err);
    }

    try {
      const html = buildEmailHtml(content, {
        publicUrl,
        qrCodeUrl: qrUrl ?? undefined,
      });
      setLoading(false);
      return { html, qrUrl };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'HTML generation failed';
      setError(message);
      setLoading(false);
      throw new Error(message);
    }
  }, []);

  return { generate, loading, error };
}
