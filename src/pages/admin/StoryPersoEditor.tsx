import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Linkedin, Instagram, Sparkles } from 'lucide-react';
import { COLORS_PERSO, GRADIENTS_PERSO, WATERMARK_CONFIG, type GradientTypePerso } from '@/components/admin/medias/perso/tokensPerso';
import ExportActions from '@/components/admin/medias/ExportActions';

const StoryPersoEditor = () => {
  const navigate = useNavigate();
  const previewRef = useRef<HTMLDivElement>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [body, setBody] = useState('');
  const [cta, setCta] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [gradientType, setGradientType] = useState<GradientTypePerso>('diagonal');
  const [showWatermark, setShowWatermark] = useState(true);
  const [titleSize, setTitleSize] = useState(48);
  const [quality, setQuality] = useState<number>(2); // 2x recommandé

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
              <h1 className="text-2xl font-bold text-foreground">Story</h1>
              <p className="text-muted-foreground text-sm flex items-center gap-2">
                1080×1920px
                <Instagram className="h-4 w-4" />
                <Linkedin className="h-4 w-4" />
              </p>
            </div>
          </div>
          <ExportActions
            elementRef={previewRef}
            filename="story-perso"
            width={1080}
            height={1920}
            quality={quality as 1 | 2 | 3 | 4 | 6 | 8}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label>Titre principal</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Votre message accrocheur"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Sous-titre</Label>
                  <Input
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Sous-titre ou contexte"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Corps du texte</Label>
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Développez votre message..."
                    className="mt-1"
                    rows={4}
                  />
                </div>

                <div>
                  <Label>Call-to-action</Label>
                  <Input
                    value={cta}
                    onChange={(e) => setCta(e.target.value)}
                    placeholder="Swipe up • En savoir plus →"
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label>Thème</Label>
                    <Select value={theme} onValueChange={(v) => setTheme(v as 'dark' | 'light')}>
                      <SelectTrigger className="w-28">
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
                        <SelectTrigger className="w-28">
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
                </div>

                <div>
                  <Label>Taille du titre: {titleSize}px</Label>
                  <Slider
                    value={[titleSize]}
                    onValueChange={([v]) => setTitleSize(v)}
                    min={36}
                    max={64}
                    step={2}
                    className="mt-2"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Watermark IArche</Label>
                  <Switch checked={showWatermark} onCheckedChange={setShowWatermark} />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Qualité: {quality}x</Label>
                  <Select value={String(quality)} onValueChange={(v) => setQuality(Number(v))}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4x</SelectItem>
                      <SelectItem value="6">6x</SelectItem>
                      <SelectItem value="8">8x</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <Label>Aperçu</Label>
            <div 
              ref={previewRef}
              className="rounded-lg overflow-hidden shadow-xl relative mx-auto"
              style={{
                width: '270px',
                height: '480px',
                background: getBackground(),
                fontFamily: "'Manrope', sans-serif",
              }}
            >
              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-center p-6 text-center">
                {title && (
                  <h1 
                    className="font-bold leading-tight mb-3"
                    style={{ 
                      color: getTextColor(),
                      fontSize: `${titleSize * 0.5}px`,
                      textShadow: theme === 'dark' ? '0 2px 10px rgba(0,0,0,0.3)' : 'none',
                    }}
                  >
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p 
                    className="text-sm font-medium mb-4"
                    style={{ color: getSubtitleColor() }}
                  >
                    {subtitle}
                  </p>
                )}
                {body && (
                  <p 
                    className="text-xs leading-relaxed"
                    style={{ color: theme === 'dark' ? COLORS_PERSO.whiteAlpha90 : COLORS_PERSO.grisTexte }}
                  >
                    {body}
                  </p>
                )}
              </div>

              {/* CTA */}
              {cta && (
                <div 
                  className="absolute bottom-12 left-0 right-0 text-center"
                  style={{ color: getSubtitleColor() }}
                >
                  <p className="text-sm font-semibold">{cta}</p>
                </div>
              )}

              {/* Watermark */}
              {showWatermark && (
                <div 
                  className="absolute bottom-3 right-3 text-xs font-bold"
                  style={{ 
                    opacity: WATERMARK_CONFIG.opacity,
                    color: theme === 'dark' ? COLORS_PERSO.white : COLORS_PERSO.bleuProfond,
                  }}
                >
                  IArche
                </div>
              )}

              {/* Empty state */}
              {!title && !subtitle && !body && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Sparkles className="h-8 w-8 mb-2" style={{ color: theme === 'dark' ? COLORS_PERSO.whiteAlpha50 : COLORS_PERSO.terracotta }} />
                  <p className="text-xs" style={{ color: theme === 'dark' ? COLORS_PERSO.whiteAlpha50 : COLORS_PERSO.grisTexte }}>
                    Créez votre story
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default StoryPersoEditor;
