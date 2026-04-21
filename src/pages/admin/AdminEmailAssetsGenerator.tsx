import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, Check, ImageIcon, Palette } from 'lucide-react';
import { EMAIL_ASSET_PATHS, EMAIL_ASSETS } from '@/lib/email/assets';

type Status = 'idle' | 'generating' | 'uploading' | 'done' | 'error';

interface AssetResult {
  status: Status;
  url?: string;
  previewDataUrl?: string;
  error?: string;
}

const COLORS = {
  bleuNuit: '#1A2B4A',
  terracotta: '#B04A32', // Couleur officielle IArche (corrigée v3)
  bleuClair: '#4A90D9',
} as const;

const HERO_PREVIEW_GRADIENT =
  'linear-gradient(135deg, #1A2B4A 0%, rgba(26,43,74,0.867) 50%, rgba(176,74,50,0.251) 100%)';

/** Convertit un canvas en Blob PNG (Promise). */
const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      'image/png',
    );
  });

/** Charge une image (SVG ou autre) en HTMLImageElement. */
const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });

/**
 * Génère le logo IArche en PNG 600x160 BLANC (fond transparent).
 * Applique brightness(0) invert(1) via pixel manipulation cross-browser.
 */
const generateLogoPng = async (): Promise<{ blob: Blob; dataUrl: string }> => {
  const img = await loadImage('/logos/iarche-main.svg');

  // Canvas temporaire pour appliquer le filtre blanc
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = img.naturalWidth;
  tempCanvas.height = img.naturalHeight;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) throw new Error('Canvas 2D context unavailable (temp)');
  tempCtx.drawImage(img, 0, 0);

  // Pixel manipulation : tout pixel non-transparent → blanc pur (alpha conservé)
  const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    }
  }
  tempCtx.putImageData(imageData, 0, 0);

  // Canvas final 600x160, logo blanc centré
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const maxW = 560;
  const maxH = 140;
  const scale = Math.min(maxW / tempCanvas.width, maxH / tempCanvas.height);
  const drawW = tempCanvas.width * scale;
  const drawH = tempCanvas.height * scale;
  const dx = (canvas.width - drawW) / 2;
  const dy = (canvas.height - drawH) / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(tempCanvas, dx, dy, drawW, drawH);

  const blob = await canvasToBlob(canvas);
  const dataUrl = canvas.toDataURL('image/png');
  return { blob, dataUrl };
};

/**
 * Génère un PNG 1200x600 — gradient 135deg avec 3 stops alphas + 2 cercles flous overlays.
 * Reproduit fidèlement le hero de /admin/invitation/:id.
 */
const generateHeroGradientPng = async (): Promise<{ blob: Blob; dataUrl: string }> => {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // 1. Fond bleu nuit plein
  ctx.fillStyle = COLORS.bleuNuit;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Gradient 135deg (haut-gauche → bas-droit), 3 stops avec alphas
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#1A2B4A');
  gradient.addColorStop(0.5, 'rgba(26, 43, 74, 0.867)');
  gradient.addColorStop(1, 'rgba(176, 74, 50, 0.251)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 3. Overlay : 2 cercles flous à opacity globale 10%
  ctx.save();
  ctx.globalAlpha = 0.1;

  // Cercle haut-droit : terracotta, blur 160px (page = 80px × scale 2x)
  ctx.filter = 'blur(160px)';
  ctx.fillStyle = COLORS.terracotta;
  ctx.beginPath();
  ctx.arc(canvas.width - 80 - 256, 80 + 256, 256, 0, Math.PI * 2);
  ctx.fill();

  // Cercle bas-gauche : bleu clair, blur 120px
  ctx.filter = 'blur(120px)';
  ctx.fillStyle = COLORS.bleuClair;
  ctx.beginPath();
  ctx.arc(80 + 192, canvas.height - 80 - 192, 192, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  const blob = await canvasToBlob(canvas);
  const dataUrl = canvas.toDataURL('image/png');
  return { blob, dataUrl };
};

/** Upload un blob dans le bucket email-assets (upsert). */
const uploadToBucket = async (path: string, blob: Blob): Promise<string> => {
  const { error } = await supabase.storage
    .from('email-assets')
    .upload(path, blob, {
      contentType: 'image/png',
      cacheControl: '31536000',
      upsert: true,
    });
  if (error) throw error;
  const { data } = supabase.storage.from('email-assets').getPublicUrl(path);
  return data.publicUrl;
};

const AdminEmailAssetsGenerator = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAdmin, loading: authLoading } = useAuth();

  const [logo, setLogo] = useState<AssetResult>({ status: 'idle' });
  const [hero, setHero] = useState<AssetResult>({ status: 'idle' });
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate('/admin');
  }, [user, isAdmin, authLoading, navigate]);

  const handleGenerateLogo = async () => {
    setLogo({ status: 'generating' });
    try {
      const { blob, dataUrl } = await generateLogoPng();
      setLogo({ status: 'uploading', previewDataUrl: dataUrl });
      const url = await uploadToBucket(EMAIL_ASSET_PATHS.logo, blob);
      setLogo({ status: 'done', url, previewDataUrl: dataUrl });
      toast({ title: 'Logo généré et uploadé' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setLogo({ status: 'error', error: message });
      toast({ title: 'Erreur génération logo', description: message, variant: 'destructive' });
    }
  };

  const handleGenerateHero = async () => {
    setHero({ status: 'generating' });
    try {
      const { blob, dataUrl } = await generateHeroGradientPng();
      setHero({ status: 'uploading', previewDataUrl: dataUrl });
      const url = await uploadToBucket(EMAIL_ASSET_PATHS.heroBackground, blob);
      setHero({ status: 'done', url, previewDataUrl: dataUrl });
      toast({ title: 'Hero gradient généré et uploadé' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setHero({ status: 'error', error: message });
      toast({ title: 'Erreur génération hero', description: message, variant: 'destructive' });
    }
  };

  const handleCopy = async (url: string, key: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast({ title: 'Échec de la copie', variant: 'destructive' });
    }
  };

  const renderCard = (
    title: string,
    description: string,
    expectedUrl: string,
    state: AssetResult,
    onGenerate: () => void,
    icon: React.ReactNode,
    previewBg: 'light' | 'gradient',
  ) => {
    const busy = state.status === 'generating' || state.status === 'uploading';
    return (
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-primary">
            {icon}
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>

        <div
          className="rounded border border-border overflow-hidden flex items-center justify-center"
          style={{
            minHeight: 140,
            background:
              previewBg === 'gradient'
                ? HERO_PREVIEW_GRADIENT
                : 'hsl(var(--muted))',
          }}
        >
          {state.previewDataUrl ? (
            <img
              src={state.previewDataUrl}
              alt={`Preview ${title}`}
              style={{ maxWidth: '100%', maxHeight: 200, display: 'block' }}
            />
          ) : (
            <span className="text-xs text-muted-foreground p-4">Aucune génération</span>
          )}
        </div>

        <Button onClick={onGenerate} disabled={busy} size="sm" className="w-full">
          {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {state.status === 'generating' && 'Génération…'}
          {state.status === 'uploading' && 'Upload…'}
          {(state.status === 'idle' || state.status === 'done' || state.status === 'error') &&
            (state.status === 'done' ? 'Régénérer' : 'Générer')}
        </Button>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            URL publique attendue
          </label>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={state.url || expectedUrl}
              className="flex-1 font-mono text-xs bg-muted text-foreground border border-border rounded px-2 py-1.5"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy(state.url || expectedUrl, title)}
            >
              {copied === title ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          {state.status === 'done' && (
            <p className="text-xs text-green-600">
              ✓ Uploadé dans bucket <code>email-assets</code>
            </p>
          )}
          {state.status === 'error' && (
            <p className="text-xs text-destructive">✗ {state.error}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="bg-card border border-border rounded-lg p-5">
          <h1 className="text-xl font-semibold text-foreground">Générateur d'assets email</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Génère et upload les images statiques utilisées par les templates email
            (bucket Supabase <code>email-assets</code>, public en lecture). One-shot —
            à régénérer uniquement si la charte change.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {renderCard(
            'Logo IArche PNG 600×160',
            'Conversion du SVG /logos/iarche-main.svg en PNG retina-ready (fond transparent).',
            EMAIL_ASSETS.logo,
            logo,
            handleGenerateLogo,
            <ImageIcon className="w-5 h-5" />,
            'light',
          )}

          {renderCard(
            'Hero gradient PNG 1200×600',
            'Gradient linéaire 135° bleu nuit (#1A2B4A) → terracotta (#D15A3E), sans texte.',
            EMAIL_ASSETS.heroBackground,
            hero,
            handleGenerateHero,
            <Palette className="w-5 h-5" />,
            'gradient',
          )}
        </div>

        <div className="bg-muted/50 border border-border rounded-lg p-4 text-sm text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">Étape suivante</p>
          <p>
            Une fois les 2 PNG générés et uploadés, ouvrez{' '}
            <code>/admin/invitation/[id]/email-preview</code> — le HTML email
            consomme automatiquement ces URLs (constantes <code>EMAIL_ASSETS</code>).
          </p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminEmailAssetsGenerator;
