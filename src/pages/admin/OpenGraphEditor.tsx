import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Briefcase, Globe } from 'lucide-react';
import { MediaTemplate } from '@/hooks/useMediaTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import AdminLayout from '@/components/layouts/AdminLayout';
import { exportToPNG } from '@/lib/exportPng';
import TypographyControls, { TextAlignment } from '@/components/admin/medias/TypographyControls';
import SavedTemplatesPanel from '@/components/admin/medias/SavedTemplatesPanel';
import ExportModeControls, { ExportMode } from '@/components/admin/medias/ExportModeControls';
import { ImageLibrary } from '@/components/admin/medias/ImageLibrary';
import { BarSize } from '@/components/admin/medias/html/tokens';
import {
  HTMLBaseTemplate,
  HTMLLogoWithBar,
  HTMLGradientBar,
  IARCHE_COLORS,
  IARCHE_FONTS,
  ThemeType,
} from '@/components/admin/medias/html';

type PngQuality = 4 | 6 | 8;
const PNG_QUALITY_OPTIONS: { value: PngQuality; label: string }[] = [
  { value: 4, label: 'Standard (4x)' },
  { value: 6, label: 'Haute (6x)' },
  { value: 8, label: 'Ultra (8x)' },
];

type OGTemplate = 'page' | 'article' | 'solution';

type PresetTemplate = {
  id: string;
  label: string;
  pageTitle: string;
  pageTagline: string;
  articleTitle: string;
  articleCategory: string;
};

const PRESET_TEMPLATES: PresetTemplate[] = [
  { id: 'services', label: 'Page Services', pageTitle: 'Services', pageTagline: 'Audit, Développement, Formation IA', articleTitle: 'Nos services IA pour PME', articleCategory: 'Services' },
  { id: 'solutions', label: 'Page Solutions', pageTitle: 'Solutions', pageTagline: 'Des solutions IA clé en main', articleTitle: 'Découvrez nos solutions', articleCategory: 'Solutions' },
  { id: 'guide', label: 'Article Guide', pageTitle: 'Ressources', pageTagline: 'Guides et conseils IA', articleTitle: 'Guide complet : Intégrer l\'IA dans votre PME', articleCategory: 'Guide' },
  { id: 'actualite', label: 'Actualité', pageTitle: 'Actualités', pageTagline: 'Les dernières nouvelles IArche', articleTitle: 'IArche lance sa nouvelle plateforme', articleCategory: 'Actualité' },
  { id: 'cas-client', label: 'Cas Client', pageTitle: 'Cas Clients', pageTagline: 'Nos success stories', articleTitle: 'Comment notre client a triplé sa productivité', articleCategory: 'Cas Client' },
];

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const SCALE = 0.45;

const SOLUTIONS = [
  { id: 'collaboria', name: 'Collaboria', description: 'Plateforme collaborative IA' },
  { id: 'datalia', name: 'Datalia', description: 'Analyse de données augmentée' },
  { id: 'team5connect', name: 'Team 5 Connect', description: 'Communication d\'équipe intelligente' },
  { id: 'erp-avocat', name: 'ERP Avocat', description: 'Gestion de cabinet boostée à l\'IA' },
  { id: 'chatbot-rag', name: 'Chatbot RAG', description: 'Assistant conversationnel expert' },
];

export default function OpenGraphEditor() {
  const navigate = useNavigate();
  const location = useLocation();
  const ogRef = useRef<HTMLDivElement>(null);
  
  const [template, setTemplate] = useState<OGTemplate>('page');
  const [theme, setTheme] = useState<ThemeType>('dark');
  const [preset, setPreset] = useState<string>('');
  const [exportMode, setExportMode] = useState<ExportMode>('full');
  const [barSize, setBarSize] = useState<BarSize>('lg');
  const [pngQuality, setPngQuality] = useState<PngQuality>(6);
  
  // Typography states
  const [titleFontSize, setTitleFontSize] = useState(72);
  const [titleBold, setTitleBold] = useState(true);
  const [titleItalic, setTitleItalic] = useState(false);
  const [titleAlignment, setTitleAlignment] = useState<TextAlignment>('center');
  
  // Page fields
  const [pageTitle, setPageTitle] = useState('Services');
  const [pageTagline, setPageTagline] = useState("L'IA se construit avec vous");
  
  // Article fields
  const [articleTitle, setArticleTitle] = useState('Comment intégrer l\'IA dans votre PME');
  const [articleDate, setArticleDate] = useState('15 Janvier 2025');
  const [articleCategory, setArticleCategory] = useState('Guide');
  
  // Solution fields
  const [selectedSolution, setSelectedSolution] = useState(SOLUTIONS[0].id);
  const [solutionImage, setSolutionImage] = useState<string | null>(null);

  const applyPreset = (presetId: string) => {
    const selectedPreset = PRESET_TEMPLATES.find(p => p.id === presetId);
    if (selectedPreset) {
      setPageTitle(selectedPreset.pageTitle);
      setPageTagline(selectedPreset.pageTagline);
      setArticleTitle(selectedPreset.articleTitle);
      setArticleCategory(selectedPreset.articleCategory);
    }
    setPreset(presetId);
  };

  // Get current data for saving template
  const getCurrentData = useCallback(() => ({
    template, theme, preset, exportMode, barSize, pngQuality,
    titleFontSize, titleBold, titleItalic, titleAlignment,
    pageTitle, pageTagline,
    articleTitle, articleDate, articleCategory,
    selectedSolution, solutionImage,
  }), [template, theme, preset, exportMode, barSize, pngQuality, titleFontSize, titleBold, titleItalic, titleAlignment, pageTitle, pageTagline, articleTitle, articleDate, articleCategory, selectedSolution, solutionImage]);

  // Load template data
  const loadTemplateData = useCallback((data: Record<string, unknown>) => {
    if (data.template) setTemplate(data.template as OGTemplate);
    if (data.theme) setTheme(data.theme as ThemeType);
    if (data.exportMode) setExportMode(data.exportMode as ExportMode);
    if (data.barSize) setBarSize(data.barSize as BarSize);
    if (data.pngQuality) setPngQuality(data.pngQuality as PngQuality);
    if (data.titleFontSize !== undefined) setTitleFontSize(data.titleFontSize as number);
    if (data.titleBold !== undefined) setTitleBold(data.titleBold as boolean);
    if (data.titleItalic !== undefined) setTitleItalic(data.titleItalic as boolean);
    if (data.titleAlignment !== undefined) setTitleAlignment(data.titleAlignment as TextAlignment);
    if (data.pageTitle !== undefined) setPageTitle(data.pageTitle as string);
    if (data.pageTagline !== undefined) setPageTagline(data.pageTagline as string);
    if (data.articleTitle !== undefined) setArticleTitle(data.articleTitle as string);
    if (data.articleDate !== undefined) setArticleDate(data.articleDate as string);
    if (data.articleCategory !== undefined) setArticleCategory(data.articleCategory as string);
    if (data.selectedSolution !== undefined) setSelectedSolution(data.selectedSolution as string);
    if (data.solutionImage !== undefined) setSolutionImage(data.solutionImage as string | null);
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
      await exportToPNG(ogRef, `og-${template}`, {
        pixelRatio: pngQuality,
        backgroundColor: theme === 'dark' ? IARCHE_COLORS.bleuNuit : IARCHE_COLORS.blancCasse,
      });
      toast.success(`Open Graph exporté (${OG_WIDTH * pngQuality}×${OG_HEIGHT * pngQuality}px)`);
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    }
  };

  const textColor = theme === 'dark' ? IARCHE_COLORS.white : IARCHE_COLORS.bleuNuit;
  const subtextColor = theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(26,43,74,0.7)';

  const renderOGContent = () => {
    switch (template) {
      case 'page':
        return (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center',
            alignItems: titleAlignment === 'center' ? 'center' : titleAlignment === 'left' ? 'flex-start' : 'flex-end',
            height: '100%',
            gap: '32px',
            textAlign: titleAlignment,
          }}>
            <HTMLLogoWithBar size="xl" theme={theme} barSize={barSize} />
            <h1 style={{
              fontFamily: IARCHE_FONTS.primary,
              fontSize: `${titleFontSize}px`,
              fontWeight: titleBold ? 700 : 400,
              fontStyle: titleItalic ? 'italic' : 'normal',
              color: textColor,
              margin: 0,
            }}>
              {pageTitle}
            </h1>
            <p style={{
              fontFamily: IARCHE_FONTS.primary,
              fontSize: `${titleFontSize * 0.39}px`,
              fontWeight: 400,
              color: subtextColor,
              margin: 0,
            }}>
              {pageTagline}
            </p>
          </div>
        );

      case 'article':
        return (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            height: '100%',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <HTMLLogoWithBar size="lg" theme={theme} barSize={barSize} />
              <span style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: '18px',
                fontWeight: 600,
                color: IARCHE_COLORS.white,
                backgroundColor: IARCHE_COLORS.terracotta,
                padding: '8px 20px',
                borderRadius: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {articleCategory}
              </span>
            </div>

            {/* Content */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '24px',
              maxWidth: '85%',
              textAlign: titleAlignment,
            }}>
              <h1 style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: `${titleFontSize * 0.72}px`,
                fontWeight: titleBold ? 700 : 400,
                fontStyle: titleItalic ? 'italic' : 'normal',
                color: textColor,
                margin: 0,
                lineHeight: 1.15,
              }}>
                {articleTitle}
              </h1>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <FileText size={24} color={IARCHE_COLORS.terracotta} />
              <span style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: '20px',
                fontWeight: 500,
                color: subtextColor,
              }}>
                {articleDate} · iarche.fr
              </span>
            </div>
          </div>
        );

      case 'solution':
        const solution = SOLUTIONS.find(s => s.id === selectedSolution) || SOLUTIONS[0];
        return (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            height: '100%',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <HTMLLogoWithBar size="lg" theme={theme} barSize={barSize} />
              <span style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: '16px',
                fontWeight: 500,
                color: subtextColor,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}>
                Solution IArche
              </span>
            </div>

            {/* Content */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: '48px',
            }}>
              {/* Icon/Image */}
              <div style={{
                width: '140px',
                height: '140px',
                borderRadius: '24px',
                backgroundColor: solutionImage ? 'transparent' : IARCHE_COLORS.terracotta,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                overflow: 'hidden',
              }}>
                {solutionImage ? (
                  <img src={solutionImage} alt={solution.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Briefcase size={64} color={IARCHE_COLORS.white} />
                )}
              </div>
              
              {/* Text */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: titleAlignment }}>
                <h1 style={{
                  fontFamily: IARCHE_FONTS.primary,
                  fontSize: `${titleFontSize * 0.89}px`,
                  fontWeight: titleBold ? 700 : 400,
                  fontStyle: titleItalic ? 'italic' : 'normal',
                  color: textColor,
                  margin: 0,
                }}>
                  {solution.name}
                </h1>
                <p style={{
                  fontFamily: IARCHE_FONTS.primary,
                  fontSize: `${titleFontSize * 0.39}px`,
                  fontWeight: 400,
                  color: subtextColor,
                  margin: 0,
                }}>
                  {solution.description}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Globe size={20} color={IARCHE_COLORS.terracotta} />
              <span style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: '18px',
                fontWeight: 500,
                color: subtextColor,
              }}>
                iarche.fr/solutions/{solution.id}
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
              <h1 className="text-2xl font-bold text-foreground">Open Graph</h1>
              <p className="text-muted-foreground">1200 × 630 px — Aperçus de partage</p>
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
                <Tabs value={template} onValueChange={(v) => setTemplate(v as OGTemplate)}>
                  <TabsList className="grid grid-cols-3">
                    <TabsTrigger value="page">Page</TabsTrigger>
                    <TabsTrigger value="article">Article</TabsTrigger>
                    <TabsTrigger value="solution">Solution</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Theme */}
              <div className="space-y-2">
                <Label>Thème</Label>
                <Select value={theme} onValueChange={(v) => setTheme(v as ThemeType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Bleu Nuit (sombre)</SelectItem>
                    <SelectItem value="light">Blanc Cassé (clair)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Typography controls */}
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
                minFontSize={48}
                maxFontSize={96}
              />

              {/* Template-specific fields */}
              {template === 'page' && (
                <>
                  <div className="space-y-2">
                    <Label>Titre de la page</Label>
                    <Input value={pageTitle} onChange={(e) => setPageTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tagline</Label>
                    <Input value={pageTagline} onChange={(e) => setPageTagline(e.target.value)} />
                  </div>
                </>
              )}

              {template === 'article' && (
                <>
                  <div className="space-y-2">
                    <Label>Titre de l'article</Label>
                    <Input value={articleTitle} onChange={(e) => setArticleTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input value={articleDate} onChange={(e) => setArticleDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Catégorie</Label>
                    <Input value={articleCategory} onChange={(e) => setArticleCategory(e.target.value)} />
                  </div>
                </>
              )}

              {template === 'solution' && (
                <>
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
                  <div className="space-y-2">
                    <Label>Image/Icône</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={solutionImage || ''}
                        onChange={(e) => setSolutionImage(e.target.value || null)}
                        placeholder="URL de l'image"
                        className="flex-1"
                      />
                      <ImageLibrary 
                        onSelect={(url) => setSolutionImage(url)} 
                        triggerLabel="Choisir"
                      />
                    </div>
                    {solutionImage && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSolutionImage(null)}
                        className="w-full mt-1"
                      >
                        Supprimer l'image
                      </Button>
                    )}
                  </div>
                </>
              )}

              {/* Export Mode Controls */}
              <ExportModeControls
                exportMode={exportMode}
                onExportModeChange={setExportMode}
                barSize={barSize}
                onBarSizeChange={setBarSize}
                compact={true}
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

              {/* Saved Templates */}
              <div className="pt-4 border-t">
                <SavedTemplatesPanel
                  editorType="opengraph"
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
                className="overflow-auto rounded-lg border"
                style={{ 
                  backgroundColor: '#f0f0f0',
                  padding: '16px',
                }}
              >
                <div style={{ 
                  transform: `scale(${SCALE})`, 
                  transformOrigin: 'top left',
                  width: OG_WIDTH * SCALE,
                  height: OG_HEIGHT * SCALE,
                }}>
                  <HTMLBaseTemplate
                    ref={ogRef}
                    width={OG_WIDTH}
                    height={OG_HEIGHT}
                    theme={theme}
                    padding={60}
                    showArches={false}
                    showCanalisations={exportMode === 'full'}
                    canalisationOpacity={0.4}
                    canalisationStrokeWidth={5}
                  >
                    {renderOGContent()}
                  </HTMLBaseTemplate>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Aperçu à {Math.round(SCALE * 100)}% — Export en taille réelle (1200×630px)
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}