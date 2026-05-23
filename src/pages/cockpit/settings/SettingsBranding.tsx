import { useEffect, useState } from 'react';
import { CockpitLayout } from '@/components/cockpit/CockpitLayout';
import { useWorkspaceId } from '@/contexts/WorkspaceContext';
import { useWorkspaceBranding } from '@/hooks/useWorkspaceBranding';
import { LoadingState } from '@/components/cockpit/common/LoadingState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Palette, Upload, Image as ImageIcon } from 'lucide-react';
import { BrandingDocumentPreview } from '@/components/cockpit/settings/BrandingDocumentPreview';

const COLOR_FIELDS = [
  { key: 'primary_color' as const, label: 'Couleur principale', placeholder: '#1A2B4A' },
  { key: 'secondary_color' as const, label: 'Couleur secondaire', placeholder: '#B04A32' },
  { key: 'accent_color' as const, label: 'Couleur d’accent', placeholder: '#FAF9F7' },
  { key: 'background_color' as const, label: 'Fond', placeholder: '#FFFFFF' },
  { key: 'text_color' as const, label: 'Texte', placeholder: '#0F172A' },
];

export default function SettingsBranding() {
  const workspaceId = useWorkspaceId();
  const { data, isLoading, upsert, uploadAsset } = useWorkspaceBranding(workspaceId);
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data) {
      const init: Record<string, string> = {};
      Object.entries(data).forEach(([k, v]) => { if (k !== 'workspace_id') init[k] = (v as string) ?? ''; });
      setForm(init);
    }
  }, [data]);

  if (!workspaceId || isLoading) {
    return <CockpitLayout><LoadingState message="Chargement de l’identité visuelle..." /></CockpitLayout>;
  }

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const onUpload = async (file: File, kind: 'logo' | 'logo_dark' | 'favicon') => {
    await uploadAsset.mutateAsync({ file, kind });
  };

  const onSave = () => {
    const patch: Record<string, string | null> = {};
    Object.entries(form).forEach(([k, v]) => { patch[k] = v.trim() === '' ? null : v; });
    upsert.mutate(patch as never);
  };

  const LogoSlot = ({ kind, label, url }: { kind: 'logo' | 'logo_dark' | 'favicon'; label: string; url: string | null }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 rounded-md border bg-muted/30 flex items-center justify-center overflow-hidden">
          {url ? <img src={url} alt={label} className="h-full w-full object-contain" /> : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
        </div>
        <label className="inline-flex">
          <Button type="button" variant="outline" size="sm" asChild>
            <span className="cursor-pointer inline-flex items-center gap-2">
              <Upload className="h-4 w-4" />
              {url ? 'Remplacer' : 'Importer'}
            </span>
          </Button>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f, kind); e.currentTarget.value = ''; }}
          />
        </label>
      </div>
    </div>
  );

  return (
    <CockpitLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-3">
          <Palette className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Identité visuelle</h1>
            <p className="text-muted-foreground">Logo, couleurs et typographie appliqués automatiquement aux documents et exports IA.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Logos</CardTitle>
            <CardDescription>PNG, JPG, WEBP ou SVG. Stockés par workspace, accessibles aux exports IA.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-3">
            <LogoSlot kind="logo" label="Logo principal" url={data?.logo_url ?? null} />
            <LogoSlot kind="logo_dark" label="Logo fond sombre" url={data?.logo_dark_url ?? null} />
            <LogoSlot kind="favicon" label="Favicon" url={data?.favicon_url ?? null} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Marque</CardTitle>
            <CardDescription>Nom et signature affichés dans les documents générés.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nom de marque</Label>
              <Input value={form.brand_name ?? ''} onChange={e => set('brand_name', e.target.value)} placeholder="IArche" />
            </div>
            <div className="space-y-2">
              <Label>Slogan</Label>
              <Input value={form.tagline ?? ''} onChange={e => set('tagline', e.target.value)} placeholder="L’architecte de votre croissance" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Palette</CardTitle>
            <CardDescription>Couleurs au format hexadécimal injectées dans les exports.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {COLOR_FIELDS.map(({ key, label, placeholder }) => (
              <div key={key} className="space-y-2">
                <Label>{label}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    className="w-14 h-10 p-1 cursor-pointer"
                    value={form[key]?.match(/^#[0-9a-f]{6}$/i) ? form[key] : '#ffffff'}
                    onChange={e => set(key, e.target.value)}
                  />
                  <Input
                    value={form[key] ?? ''}
                    onChange={e => set(key, e.target.value)}
                    placeholder={placeholder}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Typographie</CardTitle>
            <CardDescription>Polices Google Fonts ou système.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Police des titres</Label>
              <Input value={form.heading_font ?? ''} onChange={e => set('heading_font', e.target.value)} placeholder="Manrope" />
            </div>
            <div className="space-y-2">
              <Label>Police du corps</Label>
              <Input value={form.body_font ?? ''} onChange={e => set('body_font', e.target.value)} placeholder="Inter" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documents & Emails</CardTitle>
            <CardDescription>Blocs HTML repris automatiquement dans les exports IA, factures et signatures.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Pied de page documents</Label>
              <Textarea rows={2} value={form.footer_text ?? ''} onChange={e => set('footer_text', e.target.value)} placeholder="IArche · SAS au capital de ..." />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>En-tête document (HTML)</Label>
                <Textarea rows={4} value={form.document_header_html ?? ''} onChange={e => set('document_header_html', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Pied de page document (HTML)</Label>
                <Textarea rows={4} value={form.document_footer_html ?? ''} onChange={e => set('document_footer_html', e.target.value)} />
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Signature email (HTML)</Label>
              <Textarea rows={5} value={form.email_signature_html ?? ''} onChange={e => set('email_signature_html', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <BrandingDocumentPreview
          values={{
            logo_url: data?.logo_url ?? null,
            brand_name: form.brand_name,
            tagline: form.tagline,
            primary_color: form.primary_color,
            secondary_color: form.secondary_color,
            accent_color: form.accent_color,
            background_color: form.background_color,
            text_color: form.text_color,
            heading_font: form.heading_font,
            body_font: form.body_font,
            footer_text: form.footer_text,
            document_header_html: form.document_header_html,
            document_footer_html: form.document_footer_html,
            email_signature_html: form.email_signature_html,
          }}
        />

        <div className="flex justify-end gap-2">
          <Button onClick={onSave} disabled={upsert.isPending}>
            {upsert.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </CockpitLayout>
  );
}
