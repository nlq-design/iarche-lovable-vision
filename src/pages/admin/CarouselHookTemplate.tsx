/**
 * IArche Carousel Template - Hook/Promesse
 * Premier template avec slots verrouillés, limites caractères,
 * preview mobile, et intégration Quality Score.
 * 
 * Specs: docs/MEDIA_TEMPLATES_LINKEDIN.md
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Download, Smartphone, Monitor, Eye, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';

import { HTMLBaseTemplate, HTMLLogo, HTMLLogoArc, IARCHE_FONTS, IARCHE_COLORS } from '@/components/admin/medias/html';
import { THEMES, COLORS } from '@/components/admin/medias/shared/tokens';
import { QualityScoreIndicator, QualityScoreBadge } from '@/components/admin/medias/QualityScoreIndicator';
import { useQualityScore, useQualityInput, QualityInput, ContentSlot, ElementPosition } from '@/hooks/useQualityScore';

// Types
type Theme = 'dark' | 'light' | 'terra' | 'contrast';

interface SlotContent {
  h1: string;
  subtitle: string;
  tag: string;
}

interface SlotLimits {
  h1: number;
  subtitle: number;
  tag: number;
}

// Constantes
const DIMENSIONS = { width: 1080, height: 1350 };
const SAFE_ZONE = 64;
const SCALE = 0.35;
const MOBILE_SCALE = 0.25;

const SLOT_LIMITS: SlotLimits = {
  h1: 60,
  subtitle: 80,
  tag: 20,
};

const LOCKED_TYPOGRAPHY = {
  h1: { fontSize: 72, fontWeight: 700, lineHeight: 1.1 },
  subtitle: { fontSize: 32, fontWeight: 400, lineHeight: 1.3 },
  tag: { fontSize: 20, fontWeight: 600, lineHeight: 1.2 },
};

// Helpers
const getThemeColors = (theme: Theme) => ({
  background: THEMES[theme].background,
  text: THEMES[theme].text,
  subtext: THEMES[theme].subtext,
  accent: THEMES[theme].accent,
});

const getCharacterCount = (text: string) => text.length;
const isOverLimit = (text: string, limit: number) => text.length > limit;

// Composant principal
export const CarouselHookTemplate: React.FC = () => {
  const navigate = useNavigate();
  const previewRef = useRef<HTMLDivElement>(null);
  const mobilePreviewRef = useRef<HTMLDivElement>(null);
  
  // State
  const [theme, setTheme] = useState<Theme>('dark');
  const [content, setContent] = useState<SlotContent>({
    h1: "L'IA se construit avec vous",
    subtitle: 'Transformez votre entreprise avec une approche personnalisée',
    tag: 'IArche',
  });
  const [showTag, setShowTag] = useState(true);
  const [showArc, setShowArc] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [showQualityDetails, setShowQualityDetails] = useState(false);

  // Quality Score Input
  const { createInput } = useQualityInput();
  
  const qualityInput = useMemo((): QualityInput => {
    const slots: Array<{ type: ContentSlot['type']; text: string; fontSize: number; fontWeight?: number }> = [
      { type: 'h1', text: content.h1, fontSize: LOCKED_TYPOGRAPHY.h1.fontSize, fontWeight: LOCKED_TYPOGRAPHY.h1.fontWeight },
    ];
    
    if (content.subtitle) {
      slots.push({ type: 'body', text: content.subtitle, fontSize: LOCKED_TYPOGRAPHY.subtitle.fontSize });
    }
    
    if (showTag && content.tag) {
      slots.push({ type: 'caption', text: content.tag, fontSize: LOCKED_TYPOGRAPHY.tag.fontSize });
    }

    // Calculate element positions (simplified, based on layout)
    const elementBounds: ElementPosition[] = [
      // Logo
      { x: SAFE_ZONE, y: SAFE_ZONE, width: 180, height: 60 },
      // H1 (centered)
      { x: SAFE_ZONE, y: 500, width: DIMENSIONS.width - SAFE_ZONE * 2, height: 160 },
      // Arc (if shown)
      ...(showArc ? [{ x: (DIMENSIONS.width - 200) / 2, y: 680, width: 200, height: 8 }] : []),
      // Subtitle
      ...(content.subtitle ? [{ x: SAFE_ZONE, y: 720, width: DIMENSIONS.width - SAFE_ZONE * 2, height: 80 }] : []),
      // Tag
      ...(showTag && content.tag ? [{ x: DIMENSIONS.width - SAFE_ZONE - 100, y: DIMENSIONS.height - SAFE_ZONE - 40, width: 100, height: 40 }] : []),
    ];

    return createInput('carousel', theme, { slots, elementBounds }, {
      hasArcInHeader: false,
      hasLogoWithArc: false,
    });
  }, [content, theme, showTag, showArc, createInput]);

  const qualityResult = useQualityScore(qualityInput);

  // Handlers
  const updateContent = useCallback((field: keyof SlotContent, value: string) => {
    setContent(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleExport = useCallback(async () => {
    if (!previewRef.current || !qualityResult?.canExport) {
      toast.error("Export bloqué — corrigez les problèmes de qualité");
      return;
    }

    setIsExporting(true);
    try {
      const dataUrl = await toPng(previewRef.current, {
        width: DIMENSIONS.width,
        height: DIMENSIONS.height,
        pixelRatio: 2,
      });

      const link = document.createElement('a');
      link.download = `carousel-hook-${theme}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      toast.success('Slide exporté avec succès !');
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Erreur lors de l'export");
    } finally {
      setIsExporting(false);
    }
  }, [qualityResult?.canExport, theme]);

  // Theme colors
  const colors = getThemeColors(theme);
  const logoVariant = theme === 'dark' || theme === 'contrast' ? 'terracotta' :
                      theme === 'terra' ? 'white' : 'gradient';

  // Render preview content
  const renderPreviewContent = () => (
    <div
      style={{
        width: DIMENSIONS.width,
        height: DIMENSIONS.height,
        padding: SAFE_ZONE,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: IARCHE_FONTS.primary,
        position: 'relative',
      }}
    >
      {/* Safe zone indicator (dev only) */}
      <div
        style={{
          position: 'absolute',
          top: SAFE_ZONE,
          left: SAFE_ZONE,
          right: SAFE_ZONE,
          bottom: SAFE_ZONE,
          border: '1px dashed rgba(255,255,255,0.1)',
          pointerEvents: 'none',
        }}
      />

      {/* Logo */}
      <div style={{ marginBottom: 40 }}>
        <HTMLLogo size="lg" theme={theme} />
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Main content - centered */}
      <div style={{ textAlign: 'center' }}>
        {/* H1 */}
        <h1
          style={{
            fontSize: LOCKED_TYPOGRAPHY.h1.fontSize,
            fontWeight: LOCKED_TYPOGRAPHY.h1.fontWeight,
            lineHeight: LOCKED_TYPOGRAPHY.h1.lineHeight,
            color: colors.text,
            margin: 0,
            marginBottom: showArc ? 24 : 32,
          }}
        >
          {content.h1 || 'Votre titre ici'}
        </h1>

        {/* Arc */}
        {showArc && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
            <HTMLLogoArc size="lg" />
          </div>
        )}

        {/* Subtitle */}
        {content.subtitle && (
          <p
            style={{
              fontSize: LOCKED_TYPOGRAPHY.subtitle.fontSize,
              fontWeight: LOCKED_TYPOGRAPHY.subtitle.fontWeight,
              lineHeight: LOCKED_TYPOGRAPHY.subtitle.lineHeight,
              color: colors.subtext,
              margin: 0,
              maxWidth: 800,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            {content.subtitle}
          </p>
        )}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Tag (bottom right) */}
      {showTag && content.tag && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <span
            style={{
              fontSize: LOCKED_TYPOGRAPHY.tag.fontSize,
              fontWeight: LOCKED_TYPOGRAPHY.tag.fontWeight,
              color: colors.accent,
              backgroundColor: `${colors.accent}15`,
              padding: '8px 16px',
              borderRadius: 8,
            }}
          >
            {content.tag}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/medias')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Template Hook / Promesse</h1>
              <p className="text-muted-foreground text-sm">Slide 1 — Accroche pour capter l'attention</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <QualityScoreBadge 
              result={qualityResult} 
              onClick={() => setShowQualityDetails(!showQualityDetails)}
            />
            <Button
              onClick={handleExport}
              disabled={!qualityResult?.canExport || isExporting}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {isExporting ? 'Export...' : 'Exporter PNG'}
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings panel */}
          <div className="space-y-6">
            {/* Theme */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Thème</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={theme} onValueChange={(v) => setTheme(v as Theme)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">🌙 Dark (Bleu Nuit)</SelectItem>
                    <SelectItem value="light">☀️ Light (Blanc Cassé)</SelectItem>
                    <SelectItem value="terra">🔥 Terra (Terracotta)</SelectItem>
                    <SelectItem value="contrast">⬛ Contrast (WCAG AAA)</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Slots */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Contenu (Slots verrouillés)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* H1 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="h1">Titre principal (H1)</Label>
                    <Badge 
                      variant={isOverLimit(content.h1, SLOT_LIMITS.h1) ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {getCharacterCount(content.h1)}/{SLOT_LIMITS.h1}
                    </Badge>
                  </div>
                  <Textarea
                    id="h1"
                    value={content.h1}
                    onChange={(e) => updateContent('h1', e.target.value)}
                    placeholder="Votre accroche principale..."
                    className="resize-none"
                    rows={2}
                  />
                  {isOverLimit(content.h1, SLOT_LIMITS.h1) && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Titre trop long — impact sur la lisibilité mobile
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Taille verrouillée : {LOCKED_TYPOGRAPHY.h1.fontSize}px / Bold
                  </p>
                </div>

                {/* Subtitle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="subtitle">Sous-titre</Label>
                    <Badge 
                      variant={isOverLimit(content.subtitle, SLOT_LIMITS.subtitle) ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {getCharacterCount(content.subtitle)}/{SLOT_LIMITS.subtitle}
                    </Badge>
                  </div>
                  <Textarea
                    id="subtitle"
                    value={content.subtitle}
                    onChange={(e) => updateContent('subtitle', e.target.value)}
                    placeholder="Précision ou bénéfice..."
                    className="resize-none"
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">
                    Taille verrouillée : {LOCKED_TYPOGRAPHY.subtitle.fontSize}px / Regular
                  </p>
                </div>

                {/* Tag */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="tag">Tag / Label</Label>
                    <div className="flex items-center gap-2">
                      <Switch checked={showTag} onCheckedChange={setShowTag} />
                      {showTag && (
                        <Badge 
                          variant={isOverLimit(content.tag, SLOT_LIMITS.tag) ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {getCharacterCount(content.tag)}/{SLOT_LIMITS.tag}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {showTag && (
                    <Input
                      id="tag"
                      value={content.tag}
                      onChange={(e) => updateContent('tag', e.target.value)}
                      placeholder="IArche"
                    />
                  )}
                </div>

                {/* Arc toggle */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <Label>Arc décoratif (sous H1)</Label>
                  <Switch checked={showArc} onCheckedChange={setShowArc} />
                </div>
              </CardContent>
            </Card>

            {/* Quality Score */}
            <QualityScoreIndicator
              result={qualityResult}
              onExport={handleExport}
              isExporting={isExporting}
            />
          </div>

          {/* Preview panel */}
          <div className="lg:col-span-2 space-y-4">
            {/* Preview mode toggle */}
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Aperçu</h2>
              <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as 'desktop' | 'mobile')}>
                <TabsList className="h-8">
                  <TabsTrigger value="desktop" className="text-xs gap-1 px-3">
                    <Monitor className="h-3 w-3" />
                    Desktop
                  </TabsTrigger>
                  <TabsTrigger value="mobile" className="text-xs gap-1 px-3">
                    <Smartphone className="h-3 w-3" />
                    Mobile LinkedIn
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Preview */}
            <Card className="overflow-hidden">
              <CardContent className="p-4 flex justify-center bg-muted/30">
                {previewMode === 'desktop' ? (
                  <div
                    style={{
                      transform: `scale(${SCALE})`,
                      transformOrigin: 'top center',
                      width: DIMENSIONS.width,
                      height: DIMENSIONS.height * SCALE + 20,
                    }}
                  >
                    <div ref={previewRef}>
                      <HTMLBaseTemplate
                        width={DIMENSIONS.width}
                        height={DIMENSIONS.height}
                        theme={theme}
                      >
                        {renderPreviewContent()}
                      </HTMLBaseTemplate>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Mobile frame */}
                    <div className="bg-black rounded-[2rem] p-2 shadow-xl">
                      <div 
                        className="bg-black rounded-[1.5rem] overflow-hidden"
                        style={{ width: 280, height: 500 }}
                      >
                        {/* Status bar */}
                        <div className="h-6 bg-black flex items-center justify-between px-4 text-white text-[10px]">
                          <span>9:41</span>
                          <div className="flex items-center gap-1">
                            <span>📶</span>
                            <span>🔋</span>
                          </div>
                        </div>
                        {/* LinkedIn header mock */}
                        <div className="h-10 bg-white flex items-center px-3 border-b">
                          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[8px] font-bold">in</div>
                          <div className="ml-2 flex-1 h-6 bg-gray-100 rounded-full" />
                        </div>
                        {/* Post preview */}
                        <div className="bg-white p-2">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1A2B4A] to-[#B04A32]" />
                            <div>
                              <div className="text-[10px] font-medium">IArche</div>
                              <div className="text-[8px] text-gray-500">Conseil IA • 1j</div>
                            </div>
                          </div>
                          {/* Scaled preview */}
                          <div
                            ref={mobilePreviewRef}
                            style={{
                              transform: `scale(${260 / DIMENSIONS.width})`,
                              transformOrigin: 'top left',
                              width: DIMENSIONS.width,
                              height: DIMENSIONS.height,
                            }}
                          >
                            <HTMLBaseTemplate
                              width={DIMENSIONS.width}
                              height={DIMENSIONS.height}
                              theme={theme}
                            >
                              {renderPreviewContent()}
                            </HTMLBaseTemplate>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs">
                      Simulation LinkedIn Mobile
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Format info */}
            <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
              <span>Format : {DIMENSIONS.width}×{DIMENSIONS.height}px (LinkedIn Carrousel)</span>
              <span>Safe zone : {SAFE_ZONE}px</span>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default CarouselHookTemplate;
