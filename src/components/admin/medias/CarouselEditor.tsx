import { useState, useEffect } from 'react';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, Download, Plus, Trash2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CarouselPDF } from './templates/CarouselPDF';

interface CarouselEditorProps {
  templateId: string;
  onBack: () => void;
}

interface SlideData {
  id: number;
  title: string;
  subtitle: string;
  content: string;
  highlight?: string;
}

const templateConfigs: Record<string, { name: string; defaultSlides: SlideData[] }> = {
  solution: {
    name: 'Annonce Solution',
    defaultSlides: [
      { id: 1, title: 'IArche présente', subtitle: '', content: '', highlight: '' },
      { id: 2, title: 'Le problème', subtitle: '', content: 'Décrivez le problème que résout cette solution', highlight: '' },
      { id: 3, title: 'Notre solution', subtitle: '', content: 'Présentez votre solution', highlight: '' },
      { id: 4, title: 'Les bénéfices', subtitle: '', content: 'Listez les avantages clés', highlight: '' },
      { id: 5, title: 'Passez à l\'action', subtitle: '', content: 'Call-to-action', highlight: 'iarche.fr' },
    ]
  },
  article: {
    name: 'Partage Article',
    defaultSlides: [
      { id: 1, title: '', subtitle: 'Article IArche', content: '', highlight: '' },
      { id: 2, title: 'Point clé 1', subtitle: '', content: '', highlight: '' },
      { id: 3, title: 'Point clé 2', subtitle: '', content: '', highlight: '' },
      { id: 4, title: 'Point clé 3', subtitle: '', content: '', highlight: '' },
      { id: 5, title: 'En résumé', subtitle: '', content: '', highlight: '' },
      { id: 6, title: 'Lire l\'article complet', subtitle: '', content: '', highlight: 'iarche.fr/articles' },
    ]
  },
  stats: {
    name: 'Chiffres Clés',
    defaultSlides: [
      { id: 1, title: 'Les chiffres qui comptent', subtitle: 'IArche en quelques données', content: '', highlight: '' },
      { id: 2, title: '', subtitle: '', content: '', highlight: '85%' },
      { id: 3, title: '', subtitle: '', content: '', highlight: '+200%' },
      { id: 4, title: 'Source & Contact', subtitle: '', content: '', highlight: 'iarche.fr' },
    ]
  }
};

export const CarouselEditor = ({ templateId, onBack }: CarouselEditorProps) => {
  const { toast } = useToast();
  const config = templateConfigs[templateId] || templateConfigs.solution;
  
  const [slides, setSlides] = useState<SlideData[]>(config.defaultSlides);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [sourceMode, setSourceMode] = useState<'libre' | 'article'>('libre');
  const [articles, setArticles] = useState<{ id: string; title: string; slug: string }[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<string>('');
  const [startTheme, setStartTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const fetchArticles = async () => {
      const { data } = await supabase
        .from('articles')
        .select('id, title, slug')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) setArticles(data);
    };
    fetchArticles();
  }, []);

  const handleSlideChange = (field: keyof SlideData, value: string) => {
    setSlides(prev => prev.map((slide, idx) => 
      idx === currentSlide ? { ...slide, [field]: value } : slide
    ));
  };

  const addSlide = () => {
    const newSlide: SlideData = {
      id: Date.now(),
      title: 'Nouveau slide',
      subtitle: '',
      content: '',
      highlight: ''
    };
    setSlides(prev => [...prev, newSlide]);
    setCurrentSlide(slides.length);
  };

  const removeSlide = () => {
    if (slides.length <= 2) {
      toast({ title: 'Minimum 2 slides requis', variant: 'destructive' });
      return;
    }
    setSlides(prev => prev.filter((_, idx) => idx !== currentSlide));
    setCurrentSlide(prev => Math.max(0, prev - 1));
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const blob = await pdf(<CarouselPDF slides={slides} startTheme={startTheme} />).toBlob();
      saveAs(blob, `carousel-iarche-${templateId}-${Date.now()}.pdf`);
      toast({ title: 'PDF exporté avec succès' });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: 'Erreur lors de l\'export', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const loadFromArticle = async (articleId: string) => {
    const { data } = await supabase
      .from('articles')
      .select('title, excerpt, content')
      .eq('id', articleId)
      .single();
    
    if (data) {
      // Parse content to extract key points (simplified)
      const contentText = data.content.replace(/<[^>]*>/g, ' ').substring(0, 500);
      setSlides([
        { id: 1, title: data.title, subtitle: 'Article IArche', content: '', highlight: '' },
        { id: 2, title: 'En bref', subtitle: '', content: data.excerpt || '', highlight: '' },
        { id: 3, title: 'Points clés', subtitle: '', content: contentText.substring(0, 150) + '...', highlight: '' },
        { id: 4, title: 'Lire l\'article', subtitle: '', content: '', highlight: 'iarche.fr/articles' },
      ]);
      toast({ title: 'Article chargé' });
    }
  };

  const current = slides[currentSlide];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Carrousel : {config.name}</h1>
              <p className="text-sm text-muted-foreground">Format LinkedIn 1080×1350px</p>
            </div>
          </div>
          <Button onClick={handleExportPDF} disabled={isExporting}>
            {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Télécharger PDF
          </Button>
        </div>

        {/* Source selector and theme selector */}
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Label>Mode :</Label>
            <Select value={sourceMode} onValueChange={(v) => setSourceMode(v as 'libre' | 'article')}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="libre">Création libre</SelectItem>
                <SelectItem value="article">Depuis un article</SelectItem>
              </SelectContent>
            </Select>
            {sourceMode === 'article' && (
              <Select value={selectedArticle} onValueChange={(v) => { setSelectedArticle(v); loadFromArticle(v); }}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Sélectionner un article" />
                </SelectTrigger>
                <SelectContent>
                  {articles.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          {/* Theme selector */}
          <div className="flex items-center gap-3">
            <Label>Thème de départ :</Label>
            <RadioGroup 
              value={startTheme} 
              onValueChange={(v) => setStartTheme(v as 'dark' | 'light')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dark" id="dark" />
                <Label htmlFor="dark" className="flex items-center gap-2 cursor-pointer">
                  <div className="w-5 h-5 rounded border" style={{ backgroundColor: '#1A2B4A' }} />
                  <span className="text-sm">Bleu Nuit</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="light" id="light" />
                <Label htmlFor="light" className="flex items-center gap-2 cursor-pointer">
                  <div className="w-5 h-5 rounded border" style={{ backgroundColor: '#FAF9F7' }} />
                  <span className="text-sm">Blanc Cassé</span>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Aperçu</h3>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                  disabled={currentSlide === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">{currentSlide + 1} / {slides.length}</span>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
                  disabled={currentSlide === slides.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Slide preview */}
            <Card className="overflow-hidden">
              <div 
                className="aspect-[4/5] p-8 flex flex-col justify-between"
                style={{
                  background: 'linear-gradient(135deg, hsl(218, 47%, 20%) 0%, hsl(218, 47%, 15%) 100%)'
                }}
              >
                {/* Logo */}
                <div className="text-center">
                  <span 
                    className="text-2xl font-bold"
                    style={{
                      background: 'linear-gradient(270deg, hsl(218, 47%, 20%), hsl(12, 60%, 53%), hsl(218, 47%, 35%), hsl(12, 60%, 53%))',
                      backgroundSize: '600% 600%',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}
                  >
                    IArche
                  </span>
                  <div className="w-12 h-0.5 mx-auto mt-1 bg-gradient-to-r from-primary to-accent" />
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-center text-center space-y-4">
                  {current?.subtitle && (
                    <p className="text-sm uppercase tracking-wider text-white/60">{current.subtitle}</p>
                  )}
                  {current?.title && (
                    <h2 className="text-2xl font-bold text-white">{current.title}</h2>
                  )}
                  {current?.content && (
                    <p className="text-white/80 text-sm leading-relaxed">{current.content}</p>
                  )}
                  {current?.highlight && (
                    <p 
                      className="text-3xl font-bold mt-4"
                      style={{ color: 'hsl(12, 60%, 53%)' }}
                    >
                      {current.highlight}
                    </p>
                  )}
                </div>

                {/* Footer */}
                <div className="text-center">
                  <p className="text-xs text-white/40">iarche.fr</p>
                </div>
              </div>
            </Card>

            {/* Slide thumbnails */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {slides.map((slide, idx) => (
                <button
                  key={slide.id}
                  onClick={() => setCurrentSlide(idx)}
                  className={`flex-shrink-0 w-16 h-20 rounded border-2 transition-all ${
                    idx === currentSlide ? 'border-primary' : 'border-border hover:border-primary/50'
                  }`}
                  style={{
                    background: 'linear-gradient(135deg, hsl(218, 47%, 20%) 0%, hsl(218, 47%, 15%) 100%)'
                  }}
                >
                  <span className="text-xs text-white/60">{idx + 1}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Édition - Slide {currentSlide + 1}</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={addSlide}>
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter
                </Button>
                <Button variant="outline" size="sm" onClick={removeSlide}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Supprimer
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label>Sous-titre (optionnel)</Label>
                  <Input 
                    value={current?.subtitle || ''} 
                    onChange={(e) => handleSlideChange('subtitle', e.target.value)}
                    placeholder="Ex: Article IArche"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Titre principal</Label>
                  <Input 
                    value={current?.title || ''} 
                    onChange={(e) => handleSlideChange('title', e.target.value)}
                    placeholder="Titre du slide"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contenu</Label>
                  <Textarea 
                    value={current?.content || ''} 
                    onChange={(e) => handleSlideChange('content', e.target.value)}
                    placeholder="Texte du slide..."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mise en avant (chiffre, CTA...)</Label>
                  <Input 
                    value={current?.highlight || ''} 
                    onChange={(e) => handleSlideChange('highlight', e.target.value)}
                    placeholder="Ex: +200% ou iarche.fr"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
