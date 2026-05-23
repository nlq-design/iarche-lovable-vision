import { useEffect, useState } from 'react';
import { CockpitLayout } from '@/components/cockpit/CockpitLayout';
import { useWorkspaceId } from '@/contexts/WorkspaceContext';
import { useWorkspaceBranding } from '@/hooks/useWorkspaceBranding';
import { LoadingState } from '@/components/cockpit/common/LoadingState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Palette, Upload, Image as ImageIcon } from 'lucide-react';
import { BrandingDocumentPreview } from '@/components/cockpit/settings/BrandingDocumentPreview';

const FONT_OPTIONS = ['Inter', 'Manrope', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Source Sans Pro'];

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

  const onUpload = async (file: File, kind: 'logo' | 'favicon') => {
    await uploadAsset.mutateAsync({ file, kind });
  };

  const onSave = () => {
    // Only save the simple fields. Apply the chosen font to both heading & body for consistency.
    const font = form.body_font?.trim() || form.heading_font?.trim() || '';
    const patch: Record<string, string | null> = {
      brand_name: form.brand_name?.trim() || null,
      tagline: form.tagline?.trim() || null,
      primary_color: form.primary_color?.trim() || null,
      secondary_color: form.secondary_color?.trim() || null,
      heading_font: font || null,
      body_font: font || null,
      footer_text: form.footer_text?.trim() || null,
    };
    upsert.mutate(patch as never);
  };

  const LogoSlot = ({ kind, label, hint, url }: { kind: 'logo' | 'favicon'; label: string; hint: string; url: string | null }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 rounded-md border bg-muted/30 flex items-center justify-center overflow-hidden">
          {url ? <img src={url} alt={label} className="h-full w-full object-contain" /> : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
        </div>
        <div className="flex flex-col gap-1">
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
          <span className="text-xs text-muted-foreground">{hint}</span>
        </div>
      </div>
    </div>
  );

  const currentFont = form.body_font?.trim() || form.heading_font?.trim() || '';

  return (
    <CockpitLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-3">
          <Palette className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Identité visuelle</h1>
            <p className="text-muted-foreground">L’essentiel pour personnaliser vos documents et exports IA.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Logo</CardTitle>
            <CardDescription>Importez votre logo principal et un favicon. Formats PNG, JPG, SVG.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <LogoSlot kind="logo" label="Logo" hint="Affiché en en-tête des documents" url={data?.logo_url ?? null} />
            <LogoSlot kind="favicon" label="Favicon" hint="Icône d’onglet navigateur" url={data?.favicon_url ?? null} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Marque</CardTitle>
            <CardDescription>Nom et signature reprises automatiquement dans les exports.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nom de marque</Label>
              <Input value={form.brand_name ?? ''} onChange={e => set('brand_name', e.target.value)} placeholder="Ma société" />
            </div>
            <div className="space-y-2">
              <Label>Slogan (optionnel)</Label>
              <Input value={form.tagline ?? ''} onChange={e => set('tagline', e.target.value)} placeholder="Une phrase qui vous décrit" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Couleurs</CardTitle>
            <CardDescription>Deux couleurs suffisent : une principale, une d’accent.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Couleur principale</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  className="w-14 h-10 p-1 cursor-pointer"
                  value={form.primary_color?.match(/^#[0-9a-f]{6}$/i) ? form.primary_color : '#1A2B4A'}
                  onChange={e => set('primary_color', e.target.value)}
                />
                <Input value={form.primary_color ?? ''} onChange={e => set('primary_color', e.target.value)} placeholder="#1A2B4A" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Couleur d’accent</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  className="w-14 h-10 p-1 cursor-pointer"
                  value={form.secondary_color?.match(/^#[0-9a-f]{6}$/i) ? form.secondary_color : '#B04A32'}
                  onChange={e => set('secondary_color', e.target.value)}
                />
                <Input value={form.secondary_color ?? ''} onChange={e => set('secondary_color', e.target.value)} placeholder="#B04A32" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Typographie</CardTitle>
            <CardDescription>Une seule police, appliquée aux titres et au corps.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-w-sm">
              <Label>Police</Label>
              <div className="flex flex-wrap gap-2">
                {FONT_OPTIONS.map(font => (
                  <Button
                    key={font}
                    type="button"
                    variant={currentFont === font ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => { set('heading_font', font); set('body_font', font); }}
                    style={{ fontFamily: `'${font}', sans-serif` }}
                  >
                    {font}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pied de page</CardTitle>
            <CardDescription>Texte affiché en bas des documents générés (mentions légales, contact…).</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              value={form.footer_text ?? ''}
              onChange={e => set('footer_text', e.target.value)}
              placeholder="Ma société — contact@exemple.com"
            />
          </CardContent>
        </Card>

        <BrandingDocumentPreview
          values={{
            logo_url: data?.logo_url ?? null,
            brand_name: form.brand_name,
            tagline: form.tagline,
            primary_color: form.primary_color,
            secondary_color: form.secondary_color,
            heading_font: currentFont,
            body_font: currentFont,
            footer_text: form.footer_text,
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
