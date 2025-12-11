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

const BannerPersoEditor = () => {
  const navigate = useNavigate();
  const previewRef = useRef<HTMLDivElement>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [gradientType, setGradientType] = useState<GradientTypePerso>('diagonal');
  const [showWatermark, setShowWatermark] = useState(true);
  const [titleSize, setTitleSize] = useState(42);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');
  const [quality, setQuality] = useState<number>(2); // 2x recommandé pour bannière

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
    return theme === 'dark' ? COLORS_PERSO.whiteAlpha70 : COLORS_PERSO.terracotta;
  };

  const alignClass = {
    left: 'items-start text-left pl-16',
    center: 'items-center text-center',
    right: 'items-end text-right pr-16',
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
                1584×396px
                <Linkedin className="h-4 w-4" />
              </p>
            </div>
          </div>
          <ExportActions
            elementRef={previewRef}
            filename="banner-linkedin-perso"
            width={1584}
            height={396}
            quality={quality as 1 | 2 | 3 | 4 | 6 | 8}
          />
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Preview - Full width */}
          <div className="space-y-4">
            <Label>Aperçu (ratio réel)</Label>
            <div 
              ref={previewRef}
              className="w-full rounded-lg overflow-hidden shadow-xl relative"
              style={{
                aspectRatio: '1584 / 396',
                background: getBackground(),
                fontFamily: "'Manrope', sans-serif",
              }}
            >
              {/* Content */}
              <div className={`absolute inset-0 flex flex-col justify-center ${alignClass[textAlign]}`}>
                {title && (
                  <h1 
                    className="font-bold leading-tight mb-2"
                    style={{ 
                      color: getTextColor(),
                      fontSize: `${titleSize}px`,
                      textShadow: theme === 'dark' ? '0 2px 10px rgba(0,0,0,0.3)' : 'none',
                    }}
                  >
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p 
                    className="text-lg font-medium"
                    style={{ color: getSubtitleColor() }}
                  >
                    {subtitle}
                  </p>
                )}
              </div>

              {/* Watermark */}
              {showWatermark && (
                <div 
                  className="absolute bottom-4 right-6 text-sm font-bold"
                  style={{ 
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
                  <Sparkles className="h-8 w-8 mb-2" style={{ color: theme === 'dark' ? COLORS_PERSO.whiteAlpha50 : COLORS_PERSO.terracotta }} />
                  <p className="text-sm" style={{ color: theme === 'dark' ? COLORS_PERSO.whiteAlpha50 : COLORS_PERSO.grisTexte }}>
                    Ajoutez votre titre et tagline
                  </p>
                </div>
              )}
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
                  <Label>Taille du titre: {titleSize}px</Label>
                  <Slider
                    value={[titleSize]}
                    onValueChange={([v]) => setTitleSize(v)}
                    min={28}
                    max={56}
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
                    <Label>Qualité: {quality}x</Label>
                    <p className="text-xs text-muted-foreground">
                      {quality === 1 && '1584×396px (~150KB)'}
                      {quality === 2 && '3168×792px (~400KB) ✓'}
                      {quality === 3 && '4752×1188px (~800KB)'}
                      {quality === 4 && '6336×1584px (~1.5MB)'}
                      {quality === 6 && '9504×2376px (~3MB)'}
                      {quality === 8 && '12672×3168px (~6MB)'}
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
                      <SelectItem value="6">6x</SelectItem>
                      <SelectItem value="8">8x</SelectItem>
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
