import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Copy, Loader2, AlertCircle } from 'lucide-react';
import { buildEmailHtml } from '@/lib/email/buildEmailHtml';
import type { InvitationContentJson } from '@/lib/email/types';

interface InvitationDocRow {
  id: string;
  title: string | null;
  status: string | null;
  slug: string | null;
  content_json: unknown;
}

const AdminInvitationEmailPreview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [doc, setDoc] = useState<InvitationDocRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | undefined>(undefined);
  const [qrLoading, setQrLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate('/admin');
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (!id || !user || !isAdmin) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('generated_documents')
        .select('id, title, status, slug, content_json')
        .eq('id', id)
        .single();
      if (cancelled) return;
      if (err || !data) {
        setError(err?.message || 'Document introuvable');
      } else {
        setDoc(data as unknown as InvitationDocRow);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, user, isAdmin]);

  const publicUrl = useMemo(() => {
    if (!doc) return '';
    return `https://iarche.fr/evenements/${doc.slug || ''}`;
  }, [doc]);

  // Génération QR code asynchrone à partir de l'URL publique
  useEffect(() => {
    if (!publicUrl) return;
    let cancelled = false;
    setQrLoading(true);
    QRCode.toDataURL(publicUrl, {
      width: 280,
      margin: 1,
      color: { dark: '#1A2B4A', light: '#FFFFFF' },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(undefined);
      })
      .finally(() => {
        if (!cancelled) setQrLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [publicUrl]);

  const html = useMemo(() => {
    if (!doc) return '';
    const content = (doc.content_json || { metadata: {}, sections: [] }) as InvitationContentJson;
    return buildEmailHtml(content, { publicUrl, qrCodeDataUrl: qrDataUrl });
  }, [doc, publicUrl, qrDataUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(html);
      toast({ title: 'HTML copié', description: "Collez-le dans l'éditeur HTML de Brevo." });
    } catch {
      toast({
        title: 'Échec de la copie',
        description: 'Sélectionnez le HTML manuellement dans le textarea.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-4">
        {/* Bandeau */}
        <div className="flex items-center justify-between gap-4 flex-wrap bg-card border border-border rounded-lg p-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Preview HTML email</h1>
            <p className="text-sm text-muted-foreground">
              Largeur 600px rendue dans iframe — prêt à coller dans Brevo
              {qrLoading && ' · génération QR code…'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/admin/invitation/${id}`)}>
              <ArrowLeft className="w-4 h-4" />
              Retour à l'édition
            </Button>
            <Button size="sm" onClick={handleCopy} disabled={!html}>
              <Copy className="w-4 h-4" />
              Copier HTML
            </Button>
          </div>
        </div>

        {/* États */}
        {loading && (
          <div className="flex items-center justify-center py-20 bg-card border border-border rounded-lg">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-lg gap-3">
            <AlertCircle className="w-8 h-8 text-destructive" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        )}

        {!loading && !error && doc && (
          <>
            {/* Iframe preview */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <iframe
                srcDoc={html}
                title="Email preview"
                style={{ width: '100%', minHeight: '800px', border: 'none', display: 'block' }}
              />
            </div>

            {/* HTML brut */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-2">
              <label className="text-sm font-medium text-foreground">HTML brut généré</label>
              <textarea
                readOnly
                value={html}
                className="w-full font-mono text-xs bg-muted text-foreground border border-border rounded p-3"
                style={{ height: '400px' }}
                onFocus={(e) => e.currentTarget.select()}
              />
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminInvitationEmailPreview;
