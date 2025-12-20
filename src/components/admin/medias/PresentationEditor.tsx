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
import { PresentationPDF, ExportMode, BarSize } from './templates/PresentationPDF';
import { ExportModeControls } from './ExportModeControls';
import { HTMLLogoArc } from './html/HTMLLogoArc';

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
  exportMode?: ExportMode;
  barSize?: BarSize;
}

// Presets pré-remplis uniformisés (comme Post/Story/Banner)
type PresetTemplate = {
  id: string;
  label: string;
  category: 'annonce' | 'chiffre' | 'temoignage' | 'conseil' | 'question' | 'services';
  slides: Partial<SlideData>[];
};

const PRESET_TEMPLATES: PresetTemplate[] = [
  // ========== 4 SERVICES ==========
  { id: 'services-iarche', label: '4 Services IArche', category: 'services', slides: [
    { type: 'title', title: 'Nos Services', subtitle: 'L\'IA au service de votre entreprise' },
    { type: 'content', title: 'Audit & Conseil', content: 'Diagnostic complet de votre maturité IA et stratégie personnalisée' },
    { type: 'content', title: 'Développement', content: 'Solutions IA sur mesure : chatbots, automatisation, RAG' },
    { type: 'content', title: 'Accompagnement', content: 'Formation, conduite du changement et autonomisation de vos équipes' },
    { type: 'content', title: 'Conformité', content: 'RGPD, gouvernance des données et IA responsable' },
    { type: 'cta', title: 'Passez à l\'action', content: 'iarche.fr/contact' },
  ]},
  // ========== ANNONCE ==========
  { id: 'nouveaute', label: 'Nouveauté', category: 'annonce', slides: [
    { type: 'title', title: 'Nouveauté', subtitle: 'IArche présente' },
    { type: 'content', title: 'Découvrez notre nouvelle solution', content: 'Une innovation pour simplifier votre quotidien.' },
    { type: 'bullets', title: 'Les bénéfices', bullets: ['Gain de temps', 'Automatisation', 'ROI mesurable'] },
    { type: 'cta', title: 'En savoir plus', content: 'iarche.fr' },
  ]},
  { id: 'evenement', label: 'Événement', category: 'annonce', slides: [
    { type: 'title', title: 'Événement', subtitle: 'Save the date' },
    { type: 'content', title: 'Webinaire IA & PME', content: 'Rejoignez-nous pour découvrir comment l\'IA transforme les entreprises.' },
    { type: 'bullets', title: 'Au programme', bullets: ['Démonstrations', 'Cas pratiques', 'Q&A'] },
    { type: 'cta', title: 'S\'inscrire', content: 'iarche.fr/webinaire' },
  ]},
  { id: 'lancement', label: 'Lancement produit', category: 'annonce', slides: [
    { type: 'title', title: 'Nouveau', subtitle: 'Coming soon' },
    { type: 'content', title: 'Découvrez [Nom du produit]', content: 'Présentation de la solution.' },
    { type: 'bullets', title: 'Pourquoi ?', bullets: ['Bénéfice 1', 'Bénéfice 2', 'Bénéfice 3'] },
    { type: 'cta', title: 'Disponible maintenant', content: 'iarche.fr' },
  ]},
  // ========== CHIFFRE ==========
  { id: 'statistiques', label: 'Statistiques', category: 'chiffre', slides: [
    { type: 'title', title: 'Les chiffres qui comptent', subtitle: 'IArche en quelques données' },
    { type: 'content', title: '73%', content: 'des entreprises constatent un ROI positif' },
    { type: 'content', title: '+200%', content: 'de productivité en moyenne' },
    { type: 'cta', title: 'Source : Étude IArche 2024', content: 'iarche.fr' },
  ]},
  { id: 'milestone', label: 'Milestone', category: 'chiffre', slides: [
    { type: 'title', title: 'Cap franchi', subtitle: 'Merci à vous' },
    { type: 'content', title: '100', content: 'entreprises accompagnées' },
    { type: 'content', title: 'Et ce n\'est que le début', content: 'Objectif 2025 : 200 PME.' },
    { type: 'cta', title: 'Rejoignez-nous', content: 'iarche.fr' },
  ]},
  // ========== TÉMOIGNAGE ==========
  { id: 'temoignage-client', label: 'Témoignage client', category: 'temoignage', slides: [
    { type: 'title', title: 'Success Story', subtitle: 'Ils nous font confiance' },
    { type: 'content', title: '"Grâce à IArche, nous avons automatisé 40% de nos tâches."', content: 'Jean-Pierre Martin, DG Groupe ABC' },
    { type: 'bullets', title: 'Résultats', bullets: ['+200% productivité', '-40% tâches admin', 'ROI en 6 mois'] },
    { type: 'cta', title: 'Votre tour ?', content: 'iarche.fr/contact' },
  ]},
  { id: 'cas-client', label: 'Cas client', category: 'temoignage', slides: [
    { type: 'title', title: 'Cas Client', subtitle: 'Découvrez leur transformation' },
    { type: 'content', title: 'Le contexte', content: 'PME de 50 salariés, secteur industriel.' },
    { type: 'content', title: 'La solution', content: 'Chatbot RAG + automatisation.' },
    { type: 'bullets', title: 'Les résultats', bullets: ['-40% admin', 'Satisfaction client +30%', 'ROI 6 mois'] },
  ]},
  // ========== CONSEIL ==========
  { id: 'conseil-tip', label: 'Conseil / Tip', category: 'conseil', slides: [
    { type: 'title', title: 'Conseil #1', subtitle: 'Astuce IA' },
    { type: 'content', title: 'Commencez petit', content: 'Identifiez un cas d\'usage simple et mesurez les résultats.' },
    { type: 'content', title: 'Pourquoi ?', content: 'Cela permet de valider le ROI avant de généraliser.' },
    { type: 'cta', title: 'Besoin d\'aide ?', content: 'iarche.fr/audit' },
  ]},
  { id: 'bonnes-pratiques', label: 'Bonnes pratiques', category: 'conseil', slides: [
    { type: 'title', title: '3 bonnes pratiques', subtitle: 'Pour réussir votre projet IA' },
    { type: 'bullets', title: 'Nos recommandations', bullets: ['#1 Impliquez vos équipes', '#2 Mesurez tout', '#3 Itérez'] },
    { type: 'content', title: 'Clé du succès', content: 'L\'adoption est plus importante que la technologie.' },
    { type: 'cta', title: 'Accompagnement', content: 'iarche.fr' },
  ]},
  // ========== QUESTION ==========
  { id: 'question-sondage', label: 'Question / Sondage', category: 'question', slides: [
    { type: 'title', title: '?', subtitle: 'Votre avis nous intéresse' },
    { type: 'content', title: 'L\'IA va-t-elle remplacer votre métier ?', content: 'Partagez votre opinion.' },
    { type: 'content', title: 'Notre vision', content: 'L\'IA augmente, elle ne remplace pas.' },
    { type: 'cta', title: 'Débattons ensemble', content: 'Commentez !' },
  ]},
  { id: 'quiz', label: 'Quiz / Devinette', category: 'question', slides: [
    { type: 'title', title: 'Quiz IA', subtitle: 'Testez vos connaissances' },
    { type: 'content', title: 'Question', content: 'Quel % des PME utilisent déjà l\'IA ?' },
    { type: 'content', title: '35%', content: 'Et vous, en faites-vous partie ?' },
    { type: 'cta', title: 'Passez à l\'action', content: 'iarche.fr/audit' },
  ]},
];

const templateConfigs: Record<string, { name: string; defaultSlides: SlideData[] }> = {
  pitch: {
    name: 'Pitch Commercial',
    defaultSlides: [
      { id: 1, type: 'title', title: 'IArche', subtitle: 'L\'IA se construit avec vous', content: '', bullets: [], exportMode: 'full', barSize: 'lg' },
      { id: 2, type: 'content', title: 'Qui sommes-nous ?', subtitle: '', content: 'IArche est une agence IA installée à Bayonne. On accompagne les dirigeants de PME dans l\'intégration concrète de l\'intelligence artificielle.', bullets: [], exportMode: 'full', barSize: 'lg' },
      { id: 3, type: 'bullets', title: 'Nos services', subtitle: '', content: '', bullets: ['Audit IA', 'Développement sur-mesure', 'Formation', 'Conformité RGPD'], exportMode: 'full', barSize: 'lg' },
      { id: 4, type: 'bullets', title: 'Nos solutions', subtitle: '', content: '', bullets: ['Collaboria', 'Datalia', 'Team 5 Connect', 'Lexia', 'Dialogue Plus'], exportMode: 'full', barSize: 'lg' },
      { id: 5, type: 'content', title: 'Notre méthodologie', subtitle: '', content: 'Une approche pragmatique centrée sur vos besoins réels et votre ROI.', bullets: [], exportMode: 'full', barSize: 'lg' },
      { id: 6, type: 'bullets', title: 'Pourquoi IArche ?', subtitle: '', content: '', bullets: ['Expertise IA reconnue', 'Proximité & engagement local', 'Solutions éprouvées', 'Accompagnement sur-mesure'], exportMode: 'full', barSize: 'lg' },
      { id: 7, type: 'content', title: 'Ils nous font confiance', subtitle: '', content: 'PME, ETI et grands groupes nous accompagnent dans leur transformation IA.', bullets: [], exportMode: 'full', barSize: 'lg' },
      { id: 8, type: 'cta', title: 'Prêt à démarrer ?', subtitle: 'Prenez rendez-vous', content: 'iarche.fr/rendez-vous', bullets: [], exportMode: 'full', barSize: 'lg' },
    ]
  },
  project: {
    name: 'Présentation Projet',
    defaultSlides: [
      { id: 1, type: 'title', title: '', subtitle: 'Proposition de projet', content: '', bullets: [], exportMode: 'full', barSize: 'lg' },
      { id: 2, type: 'content', title: 'Contexte', subtitle: '', content: 'Décrivez le contexte du projet...', bullets: [], exportMode: 'full', barSize: 'lg' },
      { id: 3, type: 'bullets', title: 'Vos enjeux', subtitle: '', content: '', bullets: ['Enjeu 1', 'Enjeu 2', 'Enjeu 3'], exportMode: 'full', barSize: 'lg' },
      { id: 4, type: 'content', title: 'Notre solution', subtitle: '', content: 'Présentez la solution proposée...', bullets: [], exportMode: 'full', barSize: 'lg' },
      { id: 5, type: 'bullets', title: 'Fonctionnalités clés', subtitle: '', content: '', bullets: ['Fonctionnalité 1', 'Fonctionnalité 2', 'Fonctionnalité 3'], exportMode: 'full', barSize: 'lg' },
      { id: 6, type: 'content', title: 'Planning', subtitle: '', content: 'Détaillez les phases du projet...', bullets: [], exportMode: 'full', barSize: 'lg' },
      { id: 7, type: 'content', title: 'Budget', subtitle: '', content: 'À partir de X €', bullets: [], exportMode: 'full', barSize: 'lg' },
      { id: 8, type: 'cta', title: 'Prochaines étapes', subtitle: '', content: 'Contactez-nous pour démarrer', bullets: [], exportMode: 'full', barSize: 'lg' },
    ]
  },
  report: {
    name: 'Rapport / Bilan',
    defaultSlides: [
      { id: 1, type: 'title', title: 'Rapport d\'activité', subtitle: '', content: '', bullets: [], exportMode: 'full', barSize: 'lg' },
      { id: 2, type: 'content', title: 'Synthèse', subtitle: '', content: 'Résumé exécutif...', bullets: [], exportMode: 'full', barSize: 'lg' },
      { id: 3, type: 'bullets', title: 'Réalisations', subtitle: '', content: '', bullets: ['Réalisation 1', 'Réalisation 2', 'Réalisation 3'], exportMode: 'full', barSize: 'lg' },
      { id: 4, type: 'content', title: 'Résultats', subtitle: '', content: 'Détaillez les résultats obtenus...', bullets: [], exportMode: 'full', barSize: 'lg' },
      { id: 5, type: 'bullets', title: 'Prochaines étapes', subtitle: '', content: '', bullets: ['Action 1', 'Action 2', 'Action 3'], exportMode: 'full', barSize: 'lg' },
      { id: 6, type: 'cta', title: 'Questions ?', subtitle: '', content: 'contact@iarche.fr', bullets: [], exportMode: 'full', barSize: 'lg' },
    ]
  }
};

export const PresentationEditor = ({ templateId, onBack }: PresentationEditorProps) => {
  const { toast } = useToast();
  const config = templateConfigs[templateId] || templateConfigs.pitch;
  
  const [slides, setSlides] = useState<SlideData[]>(config.defaultSlides);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [sourceMode, setSourceMode] = useState<'libre' | 'solution' | 'preset'>('libre');
  const [solutions, setSolutions] = useState<{ id: string; title: string }[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [startTheme, setStartTheme] = useState<'dark' | 'light' | 'terra' | 'contrast'>('dark');

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

  // Appliquer un preset pré-rempli
  const applyPreset = (presetId: string) => {
    const preset = PRESET_TEMPLATES.find(p => p.id === presetId);
    if (!preset) return;
    
    const newSlides: SlideData[] = preset.slides.map((slide, idx) => ({
      id: Date.now() + idx,
      type: slide.type || 'content',
      title: slide.title || '',
      subtitle: slide.subtitle || '',
      content: slide.content || '',
      bullets: slide.bullets || [],
      exportMode: 'full' as ExportMode,
      barSize: 'lg' as BarSize,
    }));
    
    setSlides(newSlides);
    setCurrentSlide(0);
    setSelectedPreset(presetId);
    toast({ title: `Preset "${preset.label}" appliqué` });
  };

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
      bullets: [],
      exportMode: 'full',
      barSize: 'lg'
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
      const blob = await pdf(<PresentationPDF slides={slides} startTheme={startTheme} />).toBlob();
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
  const currentExportMode = current?.exportMode || 'full';
  const currentBarSize = current?.barSize || 'lg';
  
  // Preview: determine if bar/canalisations should show based on current slide's export mode
  const showBarInPreview = currentExportMode === 'with-bar' || currentExportMode === 'full';
  const showCanalisationsInPreview = currentExportMode === 'full';

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

        {/* Source mode and theme selector */}
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Label>Mode :</Label>
            <Select value={sourceMode} onValueChange={(v) => setSourceMode(v as 'libre' | 'solution' | 'preset')}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="libre">Création libre</SelectItem>
                <SelectItem value="preset">Preset pré-rempli</SelectItem>
                <SelectItem value="solution">Depuis une solution</SelectItem>
              </SelectContent>
            </Select>
            {sourceMode === 'preset' && (
              <Select value={selectedPreset} onValueChange={(v) => applyPreset(v)}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Choisir un preset..." />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">4 Services</div>
                  {PRESET_TEMPLATES.filter(p => p.category === 'services').map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                  ))}
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Annonce</div>
                  {PRESET_TEMPLATES.filter(p => p.category === 'annonce').map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                  ))}
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Chiffre</div>
                  {PRESET_TEMPLATES.filter(p => p.category === 'chiffre').map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                  ))}
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Témoignage</div>
                  {PRESET_TEMPLATES.filter(p => p.category === 'temoignage').map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                  ))}
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Conseil</div>
                  {PRESET_TEMPLATES.filter(p => p.category === 'conseil').map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                  ))}
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Question</div>
                  {PRESET_TEMPLATES.filter(p => p.category === 'question').map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
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
              onValueChange={(v) => setStartTheme(v as 'dark' | 'light' | 'terra' | 'contrast')}
              className="flex flex-wrap gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dark" id="pres-dark" />
                <Label htmlFor="pres-dark" className="flex items-center gap-2 cursor-pointer">
                  <div className="w-5 h-5 rounded border" style={{ backgroundColor: '#1A2B4A' }} />
                  <span className="text-sm">Bleu Nuit</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="light" id="pres-light" />
                <Label htmlFor="pres-light" className="flex items-center gap-2 cursor-pointer">
                  <div className="w-5 h-5 rounded border" style={{ backgroundColor: '#FAF9F7' }} />
                  <span className="text-sm">Blanc Cassé</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="terra" id="pres-terra" />
                <Label htmlFor="pres-terra" className="flex items-center gap-2 cursor-pointer">
                  <div className="w-5 h-5 rounded border" style={{ backgroundColor: '#8B3A2F' }} />
                  <span className="text-sm">Terra Nova</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="contrast" id="pres-contrast" />
                <Label htmlFor="pres-contrast" className="flex items-center gap-2 cursor-pointer">
                  <div className="w-5 h-5 rounded border" style={{ backgroundColor: '#0A0A0A' }} />
                  <span className="text-sm">Contraste</span>
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
            
            <Card className="overflow-hidden">
              {(() => {
                // Theme configuration for preview - v4.1 DA compliant
                // Règle 2: subtext = #FAF9F7 opaque (pas de rgba < 0.88)
                const PREVIEW_THEMES = {
                  dark: { bg: '#1A2B4A', text: '#FAF9F7', subtext: '#FAF9F7', logo: '/logos/iarche-white.svg' },
                  light: { bg: '#FAF9F7', text: '#1A2B4A', subtext: '#666666', logo: '/logos/iarche-main.svg' },
                  terra: { bg: '#B04A32', text: '#FAF9F7', subtext: '#FAF9F7', logo: '/logos/iarche-white.svg' },
                  contrast: { bg: '#0A0A0A', text: '#FAFAFA', subtext: '#FAFAFA', logo: '/logos/iarche-white.svg' },
                };
                const THEME_ALT: Record<string, string> = { dark: 'light', light: 'dark', terra: 'dark', contrast: 'light' };
                
                const currentTheme = currentSlide % 2 === 0 ? startTheme : (THEME_ALT[startTheme] as typeof startTheme);
                const colors = PREVIEW_THEMES[currentTheme];
                const isDark = currentTheme !== 'light';
                
                return (
                  <div 
                    className="aspect-video flex flex-col relative"
                    style={{ background: colors.bg, padding: 40 }}  // v4.1: 80px safe zone scaled to preview
                  >
                    {/* Canalisations decoration preview - only if 'full' mode */}
                    {showCanalisationsInPreview && (
                      <>
                        <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none">
                          <svg viewBox="0 0 64 64" className="w-full h-full">
                            <path d="M0 0 L64 0 L64 64" fill="none" stroke={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(209,90,62,0.3)'} strokeWidth="2" />
                          </svg>
                        </div>
                        <div className="absolute bottom-0 left-0 w-16 h-16 pointer-events-none">
                          <svg viewBox="0 0 64 64" className="w-full h-full">
                            <path d="M0 0 L0 64 L64 64" fill="none" stroke={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(209,90,62,0.3)'} strokeWidth="2" />
                          </svg>
                        </div>
                      </>
                    )}

                    {/* Header with logo seul (v4.0: pas d'arc sous le logo) */}
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <img 
                          src={colors.logo}
                          alt="IArche"
                          style={{ height: 24, display: 'inline-block' }}
                        />
                      </div>
                    </div>

                    {/* Content */}
                    <div className={`flex-1 flex flex-col ${current?.type === 'title' ? 'justify-center items-center text-center' : 'justify-start'}`}>
                      {current?.subtitle && (
                        <p className="text-xs uppercase tracking-wider mb-2" style={{ color: colors.subtext, opacity: 0.88 }}>
                          {current.subtitle}
                        </p>
                      )}
                      <h2 className="text-xl font-bold mb-4" style={{ color: colors.text }}>
                        {current?.title}
                      </h2>
                      {/* v4.1: Arc sous le titre */}
                      {showBarInPreview && current?.title && (
                        <HTMLLogoArc size="sm" className="mb-4" />
                      )}
                      {current?.content && (
                        <p className="text-sm leading-relaxed" style={{ color: colors.text, opacity: 0.88 }}>
                          {current.content}
                        </p>
                      )}
                      {current?.bullets && current.bullets.length > 0 && (
                        <ul className="space-y-2 mt-4">
                          {current.bullets.map((bullet, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <span style={{ color: '#B04A32' }}>—</span>
                              <span style={{ color: colors.text, opacity: 0.88 }}>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })()}
            </Card>

            {/* Thumbnails with theme alternation */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {slides.map((slide, idx) => {
                const PREVIEW_THEMES = {
                  dark: { bg: '#1A2B4A' },
                  light: { bg: '#FAF9F7' },
                  terra: { bg: '#8B3A2F' },
                  contrast: { bg: '#0A0A0A' },
                };
                const THEME_ALT: Record<string, string> = { dark: 'light', light: 'dark', terra: 'dark', contrast: 'light' };
                const thumbTheme = idx % 2 === 0 ? startTheme : (THEME_ALT[startTheme] as typeof startTheme);
                const isDarkThumb = thumbTheme !== 'light';
                
                return (
                  <button
                    key={slide.id}
                    onClick={() => setCurrentSlide(idx)}
                    className={`flex-shrink-0 w-24 h-14 rounded border-2 transition-all flex items-center justify-center ${
                      idx === currentSlide ? 'border-primary' : 'border-border hover:border-primary/50'
                    }`}
                    style={{ background: PREVIEW_THEMES[thumbTheme].bg }}
                  >
                    <span className={`text-xs ${isDarkThumb ? 'text-white/60' : 'text-[#1A2B4A]/60'}`}>{idx + 1}</span>
                  </button>
                );
              })}
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
                {/* Export mode controls for current slide */}
                <div className="space-y-2">
                  <ExportModeControls
                    exportMode={currentExportMode}
                    onExportModeChange={(mode) => handleSlideChange('exportMode', mode)}
                    barSize={currentBarSize}
                    onBarSizeChange={(size) => handleSlideChange('barSize', size)}
                    showBarSizeSelector={currentExportMode !== 'simple'}
                    compact
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs"
                    onClick={() => {
                      setSlides(prev => prev.map(slide => ({
                        ...slide,
                        exportMode: currentExportMode,
                        barSize: currentBarSize
                      })));
                      toast({ title: 'Mode appliqué à tous les slides' });
                    }}
                  >
                    Appliquer à tous les slides
                  </Button>
                </div>

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
                    <div className="flex items-center justify-between">
                      <Label>Points clés</Label>
                      <Button variant="ghost" size="sm" onClick={addBullet}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
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