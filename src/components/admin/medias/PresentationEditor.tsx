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
import { ArrowLeft, Download, Plus, Trash2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PresentationPDF } from './templates/PresentationPDF';

interface PresentationEditorProps {
  templateId: string;
  onBack: () => void;
}

interface SlideData {
  id: number;
  type: 'title' | 'content' | 'bullets' | 'cta';
  title: string;
  subtitle: string;
  content: string;
  bullets: string[];
}

const templateConfigs: Record<string, { name: string; defaultSlides: SlideData[] }> = {
  pitch: {
    name: 'Pitch Commercial',
    defaultSlides: [
      { id: 1, type: 'title', title: 'IArche', subtitle: 'L\'IA se construit avec vous', content: '', bullets: [] },
      { id: 2, type: 'content', title: 'Qui sommes-nous ?', subtitle: '', content: 'IArche est une agence IA installée à Bayonne. On accompagne les dirigeants de PME dans l\'intégration concrète de l\'intelligence artificielle.', bullets: [] },
      { id: 3, type: 'bullets', title: 'Nos services', subtitle: '', content: '', bullets: ['Audit IA', 'Développement sur-mesure', 'Formation', 'Conformité RGPD'] },
      { id: 4, type: 'bullets', title: 'Nos solutions', subtitle: '', content: '', bullets: ['Collaboria', 'Datalia', 'Team 5 Connect', 'Lexia', 'Dialogue Plus'] },
      { id: 5, type: 'content', title: 'Notre méthodologie', subtitle: '', content: 'Une approche pragmatique centrée sur vos besoins réels et votre ROI.', bullets: [] },
      { id: 6, type: 'bullets', title: 'Pourquoi IArche ?', subtitle: '', content: '', bullets: ['Expertise IA reconnue', 'Proximité & engagement local', 'Solutions éprouvées', 'Accompagnement sur-mesure'] },
      { id: 7, type: 'content', title: 'Ils nous font confiance', subtitle: '', content: 'PME, ETI et grands groupes nous accompagnent dans leur transformation IA.', bullets: [] },
      { id: 8, type: 'cta', title: 'Prêt à démarrer ?', subtitle: 'Prenez rendez-vous', content: 'cal.com/iarche/audit-conseil', bullets: [] },
    ]
  },
  project: {
    name: 'Présentation Projet',
    defaultSlides: [
      { id: 1, type: 'title', title: '', subtitle: 'Proposition de projet', content: '', bullets: [] },
      { id: 2, type: 'content', title: 'Contexte', subtitle: '', content: 'Décrivez le contexte du projet...', bullets: [] },
      { id: 3, type: 'bullets', title: 'Vos enjeux', subtitle: '', content: '', bullets: ['Enjeu 1', 'Enjeu 2', 'Enjeu 3'] },
      { id: 4, type: 'content', title: 'Notre solution', subtitle: '', content: 'Présentez la solution proposée...', bullets: [] },
      { id: 5, type: 'bullets', title: 'Fonctionnalités clés', subtitle: '', content: '', bullets: ['Fonctionnalité 1', 'Fonctionnalité 2', 'Fonctionnalité 3'] },
      { id: 6, type: 'content', title: 'Planning', subtitle: '', content: 'Détaillez les phases du projet...', bullets: [] },
      { id: 7, type: 'content', title: 'Budget', subtitle: '', content: 'À partir de X €', bullets: [] },
      { id: 8, type: 'cta', title: 'Prochaines étapes', subtitle: '', content: 'Contactez-nous pour démarrer', bullets: [] },
    ]
  },
  report: {
    name: 'Rapport / Bilan',
    defaultSlides: [
      { id: 1, type: 'title', title: 'Rapport d\'activité', subtitle: '', content: '', bullets: [] },
      { id: 2, type: 'content', title: 'Synthèse', subtitle: '', content: 'Résumé exécutif...', bullets: [] },
      { id: 3, type: 'bullets', title: 'Réalisations', subtitle: '', content: '', bullets: ['Réalisation 1', 'Réalisation 2', 'Réalisation 3'] },
      { id: 4, type: 'content', title: 'Résultats', subtitle: '', content: 'Détaillez les résultats obtenus...', bullets: [] },
      { id: 5, type: 'bullets', title: 'Prochaines étapes', subtitle: '', content: '', bullets: ['Action 1', 'Action 2', 'Action 3'] },
      { id: 6, type: 'cta', title: 'Questions ?', subtitle: '', content: 'contact@iarche.fr', bullets: [] },
    ]
  }
};

export const PresentationEditor = ({ templateId, onBack }: PresentationEditorProps) => {
  const { toast } = useToast();
  const config = templateConfigs[templateId] || templateConfigs.pitch;
  
  const [slides, setSlides] = useState<SlideData[]>(config.defaultSlides);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [sourceMode, setSourceMode] = useState<'libre' | 'solution'>('libre');
  const [solutions, setSolutions] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    const fetchSolutions = async () => {
      const { data } = await supabase
        .from('articles')
        .select('id, title')
        .eq('resource_type', 'solution')
        .eq('published', true);
      if (data) setSolutions(data);
    };
    fetchSolutions();
  }, []);

  const handleSlideChange = (field: keyof SlideData, value: any) => {
    setSlides(prev => prev.map((slide, idx) => 
      idx === currentSlide ? { ...slide, [field]: value } : slide
    ));
  };

  const handleBulletChange = (index: number, value: string) => {
    const current = slides[currentSlide];
    const newBullets = [...current.bullets];
    newBullets[index] = value;
    handleSlideChange('bullets', newBullets);
  };

  const addBullet = () => {
    const current = slides[currentSlide];
    handleSlideChange('bullets', [...current.bullets, 'Nouveau point']);
  };

  const removeBullet = (index: number) => {
    const current = slides[currentSlide];
    handleSlideChange('bullets', current.bullets.filter((_, i) => i !== index));
  };

  const addSlide = () => {
    const newSlide: SlideData = {
      id: Date.now(),
      type: 'content',
      title: 'Nouveau slide',
      subtitle: '',
      content: '',
      bullets: []
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
      const blob = await pdf(<PresentationPDF slides={slides} />).toBlob();
      saveAs(blob, `presentation-iarche-${templateId}-${Date.now()}.pdf`);
      toast({ title: 'PDF exporté avec succès' });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: 'Erreur lors de l\'export', variant: 'destructive' });
    } finally {
      setIsExporting(false);
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
              <h1 className="text-xl font-bold">Présentation : {config.name}</h1>
              <p className="text-sm text-muted-foreground">Format 1920×1080px</p>
            </div>
          </div>
          <Button onClick={handleExportPDF} disabled={isExporting}>
            {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Télécharger PDF
          </Button>
        </div>

        {/* Source mode */}
        <div className="flex items-center gap-4">
          <Label>Mode :</Label>
          <Select value={sourceMode} onValueChange={(v) => setSourceMode(v as 'libre' | 'solution')}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="libre">Création libre</SelectItem>
              <SelectItem value="solution">Depuis une solution</SelectItem>
            </SelectContent>
          </Select>
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
            
            <Card className="overflow-hidden">
              <div 
                className="aspect-video p-8 flex flex-col"
                style={{
                  background: current?.type === 'title' 
                    ? 'linear-gradient(135deg, hsl(218, 47%, 20%) 0%, hsl(218, 47%, 15%) 100%)'
                    : 'hsl(40, 20%, 97%)'
                }}
              >
                {/* Header bar */}
                <div className="flex items-center justify-between mb-6">
                  <span 
                    className="text-lg font-bold"
                    style={{
                      background: 'linear-gradient(270deg, hsl(218, 47%, 20%), hsl(12, 60%, 53%))',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}
                  >
                    IArche
                  </span>
                  <div className="w-16 h-0.5 bg-gradient-to-r from-primary to-accent" />
                </div>

                {/* Content */}
                <div className={`flex-1 flex flex-col ${current?.type === 'title' ? 'justify-center items-center text-center' : 'justify-start'}`}>
                  {current?.subtitle && (
                    <p className={`text-xs uppercase tracking-wider mb-2 ${current?.type === 'title' ? 'text-white/60' : 'text-muted-foreground'}`}>
                      {current.subtitle}
                    </p>
                  )}
                  <h2 className={`text-xl font-bold mb-4 ${current?.type === 'title' ? 'text-white' : 'text-foreground'}`}>
                    {current?.title}
                  </h2>
                  {current?.content && (
                    <p className={`text-sm leading-relaxed ${current?.type === 'title' ? 'text-white/80' : 'text-muted-foreground'}`}>
                      {current.content}
                    </p>
                  )}
                  {current?.bullets && current.bullets.length > 0 && (
                    <ul className="space-y-2 mt-4">
                      {current.bullets.map((bullet, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <span style={{ color: 'hsl(12, 60%, 53%)' }}>●</span>
                          <span className={current?.type === 'title' ? 'text-white/80' : 'text-muted-foreground'}>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </Card>

            {/* Thumbnails */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {slides.map((slide, idx) => (
                <button
                  key={slide.id}
                  onClick={() => setCurrentSlide(idx)}
                  className={`flex-shrink-0 w-24 h-14 rounded border-2 transition-all flex items-center justify-center ${
                    idx === currentSlide ? 'border-primary' : 'border-border hover:border-primary/50'
                  }`}
                  style={{
                    background: slide.type === 'title' 
                      ? 'linear-gradient(135deg, hsl(218, 47%, 20%) 0%, hsl(218, 47%, 15%) 100%)'
                      : 'hsl(40, 20%, 97%)'
                  }}
                >
                  <span className={`text-xs ${slide.type === 'title' ? 'text-white/60' : 'text-muted-foreground'}`}>{idx + 1}</span>
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
                  <Label>Type de slide</Label>
                  <Select value={current?.type} onValueChange={(v) => handleSlideChange('type', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="title">Titre (fond sombre)</SelectItem>
                      <SelectItem value="content">Contenu</SelectItem>
                      <SelectItem value="bullets">Liste à puces</SelectItem>
                      <SelectItem value="cta">Call-to-action</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sous-titre (optionnel)</Label>
                  <Input 
                    value={current?.subtitle || ''} 
                    onChange={(e) => handleSlideChange('subtitle', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Titre</Label>
                  <Input 
                    value={current?.title || ''} 
                    onChange={(e) => handleSlideChange('title', e.target.value)}
                  />
                </div>
                {(current?.type === 'content' || current?.type === 'cta' || current?.type === 'title') && (
                  <div className="space-y-2">
                    <Label>Contenu</Label>
                    <Textarea 
                      value={current?.content || ''} 
                      onChange={(e) => handleSlideChange('content', e.target.value)}
                      rows={4}
                    />
                  </div>
                )}
                {current?.type === 'bullets' && (
                  <div className="space-y-2">
                    <Label>Points</Label>
                    {current.bullets.map((bullet, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input 
                          value={bullet} 
                          onChange={(e) => handleBulletChange(idx, e.target.value)}
                        />
                        <Button variant="ghost" size="icon" onClick={() => removeBullet(idx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addBullet}>
                      <Plus className="h-4 w-4 mr-1" />
                      Ajouter un point
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
