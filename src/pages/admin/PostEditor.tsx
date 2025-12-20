import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, User, Download } from 'lucide-react';
import { MediaTemplate } from '@/hooks/useMediaTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import AdminLayout from '@/components/layouts/AdminLayout';
import TypographyControls, { TextAlignment } from '@/components/admin/medias/TypographyControls';
import SavedTemplatesPanel from '@/components/admin/medias/SavedTemplatesPanel';
import ExportModeControls, { ExportMode } from '@/components/admin/medias/ExportModeControls';
import ExportActions from '@/components/admin/medias/ExportActions';
import PlatformPresets, { Platform } from '@/components/admin/medias/PlatformPresets';
import { ImageLibrary } from '@/components/admin/medias/ImageLibrary';
import BatchExport from '@/components/admin/medias/BatchExport';
import ResponsivePreview, { PreviewDevice, getDeviceWidth } from '@/components/admin/medias/ResponsivePreview';
import { PngQuality, PNG_QUALITY_OPTIONS, exportToPNG } from '@/lib/mediaExport';
import { BarSize } from '@/components/admin/medias/html/tokens';
import {
  HTMLBaseTemplate,
  HTMLLogo,
  IARCHE_COLORS,
  IARCHE_FONTS,
  ThemeType,
} from '@/components/admin/medias/html';

type PostFormat = 'square' | 'landscape';
type PostTemplate = 'annonce' | 'chiffre' | 'temoignage' | 'conseil' | 'services';

// Les 4 services IArche
const IARCHE_SERVICES = [
  { title: 'Audit & Conseil', description: 'Diagnostic et stratégie IA' },
  { title: 'Développement', description: 'Solutions IA sur mesure' },
  { title: 'Accompagnement', description: 'Formation et conduite du changement' },
  { title: 'Conformité', description: 'RGPD et gouvernance des données' },
];
type PresetTemplate = 'custom' | 'citation' | 'statistique' | 'evenement' | 'question' | 'temoignage-client' | 'recrutement' | 'milestone' | 'partenariat' | 'offre-promo' | 'lancement' 
  // v4.2 - Templates verticaux
  | 'story-actu' | 'story-conseil' | 'story-chiffre' | 'reels-hook' | 'tiktok-trend';

// Default dimensions
const DEFAULT_DIMENSIONS = {
  square: { width: 1200, height: 1200 },
  landscape: { width: 1200, height: 627 },
  vertical: { width: 1080, height: 1920 },
};
const MAX_PREVIEW_WIDTH = 420;

// Pre-filled templates data (v4.1 - enrichi avec templates métiers)
const PRESET_TEMPLATES: Record<PresetTemplate, {
  template: PostTemplate;
  badge?: string;
  title?: string;
  description?: string;
  cta?: string;
  chiffre?: string;
  contexte?: string;
  source?: string;
  citation?: string;
  temoinNom?: string;
  temoinFonction?: string;
  temoinEntreprise?: string;
  conseilNumero?: string;
  conseilTitre?: string;
  conseilContenu?: string;
}> = {
  custom: { template: 'annonce' },
  citation: {
    template: 'annonce',
    badge: 'Citation',
    title: '"L\'IA n\'est pas une destination, c\'est un voyage."',
    description: 'Adoptez une approche progressive pour transformer votre entreprise.',
    cta: 'Découvrir notre vision →',
  },
  statistique: {
    template: 'chiffre',
    chiffre: '73%',
    contexte: 'des entreprises ayant adopté l\'IA constatent un ROI positif dès la première année',
    source: 'Source: McKinsey Global Survey 2024',
  },
  evenement: {
    template: 'annonce',
    badge: 'Événement',
    title: 'Webinaire IA & PME',
    description: 'Rejoignez-nous le 15 janvier pour découvrir comment l\'IA peut transformer votre activité.',
    cta: 'S\'inscrire gratuitement →',
  },
  question: {
    template: 'conseil',
    conseilNumero: '?',
    conseilTitre: 'Êtes-vous prêt pour l\'IA ?',
    conseilContenu: 'Faites le point sur votre maturité digitale et identifiez les opportunités d\'automatisation.',
  },
  'temoignage-client': {
    template: 'temoignage',
    citation: '"Grâce à IArche, nous avons automatisé 40% de nos tâches administratives en 3 mois."',
    temoinNom: 'Jean-Pierre Martin',
    temoinFonction: 'Directeur des Opérations',
    temoinEntreprise: 'Groupe Industriel ABC',
  },
  // v4.1 - Nouveaux templates métiers
  recrutement: {
    template: 'annonce',
    badge: 'Recrutement',
    title: 'Nous recrutons !',
    description: 'Rejoignez notre équipe et participez à la transformation IA des entreprises françaises.',
    cta: 'Postuler maintenant →',
  },
  milestone: {
    template: 'chiffre',
    chiffre: '100',
    contexte: 'entreprises accompagnées dans leur transformation IA',
    source: 'Un cap symbolique franchi en 2024',
  },
  partenariat: {
    template: 'annonce',
    badge: 'Partenariat',
    title: 'Nouveau partenaire stratégique',
    description: 'IArche s\'associe à [Nom du partenaire] pour renforcer son offre d\'accompagnement.',
    cta: 'En savoir plus →',
  },
  'offre-promo': {
    template: 'annonce',
    badge: 'Offre limitée',
    title: 'Audit IA gratuit',
    description: 'Profitez d\'un diagnostic personnalisé de votre maturité IA sans engagement.',
    cta: 'Réserver mon audit →',
  },
  lancement: {
    template: 'annonce',
    badge: 'Nouveau',
    title: 'Découvrez notre nouvelle solution',
    description: 'Une innovation conçue pour simplifier votre quotidien et booster votre productivité.',
    cta: 'Découvrir →',
  },
  // v4.2 - Templates verticaux (Stories, Reels, TikTok)
  'story-actu': {
    template: 'annonce',
    badge: 'Actu',
    title: 'L\'IA révolutionne les PME',
    description: 'Swipe pour découvrir comment →',
    cta: '',
  },
  'story-conseil': {
    template: 'conseil',
    conseilNumero: '💡',
    conseilTitre: 'Le conseil du jour',
    conseilContenu: 'Automatisez vos tâches répétitives avant de penser à l\'IA générative.',
  },
  'story-chiffre': {
    template: 'chiffre',
    chiffre: '3x',
    contexte: 'plus de productivité avec l\'IA',
    source: 'Swipe →',
  },
  'reels-hook': {
    template: 'annonce',
    badge: 'Stop scrolling',
    title: 'Ce que personne ne vous dit sur l\'IA',
    description: '3 secrets pour transformer votre business 👇',
    cta: '',
  },
  'tiktok-trend': {
    template: 'annonce',
    badge: 'POV',
    title: 'Quand ton boss découvre ChatGPT...',
    description: 'Mais toi tu utilises déjà l\'IA depuis 2 ans 😎',
    cta: '',
  },
};

export default function PostEditor() {
  const navigate = useNavigate();
  const location = useLocation();
  const postRef = useRef<HTMLDivElement>(null);
  
  const [format, setFormat] = useState<PostFormat>('square');
  const [template, setTemplate] = useState<PostTemplate>('annonce');
  const [theme, setTheme] = useState<ThemeType>('dark');
  const [preset, setPreset] = useState<PresetTemplate>('custom');
  const [exportMode, setExportMode] = useState<ExportMode>('full');
  const [barSize, setBarSize] = useState<BarSize>('lg');
  const [pngQuality, setPngQuality] = useState<PngQuality>(6);
  const [platformPreset, setPlatformPreset] = useState<Platform>('linkedin-post');
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
  const [showBatchExport, setShowBatchExport] = useState(false);
  
  // Dynamic dimensions from platform preset
  const [width, setWidth] = useState(DEFAULT_DIMENSIONS.square.width);
  const [height, setHeight] = useState(DEFAULT_DIMENSIONS.square.height);
  
  // Computed scale for preview - adjust by device
  const deviceWidth = getDeviceWidth(previewDevice);
  const baseScale = Math.min(MAX_PREVIEW_WIDTH / width, 0.4);
  const deviceScale = previewDevice === 'desktop' ? baseScale : Math.min(deviceWidth / width, baseScale);
  const scale = deviceScale;
  
  const backgroundColor = theme === 'dark' ? IARCHE_COLORS.bleuNuit : IARCHE_COLORS.blancCasse;

  // Apply preset template
  const applyPreset = (presetKey: PresetTemplate) => {
    setPreset(presetKey);
    if (presetKey === 'custom') return;
    
    const presetData = PRESET_TEMPLATES[presetKey];
    setTemplate(presetData.template);
    
    if (presetData.badge) setBadge(presetData.badge);
    if (presetData.title) setTitle(presetData.title);
    if (presetData.description) setDescription(presetData.description);
    if (presetData.cta) setCta(presetData.cta);
    if (presetData.chiffre) setChiffre(presetData.chiffre);
    if (presetData.contexte) setContexte(presetData.contexte);
    if (presetData.source) setSource(presetData.source);
    if (presetData.citation) setCitation(presetData.citation);
    if (presetData.temoinNom) setTemoinNom(presetData.temoinNom);
    if (presetData.temoinFonction) setTemoinFonction(presetData.temoinFonction);
    if (presetData.temoinEntreprise) setTemoinEntreprise(presetData.temoinEntreprise);
    if (presetData.conseilNumero) setConseilNumero(presetData.conseilNumero);
    if (presetData.conseilTitre) setConseilTitre(presetData.conseilTitre);
    if (presetData.conseilContenu) setConseilContenu(presetData.conseilContenu);
  };
  
  // Annonce fields
  const [badge, setBadge] = useState('Nouveauté');
  const [title, setTitle] = useState('Titre de l\'annonce');
  const [description, setDescription] = useState('Description courte de l\'annonce ou de la nouveauté à partager.');
  const [cta, setCta] = useState('En savoir plus →');
  
  // Chiffre fields
  const [chiffre, setChiffre] = useState('87%');
  const [contexte, setContexte] = useState('des PME considèrent l\'IA comme prioritaire');
  const [source, setSource] = useState('Source: Étude IArche 2024');
  
  // Témoignage fields
  const [citation, setCitation] = useState('"L\'accompagnement IArche a transformé notre approche de l\'IA."');
  const [temoinNom, setTemoinNom] = useState('Marie Dupont');
  const [temoinFonction, setTemoinFonction] = useState('Directrice Générale');
  const [temoinEntreprise, setTemoinEntreprise] = useState('Entreprise XYZ');
  const [temoinPhoto, setTemoinPhoto] = useState<string | null>(null);
  
  // Conseil fields
  const [conseilNumero, setConseilNumero] = useState('01');
  const [conseilTitre, setConseilTitre] = useState('Commencez petit');
  const [conseilContenu, setConseilContenu] = useState('Identifiez un cas d\'usage simple et mesurez les résultats avant de généraliser.');

  // Typography controls - Title
  const [titleFontSize, setTitleFontSize] = useState(56);
  const [titleBold, setTitleBold] = useState(true);
  const [titleItalic, setTitleItalic] = useState(false);
  const [titleAlignment, setTitleAlignment] = useState<TextAlignment>('center');

  // Typography controls - Description
  const [descFontSize, setDescFontSize] = useState(24);
  const [descBold, setDescBold] = useState(false);
  const [descItalic, setDescItalic] = useState(false);
  const [descAlignment, setDescAlignment] = useState<TextAlignment>('center');

  // Get current data for saving template
  const getCurrentData = useCallback(() => ({
    format, template, theme, exportMode, barSize, pngQuality, platformPreset, width, height,
    badge, title, description, cta,
    chiffre, contexte, source,
    citation, temoinNom, temoinFonction, temoinEntreprise, temoinPhoto,
    conseilNumero, conseilTitre, conseilContenu,
    titleFontSize, titleBold, titleItalic, titleAlignment,
    descFontSize, descBold, descItalic, descAlignment,
  }), [format, template, theme, exportMode, barSize, pngQuality, platformPreset, width, height, badge, title, description, cta, chiffre, contexte, source, citation, temoinNom, temoinFonction, temoinEntreprise, temoinPhoto, conseilNumero, conseilTitre, conseilContenu, titleFontSize, titleBold, titleItalic, titleAlignment, descFontSize, descBold, descItalic, descAlignment]);

  // Load template data
  const loadTemplateData = useCallback((data: Record<string, unknown>) => {
    if (data.format) setFormat(data.format as PostFormat);
    if (data.template) setTemplate(data.template as PostTemplate);
    if (data.theme) setTheme(data.theme as ThemeType);
    if (data.exportMode) setExportMode(data.exportMode as ExportMode);
    if (data.barSize) setBarSize(data.barSize as BarSize);
    if (data.pngQuality) setPngQuality(data.pngQuality as PngQuality);
    if (data.platformPreset) setPlatformPreset(data.platformPreset as Platform);
    if (data.width !== undefined) setWidth(data.width as number);
    if (data.height !== undefined) setHeight(data.height as number);
    if (data.badge !== undefined) setBadge(data.badge as string);
    if (data.title !== undefined) setTitle(data.title as string);
    if (data.description !== undefined) setDescription(data.description as string);
    if (data.cta !== undefined) setCta(data.cta as string);
    if (data.chiffre !== undefined) setChiffre(data.chiffre as string);
    if (data.contexte !== undefined) setContexte(data.contexte as string);
    if (data.source !== undefined) setSource(data.source as string);
    if (data.citation !== undefined) setCitation(data.citation as string);
    if (data.temoinNom !== undefined) setTemoinNom(data.temoinNom as string);
    if (data.temoinFonction !== undefined) setTemoinFonction(data.temoinFonction as string);
    if (data.temoinEntreprise !== undefined) setTemoinEntreprise(data.temoinEntreprise as string);
    if (data.temoinPhoto !== undefined) setTemoinPhoto(data.temoinPhoto as string | null);
    if (data.conseilNumero !== undefined) setConseilNumero(data.conseilNumero as string);
    if (data.conseilTitre !== undefined) setConseilTitre(data.conseilTitre as string);
    if (data.conseilContenu !== undefined) setConseilContenu(data.conseilContenu as string);
    if (data.titleFontSize !== undefined) setTitleFontSize(data.titleFontSize as number);
    if (data.titleBold !== undefined) setTitleBold(data.titleBold as boolean);
    if (data.titleItalic !== undefined) setTitleItalic(data.titleItalic as boolean);
    if (data.titleAlignment !== undefined) setTitleAlignment(data.titleAlignment as TextAlignment);
    if (data.descFontSize !== undefined) setDescFontSize(data.descFontSize as number);
    if (data.descBold !== undefined) setDescBold(data.descBold as boolean);
    if (data.descItalic !== undefined) setDescItalic(data.descItalic as boolean);
    if (data.descAlignment !== undefined) setDescAlignment(data.descAlignment as TextAlignment);
  }, []);

  // Load template from navigation state
  useEffect(() => {
    const state = location.state as { loadTemplate?: MediaTemplate } | null;
    if (state?.loadTemplate?.template_data) {
      loadTemplateData(state.loadTemplate.template_data);
    }
  }, [location.state, loadTemplateData]);

  const handleExport = async () => {
    try {
      await exportToPNG(postRef, `post-${template}-${format}`, {
        pixelRatio: pngQuality,
        backgroundColor: theme === 'dark' ? IARCHE_COLORS.bleuNuit : IARCHE_COLORS.blancCasse,
      });
      toast.success(`Post exporté (${width * pngQuality}×${height * pngQuality}px)`);
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    }
  };

  const textColor = theme === 'dark' ? IARCHE_COLORS.white : IARCHE_COLORS.bleuNuit;
  const subtextColor = theme === 'dark' ? 'rgba(255,255,255,0.7)' : IARCHE_COLORS.grey;

  // Logo discret helper (petit logo sans arc, en coin)
  const renderLogoDiscret = (position: 'top-right' | 'bottom-right' = 'bottom-right') => (
    <img 
      src={theme === 'dark' || theme === 'terra' || theme === 'contrast' ? '/logos/iarche-white.svg' : '/logos/iarche-dark.svg'}
      alt="IArche"
      style={{
        position: 'absolute',
        [position.includes('top') ? 'top' : 'bottom']: '24px',
        [position.includes('left') ? 'left' : 'right']: '24px',
        height: format === 'square' ? '50px' : '40px',
        opacity: 0.85,
      }}
    />
  );

  const renderPostContent = () => {
    switch (template) {
      case 'annonce':
        return (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            alignItems: titleAlignment === 'center' ? 'center' : titleAlignment === 'right' ? 'flex-end' : 'flex-start',
            height: '100%',
            textAlign: titleAlignment,
            position: 'relative',
          }}>
            {exportMode === 'logo-discret' ? renderLogoDiscret('top-right') : <HTMLLogo size="lg" theme={theme} />}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: titleAlignment === 'center' ? 'center' : titleAlignment === 'right' ? 'flex-end' : 'flex-start' }}>
              <span style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: Math.max(14, Math.round(width * 0.015)) + 'px',
                fontWeight: 600,
                color: IARCHE_COLORS.terracotta,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
              }}>
                {badge}
              </span>
              <h1 style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: `${titleFontSize}px`,
                fontWeight: titleBold ? 700 : 500,
                fontStyle: titleItalic ? 'italic' : 'normal',
                color: textColor,
                margin: 0,
                lineHeight: 1.15,
                textAlign: titleAlignment,
                letterSpacing: '-0.02em',
              }}>
                {title}
              </h1>
              <p style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: `${descFontSize}px`,
                fontWeight: descBold ? 500 : 400,
                fontStyle: descItalic ? 'italic' : 'normal',
                color: subtextColor,
                margin: 0,
                maxWidth: '85%',
                lineHeight: 1.6,
                textAlign: descAlignment,
                letterSpacing: '0.01em',
              }}>
                {description}
              </p>
            </div>
            <span style={{
              fontFamily: IARCHE_FONTS.primary,
              fontSize: Math.max(16, Math.round(width * 0.018)) + 'px',
              fontWeight: 600,
              color: IARCHE_COLORS.terracotta,
              letterSpacing: '0.02em',
            }}>
              {cta}
            </span>
          </div>
        );

      case 'chiffre':
        return (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center',
            alignItems: titleAlignment === 'center' ? 'center' : titleAlignment === 'right' ? 'flex-end' : 'flex-start',
            height: '100%',
            textAlign: titleAlignment,
            gap: '32px',
            position: 'relative',
          }}>
            {exportMode === 'logo-discret' ? renderLogoDiscret('top-right') : <HTMLLogo size="md" theme={theme} />}
            <div style={{
              fontFamily: IARCHE_FONTS.primary,
              fontSize: `${titleFontSize}px`,
              fontWeight: titleBold ? 800 : 400,
              fontStyle: titleItalic ? 'italic' : 'normal',
              background: IARCHE_COLORS.terracotta,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: 'transparent',
              lineHeight: 1,
            }}>
              {chiffre}
            </div>
            <p style={{
              fontFamily: IARCHE_FONTS.primary,
              fontSize: `${descFontSize}px`,
              fontWeight: descBold ? 600 : 500,
              fontStyle: descItalic ? 'italic' : 'normal',
              color: textColor,
              margin: 0,
              maxWidth: '70%',
              lineHeight: 1.4,
              textAlign: descAlignment,
            }}>
              {contexte}
            </p>
            <span style={{
              fontFamily: IARCHE_FONTS.primary,
              fontSize: '14px',
              fontWeight: 400,
              color: subtextColor,
              fontStyle: 'italic',
            }}>
              {source}
            </span>
          </div>
        );

      case 'temoignage':
        return (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            alignItems: titleAlignment === 'center' ? 'center' : titleAlignment === 'right' ? 'flex-end' : 'flex-start',
            height: '100%',
            textAlign: titleAlignment,
            position: 'relative',
          }}>
            {exportMode === 'logo-discret' ? renderLogoDiscret('top-right') : <HTMLLogo size="md" theme={theme} />}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '32px', width: '100%' }}>
              {temoinPhoto && (
                <div style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: `3px solid ${IARCHE_COLORS.terracotta}`,
                  flexShrink: 0,
                }}>
                  <img src={temoinPhoto} alt={temoinNom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', alignItems: titleAlignment === 'center' ? 'center' : titleAlignment === 'right' ? 'flex-end' : 'flex-start', flex: 1 }}>
              <p style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: `${titleFontSize}px`,
                fontWeight: titleBold ? 600 : 400,
                color: textColor,
                margin: 0,
                maxWidth: '85%',
                lineHeight: 1.5,
                fontStyle: titleItalic ? 'italic' : 'normal',
                textAlign: titleAlignment,
              }}>
                {citation}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: descAlignment }}>
                <span style={{
                  fontFamily: IARCHE_FONTS.primary,
                  fontSize: `${descFontSize}px`,
                  fontWeight: descBold ? 700 : 600,
                  fontStyle: descItalic ? 'italic' : 'normal',
                  color: textColor,
                }}>
                  {temoinNom}
                </span>
                <span style={{
                  fontFamily: IARCHE_FONTS.primary,
                  fontSize: '18px',
                  fontWeight: 400,
                  color: IARCHE_COLORS.terracotta,
                }}>
                  {temoinFonction}
                </span>
                <span style={{
                  fontFamily: IARCHE_FONTS.primary,
                  fontSize: '16px',
                  fontWeight: 400,
                  color: subtextColor,
                }}>
                  {temoinEntreprise}
                </span>
              </div>
              </div>
            </div>
            <div style={{ height: '40px' }} />
          </div>
        );

      case 'conseil':
        return (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            alignItems: titleAlignment === 'left' ? 'flex-start' : titleAlignment === 'right' ? 'flex-end' : 'center',
            height: '100%',
            textAlign: titleAlignment,
            position: 'relative',
          }}>
            {exportMode === 'logo-discret' ? (
              renderLogoDiscret('top-right')
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start' }}>
                <HTMLLogo size="md" theme={theme} />
                <span style={{
                  fontFamily: IARCHE_FONTS.primary,
                  fontSize: '16px',
                  fontWeight: 500,
                  color: subtextColor,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Conseil IA
                </span>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: format === 'square' ? '120px' : '80px',
                fontWeight: 800,
                color: IARCHE_COLORS.terracotta,
                lineHeight: 1,
                opacity: 0.3,
              }}>
                {conseilNumero}
              </div>
              <h2 style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: `${titleFontSize}px`,
                fontWeight: titleBold ? 700 : 400,
                fontStyle: titleItalic ? 'italic' : 'normal',
                color: textColor,
                margin: 0,
                lineHeight: 1.2,
                textAlign: titleAlignment,
              }}>
                {conseilTitre}
              </h2>
              <p style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: `${descFontSize}px`,
                fontWeight: descBold ? 600 : 400,
                fontStyle: descItalic ? 'italic' : 'normal',
                color: subtextColor,
                margin: 0,
                lineHeight: 1.5,
                maxWidth: '90%',
                textAlign: descAlignment,
              }}>
                {conseilContenu}
              </p>
            </div>
            <span style={{
              fontFamily: IARCHE_FONTS.primary,
              fontSize: '16px',
              fontWeight: 500,
              color: subtextColor,
            }}>
              iarche.fr
            </span>
          </div>
        );

      case 'services':
        return (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            height: '100%',
          }}>
            {/* Header avec logo discret - v4.2 pro */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: Math.max(14, Math.round(width * 0.015)) + 'px',
                fontWeight: 600,
                color: IARCHE_COLORS.terracotta,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
              }}>
                Nos Services
              </span>
              <img 
                src={theme === 'dark' ? '/logos/iarche-white.svg' : '/logos/iarche-dark.svg'}
                alt="IArche"
                style={{ height: Math.max(32, Math.round(width * 0.035)) + 'px', opacity: 0.85 }}
              />
            </div>

            {/* Titre principal - v4.2 pro */}
            <h1 style={{
              fontFamily: IARCHE_FONTS.primary,
              fontSize: Math.max(28, Math.round(width * 0.035)) + 'px',
              fontWeight: 700,
              color: textColor,
              margin: 0,
              textAlign: 'center',
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
            }}>
              L'IA au service de votre entreprise
            </h1>

            {/* Grille 2x2 des services - v4.2 pro */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: Math.max(12, Math.round(width * 0.018)) + 'px',
              width: '100%',
            }}>
              {IARCHE_SERVICES.map((service, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    padding: `${Math.max(16, Math.round(width * 0.02))}px`,
                    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(26,43,74,0.025)',
                    borderRadius: Math.round(width * 0.01) + 'px',
                    border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(26,43,74,0.08)'}`,
                  }}
                >
                  <span style={{
                    fontFamily: IARCHE_FONTS.primary,
                    fontSize: Math.max(14, Math.round(width * 0.015)) + 'px',
                    fontWeight: 600,
                    color: textColor,
                    marginBottom: Math.round(width * 0.004) + 'px',
                    letterSpacing: '0.01em',
                  }}>
                    {service.title}
                  </span>
                  <span style={{
                    fontFamily: IARCHE_FONTS.primary,
                    fontSize: Math.max(11, Math.round(width * 0.012)) + 'px',
                    fontWeight: 400,
                    color: subtextColor,
                    lineHeight: 1.4,
                  }}>
                    {service.description}
                  </span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <span style={{
              fontFamily: IARCHE_FONTS.primary,
              fontSize: '16px',
              fontWeight: 500,
              color: IARCHE_COLORS.terracotta,
              textAlign: 'center',
            }}>
              iarche.fr
            </span>
          </div>
        );
    }
  };

  const renderFields = () => {
    switch (template) {
      case 'annonce':
        return (
          <>
            <div className="space-y-2">
              <Label>Badge</Label>
              <Input value={badge} onChange={(e) => setBadge(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>CTA</Label>
              <Input value={cta} onChange={(e) => setCta(e.target.value)} />
            </div>
          </>
        );
      case 'chiffre':
        return (
          <>
            <div className="space-y-2">
              <Label>Chiffre</Label>
              <Input value={chiffre} onChange={(e) => setChiffre(e.target.value)} placeholder="87%" />
            </div>
            <div className="space-y-2">
              <Label>Contexte</Label>
              <Textarea value={contexte} onChange={(e) => setContexte(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Input value={source} onChange={(e) => setSource(e.target.value)} />
            </div>
          </>
        );
      case 'temoignage':
        return (
          <>
            <div className="space-y-2">
              <Label>Citation</Label>
              <Textarea value={citation} onChange={(e) => setCitation(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={temoinNom} onChange={(e) => setTemoinNom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fonction</Label>
              <Input value={temoinFonction} onChange={(e) => setTemoinFonction(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Entreprise</Label>
              <Input value={temoinEntreprise} onChange={(e) => setTemoinEntreprise(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Photo du témoin</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={temoinPhoto || ''}
                  onChange={(e) => setTemoinPhoto(e.target.value || null)}
                  placeholder="URL de la photo"
                  className="flex-1"
                />
                <ImageLibrary 
                  onSelect={(url) => setTemoinPhoto(url)} 
                  triggerLabel="Choisir"
                />
              </div>
              {temoinPhoto && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setTemoinPhoto(null)}
                  className="w-full mt-1"
                >
                  Supprimer la photo
                </Button>
              )}
            </div>
          </>
        );
      case 'conseil':
        return (
          <>
            <div className="space-y-2">
              <Label>Numéro</Label>
              <Input value={conseilNumero} onChange={(e) => setConseilNumero(e.target.value)} placeholder="01" />
            </div>
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input value={conseilTitre} onChange={(e) => setConseilTitre(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Contenu</Label>
              <Textarea value={conseilContenu} onChange={(e) => setConseilContenu(e.target.value)} rows={3} />
            </div>
          </>
        );
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/medias')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Posts LinkedIn</h1>
              <p className="text-muted-foreground">
                {format === 'square' ? '1200×1200px' : '1200×627px'}
              </p>
            </div>
          </div>
          <Button onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Exporter PNG
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Paramètres</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Platform Presets - dimensions dynamiques (v4.2 - inclut vidéo verticale) */}
              <PlatformPresets
                value={platformPreset}
                onChange={setPlatformPreset}
                onDimensionsChange={(w, h) => { 
                  setWidth(w); 
                  setHeight(h);
                  // Update format based on aspect ratio
                  setFormat(h > w * 0.8 ? 'square' : 'landscape');
                }}
                filterByCategory={['LinkedIn', 'Instagram', 'Facebook', 'Twitter/X', 'Vidéo verticale', 'Pinterest']}
              />

              {/* Template selector */}
              <div className="space-y-2">
                <Label>Template</Label>
              <Tabs value={template} onValueChange={(v) => setTemplate(v as PostTemplate)}>
                  <TabsList className="grid grid-cols-3 gap-1">
                    <TabsTrigger value="annonce" className="text-xs">Annonce</TabsTrigger>
                    <TabsTrigger value="chiffre" className="text-xs">Chiffre</TabsTrigger>
                    <TabsTrigger value="temoignage" className="text-xs">Témoignage</TabsTrigger>
                    <TabsTrigger value="conseil" className="text-xs">Conseil</TabsTrigger>
                    <TabsTrigger value="services" className="text-xs">4 Services</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Theme selector */}
              <div className="space-y-2">
                <Label>Thème</Label>
                <Select value={theme} onValueChange={(v) => setTheme(v as ThemeType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Sombre (Bleu Nuit)</SelectItem>
                    <SelectItem value="light">Clair (Blanc Cassé)</SelectItem>
                    <SelectItem value="terra">Terra Nova (Terracotta)</SelectItem>
                    <SelectItem value="contrast">Contraste fort</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Preset Templates - v4.2 avec templates verticaux */}
              <div className="space-y-2">
                <Label>Templates pré-remplis</Label>
                <Select value={preset} onValueChange={(v) => applyPreset(v as PresetTemplate)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Personnalisé</SelectItem>
                    {/* Templates classiques */}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Classiques</div>
                    <SelectItem value="citation">Citation inspirante</SelectItem>
                    <SelectItem value="statistique">Chiffre clé / Statistique</SelectItem>
                    <SelectItem value="evenement">Annonce événement</SelectItem>
                    <SelectItem value="question">Question engageante</SelectItem>
                    <SelectItem value="temoignage-client">Témoignage client</SelectItem>
                    <SelectItem value="recrutement">Recrutement</SelectItem>
                    <SelectItem value="milestone">Milestone</SelectItem>
                    <SelectItem value="partenariat">Partenariat</SelectItem>
                    <SelectItem value="offre-promo">Offre promo</SelectItem>
                    <SelectItem value="lancement">Lancement</SelectItem>
                    {/* Templates verticaux */}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Stories / Reels / TikTok</div>
                    <SelectItem value="story-actu">Story - Actualité</SelectItem>
                    <SelectItem value="story-conseil">Story - Conseil</SelectItem>
                    <SelectItem value="story-chiffre">Story - Chiffre clé</SelectItem>
                    <SelectItem value="reels-hook">Reels - Hook accrocheur</SelectItem>
                    <SelectItem value="tiktok-trend">TikTok - Trend POV</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Template-specific fields */}
              {renderFields()}

              {/* Typography Controls - All templates */}
              <TypographyControls
                label={template === 'chiffre' ? 'Typographie Chiffre' : template === 'temoignage' ? 'Typographie Citation' : 'Typographie Titre'}
                fontSize={titleFontSize}
                onFontSizeChange={setTitleFontSize}
                isBold={titleBold}
                onBoldChange={setTitleBold}
                isItalic={titleItalic}
                onItalicChange={setTitleItalic}
                alignment={titleAlignment}
                onAlignmentChange={setTitleAlignment}
                minFontSize={template === 'chiffre' ? 80 : 28}
                maxFontSize={template === 'chiffre' ? 200 : 72}
              />
              <TypographyControls
                label={template === 'temoignage' ? 'Typographie Nom' : 'Typographie Description'}
                fontSize={descFontSize}
                onFontSizeChange={setDescFontSize}
                isBold={descBold}
                onBoldChange={setDescBold}
                isItalic={descItalic}
                onItalicChange={setDescItalic}
                alignment={descAlignment}
                onAlignmentChange={setDescAlignment}
                minFontSize={16}
                maxFontSize={48}
              />

              {/* Export Mode Controls */}
              <ExportModeControls
                exportMode={exportMode}
                onExportModeChange={setExportMode}
                barSize={barSize}
                onBarSizeChange={setBarSize}
                compact={true}
              />

              {/* PNG Quality */}
              <div className="space-y-2">
                <Label>Qualité PNG</Label>
                <Select value={String(pngQuality)} onValueChange={(v) => setPngQuality(Number(v) as PngQuality)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PNG_QUALITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Saved Templates */}
              <div className="pt-4 border-t">
                <SavedTemplatesPanel
                  editorType="post"
                  getCurrentData={getCurrentData}
                  onLoadTemplate={loadTemplateData}
                />
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>Aperçu</CardTitle>
              <ResponsivePreview 
                value={previewDevice} 
                onChange={setPreviewDevice}
              />
            </CardHeader>
            <CardContent className="space-y-4">
              <div 
                className="overflow-auto rounded-lg border"
                style={{ 
                  maxWidth: '100%',
                  backgroundColor: '#f0f0f0',
                  padding: '16px',
                }}
              >
                <div style={{ 
                  transform: `scale(${scale})`, 
                  transformOrigin: 'top left',
                  width: width * scale,
                  height: height * scale,
                }}>
                  <HTMLBaseTemplate
                    ref={postRef}
                    width={width}
                    height={height}
                    theme={theme}
                    padding={height > width ? 80 : 60}
                    showArches={false}
                  >
                    {renderPostContent()}
                  </HTMLBaseTemplate>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Aperçu à {Math.round(scale * 100)}% ({previewDevice}) — Export en taille réelle ({width}×{height}px)
              </p>
              
              {/* Batch Export Collapsible */}
              <Collapsible open={showBatchExport} onOpenChange={setShowBatchExport}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full">
                    {showBatchExport ? 'Masquer' : 'Export multi-formats'}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                  <BatchExport
                    elementRef={postRef}
                    baseFilename={`post-${template}`}
                    quality={pngQuality}
                  />
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
