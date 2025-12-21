import { useState, useEffect, useCallback, useRef } from 'react';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, Download, Plus, Trash2, ChevronLeft, ChevronRight, Loader2, FileImage } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CarouselPDF, ExportMode, BarSize } from './templates/CarouselPDF';
import { ExportModeControls } from './ExportModeControls';
import { HTMLLogoArc } from './html/HTMLLogoArc';
import { VerticalAlignmentControls, VerticalAlignment, getJustifyContent } from './VerticalAlignmentControls';
import { CompositionPresets, CompositionPreset, COMPOSITION_PRESETS } from './CompositionPresets';
import { TopMarginSlider, getContentSpacing } from './TopMarginSlider';
import { DecorativeArcToggle } from './DecorativeArcToggle';
import SavedTemplatesPanel from './SavedTemplatesPanel';
import ExportActions from './ExportActions';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { getCTAColor, getCTAColorHex, getCTABadgeStyles, getCTABulletStyles } from './CTAText';
import { PDFComparisonView } from './PDFComparisonView';

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
  exportMode?: ExportMode;
  barSize?: BarSize;
  verticalAlignment?: VerticalAlignment;
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
    { title: 'Nos Services', subtitle: 'L\'IA au service de votre entreprise', content: '' },
    { title: 'Audit & Conseil', content: 'Diagnostic complet de votre maturité IA et stratégie personnalisée', highlight: '' },
    { title: 'Développement', content: 'Solutions IA sur mesure : chatbots, automatisation, RAG', highlight: '' },
    { title: 'Accompagnement', content: 'Formation, conduite du changement et autonomisation de vos équipes', highlight: '' },
    { title: 'Conformité', content: 'RGPD, gouvernance des données et IA responsable', highlight: '' },
    { title: 'Passez à l\'action', highlight: 'iarche.fr/contact', content: 'Prenez rendez-vous avec notre équipe' },
  ]},
  // ========== ANNONCE ==========
  { id: 'nouveaute', label: 'Nouveauté', category: 'annonce', slides: [
    { title: 'Nouveauté', subtitle: 'IArche présente', content: '' },
    { title: 'Découvrez notre nouvelle solution', content: 'Une innovation pour simplifier votre quotidien.' },
    { title: 'Les bénéfices', content: 'Gagnez du temps, automatisez vos tâches.' },
    { title: 'En savoir plus', highlight: 'iarche.fr' },
  ]},
  { id: 'evenement', label: 'Événement', category: 'annonce', slides: [
    { title: 'Événement', subtitle: 'Save the date' },
    { title: 'Webinaire IA & PME', content: 'Rejoignez-nous pour découvrir comment l\'IA transforme les entreprises.' },
    { title: 'Au programme', content: 'Démonstrations, cas pratiques, Q&A.' },
    { title: 'S\'inscrire', highlight: 'iarche.fr/webinaire' },
  ]},
  { id: 'lancement', label: 'Lancement produit', category: 'annonce', slides: [
    { title: 'Nouveau', subtitle: 'Coming soon' },
    { title: 'Découvrez [Nom du produit]', content: 'Présentation de la solution.' },
    { title: 'Pourquoi ?', content: 'Les bénéfices clés.' },
    { title: 'Disponible maintenant', highlight: 'iarche.fr' },
  ]},
  // ========== CHIFFRE ==========
  { id: 'statistiques', label: 'Statistiques', category: 'chiffre', slides: [
    { title: 'Les chiffres qui comptent', subtitle: 'IArche en quelques données' },
    { highlight: '73%', content: 'des entreprises constatent un ROI positif' },
    { highlight: '+200%', content: 'de productivité en moyenne' },
    { title: 'Source', content: 'Étude IArche 2024', highlight: 'iarche.fr' },
  ]},
  { id: 'milestone', label: 'Milestone', category: 'chiffre', slides: [
    { title: 'Cap franchi', subtitle: 'Merci à vous' },
    { highlight: '100', content: 'entreprises accompagnées' },
    { title: 'Et ce n\'est que le début', content: 'Objectif 2025 : 200 PME.' },
    { title: 'Rejoignez-nous', highlight: 'iarche.fr' },
  ]},
  // ========== TÉMOIGNAGE ==========
  { id: 'temoignage-client', label: 'Témoignage client', category: 'temoignage', slides: [
    { title: 'Success Story', subtitle: 'Ils nous font confiance' },
    { title: '"Grâce à IArche, nous avons automatisé 40% de nos tâches."', content: 'Jean-Pierre Martin, DG Groupe ABC' },
    { title: 'Résultats', content: '+200% de productivité en 6 mois' },
    { title: 'Votre tour ?', highlight: 'iarche.fr/contact' },
  ]},
  { id: 'cas-client', label: 'Cas client', category: 'temoignage', slides: [
    { title: 'Cas Client', subtitle: 'Découvrez leur transformation' },
    { title: 'Le contexte', content: 'PME de 50 salariés, secteur industriel.' },
    { title: 'La solution', content: 'Chatbot RAG + automatisation.' },
    { title: 'Les résultats', highlight: '-40% admin', content: 'et satisfaction client en hausse.' },
  ]},
  // ========== CONSEIL ==========
  { id: 'conseil-tip', label: 'Conseil / Tip', category: 'conseil', slides: [
    { title: 'Conseil #1', subtitle: 'Astuce IA' },
    { title: 'Commencez petit', content: 'Identifiez un cas d\'usage simple et mesurez les résultats.' },
    { title: 'Pourquoi ?', content: 'Cela permet de valider le ROI avant de généraliser.' },
    { title: 'Besoin d\'aide ?', highlight: 'iarche.fr/audit' },
  ]},
  { id: 'bonnes-pratiques', label: 'Bonnes pratiques', category: 'conseil', slides: [
    { title: '3 bonnes pratiques', subtitle: 'Pour réussir votre projet IA' },
    { title: '#1 Impliquez vos équipes', content: 'L\'adoption est clé.' },
    { title: '#2 Mesurez tout', content: 'Définissez vos KPIs dès le départ.' },
    { title: '#3 Itérez', content: 'Améliorez progressivement.', highlight: 'iarche.fr' },
  ]},
  // ========== QUESTION ==========
  { id: 'question-sondage', label: 'Question / Sondage', category: 'question', slides: [
    { title: '?', subtitle: 'Votre avis nous intéresse' },
    { title: 'L\'IA va-t-elle remplacer votre métier ?', content: 'Partagez votre opinion en commentaire.' },
    { title: 'Notre vision', content: 'L\'IA augmente, elle ne remplace pas.' },
    { title: 'Débattons ensemble', highlight: 'Commentez !' },
  ]},
  { id: 'quiz', label: 'Quiz / Devinette', category: 'question', slides: [
    { title: 'Quiz IA', subtitle: 'Testez vos connaissances' },
    { title: 'Question', content: 'Quel % des PME utilisent déjà l\'IA ?' },
    { highlight: '35%', content: 'Et vous, en faites-vous partie ?' },
    { title: 'Passez à l\'action', highlight: 'iarche.fr/audit' },
  ]},
];

const templateConfigs: Record<string, { name: string; defaultSlides: SlideData[] }> = {
  solution: {
    name: 'Annonce Solution',
    defaultSlides: [
      { id: 1, title: 'IArche présente', subtitle: '', content: '', highlight: '', exportMode: 'full', barSize: 'md' },
      { id: 2, title: 'Le problème', subtitle: '', content: 'Décrivez le problème que résout cette solution', highlight: '', exportMode: 'full', barSize: 'md' },
      { id: 3, title: 'Notre solution', subtitle: '', content: 'Présentez votre solution', highlight: '', exportMode: 'full', barSize: 'md' },
      { id: 4, title: 'Les bénéfices', subtitle: '', content: 'Listez les avantages clés', highlight: '', exportMode: 'full', barSize: 'md' },
      { id: 5, title: 'Passez à l\'action', subtitle: '', content: 'Call-to-action', highlight: 'iarche.fr', exportMode: 'full', barSize: 'md' },
    ]
  },
  article: {
    name: 'Partage Article',
    defaultSlides: [
      { id: 1, title: '', subtitle: 'Article IArche', content: '', highlight: '', exportMode: 'full', barSize: 'md' },
      { id: 2, title: 'Point clé 1', subtitle: '', content: '', highlight: '', exportMode: 'full', barSize: 'md' },
      { id: 3, title: 'Point clé 2', subtitle: '', content: '', highlight: '', exportMode: 'full', barSize: 'md' },
      { id: 4, title: 'Point clé 3', subtitle: '', content: '', highlight: '', exportMode: 'full', barSize: 'md' },
      { id: 5, title: 'En résumé', subtitle: '', content: '', highlight: '', exportMode: 'full', barSize: 'md' },
      { id: 6, title: 'Lire l\'article complet', subtitle: '', content: '', highlight: 'iarche.fr/articles', exportMode: 'full', barSize: 'md' },
    ]
  },
  stats: {
    name: 'Chiffres Clés',
    defaultSlides: [
      { id: 1, title: 'Les chiffres qui comptent', subtitle: 'IArche en quelques données', content: '', highlight: '', exportMode: 'full', barSize: 'md' },
      { id: 2, title: '', subtitle: '', content: '', highlight: '85%', exportMode: 'full', barSize: 'md' },
      { id: 3, title: '', subtitle: '', content: '', highlight: '+200%', exportMode: 'full', barSize: 'md' },
      { id: 4, title: 'Source & Contact', subtitle: '', content: '', highlight: 'iarche.fr', exportMode: 'full', barSize: 'md' },
    ]
  }
};

export const CarouselEditor = ({ templateId, onBack }: CarouselEditorProps) => {
  const { toast } = useToast();
  const config = templateConfigs[templateId] || templateConfigs.solution;
  const previewRef = useRef<HTMLDivElement>(null);
  
  const [slides, setSlides] = useState<SlideData[]>(config.defaultSlides);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [sourceMode, setSourceMode] = useState<'libre' | 'article' | 'preset'>('libre');
  const [articles, setArticles] = useState<{ id: string; title: string; slug: string }[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [startTheme, setStartTheme] = useState<'dark' | 'light' | 'terra' | 'contrast' | 'gradient'>('gradient');
  const [selectedCompositionPreset, setSelectedCompositionPreset] = useState<string>('centered');
  const [verticalAlignment, setVerticalAlignment] = useState<VerticalAlignment>('center');
  const [topMargin, setTopMargin] = useState<number>(0);
  const [showDecorativeArc, setShowDecorativeArc] = useState<boolean>(true);

  // Apply composition preset
  const applyCompositionPreset = (preset: CompositionPreset) => {
    setSelectedCompositionPreset(preset.id);
    setVerticalAlignment(preset.verticalAlignment);
    setTopMargin(preset.topMargin);
    // Apply to current slide
    handleSlideChange('verticalAlignment', preset.verticalAlignment);
  };

  // Get current data for saving template
  const getCurrentData = useCallback(() => ({
    slides, startTheme, sourceMode, selectedPreset,
    verticalAlignment, selectedCompositionPreset, topMargin, showDecorativeArc,
  }), [slides, startTheme, sourceMode, selectedPreset, verticalAlignment, selectedCompositionPreset, topMargin, showDecorativeArc]);

  // Load template data
  const loadTemplateData = useCallback((data: Record<string, unknown>) => {
    if (data.slides) setSlides(data.slides as SlideData[]);
    if (data.startTheme) setStartTheme(data.startTheme as 'dark' | 'light' | 'terra' | 'contrast' | 'gradient');
    if (data.sourceMode) setSourceMode(data.sourceMode as 'libre' | 'article' | 'preset');
    if (data.selectedPreset !== undefined) setSelectedPreset(data.selectedPreset as string);
    if (data.verticalAlignment !== undefined) setVerticalAlignment(data.verticalAlignment as VerticalAlignment);
    if (data.selectedCompositionPreset !== undefined) setSelectedCompositionPreset(data.selectedCompositionPreset as string);
    if (data.topMargin !== undefined) setTopMargin(data.topMargin as number);
    if (data.showDecorativeArc !== undefined) setShowDecorativeArc(data.showDecorativeArc as boolean);
    setCurrentSlide(0);
  }, []);

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

  // Appliquer un preset pré-rempli
  const applyPreset = (presetId: string) => {
    const preset = PRESET_TEMPLATES.find(p => p.id === presetId);
    if (!preset) return;
    
    const newSlides: SlideData[] = preset.slides.map((slide, idx) => ({
      id: Date.now() + idx,
      title: slide.title || '',
      subtitle: slide.subtitle || '',
      content: slide.content || '',
      highlight: slide.highlight || '',
      exportMode: 'full' as ExportMode,
      barSize: 'md' as BarSize,
    }));
    
    setSlides(newSlides);
    setCurrentSlide(0);
    setSelectedPreset(presetId);
    toast({ title: `Preset "${preset.label}" appliqué` });
  };

  const handleSlideChange = (field: keyof SlideData, value: string | ExportMode | BarSize) => {
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
      highlight: '',
      exportMode: 'full',
      barSize: 'md'
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
      const blob = await pdf(<CarouselPDF slides={slides} startTheme={startTheme} showDecorativeArc={showDecorativeArc} />).toBlob();
      saveAs(blob, `carousel-iarche-${templateId}-${Date.now()}.pdf`);
      toast({ title: 'PDF basique exporté' });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: 'Erreur lors de l\'export', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  // PDF Haute-Fidélité - Capture chaque slide avec dimensions fixes
  const handleExportPdfHd = async () => {
    setIsExporting(true);
    const originalSlide = currentSlide;
    
    try {
      // Format carousel: portrait 4:5 ratio - page personnalisée pour éviter barres blanches
      const captureWidth = 1080;
      const captureHeight = 1350;
      // Convertir pixels en mm (à 96 DPI) puis ajuster pour format imprimable
      // On utilise une taille de page qui correspond au ratio 4:5
      const pageWidth = 200; // mm (ratio 4:5 = 200:250)
      const pageHeight = 250; // mm
      
      const pdfDoc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pageWidth, pageHeight],
      });

      // Créer un container de capture hors-écran avec dimensions fixes
      const captureContainer = document.createElement('div');
      captureContainer.style.cssText = `
        position: fixed;
        left: -9999px;
        top: 0;
        width: ${captureWidth}px;
        height: ${captureHeight}px;
        z-index: -1;
        overflow: hidden;
      `;
      document.body.appendChild(captureContainer);

      const PREVIEW_THEMES = {
        dark: { bg: '#1A2B4A', text: '#FAF9F7', subtext: '#FAF9F7', logo: '/logos/iarche-white.svg' },
        light: { bg: '#FAF9F7', text: '#1A2B4A', subtext: '#666666', logo: '/logos/iarche-main.svg' },
        terra: { bg: '#B04A32', text: '#FAF9F7', subtext: '#FAF9F7', logo: '/logos/iarche-white.svg' },
        contrast: { bg: '#0A0A0A', text: '#FAFAFA', subtext: '#FAFAFA', logo: '/logos/iarche-white.svg' },
        gradient: { bg: 'linear-gradient(135deg, #1A2B4A 0%, #B04A32 100%)', text: '#FAF9F7', subtext: '#FAF9F7', logo: '/logos/iarche-white.svg' },
      };
      const THEME_ALT: Record<string, string> = { dark: 'light', light: 'dark', terra: 'dark', contrast: 'light', gradient: 'gradient' };

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        // v4.3: Mode gradient = 100% gradient (pas d'alternance)
        const slideTheme = startTheme === 'gradient' ? 'gradient' : (i % 2 === 0 ? startTheme : (THEME_ALT[startTheme] as typeof startTheme));
        const colors = PREVIEW_THEMES[slideTheme];
        const isDark = slideTheme !== 'light';
        // v4.2 Règle d'or: CTA en blanc cassé sur gradient
        const ctaColor = getCTAColorHex(slideTheme);
        const ctaBadge = getCTABadgeStyles(slideTheme, isDark);
        const slideExportMode = slide.exportMode || 'full';
        const showBar = slideExportMode === 'with-bar' || slideExportMode === 'full';
        const showCanalisations = slideExportMode === 'full';
        
        // Générer le HTML du slide avec dimensions fixes
        captureContainer.innerHTML = `
          <div style="
            width: ${captureWidth}px;
            height: ${captureHeight}px;
            display: flex;
            flex-direction: column;
            position: relative;
            overflow: hidden;
            background: ${isDark 
              ? `radial-gradient(ellipse at 50% 0%, rgba(176, 74, 50, 0.15) 0%, transparent 50%), ${colors.bg}`
              : `radial-gradient(ellipse at 50% 100%, rgba(26, 43, 74, 0.08) 0%, transparent 50%), ${colors.bg}`};
            padding: 64px;
            box-sizing: border-box;
            font-family: Inter, system-ui, -apple-system, sans-serif;
          ">
            ${showDecorativeArc ? `
              <div style="position: absolute; bottom: -30%; right: -30%; width: 65%; height: 65%; opacity: 0.06; pointer-events: none;">
                <svg viewBox="0 0 200 200" style="width: 100%; height: 100%;">
                  <path d="M200 0 Q200 200 0 200" fill="none" stroke="${isDark ? '#ffffff' : '#B04A32'}" stroke-width="2"/>
                </svg>
              </div>
            ` : ''}
            
            ${showCanalisations ? `
              <div style="position: absolute; top: 0; right: 0; width: 80px; height: 80px; pointer-events: none;">
                <svg viewBox="0 0 80 80" style="width: 100%; height: 100%;">
                  <path d="M0 0 L80 0 L80 80" fill="none" stroke="${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(209,90,62,0.3)'}" stroke-width="2"/>
                </svg>
              </div>
              <div style="position: absolute; bottom: 0; left: 0; width: 80px; height: 80px; pointer-events: none;">
                <svg viewBox="0 0 80 80" style="width: 100%; height: 100%;">
                  <path d="M0 0 L0 80 L80 80" fill="none" stroke="${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(209,90,62,0.3)'}" stroke-width="2"/>
                </svg>
              </div>
            ` : ''}

            <!-- Logo -->
            <div style="text-align: center; margin-bottom: 40px;">
              <img src="${colors.logo}" alt="IArche" style="height: 56px; display: inline-block;"/>
            </div>

            <!-- Content -->
            <div style="
              flex: 1;
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
              justify-content: ${slide.verticalAlignment === 'top' ? 'flex-start' : slide.verticalAlignment === 'bottom' ? 'flex-end' : 'center'};
              gap: 32px;
            ">
              ${slide.subtitle ? `
                <span style="
                  display: inline-flex;
                  align-items: center;
                  font-size: 20px;
                  text-transform: uppercase;
                  letter-spacing: 0.1em;
                  font-weight: 500;
                  padding: 10px 24px;
                  border-radius: 999px;
                  background: ${ctaBadge.background};
                  color: ${ctaBadge.color};
                  border: ${ctaBadge.border};
                ">${slide.subtitle}</span>
              ` : ''}
              
              ${slide.title ? `
                <h2 style="
                  font-weight: 700;
                  line-height: 1.2;
                  color: ${colors.text};
                  font-size: ${slide.highlight ? '56px' : '64px'};
                  letter-spacing: -0.02em;
                  margin: 0;
                  max-width: 90%;
                ">${slide.title}</h2>
              ` : ''}
              
              ${showBar && slide.title ? `
                <div style="
                  width: 120px;
                  height: 6px;
                  border-radius: 3px;
                  background: linear-gradient(90deg, #D15A3E 0%, #8B3A2F 100%);
                "></div>
              ` : ''}
              
              ${slide.highlight ? `
                <div style="
                  font-size: 96px;
                  font-weight: 800;
                  color: ${ctaColor};
                  line-height: 1;
                ">${slide.highlight}</div>
              ` : ''}
              
              ${slide.content ? `
                <p style="
                  color: ${colors.text};
                  opacity: 0.85;
                  font-size: 36px;
                  line-height: 1.5;
                  max-width: 85%;
                  margin: 0;
                ">${slide.content}</p>
              ` : ''}
            </div>

            <!-- Footer -->
            <div style="
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-top: 40px;
              padding-top: 24px;
              border-top: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(26,43,74,0.1)'};
            ">
              <span style="font-size: 18px; color: ${colors.subtext}; opacity: 0.6;">iarche.fr</span>
              <span style="
                font-size: 16px;
                color: ${colors.subtext};
                opacity: 0.5;
                display: flex;
                align-items: center;
                gap: 8px;
              ">
                Swiper →
              </span>
            </div>
          </div>
        `;

        // Attendre le chargement des images
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const slideElement = captureContainer.firstElementChild as HTMLElement;
        if (!slideElement) continue;

        // Capturer le slide
        const dataUrl = await toPng(slideElement, {
          width: captureWidth,
          height: captureHeight,
          pixelRatio: 2,
          cacheBust: true,
        });

        // Ajouter nouvelle page (sauf pour la première)
        if (i > 0) {
          pdfDoc.addPage();
        }

        // Image plein format (page = même ratio que l'image)
        pdfDoc.addImage(dataUrl, 'PNG', 0, 0, pageWidth, pageHeight);
      }

      // Nettoyer
      document.body.removeChild(captureContainer);

      pdfDoc.save(`carousel-iarche-${templateId}-hd-${Date.now()}.pdf`);
      toast({ title: 'PDF HD exporté', description: `${slides.length} slides haute-fidélité` });
    } catch (error) {
      console.error('Export HD error:', error);
      toast({ title: 'Erreur lors de l\'export HD', variant: 'destructive' });
    } finally {
      setCurrentSlide(originalSlide);
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
      const contentText = data.content.replace(/<[^>]*>/g, ' ').substring(0, 500);
      setSlides([
        { id: 1, title: data.title, subtitle: 'Article IArche', content: '', highlight: '', exportMode: 'full', barSize: 'md' },
        { id: 2, title: 'En bref', subtitle: '', content: data.excerpt || '', highlight: '', exportMode: 'full', barSize: 'md' },
        { id: 3, title: 'Points clés', subtitle: '', content: contentText.substring(0, 150) + '...', highlight: '', exportMode: 'full', barSize: 'md' },
        { id: 4, title: 'Lire l\'article', subtitle: '', content: '', highlight: 'iarche.fr/articles', exportMode: 'full', barSize: 'md' },
      ]);
      toast({ title: 'Article chargé' });
    }
  };

  const current = slides[currentSlide];
  const currentExportMode = current?.exportMode || 'full';
  const currentBarSize = current?.barSize || 'md';

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
              <h1 className="text-xl font-bold">Carrousel : {config.name}</h1>
              <p className="text-sm text-muted-foreground">Format LinkedIn 1080×1350px</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ExportActions
              elementRef={previewRef}
              filename={`carousel-${templateId}-slide${currentSlide + 1}`}
              quality={4}
              showSVG={true}
              width={1080}
              height={1350}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button disabled={isExporting}>
                  {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  PDF complet
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Mode d'export PDF</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportPdfHd} className="gap-2">
                  <FileImage className="h-4 w-4 text-accent" />
                  <div>
                    <div className="font-medium">PDF Haute-Fidélité</div>
                    <div className="text-xs text-muted-foreground">Capture web exacte</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF} className="gap-2">
                  <Download className="h-4 w-4" />
                  <div>
                    <div className="font-medium">PDF Natif</div>
                    <div className="text-xs text-muted-foreground">Rendu vectoriel basique</div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <PDFComparisonView 
              htmlPreviewRef={previewRef}
              pdfDocument={<CarouselPDF slides={slides} startTheme={startTheme} showDecorativeArc={showDecorativeArc} />}
              title="Carrousel - Comparaison HTML vs PDF"
            />
          </div>
        </div>

        {/* Source selector and theme selector */}
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Label>Mode :</Label>
            <Select value={sourceMode} onValueChange={(v) => setSourceMode(v as 'libre' | 'article' | 'preset')}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="libre">Création libre</SelectItem>
                <SelectItem value="preset">Preset pré-rempli</SelectItem>
                <SelectItem value="article">Depuis un article</SelectItem>
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
              onValueChange={(v) => setStartTheme(v as 'dark' | 'light' | 'terra' | 'contrast' | 'gradient')}
              className="flex flex-wrap gap-4"
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
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="terra" id="terra" />
                <Label htmlFor="terra" className="flex items-center gap-2 cursor-pointer">
                  <div className="w-5 h-5 rounded border" style={{ backgroundColor: '#8B3A2F' }} />
                  <span className="text-sm">Terra Nova</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="contrast" id="contrast" />
                <Label htmlFor="contrast" className="flex items-center gap-2 cursor-pointer">
                  <div className="w-5 h-5 rounded border" style={{ backgroundColor: '#0A0A0A' }} />
                  <span className="text-sm">Contraste</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="gradient" id="gradient" />
                <Label htmlFor="gradient" className="flex items-center gap-2 cursor-pointer">
                  <div className="w-5 h-5 rounded border" style={{ background: 'linear-gradient(135deg, #1A2B4A 0%, #B04A32 100%)' }} />
                  <span className="text-sm">Gradient</span>
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
              {(() => {
                // Theme configuration for preview - v4.2 Gradient Reference
                // Règle d'or: sur gradient, texte TOUJOURS en blanc cassé #FAF9F7
                const PREVIEW_THEMES = {
                  dark: { bg: '#1A2B4A', text: '#FAF9F7', subtext: '#FAF9F7', logo: '/logos/iarche-white.svg' },
                  light: { bg: '#FAF9F7', text: '#1A2B4A', subtext: '#666666', logo: '/logos/iarche-main.svg' },
                  terra: { bg: '#B04A32', text: '#FAF9F7', subtext: '#FAF9F7', logo: '/logos/iarche-white.svg' },
                  contrast: { bg: '#0A0A0A', text: '#FAFAFA', subtext: '#FAFAFA', logo: '/logos/iarche-white.svg' },
                  gradient: { bg: 'linear-gradient(135deg, #1A2B4A 0%, #B04A32 100%)', text: '#FAF9F7', subtext: '#FAF9F7', logo: '/logos/iarche-white.svg' },
                };
                const THEME_ALT: Record<string, string> = { dark: 'light', light: 'dark', terra: 'dark', contrast: 'light', gradient: 'gradient' };
                
                // v4.3: Mode gradient = 100% gradient (pas d'alternance)
                const currentTheme = startTheme === 'gradient' ? 'gradient' : (currentSlide % 2 === 0 ? startTheme : (THEME_ALT[startTheme] as typeof startTheme));
                const colors = PREVIEW_THEMES[currentTheme];
                const isDark = currentTheme !== 'light';
                // v4.2 Règle d'or: CTA en blanc cassé sur gradient, sinon terracotta
                const ctaColor = getCTAColor(currentTheme);
                
                // v4.2 - Visual enhancements: badge category detection
                const selectedPresetData = PRESET_TEMPLATES.find(p => p.id === selectedPreset);
                const categoryBadge = selectedPresetData?.category;
                const categoryLabels: Record<string, { label: string; icon: string }> = {
                  annonce: { label: 'Annonce', icon: '📢' },
                  chiffre: { label: 'Chiffres', icon: '📊' },
                  temoignage: { label: 'Témoignage', icon: '💬' },
                  conseil: { label: 'Conseil', icon: '💡' },
                  question: { label: 'Question', icon: '❓' },
                  services: { label: 'Services', icon: '⚙️' },
                };
                
                return (
                  <div 
                    ref={previewRef}
                    className="aspect-[4/5] flex flex-col relative overflow-hidden"
                    style={{ 
                      background: isDark 
                        ? `radial-gradient(ellipse at 50% 0%, rgba(176, 74, 50, 0.15) 0%, transparent 50%), ${colors.bg}`
                        : `radial-gradient(ellipse at 50% 100%, rgba(26, 43, 74, 0.08) 0%, transparent 50%), ${colors.bg}`,
                      padding: 32,
                    }}
                  >
                    {/* v4.3 - Arc décoratif mode continuité: plus grand et débordant */}
                    {showDecorativeArc && (
                      <div 
                        className="absolute pointer-events-none"
                        style={{
                          bottom: '-30%',
                          right: '-30%',
                          width: '65%',
                          height: '65%',
                          opacity: 0.06,
                        }}
                      >
                        <svg viewBox="0 0 200 200" className="w-full h-full">
                          <path 
                            d="M200 0 Q200 200 0 200" 
                            fill="none" 
                            stroke={isDark ? '#ffffff' : '#B04A32'} 
                            strokeWidth="2"
                          />
                        </svg>
                      </div>
                    )}
                    
                    {/* Canalisations decoration preview - only if 'full' mode */}
                    {showCanalisationsInPreview && (
                      <>
                        <div className="absolute top-0 right-0 w-20 h-20 pointer-events-none">
                          <svg viewBox="0 0 80 80" className="w-full h-full">
                            <path d="M0 0 L80 0 L80 80" fill="none" stroke={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(209,90,62,0.3)'} strokeWidth="2" />
                          </svg>
                        </div>
                        <div className="absolute bottom-0 left-0 w-20 h-20 pointer-events-none">
                          <svg viewBox="0 0 80 80" className="w-full h-full">
                            <path d="M0 0 L0 80 L80 80" fill="none" stroke={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(209,90,62,0.3)'} strokeWidth="2" />
                          </svg>
                        </div>
                      </>
                    )}

                    {/* Logo seul (v4.0: pas d'arc sous le logo) */}
                    <div className="text-center">
                      <img 
                        src={colors.logo}
                        alt="IArche"
                        style={{ height: 32, display: 'inline-block' }}
                      />
                    </div>

                    {/* Content - with vertical alignment and top margin */}
                    <div 
                      className="flex-1 flex flex-col text-center"
                      style={{ 
                        justifyContent: getJustifyContent(current?.verticalAlignment || verticalAlignment),
                        paddingTop: (current?.verticalAlignment || verticalAlignment) === 'top' ? `${getContentSpacing(topMargin, 5)}%` : 0,
                        gap: '16px', // v4.2 - Progressive spacing
                      }}
                    >
                      {/* v4.2 - Styled badge with icon */}
                      {current?.subtitle && (
                        <div className="flex justify-center">
                          <span 
                            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-medium px-3 py-1.5 rounded-full"
                            style={getCTABadgeStyles(currentTheme, isDark)}
                          >
                            {categoryBadge && categoryLabels[categoryBadge] && (
                              <span>{categoryLabels[categoryBadge].icon}</span>
                            )}
                            {current.subtitle}
                          </span>
                        </div>
                      )}
                      
                      {/* v4.2 - Enhanced title hierarchy */}
                      {current?.title && (
                        <>
                          <h2 
                            className="font-bold leading-tight"
                            style={{ 
                              color: colors.text,
                              fontSize: current?.highlight ? '1.5rem' : '1.75rem', // Larger when no highlight
                              letterSpacing: '-0.02em',
                            }}
                          >
                            {current.title}
                          </h2>
                          {/* v4.1: Arc sous le titre H1 */}
                          {showBarInPreview && (
                            <HTMLLogoArc size="sm" className="mx-auto" />
                          )}
                        </>
                      )}
                      
                      {/* v4.2 - Content with better typography */}
                      {current?.content && (
                        <p 
                          className="leading-relaxed max-w-[85%] mx-auto"
                          style={{ 
                            color: colors.text, 
                            opacity: 0.85,
                            fontSize: '0.875rem',
                            lineHeight: 1.7,
                          }}
                        >
                          {current.content}
                        </p>
                      )}
                      
                      {/* v4.2 - Enhanced highlight with gradient effect */}
                      {current?.highlight && (
                        <div className="mt-4">
                          <p 
                            className="font-bold"
                            style={{ 
                              fontSize: current.highlight.length > 10 ? '1.5rem' : '2.5rem',
                              color: ctaColor,
                              letterSpacing: '-0.02em',
                              textShadow: isDark && currentTheme !== 'gradient' ? '0 2px 20px rgba(176, 74, 50, 0.3)' : 'none',
                            }}
                          >
                            {current.highlight}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* v4.2 - Enhanced footer */}
                    <div className="text-center pt-4">
                      <p 
                        className="text-xs font-medium tracking-wide"
                        style={{ color: colors.subtext, opacity: 0.5 }}
                      >
                        iarche.fr
                      </p>
                    </div>
                  </div>
                );
              })()}
            </Card>

            {/* Slide thumbnails with theme alternation */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {slides.map((slide, idx) => {
                const PREVIEW_THEMES = {
                  dark: { bg: '#1A2B4A' },
                  light: { bg: '#FAF9F7' },
                  terra: { bg: '#8B3A2F' },
                  contrast: { bg: '#0A0A0A' },
                  gradient: { bg: 'linear-gradient(135deg, #1A2B4A 0%, #B04A32 100%)' },
                };
                const THEME_ALT: Record<string, string> = { dark: 'light', light: 'dark', terra: 'dark', contrast: 'light', gradient: 'light' };
                const thumbTheme = idx % 2 === 0 ? startTheme : (THEME_ALT[startTheme] as typeof startTheme);
                const isDarkThumb = thumbTheme !== 'light';
                
                return (
                  <button
                    key={slide.id}
                    onClick={() => setCurrentSlide(idx)}
                    className={`flex-shrink-0 w-16 h-20 rounded border-2 transition-all flex items-center justify-center ${
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
                {/* Vertical alignment controls */}
                <VerticalAlignmentControls
                  value={current?.verticalAlignment || verticalAlignment}
                  onChange={(v) => handleSlideChange('verticalAlignment', v)}
                />

                {/* Composition presets */}
                <CompositionPresets
                  selectedPreset={selectedCompositionPreset}
                  onSelectPreset={applyCompositionPreset}
                  currentVerticalAlignment={current?.verticalAlignment || verticalAlignment}
                  currentTopMargin={topMargin}
                  compact
                />

                {/* Top Margin Slider */}
                <TopMarginSlider
                  value={topMargin}
                  onChange={setTopMargin}
                />

                {/* Arcs décoratifs toggle */}
                <DecorativeArcToggle
                  enabled={showDecorativeArc}
                  onChange={setShowDecorativeArc}
                  compact
                />

                {/* Saved Templates */}
                <SavedTemplatesPanel
                  editorType="carousel"
                  getCurrentData={getCurrentData}
                  onLoadTemplate={loadTemplateData}
                />
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
                        barSize: currentBarSize,
                        verticalAlignment: current?.verticalAlignment || verticalAlignment
                      })));
                      toast({ title: 'Paramètres appliqués à tous les slides' });
                    }}
                  >
                    Appliquer à tous les slides
                  </Button>
                </div>

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