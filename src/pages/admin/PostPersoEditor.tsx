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
import CharterSelector, { CharterType, getCharterColors, getCharterGradients, GradientType } from '@/components/admin/medias/CharterSelector';
import ExportActions from '@/components/admin/medias/ExportActions';

const PostPersoEditor = () => {
  const navigate = useNavigate();
  const previewRef = useRef<HTMLDivElement>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [body, setBody] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [charter, setCharter] = useState<CharterType>('iarche2');
  const [gradientType, setGradientType] = useState<GradientType>('diagonal');
  const [showWatermark, setShowWatermark] = useState(true);
  const [titleSize, setTitleSize] = useState(48);
  const [quality, setQuality] = useState<number>(2);

  // Get colors based on charter
  const charterColors = getCharterColors(charter);
  const charterGradients = getCharterGradients(charter);

  const getBackground = () => {
    if (theme === 'light') {
      return charterColors.blancCasse;
    }
    return charterGradients[gradientType]?.css || charterGradients.diagonal.css;
  };

  const getTextColor = () => {
    return theme === 'dark' ? charterColors.white : charterColors.grisTexte;
  };

  const getSubtitleColor = () => {
    return theme === 'dark' ? charterColors.whiteAlpha70 : charterColors.terracotta;
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
              <h1 className="text-2xl font-bold text-foreground">Post Carré</h1>
              <p className="text-muted-foreground text-sm flex items-center gap-2">
                1080×1080px
                <Linkedin className="h-4 w-4" />
                <Instagram className="h-4 w-4" />
              </p>
            </div>
          </div>
          <ExportActions
            elementRef={previewRef}
            filename="post-perso"
            width={1080}
            height={1080}
            quality={quality as 1 | 2 | 3 | 4 | 6 | 8}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label>Titre principal</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Votre message principal"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Sous-titre</Label>
                  <Input
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Sous-titre ou tagline"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Corps du texte (optionnel)</Label>
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Texte complémentaire..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                {/* Charter selector */}
                <CharterSelector value={charter} onChange={setCharter} />

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
                    <Label>Type de dégradé</Label>
                    <Select value={gradientType} onValueChange={(v) => setGradientType(v as GradientType)}>
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

                <div>
                  <Label>Taille du titre: {titleSize}px</Label>
                  <Slider
                    value={[titleSize]}
                    onValueChange={([v]) => setTitleSize(v)}
                    min={32}
                    max={72}
                    step={2}
                    className="mt-2"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Watermark IArche</Label>
                  <Switch checked={showWatermark} onCheckedChange={setShowWatermark} />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Qualité export: {quality}x</Label>
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
              className="aspect-square rounded-lg overflow-hidden shadow-xl relative"
              style={{
                background: getBackground(),
                fontFamily: "'Manrope', sans-serif",
              }}
            >
              {/* Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
                {title && (
                  <h1 
                    className="font-bold leading-tight mb-4"
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
                    className="text-xl font-medium mb-6"
                    style={{ color: getSubtitleColor() }}
                  >
                    {subtitle}
                  </p>
                )}
                {body && (
                <p 
                    className="text-base leading-relaxed max-w-[80%]"
                    style={{ color: theme === 'dark' ? charterColors.whiteAlpha90 : charterColors.grisTexte }}
                  >
                    {body}
                  </p>
                )}
              </div>

              {/* Watermark */}
              {showWatermark && (
                <div 
                  className="absolute bottom-5 right-5 text-sm font-bold"
                  style={{ 
                    opacity: 0.15,
                    color: theme === 'dark' ? charterColors.white : charterColors.bleuNuit,
                  }}
                >
                  IArche
                </div>
              )}

              {/* Empty state */}
              {!title && !subtitle && !body && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Sparkles className="h-12 w-12 mb-4" style={{ color: theme === 'dark' ? charterColors.whiteAlpha50 : charterColors.terracotta }} />
                  <p style={{ color: theme === 'dark' ? charterColors.whiteAlpha50 : charterColors.grisTexte }}>
                    Commencez à taper...
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

export default PostPersoEditor;
