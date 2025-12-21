import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, User } from 'lucide-react';
import { MediaTemplate } from '@/hooks/useMediaTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import AdminLayout from '@/components/layouts/AdminLayout';
import TypographyControls, { TextAlignment } from '@/components/admin/medias/TypographyControls';
import SavedTemplatesPanel from '@/components/admin/medias/SavedTemplatesPanel';
import ExportModeControls, { ExportMode } from '@/components/admin/medias/ExportModeControls';
import ExportActions from '@/components/admin/medias/ExportActions';
import PlatformPresets, { Platform } from '@/components/admin/medias/PlatformPresets';
import { ImageLibrary } from '@/components/admin/medias/ImageLibrary';
import BatchExport from '@/components/admin/medias/BatchExport';
import ResponsivePreview, { PreviewDevice, getDeviceWidth } from '@/components/admin/medias/ResponsivePreview';
import { PngQuality, PNG_QUALITY_OPTIONS } from '@/lib/mediaExport';
import VerticalAlignmentControls, { VerticalAlignment, getJustifyContent } from '@/components/admin/medias/VerticalAlignmentControls';
import CompositionPresets from '@/components/admin/medias/CompositionPresets';
import TopMarginSlider, { getContentSpacing } from '@/components/admin/medias/TopMarginSlider';
import { DecorativeArcToggle } from '@/components/admin/medias/DecorativeArcToggle';
import {
  HTMLBaseTemplate,
  HTMLLogo,
  IARCHE_COLORS,
  IARCHE_FONTS,
  IARCHE_TYPOGRAPHY,
  IARCHE_SPACING,
  IARCHE_EFFECTS,
  ThemeType,
} from '@/components/admin/medias/html';

// Default dimensions (can be changed by platform preset)
const DEFAULT_WIDTH = 1584;
const DEFAULT_HEIGHT = 396;
const MAX_PREVIEW_WIDTH = 640;

type PresetTemplate = {
  id: string;
  label: string;
  category: 'annonce' | 'chiffre' | 'temoignage' | 'conseil' | 'question';
  tagline: string;
  ceoName: string;
  ceoTitle: string;
};

const PRESET_TEMPLATES: PresetTemplate[] = [
  // ========== ANNONCE ==========
  { id: 'default', label: 'Par défaut', category: 'annonce', tagline: "L'IA se construit avec vous", ceoName: 'Nicolas Lara Queralta', ceoTitle: 'CEO & Fondateur' },
  { id: 'innovation', label: 'Innovation', category: 'annonce', tagline: 'Transformez votre entreprise avec l\'IA', ceoName: 'Nicolas Lara Queralta', ceoTitle: 'Expert IA & Consultant' },
  { id: 'lancement', label: 'Lancement produit', category: 'annonce', tagline: 'Découvrez notre nouvelle solution IA', ceoName: 'Nicolas Lara Queralta', ceoTitle: 'Fondateur IArche' },
  // ========== CHIFFRE ==========
  { id: 'milestone', label: 'Milestone', category: 'chiffre', tagline: '100 entreprises accompagnées', ceoName: 'Nicolas Lara Queralta', ceoTitle: 'CEO & Fondateur' },
  { id: 'statistiques', label: 'Statistiques', category: 'chiffre', tagline: '73% de ROI positif dès la 1ère année', ceoName: 'Nicolas Lara Queralta', ceoTitle: 'Fondateur' },
  // ========== TÉMOIGNAGE ==========
  { id: 'temoignage', label: 'Témoignage', category: 'temoignage', tagline: '"Une transformation IA réussie"', ceoName: 'Nicolas Lara Queralta', ceoTitle: 'Accompagnateur IA' },
  { id: 'cas-client', label: 'Cas client', category: 'temoignage', tagline: 'Ils nous font confiance', ceoName: 'Nicolas Lara Queralta', ceoTitle: 'Expert IA' },
  // ========== CONSEIL ==========
  { id: 'conseil', label: 'Conseil / Tip', category: 'conseil', tagline: 'Conseil #1 : Commencez petit', ceoName: 'Nicolas Lara Queralta', ceoTitle: 'Expert IA' },
  { id: 'bonnes-pratiques', label: 'Bonnes pratiques', category: 'conseil', tagline: '3 bonnes pratiques pour réussir votre IA', ceoName: 'Nicolas Lara Queralta', ceoTitle: 'Consultant IA' },
  // ========== QUESTION ==========
  { id: 'question', label: 'Question / Sondage', category: 'question', tagline: 'Êtes-vous prêt pour l\'IA ?', ceoName: 'Nicolas Lara Queralta', ceoTitle: 'CEO & Fondateur' },
  { id: 'quiz', label: 'Quiz', category: 'question', tagline: 'Testez vos connaissances IA', ceoName: 'Nicolas Lara Queralta', ceoTitle: 'Animateur' },
  // ========== ÉVÉNEMENTS ==========
  { id: 'evenement-live', label: 'Événement live', category: 'annonce', tagline: '🔴 En direct | Webinaire IA & PME', ceoName: 'Nicolas Lara Queralta', ceoTitle: 'Animateur' },
  { id: 'recrutement', label: 'Recrutement', category: 'annonce', tagline: 'Rejoignez l\'aventure IArche !', ceoName: 'Nicolas Lara Queralta', ceoTitle: 'Nous recrutons' },
];

const SOLUTIONS = [
  { id: 'collaboria', name: 'Collaboria', description: 'Plateforme collaborative IA pour équipes' },
  { id: 'datalia', name: 'Datalia', description: 'Analyse de données augmentée par l\'IA' },
  { id: 'team5connect', name: 'Team 5 Connect', description: 'Communication d\'équipe intelligente' },
  { id: 'erp-avocat', name: 'ERP Avocat', description: 'Gestion de cabinet boostée à l\'IA' },
  { id: 'chatbot-rag', name: 'Chatbot RAG Avancé', description: 'Assistant conversationnel expert' },
];

type BannerTemplate = 'entreprise' | 'solution' | 'ceo' | 'services';

// Les 4 services IArche pour le template "services"
const IARCHE_SERVICES = [
  { title: 'Audit & Conseil', desc: 'Roadmap IA' },
  { title: 'Développement', desc: 'Solutions sur mesure' },
  { title: 'Accompagnement', desc: 'Formation & autonomie' },
  { title: 'Conformité', desc: 'AI Act & RGPD' },
];

export default function BannerEditor() {
  const navigate = useNavigate();
  const location = useLocation();
  const bannerRef = useRef<HTMLDivElement>(null);
  
  const [template, setTemplate] = useState<BannerTemplate>('entreprise');
  const [theme, setTheme] = useState<ThemeType>('gradient');
  const [preset, setPreset] = useState<string>('');
  const [exportMode, setExportMode] = useState<ExportMode>('full');
  const [pngQuality, setPngQuality] = useState<PngQuality>(6);
  const [platformPreset, setPlatformPreset] = useState<Platform>('linkedin-banner');
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
  const [showBatchExport, setShowBatchExport] = useState(false);
  
  // Dynamic dimensions from platform preset
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  
  // Computed scale for preview - adjust by device
  const deviceWidth = getDeviceWidth(previewDevice);
  const baseScale = Math.min(MAX_PREVIEW_WIDTH / width, 0.5);
  const deviceScale = previewDevice === 'desktop' ? baseScale : Math.min(deviceWidth / width, baseScale);
  const scale = deviceScale;
  
  // Typography states
  const [titleFontSize, setTitleFontSize] = useState(32);
  const [titleBold, setTitleBold] = useState(false);
  const [titleItalic, setTitleItalic] = useState(false);
  const [titleAlignment, setTitleAlignment] = useState<TextAlignment>('center');
  
  // Composition states (v4.3)
  const [verticalAlignment, setVerticalAlignment] = useState<VerticalAlignment>('center');
  const [topMargin, setTopMargin] = useState(0);
  const [compositionPreset, setCompositionPreset] = useState('centered');
  const [showDecorativeArc, setShowDecorativeArc] = useState(true);
  
  // Entreprise fields
  const [tagline, setTagline] = useState("L'IA se construit avec vous");
  
  // Solution fields
  const [selectedSolution, setSelectedSolution] = useState(SOLUTIONS[0].id);
  
  // CEO fields
  const [ceoName, setCeoName] = useState('Nicolas Lara Queralta');
  const [ceoTitle, setCeoTitle] = useState('CEO & Fondateur');
  const [ceoPhoto, setCeoPhoto] = useState<string | null>(null);

  const applyPreset = (presetId: string) => {
    const selectedPreset = PRESET_TEMPLATES.find(p => p.id === presetId);
    if (selectedPreset) {
      setTagline(selectedPreset.tagline);
      setCeoName(selectedPreset.ceoName);
      setCeoTitle(selectedPreset.ceoTitle);
    }
    setPreset(presetId);
  };

  // Get current data for saving template
  const getCurrentData = useCallback(() => ({
    template, theme, preset, exportMode, pngQuality, platformPreset, width, height,
    titleFontSize, titleBold, titleItalic, titleAlignment,
    verticalAlignment, topMargin, compositionPreset,
    tagline, selectedSolution, ceoName, ceoTitle, ceoPhoto,
  }), [template, theme, preset, exportMode, pngQuality, platformPreset, width, height, titleFontSize, titleBold, titleItalic, titleAlignment, verticalAlignment, topMargin, compositionPreset, tagline, selectedSolution, ceoName, ceoTitle, ceoPhoto]);

  // Load template data
  const loadTemplateData = useCallback((data: Record<string, unknown>) => {
    if (data.template) setTemplate(data.template as BannerTemplate);
    if (data.theme) setTheme(data.theme as ThemeType);
    if (data.exportMode) setExportMode(data.exportMode as ExportMode);
    if (data.pngQuality) setPngQuality(data.pngQuality as PngQuality);
    if (data.platformPreset) setPlatformPreset(data.platformPreset as Platform);
    if (data.width !== undefined) setWidth(data.width as number);
    if (data.height !== undefined) setHeight(data.height as number);
    if (data.titleFontSize !== undefined) setTitleFontSize(data.titleFontSize as number);
    if (data.titleBold !== undefined) setTitleBold(data.titleBold as boolean);
    if (data.titleItalic !== undefined) setTitleItalic(data.titleItalic as boolean);
    if (data.titleAlignment !== undefined) setTitleAlignment(data.titleAlignment as TextAlignment);
    if (data.verticalAlignment !== undefined) setVerticalAlignment(data.verticalAlignment as VerticalAlignment);
    if (data.topMargin !== undefined) setTopMargin(data.topMargin as number);
    if (data.compositionPreset !== undefined) setCompositionPreset(data.compositionPreset as string);
    if (data.tagline !== undefined) setTagline(data.tagline as string);
    if (data.selectedSolution !== undefined) setSelectedSolution(data.selectedSolution as string);
    if (data.ceoName !== undefined) setCeoName(data.ceoName as string);
    if (data.ceoTitle !== undefined) setCeoTitle(data.ceoTitle as string);
    if (data.ceoPhoto !== undefined) setCeoPhoto(data.ceoPhoto as string | null);
  }, []);

  // Load template from navigation state
  useEffect(() => {
    const state = location.state as { loadTemplate?: MediaTemplate } | null;
    if (state?.loadTemplate?.template_data) {
      loadTemplateData(state.loadTemplate.template_data);
    }
  }, [location.state, loadTemplateData]);

  // v4.1: Gestion des couleurs par thème (dark, light, terra)
  const backgroundColor = theme === 'dark' ? IARCHE_COLORS.bleuNuit 
    : theme === 'terra' ? IARCHE_COLORS.terracotta 
    : IARCHE_COLORS.blancCasse;

  // v4.2 Règle d'or: gradient utilise TOUJOURS blanc cassé
  const textColor = theme === 'light' ? IARCHE_COLORS.bleuNuit : IARCHE_COLORS.blancCasse;
  const subtextColor = theme === 'light' ? IARCHE_COLORS.grey : IARCHE_COLORS.blancCasse;
  // v4.2 Règle d'or: CTA en blanc cassé sur gradient, sinon terracotta
  const ctaColor = theme === 'gradient' ? IARCHE_COLORS.blancCasse : IARCHE_COLORS.terracotta;
  const showCanalisations = exportMode === 'full';

  // Computed spacing for content
  const contentPaddingTop = getContentSpacing(topMargin, 0);
  const justifyContent = getJustifyContent(verticalAlignment);

  const renderBannerContent = () => {
    switch (template) {
      case 'entreprise':
        return (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: justifyContent, 
            alignItems: titleAlignment === 'center' ? 'center' : titleAlignment === 'left' ? 'flex-start' : 'flex-end',
            height: '100%',
            gap: '24px',
            textAlign: titleAlignment,
            paddingTop: `${contentPaddingTop}%`,
          }}>
            <HTMLLogo size="xl" theme={theme} />
            <p style={{
              fontFamily: IARCHE_FONTS.primary,
              fontSize: `${titleFontSize}px`,
              fontWeight: titleBold ? 600 : 400,
              fontStyle: titleItalic ? 'italic' : 'normal',
              color: subtextColor,
              margin: 0,
              letterSpacing: '0.03em',
              lineHeight: 1.3,
            }}>
              {tagline}
            </p>
          </div>
        );

      case 'solution':
        const solution = SOLUTIONS.find(s => s.id === selectedSolution) || SOLUTIONS[0];
        return (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: justifyContent, 
            alignItems: titleAlignment === 'center' ? 'center' : titleAlignment === 'left' ? 'flex-start' : 'flex-end',
            height: '100%',
            gap: '20px',
            textAlign: titleAlignment,
            paddingTop: `${contentPaddingTop}%`,
          }}>
            <HTMLLogo size="lg" theme={theme} />
            <h2 style={{
              fontFamily: IARCHE_FONTS.primary,
              fontSize: `${titleFontSize + 16}px`,
              fontWeight: titleBold ? 800 : 700,
              fontStyle: titleItalic ? 'italic' : 'normal',
              color: textColor,
              margin: 0,
            }}>
              {solution.name}
            </h2>
            <p style={{
              fontFamily: IARCHE_FONTS.primary,
              fontSize: `${titleFontSize - 8}px`,
              fontWeight: 400,
              color: subtextColor,
              margin: 0,
            }}>
              {solution.description}
            </p>
          </div>
        );

      case 'ceo':
        return (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            height: '100%',
            gap: '48px',
          }}>
            {/* Photo */}
            <div style={{
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(26,43,74,0.1)',
              border: `3px solid ${ctaColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {ceoPhoto ? (
                <img src={ceoPhoto} alt={ceoName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={48} color={subtextColor} />
              )}
            </div>
            
            {/* Info */}
            <div style={{ 
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              textAlign: titleAlignment,
            }}>
              <HTMLLogo size="lg" theme={theme} />
              <h2 style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: `${titleFontSize + 4}px`,
                fontWeight: titleBold ? 800 : 700,
                fontStyle: titleItalic ? 'italic' : 'normal',
                color: textColor,
                margin: 0,
              }}>
                {ceoName}
              </h2>
              <p style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: `${titleFontSize - 12}px`,
                fontWeight: 400,
                color: ctaColor,
                margin: 0,
              }}>
                {ceoTitle}
              </p>
            </div>
          </div>
        );

      case 'services':
        return (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '100%',
            padding: `0 ${Math.round(width * 0.04)}px`,
          }}>
            {/* Logo discret à gauche - v4.2 pro */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: Math.round(height * 0.03) + 'px' }}>
              <img 
                src={theme === 'dark' || theme === 'terra' ? 'https://iarche.fr/logos/iarche-white.svg' : 'https://iarche.fr/logos/iarche-dark.svg'} 
                alt="IArche" 
                style={{ width: Math.round(width * 0.08) + 'px', height: 'auto' }}
              />
              <span style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: Math.round(width * 0.009) + 'px',
                color: subtextColor,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>
                Agence IA
              </span>
            </div>
            
            {/* 4 services en ligne - v4.2 pro */}
            <div style={{ 
              display: 'flex', 
              gap: Math.round(width * 0.03) + 'px',
            }}>
              {IARCHE_SERVICES.map((service, idx) => (
                <div key={idx} style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  gap: Math.round(height * 0.015) + 'px',
                }}>
                  <span style={{
                    fontFamily: IARCHE_FONTS.primary,
                    fontSize: Math.round(width * 0.011) + 'px',
                    fontWeight: 600,
                    color: textColor,
                    letterSpacing: '0.01em',
                  }}>
                    {service.title}
                  </span>
                  <span style={{
                    fontFamily: IARCHE_FONTS.primary,
                    fontSize: Math.round(width * 0.008) + 'px',
                    color: subtextColor,
                    fontWeight: 400,
                  }}>
                    {service.desc}
                  </span>
                </div>
              ))}
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
              <h1 className="text-2xl font-bold text-foreground">Bannières LinkedIn</h1>
              <p className="text-muted-foreground">1584 × 396 px</p>
            </div>
          </div>
          <ExportActions
            elementRef={bannerRef}
            filename={`banner-${template}`}
            quality={pngQuality}
            backgroundColor={theme === 'light' ? IARCHE_COLORS.blancCasse : IARCHE_COLORS.bleuNuit}
            onUploadComplete={(url) => toast.success(`URL: ${url}`)}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Paramètres</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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

              {/* Template selector */}
              <div className="space-y-2">
                <Label>Template</Label>
                <Tabs value={template} onValueChange={(v) => setTemplate(v as BannerTemplate)}>
                  <TabsList className="grid grid-cols-4">
                    <TabsTrigger value="entreprise">Entreprise</TabsTrigger>
                    <TabsTrigger value="solution">Solution</TabsTrigger>
                    <TabsTrigger value="ceo">CEO</TabsTrigger>
                    <TabsTrigger value="services">4 Services</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

{/* Theme selector */}
              <div className="space-y-2">
                <Label>Thème</Label>
                <Select value={theme} onValueChange={(v) => setTheme(v as ThemeType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Sombre (Bleu Nuit)</SelectItem>
                    <SelectItem value="light">Clair (Blanc Cassé)</SelectItem>
                    <SelectItem value="terra">Terra Nova (Terracotta)</SelectItem>
                    <SelectItem value="contrast">Contraste fort</SelectItem>
                    <SelectItem value="gradient">Gradient (Style Email)</SelectItem>
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
                minFontSize={20}
                maxFontSize={48}
              />

              {/* Export mode controls - barSize removed per v4.0 */}
              <ExportModeControls
                exportMode={exportMode}
                onExportModeChange={setExportMode}
              />

              {/* Composition presets (v4.3) */}
              <CompositionPresets
                selectedPreset={compositionPreset}
                onSelectPreset={(preset) => {
                  setCompositionPreset(preset.id);
                  setVerticalAlignment(preset.verticalAlignment);
                  setTopMargin(preset.topMargin);
                }}
                currentVerticalAlignment={verticalAlignment}
                currentTopMargin={topMargin}
              />

              {/* Vertical alignment (v4.3) */}
              <VerticalAlignmentControls
                value={verticalAlignment}
                onChange={setVerticalAlignment}
              />

              {/* Top margin slider (v4.3) */}
              <TopMarginSlider
                value={topMargin}
                onChange={setTopMargin}
              />

              {/* Decorative arc toggle (v4.3) */}
              <DecorativeArcToggle
                enabled={showDecorativeArc}
                onChange={setShowDecorativeArc}
              />

              {/* Platform Presets - dimensions dynamiques */}
              <PlatformPresets
                value={platformPreset}
                onChange={setPlatformPreset}
                onDimensionsChange={(w, h) => { setWidth(w); setHeight(h); }}
                filterByCategory={['LinkedIn', 'Twitter/X', 'Facebook']}
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
              {template === 'entreprise' && (
                <div className="space-y-2">
                  <Label>Tagline</Label>
                  <Input
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="L'IA se construit avec vous"
                  />
                </div>
              )}

              {template === 'solution' && (
                <div className="space-y-2">
                  <Label>Solution</Label>
                  <Select value={selectedSolution} onValueChange={setSelectedSolution}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOLUTIONS.map((sol) => (
                        <SelectItem key={sol.id} value={sol.id}>
                          {sol.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {template === 'ceo' && (
                <>
                  <div className="space-y-2">
                    <Label>Nom</Label>
                    <Input
                      value={ceoName}
                      onChange={(e) => setCeoName(e.target.value)}
                      placeholder="Prénom Nom"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Titre</Label>
                    <Input
                      value={ceoTitle}
                      onChange={(e) => setCeoTitle(e.target.value)}
                      placeholder="CEO & Fondateur"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Photo</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={ceoPhoto || ''}
                        onChange={(e) => setCeoPhoto(e.target.value || null)}
                        placeholder="URL de la photo"
                        className="flex-1"
                      />
                      <ImageLibrary 
                        onSelect={(url) => setCeoPhoto(url)} 
                        triggerLabel="Choisir"
                      />
                    </div>
                    {ceoPhoto && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCeoPhoto(null)}
                        className="w-full mt-1"
                      >
                        Supprimer la photo
                      </Button>
                    )}
                  </div>
                </>
              )}

              {/* Saved Templates */}
              <div className="pt-4 border-t">
                <SavedTemplatesPanel
                  editorType="banner"
                  getCurrentData={getCurrentData}
                  onLoadTemplate={loadTemplateData}
                />
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>Aperçu</CardTitle>
              <ResponsivePreview 
                value={previewDevice} 
                onChange={setPreviewDevice}
              />
            </CardHeader>
            <CardContent className="space-y-4">
              <div 
                className="overflow-auto rounded-lg border"
                style={{ 
                  maxWidth: '100%',
                  backgroundColor: '#f0f0f0',
                  padding: '16px',
                }}
              >
                <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                  <HTMLBaseTemplate
                    ref={bannerRef}
                    width={width}
                    height={height}
                    theme={theme}
                    padding={60}
                    showArches={false}
                    decorativeArc={showDecorativeArc ? { 
                      position: 'bottom-right', 
                      size: Math.min(width, height) * 0.30, 
                      opacity: 0.06, 
                      strokeWidth: 2,
                      extended: true, // v4.3 mode continuité
                    } : undefined}
                  >
                    {renderBannerContent()}
                  </HTMLBaseTemplate>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Aperçu à {Math.round(scale * 100)}% ({previewDevice}) — Export en taille réelle ({width}×{height}px)
              </p>
              
              {/* Batch Export Collapsible */}
              <Collapsible open={showBatchExport} onOpenChange={setShowBatchExport}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full">
                    {showBatchExport ? 'Masquer' : 'Export multi-formats'}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                  <BatchExport
                    elementRef={bannerRef}
                    baseFilename={`banner-${template}`}
                    quality={pngQuality}
                  />
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}