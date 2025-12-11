import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Linkedin, Sparkles } from 'lucide-react';
import { COLORS_PERSO, GRADIENTS_PERSO, WATERMARK_CONFIG, type GradientTypePerso } from '@/components/admin/medias/perso/tokensPerso';
import ExportActions from '@/components/admin/medias/ExportActions';

// Dimensions réelles LinkedIn Banner
const CANVAS_WIDTH = 1584;
const CANVAS_HEIGHT = 396;

const BannerPersoEditor = () => {
  const navigate = useNavigate();
  const previewRef = useRef<HTMLDivElement>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [gradientType, setGradientType] = useState<GradientTypePerso>('diagonal');
  const [showWatermark, setShowWatermark] = useState(true);
  const [titleSize, setTitleSize] = useState(72); // Taille relative au canvas 1584px
  const [subtitleSize, setSubtitleSize] = useState(28);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');
  const [quality, setQuality] = useState<number>(2);

  const getBackground = () => {
    if (theme === 'light') {
      return COLORS_PERSO.blancCasse;
    }
    return GRADIENTS_PERSO[gradientType]?.css || GRADIENTS_PERSO.diagonal.css;
  };

  const getTextColor = () => {
    return theme === 'dark' ? COLORS_PERSO.white : COLORS_PERSO.grisTexte;
  };

  const getSubtitleColor = () => {
    return theme === 'dark' ? COLORS_PERSO.whiteAlpha90 : COLORS_PERSO.terracotta;
  };

  const getAlignStyles = (): React.CSSProperties => {
    switch (textAlign) {
      case 'left':
        return { alignItems: 'flex-start', textAlign: 'left', paddingLeft: 80 };
      case 'center':
        return { alignItems: 'center', textAlign: 'center' };
      case 'right':
        return { alignItems: 'flex-end', textAlign: 'right', paddingRight: 80 };
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/medias-perso')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Bannière LinkedIn</h1>
              <p className="text-muted-foreground text-sm flex items-center gap-2">
                {CANVAS_WIDTH}×{CANVAS_HEIGHT}px
                <Linkedin className="h-4 w-4" />
              </p>
            </div>
          </div>
          <ExportActions
            elementRef={previewRef}
            filename="banner-linkedin-perso"
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            quality={quality as 1 | 2 | 3 | 4 | 6 | 8}
          />
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Preview Container */}
          <div className="space-y-4">
            <Label>Aperçu (50% de {CANVAS_WIDTH}×{CANVAS_HEIGHT}px)</Label>
            <div className="overflow-x-auto bg-muted/30 rounded-lg p-4">
              {/* Scaled container for display only */}
              <div 
                className="mx-auto"
                style={{
                  width: CANVAS_WIDTH * 0.5,
                  height: CANVAS_HEIGHT * 0.5,
                  overflow: 'hidden',
                }}
              >
                <div 
                  ref={previewRef}
                  className="relative overflow-hidden"
                  style={{
                    width: CANVAS_WIDTH,
                    height: CANVAS_HEIGHT,
                    transform: 'scale(0.5)',
                    transformOrigin: 'top left',
                    background: getBackground(),
                    fontFamily: "'Manrope', 'Helvetica Neue', Arial, sans-serif",
                  }}
                >
                  {/* Content */}
                  <div 
                    className="absolute inset-0 flex flex-col justify-center"
                    style={getAlignStyles()}
                  >
                    {title && (
                      <h1 
                        className="font-bold leading-tight"
                        style={{ 
                          color: getTextColor(),
                          fontSize: titleSize,
                          textShadow: theme === 'dark' ? '0 4px 20px rgba(0,0,0,0.4)' : 'none',
                          letterSpacing: '-0.02em',
                          marginBottom: 8,
                        }}
                      >
                        {title}
                      </h1>
                    )}
                    {subtitle && (
                      <p 
                        className="font-medium"
                        style={{ 
                          color: getSubtitleColor(),
                          fontSize: subtitleSize,
                          letterSpacing: '0.01em',
                        }}
                      >
                        {subtitle}
                      </p>
                    )}
                  </div>

                  {/* Watermark */}
                  {showWatermark && (
                    <div 
                      className="absolute font-bold"
                      style={{ 
                        bottom: 20,
                        right: 30,
                        fontSize: 18,
                        opacity: WATERMARK_CONFIG.opacity,
                        color: theme === 'dark' ? COLORS_PERSO.white : COLORS_PERSO.bleuProfond,
                      }}
                    >
                      IArche
                    </div>
                  )}

                  {/* Empty state */}
                  {!title && !subtitle && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <Sparkles 
                        className="mb-4" 
                        style={{ 
                          width: 48, 
                          height: 48,
                          color: theme === 'dark' ? COLORS_PERSO.whiteAlpha50 : COLORS_PERSO.terracotta 
                        }} 
                      />
                      <p 
                        style={{ 
                          fontSize: 24,
                          color: theme === 'dark' ? COLORS_PERSO.whiteAlpha50 : COLORS_PERSO.grisTexte 
                        }}
                      >
                        Ajoutez votre titre et tagline
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label>Titre principal</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Nicolas Lara"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Sous-titre / Tagline</Label>
                  <Input
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Consultant IA & Fondateur IArche"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Taille titre: {titleSize}px</Label>
                  <Slider
                    value={[titleSize]}
                    onValueChange={([v]) => setTitleSize(v)}
                    min={48}
                    max={96}
                    step={2}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Taille sous-titre: {subtitleSize}px</Label>
                  <Slider
                    value={[subtitleSize]}
                    onValueChange={([v]) => setSubtitleSize(v)}
                    min={18}
                    max={42}
                    step={2}
                    className="mt-2"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Thème</Label>
                  <Select value={theme} onValueChange={(v) => setTheme(v as 'dark' | 'light')}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark">Sombre</SelectItem>
                      <SelectItem value="light">Clair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {theme === 'dark' && (
                  <div className="flex items-center justify-between">
                    <Label>Dégradé</Label>
                    <Select value={gradientType} onValueChange={(v) => setGradientType(v as GradientTypePerso)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diagonal">Diagonal</SelectItem>
                        <SelectItem value="horizontal">Horizontal</SelectItem>
                        <SelectItem value="vertical">Vertical</SelectItem>
                        <SelectItem value="darkSolid">Bleu uni</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Label>Alignement</Label>
                  <Select value={textAlign} onValueChange={(v) => setTextAlign(v as 'left' | 'center' | 'right')}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Gauche</SelectItem>
                      <SelectItem value="center">Centre</SelectItem>
                      <SelectItem value="right">Droite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Watermark IArche</Label>
                  <Switch checked={showWatermark} onCheckedChange={setShowWatermark} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Qualité export: {quality}x</Label>
                    <p className="text-xs text-muted-foreground">
                      {quality === 1 && `${CANVAS_WIDTH}×${CANVAS_HEIGHT}px (~150KB)`}
                      {quality === 2 && `${CANVAS_WIDTH * 2}×${CANVAS_HEIGHT * 2}px (~400KB) ✓`}
                      {quality === 3 && `${CANVAS_WIDTH * 3}×${CANVAS_HEIGHT * 3}px (~800KB)`}
                      {quality === 4 && `${CANVAS_WIDTH * 4}×${CANVAS_HEIGHT * 4}px (~1.5MB)`}
                    </p>
                  </div>
                  <Select value={String(quality)} onValueChange={(v) => setQuality(Number(v))}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1x</SelectItem>
                      <SelectItem value="2">2x ✓</SelectItem>
                      <SelectItem value="3">3x</SelectItem>
                      <SelectItem value="4">4x</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default BannerPersoEditor;
