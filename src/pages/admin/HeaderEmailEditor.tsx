import React, { useRef, useState } from 'react';
import { ArrowLeft, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { exportToPNG } from '@/lib/exportPng';
import { toast } from 'sonner';
import AdminLayout from '@/components/layouts/AdminLayout';
import TypographyControls, { TextAlignment } from '@/components/admin/medias/TypographyControls';
import {
  HTMLBaseTemplate,
  HTMLLogo,
  HTMLGradientBar,
  IARCHE_COLORS,
  IARCHE_FONTS,
} from '@/components/admin/medias/html';

type HeaderTemplate = 'newsletter' | 'annonce' | 'minimal';

type PresetTemplate = {
  id: string;
  label: string;
  titre: string;
  sousTitre: string;
  numero: string;
  date: string;
  template: HeaderTemplate;
};

const PRESET_TEMPLATES: PresetTemplate[] = [
  { id: 'newsletter-mensuelle', label: 'Newsletter Mensuelle', titre: 'Newsletter IArche', sousTitre: 'L\'IA au service de votre entreprise', numero: '#12', date: 'Décembre 2024', template: 'newsletter' },
  { id: 'newsletter-speciale', label: 'Newsletter Spéciale', titre: 'Édition Spéciale', sousTitre: 'Nouveautés et innovations', numero: 'Hors-série', date: 'Janvier 2025', template: 'newsletter' },
  { id: 'annonce-evenement', label: 'Annonce Événement', titre: 'Webinaire IA pour PME', sousTitre: '', numero: '', date: '', template: 'annonce' },
  { id: 'annonce-produit', label: 'Annonce Produit', titre: 'Nouvelle Solution IArche', sousTitre: '', numero: '', date: '', template: 'annonce' },
  { id: 'minimal-pro', label: 'Minimal Pro', titre: '', sousTitre: '', numero: '', date: '', template: 'minimal' },
];

const HeaderEmailEditor: React.FC = () => {
  const navigate = useNavigate();
  const previewRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [template, setTemplate] = useState<HeaderTemplate>('newsletter');
  const [preset, setPreset] = useState<string>('');
  
  // Typography states
  const [titleFontSize, setTitleFontSize] = useState(20);
  const [titleBold, setTitleBold] = useState(true);
  const [titleItalic, setTitleItalic] = useState(false);
  const [titleAlignment, setTitleAlignment] = useState<TextAlignment>('center');
  
  const [formData, setFormData] = useState({
    titre: 'Newsletter IArche',
    sousTitre: 'L\'IA au service de votre entreprise',
    numero: '#12',
    date: 'Décembre 2024',
  });

  const applyPreset = (presetId: string) => {
    const selectedPreset = PRESET_TEMPLATES.find(p => p.id === presetId);
    if (selectedPreset) {
      setFormData({
        titre: selectedPreset.titre,
        sousTitre: selectedPreset.sousTitre,
        numero: selectedPreset.numero,
        date: selectedPreset.date,
      });
      setTemplate(selectedPreset.template);
    }
    setPreset(presetId);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportToPNG(previewRef, `header-email-${template}`, {
        pixelRatio: 2,
        backgroundColor: template === 'newsletter' ? IARCHE_COLORS.bleuNuit : IARCHE_COLORS.blancCasse,
      });
      toast.success('Header exporté avec succès');
    } catch (error) {
      toast.error("Erreur lors de l'export");
    } finally {
      setIsExporting(false);
    }
  };

  const renderPreview = () => {
    switch (template) {
      case 'newsletter':
        return (
          <HTMLBaseTemplate
            ref={previewRef}
            width={600}
            height={150}
            theme="dark"
            showMesh={true}
            showArches={false}
            showCanalisations={true}
            canalisationOpacity={0.35}
            canalisationStrokeWidth={3}
            padding={24}
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              height: '100%',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <HTMLLogo size="lg" theme="dark" />
                <HTMLGradientBar size="md" />
              </div>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: titleAlignment === 'center' ? 'center' : titleAlignment === 'left' ? 'flex-start' : 'flex-end',
                gap: '4px',
                textAlign: titleAlignment,
              }}>
                <span style={{
                  fontFamily: IARCHE_FONTS.primary,
                  fontSize: `${titleFontSize}px`,
                  fontWeight: titleBold ? 700 : 400,
                  fontStyle: titleItalic ? 'italic' : 'normal',
                  color: IARCHE_COLORS.white,
                }}>
                  {formData.titre}
                </span>
                <span style={{
                  fontFamily: IARCHE_FONTS.primary,
                  fontSize: `${titleFontSize * 0.7}px`,
                  color: IARCHE_COLORS.terracotta,
                }}>
                  {formData.numero} · {formData.date}
                </span>
              </div>
            </div>
          </HTMLBaseTemplate>
        );

      case 'annonce':
        return (
          <HTMLBaseTemplate
            ref={previewRef}
            width={600}
            height={150}
            theme="light"
            showMesh={false}
            showArches={false}
            showCanalisations={true}
            canalisationOpacity={0.35}
            canalisationStrokeWidth={3}
            padding={24}
          >
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: titleAlignment === 'center' ? 'center' : titleAlignment === 'left' ? 'flex-start' : 'flex-end',
              justifyContent: 'center',
              height: '100%',
              gap: '8px',
              textAlign: titleAlignment,
            }}>
              <HTMLLogo size="lg" theme="light" />
              <span style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: `${titleFontSize}px`,
                fontWeight: titleBold ? 600 : 400,
                fontStyle: titleItalic ? 'italic' : 'normal',
                color: IARCHE_COLORS.bleuNuit,
                textAlign: titleAlignment,
              }}>
                {formData.titre}
              </span>
              <HTMLGradientBar size="lg" />
            </div>
          </HTMLBaseTemplate>
        );

      case 'minimal':
        return (
          <HTMLBaseTemplate
            ref={previewRef}
            width={600}
            height={150}
            theme="light"
            showMesh={false}
            showArches={false}
            showCanalisations={true}
            canalisationOpacity={0.25}
            canalisationStrokeWidth={2}
            padding={24}
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: '16px',
            }}>
              <HTMLGradientBar size="sm" />
              <HTMLLogo size="xl" theme="light" />
              <HTMLGradientBar size="sm" reverse />
            </div>
          </HTMLBaseTemplate>
        );
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin/medias')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Header Email</h1>
              <p className="text-muted-foreground">600 × 150 px - En-tête newsletters</p>
            </div>
          </div>
          <Button onClick={handleExport} disabled={isExporting} className="gap-2">
            <Download className="h-4 w-4" />
            {isExporting ? 'Export...' : 'Exporter PNG'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preset templates */}
              <div className="space-y-2">
                <Label>Templates pré-remplis</Label>
                <Select value={preset} onValueChange={applyPreset}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_TEMPLATES.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="template">Template</Label>
                <Select value={template} onValueChange={(v) => setTemplate(v as HeaderTemplate)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newsletter">Newsletter (fond bleu)</SelectItem>
                    <SelectItem value="annonce">Annonce (fond clair)</SelectItem>
                    <SelectItem value="minimal">Minimal (logo centré)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Typography controls */}
              {template !== 'minimal' && (
                <TypographyControls
                  label="Typographie titre"
                  fontSize={titleFontSize}
                  onFontSizeChange={setTitleFontSize}
                  isBold={titleBold}
                  onBoldChange={setTitleBold}
                  isItalic={titleItalic}
                  onItalicChange={setTitleItalic}
                  alignment={titleAlignment}
                  onAlignmentChange={setTitleAlignment}
                  minFontSize={14}
                  maxFontSize={32}
                />
              )}

              {template !== 'minimal' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="titre">Titre</Label>
                    <Input
                      id="titre"
                      value={formData.titre}
                      onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                    />
                  </div>
                  {template === 'newsletter' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="numero">Numéro</Label>
                        <Input
                          id="numero"
                          value={formData.numero}
                          onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                          placeholder="#12"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Input
                          id="date"
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          placeholder="Décembre 2024"
                        />
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Aperçu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center overflow-auto">
                {renderPreview()}
              </div>
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Export en taille réelle (600×150px)
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default HeaderEmailEditor;