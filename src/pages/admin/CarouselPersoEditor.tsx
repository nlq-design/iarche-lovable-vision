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
import { ArrowLeft, Linkedin, Plus, Trash2, ChevronLeft, ChevronRight, Download, Sparkles } from 'lucide-react';
import CharterSelector, { CharterType, getCharterColors, getCharterGradients, GradientType } from '@/components/admin/medias/CharterSelector';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface Slide {
  id: string;
  title: string;
  body: string;
}

const CarouselPersoEditor = () => {
  const navigate = useNavigate();
  const slideRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  // Form state
  const [slides, setSlides] = useState<Slide[]>([
    { id: '1', title: '', body: '' },
  ]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [charter, setCharter] = useState<CharterType>('iarche2');
  const [gradientType, setGradientType] = useState<GradientType>('diagonal');
  const [showWatermark, setShowWatermark] = useState(true);
  const [showSlideNumber, setShowSlideNumber] = useState(true);
  const [quality, setQuality] = useState<number>(2);
  const [isExporting, setIsExporting] = useState(false);

  // Get colors based on charter
  const charterColors = getCharterColors(charter);
  const charterGradients = getCharterGradients(charter);

  const addSlide = () => {
    const newSlide: Slide = {
      id: String(Date.now()),
      title: '',
      body: '',
    };
    setSlides([...slides, newSlide]);
    setCurrentSlide(slides.length);
  };

  const removeSlide = (index: number) => {
    if (slides.length <= 1) return;
    const newSlides = slides.filter((_, i) => i !== index);
    setSlides(newSlides);
    if (currentSlide >= newSlides.length) {
      setCurrentSlide(newSlides.length - 1);
    }
  };

  const updateSlide = (index: number, field: keyof Slide, value: string) => {
    const newSlides = [...slides];
    newSlides[index] = { ...newSlides[index], [field]: value };
    setSlides(newSlides);
  };

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

  const exportAllSlides = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      
      for (let i = 0; i < slides.length; i++) {
        const slideRef = slideRefs.current.get(slides[i].id);
        if (slideRef) {
          const dataUrl = await toPng(slideRef, { pixelRatio: quality });
          // Convert data URL to blob
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          zip.file(`slide-${String(i + 1).padStart(2, '0')}.png`, blob);
        }
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `carousel-perso-${Date.now()}.zip`);
      toast.success(`${slides.length} slides exportées en ZIP`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Erreur lors de l'export");
    } finally {
      setIsExporting(false);
    }
  };

  const slide = slides[currentSlide];

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
              <h1 className="text-2xl font-bold text-foreground">Carrousel LinkedIn</h1>
              <p className="text-muted-foreground text-sm flex items-center gap-2">
                1080×1350px • {slides.length} slide{slides.length > 1 ? 's' : ''}
                <Linkedin className="h-4 w-4" />
              </p>
            </div>
          </div>
          <Button onClick={exportAllSlides} disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Export...' : `Exporter ZIP (${slides.length} slides)`}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="space-y-6">
            {/* Slide navigation */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <Label>Slides ({slides.length})</Label>
                  <Button variant="outline" size="sm" onClick={addSlide}>
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {slides.map((s, i) => (
                    <button
                      key={s.id}
                      onClick={() => setCurrentSlide(i)}
                      className={`
                        relative min-w-[60px] h-[75px] rounded-lg border-2 transition-all
                        flex items-center justify-center text-sm font-medium
                        ${currentSlide === i ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}
                      `}
                      style={{ 
                        background: currentSlide === i ? undefined : getBackground(),
                        color: currentSlide === i ? undefined : (theme === 'dark' ? COLORS_PERSO.white : COLORS_PERSO.grisTexte),
                      }}
                    >
                      {i + 1}
                      {slides.length > 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removeSlide(i); }}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Current slide editor */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">Slide {currentSlide + 1}</Label>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      disabled={currentSlide === 0}
                      onClick={() => setCurrentSlide(c => c - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      disabled={currentSlide === slides.length - 1}
                      onClick={() => setCurrentSlide(c => c + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Titre</Label>
                  <Input
                    value={slide.title}
                    onChange={(e) => updateSlide(currentSlide, 'title', e.target.value)}
                    placeholder={currentSlide === 0 ? "Titre accrocheur" : `Slide ${currentSlide + 1}`}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Contenu</Label>
                  <Textarea
                    value={slide.body}
                    onChange={(e) => updateSlide(currentSlide, 'body', e.target.value)}
                    placeholder="Développez votre point..."
                    className="mt-1"
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Global settings */}
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

                <div className="flex items-center justify-between">
                  <Label>Numéro de slide</Label>
                  <Switch checked={showSlideNumber} onCheckedChange={setShowSlideNumber} />
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
              ref={(el) => {
                if (el) slideRefs.current.set(slide.id, el);
              }}
              className="rounded-lg overflow-hidden shadow-xl relative mx-auto"
              style={{
                width: '324px',
                height: '405px',
                background: getBackground(),
                fontFamily: "'Manrope', sans-serif",
              }}
            >
              {/* Slide number */}
              {showSlideNumber && (
                <div 
                  className="absolute top-4 right-4 text-sm font-bold"
                  style={{ color: getSubtitleColor() }}
                >
                  {currentSlide + 1}/{slides.length}
                </div>
              )}

              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-center p-8 text-center">
                {slide.title && (
                  <h1 
                    className="font-bold leading-tight mb-4 text-2xl"
                    style={{ 
                      color: getTextColor(),
                      textShadow: theme === 'dark' ? '0 2px 10px rgba(0,0,0,0.3)' : 'none',
                    }}
                  >
                    {slide.title}
                  </h1>
                )}
                {slide.body && (
                  <p 
                    className="text-sm leading-relaxed"
                    style={{ color: theme === 'dark' ? COLORS_PERSO.whiteAlpha90 : COLORS_PERSO.grisTexte }}
                  >
                    {slide.body}
                  </p>
                )}
              </div>

              {/* Watermark */}
              {showWatermark && (
                <div 
                  className="absolute bottom-4 right-4 text-xs font-bold"
                  style={{ 
                    opacity: WATERMARK_CONFIG.opacity,
                    color: theme === 'dark' ? COLORS_PERSO.white : COLORS_PERSO.bleuProfond,
                  }}
                >
                  IArche
                </div>
              )}

              {/* Empty state */}
              {!slide.title && !slide.body && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Sparkles className="h-8 w-8 mb-2" style={{ color: theme === 'dark' ? COLORS_PERSO.whiteAlpha50 : COLORS_PERSO.terracotta }} />
                  <p className="text-xs" style={{ color: theme === 'dark' ? COLORS_PERSO.whiteAlpha50 : COLORS_PERSO.grisTexte }}>
                    Slide {currentSlide + 1}
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

export default CarouselPersoEditor;
