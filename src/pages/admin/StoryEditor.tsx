import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ChevronUp, Download } from 'lucide-react';
import { MediaTemplate } from '@/hooks/useMediaTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import AdminLayout from '@/components/layouts/AdminLayout';
import TypographyControls, { TextAlignment } from '@/components/admin/medias/TypographyControls';
import SavedTemplatesPanel from '@/components/admin/medias/SavedTemplatesPanel';
import ExportModeControls, { ExportMode } from '@/components/admin/medias/ExportModeControls';
import ExportActions from '@/components/admin/medias/ExportActions';
import PlatformPresets, { Platform } from '@/components/admin/medias/PlatformPresets';
import { PngQuality, PNG_QUALITY_OPTIONS, exportToPNG } from '@/lib/mediaExport';
import CharterSelector, { CharterType, getCharterColors, getCharterGradients } from '@/components/admin/medias/CharterSelector';
import {
  HTMLBaseTemplate,
  HTMLLogoWithBar,
  HTMLGradientBar,
  IARCHE_COLORS,
  IARCHE_FONTS,
  ThemeType,
  BarSize,
} from '@/components/admin/medias/html';

type StoryTemplate = 'annonce' | 'chiffre';

type PresetTemplate = {
  id: string;
  label: string;
  badge: string;
  titre: string;
  ctaText: string;
  chiffre: string;
  contexte: string;
  source: string;
};

const PRESET_TEMPLATES: PresetTemplate[] = [
  { id: 'nouveaute', label: 'Nouveauté', badge: 'Nouveauté', titre: 'Découvrez notre nouvelle solution IA', ctaText: 'En savoir plus', chiffre: '92%', contexte: 'des entreprises accompagnées ont augmenté leur productivité', source: 'Résultats IArche 2024' },
  { id: 'evenement', label: 'Événement', badge: 'Événement', titre: 'Webinaire exclusif sur l\'IA en entreprise', ctaText: 'S\'inscrire', chiffre: '+150', contexte: 'participants à nos ateliers cette année', source: 'Bilan IArche 2024' },
  { id: 'conseil', label: 'Conseil du jour', badge: 'Conseil', titre: '3 étapes pour intégrer l\'IA dans votre PME', ctaText: 'Découvrir', chiffre: '3x', contexte: 'plus efficace avec l\'automatisation IA', source: 'Étude interne' },
  { id: 'resultat', label: 'Résultat client', badge: 'Success Story', titre: 'Comment notre client a doublé sa productivité', ctaText: 'Voir le cas', chiffre: '+200%', contexte: 'de gain de productivité en 6 mois', source: 'Cas client 2024' },
  { id: 'offre', label: 'Offre spéciale', badge: 'Offre limitée', titre: 'Audit IA gratuit pour les 10 prochaines PME', ctaText: 'En profiter', chiffre: '-50%', contexte: 'sur votre premier accompagnement', source: 'Offre valable en janvier' },
];

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;
const SCALE = 0.22;

export default function StoryEditor() {
  const navigate = useNavigate();
  const location = useLocation();
  const storyRef = useRef<HTMLDivElement>(null);
  
  const [template, setTemplate] = useState<StoryTemplate>('annonce');
  const [theme, setTheme] = useState<ThemeType>('dark');
  const [charter, setCharter] = useState<CharterType>('iarche');
  const [preset, setPreset] = useState<string>('');
  const [exportMode, setExportMode] = useState<ExportMode>('full');
  const [barSize, setBarSize] = useState<BarSize>('xl');
  const [pngQuality, setPngQuality] = useState<PngQuality>(6);
  
  // Get colors based on charter
  const charterColors = getCharterColors(charter);
  
  // Typography states
  const [titleFontSize, setTitleFontSize] = useState(64);
  const [titleBold, setTitleBold] = useState(true);
  const [titleItalic, setTitleItalic] = useState(false);
  const [titleAlignment, setTitleAlignment] = useState<TextAlignment>('center');
  
  // Annonce fields
  const [badge, setBadge] = useState('Nouveauté');
  const [titre, setTitre] = useState('Découvrez notre nouvelle solution IA');
  const [ctaText, setCtaText] = useState('En savoir plus');
  
  // Chiffre fields
  const [chiffre, setChiffre] = useState('92%');
  const [contexte, setContexte] = useState('des entreprises accompagnées ont augmenté leur productivité');
  const [source, setSource] = useState('Résultats IArche 2024');

  const applyPreset = (presetId: string) => {
    const selectedPreset = PRESET_TEMPLATES.find(p => p.id === presetId);
    if (selectedPreset) {
      setBadge(selectedPreset.badge);
      setTitre(selectedPreset.titre);
      setCtaText(selectedPreset.ctaText);
      setChiffre(selectedPreset.chiffre);
      setContexte(selectedPreset.contexte);
      setSource(selectedPreset.source);
    }
    setPreset(presetId);
  };

  // Get current data for saving template
  const getCurrentData = useCallback(() => ({
    template, theme, preset, exportMode, barSize, pngQuality,
    titleFontSize, titleBold, titleItalic, titleAlignment,
    badge, titre, ctaText, chiffre, contexte, source,
  }), [template, theme, preset, exportMode, barSize, pngQuality, titleFontSize, titleBold, titleItalic, titleAlignment, badge, titre, ctaText, chiffre, contexte, source]);

  // Load template data
  const loadTemplateData = useCallback((data: Record<string, unknown>) => {
    if (data.template) setTemplate(data.template as StoryTemplate);
    if (data.theme) setTheme(data.theme as ThemeType);
    if (data.exportMode) setExportMode(data.exportMode as ExportMode);
    if (data.barSize) setBarSize(data.barSize as BarSize);
    if (data.pngQuality) setPngQuality(data.pngQuality as PngQuality);
    if (data.titleFontSize !== undefined) setTitleFontSize(data.titleFontSize as number);
    if (data.titleBold !== undefined) setTitleBold(data.titleBold as boolean);
    if (data.titleItalic !== undefined) setTitleItalic(data.titleItalic as boolean);
    if (data.titleAlignment !== undefined) setTitleAlignment(data.titleAlignment as TextAlignment);
    if (data.badge !== undefined) setBadge(data.badge as string);
    if (data.titre !== undefined) setTitre(data.titre as string);
    if (data.ctaText !== undefined) setCtaText(data.ctaText as string);
    if (data.chiffre !== undefined) setChiffre(data.chiffre as string);
    if (data.contexte !== undefined) setContexte(data.contexte as string);
    if (data.source !== undefined) setSource(data.source as string);
  }, []);

  // Load template from navigation state
  useEffect(() => {
    const state = location.state as { loadTemplate?: MediaTemplate } | null;
    if (state?.loadTemplate?.template_data) {
      loadTemplateData(state.loadTemplate.template_data);
    }
  }, [location.state, loadTemplateData]);

  const handleExport = async () => {
    try {
      await exportToPNG(storyRef, `story-${template}`, {
        pixelRatio: pngQuality,
        backgroundColor: theme === 'dark' ? IARCHE_COLORS.bleuNuit : IARCHE_COLORS.blancCasse,
      });
      toast.success(`Story exportée (${STORY_WIDTH * pngQuality}×${STORY_HEIGHT * pngQuality}px)`);
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    }
  };

  const textColor = theme === 'dark' ? charterColors.white : charterColors.bleuNuit;
  const subtextColor = theme === 'dark' ? charterColors.whiteAlpha70 : charterColors.grisTexte;
  const showCanalisations = exportMode === 'full';

  const renderStoryContent = () => {
    switch (template) {
      case 'annonce':
        return (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            alignItems: titleAlignment === 'center' ? 'center' : titleAlignment === 'left' ? 'flex-start' : 'flex-end',
            height: '100%',
            textAlign: titleAlignment,
          }}>
            {/* Header */}
            <HTMLLogoWithBar size="xl" theme={theme} barSize={barSize} />
            
            {/* Main Content */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '40px', 
              alignItems: titleAlignment === 'center' ? 'center' : titleAlignment === 'left' ? 'flex-start' : 'flex-end',
              padding: '0 20px',
            }}>
              <span style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: '28px',
                fontWeight: 700,
                color: IARCHE_COLORS.terracotta,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
              }}>
                {badge}
              </span>
              <h1 style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: `${titleFontSize}px`,
                fontWeight: titleBold ? 700 : 400,
                fontStyle: titleItalic ? 'italic' : 'normal',
                color: textColor,
                margin: 0,
                lineHeight: 1.15,
              }}>
                {titre}
              </h1>
            </div>

            {/* Swipe Up CTA */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              gap: '12px',
            }}>
              <ChevronUp size={40} color={IARCHE_COLORS.terracotta} />
              <span style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: '24px',
                fontWeight: 600,
                color: IARCHE_COLORS.terracotta,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}>
                {ctaText}
              </span>
            </div>
          </div>
        );

      case 'chiffre':
        return (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            alignItems: titleAlignment === 'center' ? 'center' : titleAlignment === 'left' ? 'flex-start' : 'flex-end',
            height: '100%',
            textAlign: titleAlignment,
          }}>
            {/* Header */}
            <HTMLLogoWithBar size="xl" theme={theme} barSize={barSize} />
            
            {/* Main Content - Big Number */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '48px', 
              alignItems: titleAlignment === 'center' ? 'center' : titleAlignment === 'left' ? 'flex-start' : 'flex-end',
            }}>
              <div style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: `${titleFontSize * 3}px`,
                fontWeight: titleBold ? 800 : 700,
                fontStyle: titleItalic ? 'italic' : 'normal',
                color: IARCHE_COLORS.terracotta,
                lineHeight: 1,
              }}>
                {chiffre}
              </div>
              <p style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: `${titleFontSize * 0.55}px`,
                fontWeight: 500,
                color: textColor,
                margin: 0,
                maxWidth: '85%',
                lineHeight: 1.4,
              }}>
                {contexte}
              </p>
            </div>

            {/* Footer */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              gap: '16px',
            }}>
              <span style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: '18px',
                fontWeight: 400,
                color: subtextColor,
                fontStyle: 'italic',
              }}>
                {source}
              </span>
              <span style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: '20px',
                fontWeight: 500,
                color: subtextColor,
              }}>
                iarche.fr
              </span>
            </div>
          </div>
        );
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/medias')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Stories</h1>
              <p className="text-muted-foreground">1080 × 1920 px (vertical)</p>
            </div>
          </div>
          <Button onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Exporter PNG
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Paramètres</CardTitle>
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

              {/* Template */}
              <div className="space-y-2">
                <Label>Template</Label>
                <Tabs value={template} onValueChange={(v) => setTemplate(v as StoryTemplate)}>
                  <TabsList className="grid grid-cols-2">
                    <TabsTrigger value="annonce">Annonce</TabsTrigger>
                    <TabsTrigger value="chiffre">Chiffre</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Charter selector */}
              <CharterSelector value={charter} onChange={setCharter} />

              {/* Theme */}
              <div className="space-y-2">
                <Label>Thème</Label>
                <Select value={theme} onValueChange={(v) => setTheme(v as ThemeType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Sombre</SelectItem>
                    <SelectItem value="light">Clair</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Typography controls */}
              <TypographyControls
                label="Typographie"
                fontSize={titleFontSize}
                onFontSizeChange={setTitleFontSize}
                isBold={titleBold}
                onBoldChange={setTitleBold}
                isItalic={titleItalic}
                onItalicChange={setTitleItalic}
                alignment={titleAlignment}
                onAlignmentChange={setTitleAlignment}
                minFontSize={40}
                maxFontSize={80}
              />

              {/* Export mode controls */}
              <ExportModeControls
                exportMode={exportMode}
                onExportModeChange={setExportMode}
                barSize={barSize}
                onBarSizeChange={setBarSize}
              />

              {/* PNG Quality */}
              <div className="space-y-2">
                <Label>Qualité PNG</Label>
                <Select value={String(pngQuality)} onValueChange={(v) => setPngQuality(Number(v) as PngQuality)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PNG_QUALITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Template-specific fields */}
              {template === 'annonce' && (
                <>
                  <div className="space-y-2">
                    <Label>Badge</Label>
                    <Input value={badge} onChange={(e) => setBadge(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Titre</Label>
                    <Textarea value={titre} onChange={(e) => setTitre(e.target.value)} rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label>CTA (Swipe up)</Label>
                    <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
                  </div>
                </>
              )}

              {template === 'chiffre' && (
                <>
                  <div className="space-y-2">
                    <Label>Chiffre</Label>
                    <Input value={chiffre} onChange={(e) => setChiffre(e.target.value)} placeholder="92%" />
                  </div>
                  <div className="space-y-2">
                    <Label>Contexte</Label>
                    <Textarea value={contexte} onChange={(e) => setContexte(e.target.value)} rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label>Source</Label>
                    <Input value={source} onChange={(e) => setSource(e.target.value)} />
                  </div>
                </>
              )}

              {/* Saved Templates */}
              <div className="pt-4 border-t">
                <SavedTemplatesPanel
                  editorType="story"
                  getCurrentData={getCurrentData}
                  onLoadTemplate={loadTemplateData}
                />
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Aperçu</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="overflow-auto rounded-lg border flex justify-center"
                style={{ 
                  backgroundColor: '#f0f0f0',
                  padding: '16px',
                }}
              >
                <div style={{ 
                  transform: `scale(${SCALE})`, 
                  transformOrigin: 'top center',
                  width: STORY_WIDTH * SCALE,
                  height: STORY_HEIGHT * SCALE,
                }}>
                  <HTMLBaseTemplate
                    ref={storyRef}
                    width={STORY_WIDTH}
                    height={STORY_HEIGHT}
                    theme={theme}
                    padding={80}
                    showArches={false}
                  >
                    {renderStoryContent()}
                  </HTMLBaseTemplate>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Aperçu à {Math.round(SCALE * 100)}% — Export en taille réelle (1080×1920px)
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}