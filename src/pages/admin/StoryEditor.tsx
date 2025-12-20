import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ChevronUp, Download } from 'lucide-react';
import { MediaTemplate } from '@/hooks/useMediaTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import AdminLayout from '@/components/layouts/AdminLayout';
import TypographyControls, { TextAlignment } from '@/components/admin/medias/TypographyControls';
import SavedTemplatesPanel from '@/components/admin/medias/SavedTemplatesPanel';
import ExportModeControls, { ExportMode } from '@/components/admin/medias/ExportModeControls';
import ExportActions from '@/components/admin/medias/ExportActions';
import PlatformPresets, { Platform } from '@/components/admin/medias/PlatformPresets';
import { PngQuality, PNG_QUALITY_OPTIONS, exportToPNG } from '@/lib/mediaExport';
import { VerticalAlignmentControls, VerticalAlignment, getJustifyContent } from '@/components/admin/medias/VerticalAlignmentControls';
import { CompositionPresets, CompositionPreset, COMPOSITION_PRESETS } from '@/components/admin/medias/CompositionPresets';
import { TopMarginSlider, getContentSpacing } from '@/components/admin/medias/TopMarginSlider';
import {
  HTMLBaseTemplate,
  HTMLLogo,
  IARCHE_COLORS,
  IARCHE_FONTS,
  IARCHE_TYPOGRAPHY,
  IARCHE_SPACING,
  IARCHE_EFFECTS,
  IARCHE_BADGES,
  ThemeType,
} from '@/components/admin/medias/html';
import { HTMLLogoArc } from '@/components/admin/medias/html/HTMLLogoArc';
import { ArcSize } from '@/components/admin/medias/html/tokens';

type StoryTemplate = 'annonce' | 'chiffre' | 'temoignage' | 'conseil' | 'question';

type PresetTemplate = {
  id: string;
  label: string;
  category: 'annonce' | 'chiffre' | 'temoignage' | 'conseil' | 'question';
  badge: string;
  titre: string;
  ctaText: string;
  chiffre: string;
  contexte: string;
  source: string;
  // Témoignage fields
  citation?: string;
  temoinNom?: string;
  temoinFonction?: string;
  // Conseil fields
  conseilNumero?: string;
  conseilTitre?: string;
  conseilContenu?: string;
};

const PRESET_TEMPLATES: PresetTemplate[] = [
  // ========== ANNONCE ==========
  { id: 'nouveaute', label: 'Nouveauté', category: 'annonce', badge: 'Nouveauté', titre: 'Découvrez notre nouvelle solution IA', ctaText: 'En savoir plus', chiffre: '92%', contexte: 'des entreprises accompagnées ont augmenté leur productivité', source: 'Résultats IArche 2024' },
  { id: 'evenement', label: 'Événement', category: 'annonce', badge: 'Événement', titre: 'Webinaire exclusif sur l\'IA en entreprise', ctaText: 'S\'inscrire', chiffre: '+150', contexte: 'participants à nos ateliers cette année', source: 'Bilan IArche 2024' },
  { id: 'lancement', label: 'Lancement produit', category: 'annonce', badge: 'Nouveau', titre: 'Lancement de notre nouvelle solution', ctaText: 'Découvrir', chiffre: '100%', contexte: 'pensé pour les PME', source: 'IArche 2025' },
  // ========== CHIFFRE ==========
  { id: 'statistiques', label: 'Statistiques', category: 'chiffre', badge: 'Chiffre clé', titre: 'L\'IA en chiffres', ctaText: 'En savoir plus', chiffre: '73%', contexte: 'des entreprises constatent un ROI positif', source: 'McKinsey 2024' },
  { id: 'milestone', label: 'Milestone', category: 'chiffre', badge: 'Cap franchi', titre: 'Merci à vous !', ctaText: 'Célébrer', chiffre: '100', contexte: 'entreprises accompagnées', source: 'IArche 2024' },
  { id: 'resultat', label: 'Résultat client', category: 'chiffre', badge: 'Success Story', titre: 'Comment notre client a doublé sa productivité', ctaText: 'Voir le cas', chiffre: '+200%', contexte: 'de gain de productivité en 6 mois', source: 'Cas client 2024' },
  // ========== TÉMOIGNAGE ==========
  { id: 'temoignage-client', label: 'Témoignage client', category: 'temoignage', badge: 'Témoignage', titre: '', ctaText: 'Voir le cas', chiffre: '', contexte: '', source: '', citation: '"Grâce à IArche, nous avons automatisé 40% de nos tâches."', temoinNom: 'Jean-Pierre Martin', temoinFonction: 'DG, Groupe ABC' },
  { id: 'cas-client', label: 'Cas client', category: 'temoignage', badge: 'Success Story', titre: 'Découvrez leur transformation', ctaText: 'En savoir plus', chiffre: '+200%', contexte: 'de productivité', source: 'Cas client 2024', citation: '"Une transformation réussie"', temoinNom: 'Marie Dupont', temoinFonction: 'Directrice Ops' },
  // ========== CONSEIL ==========
  { id: 'conseil-tip', label: 'Conseil / Tip', category: 'conseil', badge: 'Conseil', titre: '', ctaText: 'Appliquer', chiffre: '', contexte: '', source: '', conseilNumero: '01', conseilTitre: 'Commencez petit', conseilContenu: 'Identifiez un cas d\'usage simple avant de généraliser.' },
  { id: 'bonnes-pratiques', label: 'Bonnes pratiques', category: 'conseil', badge: 'Best Practice', titre: '', ctaText: 'Découvrir', chiffre: '3', contexte: 'bonnes pratiques IA', source: 'IArche', conseilNumero: '3', conseilTitre: '3 bonnes pratiques', conseilContenu: 'Impliquez vos équipes, mesurez, itérez.' },
  // ========== QUESTION ==========
  { id: 'question-sondage', label: 'Question / Sondage', category: 'question', badge: 'Votre avis', titre: 'L\'IA va-t-elle remplacer votre métier ?', ctaText: 'Répondre', chiffre: '?', contexte: 'Partagez votre opinion', source: 'Débat', conseilNumero: '?', conseilTitre: 'Question du jour', conseilContenu: 'Donnez-nous votre avis en commentaire.' },
  { id: 'quiz', label: 'Quiz / Devinette', category: 'question', badge: 'Quiz', titre: 'Testez vos connaissances IA', ctaText: 'Jouer', chiffre: '?', contexte: 'Saurez-vous répondre ?', source: 'IArche Quiz', conseilNumero: '?', conseilTitre: 'Quiz IA', conseilContenu: 'Quel % des PME utilisent l\'IA ?' },
];

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;
const SCALE = 0.22;

export default function StoryEditor() {
  const navigate = useNavigate();
  const location = useLocation();
  const storyRef = useRef<HTMLDivElement>(null);
  
  const [template, setTemplate] = useState<StoryTemplate>('annonce');
  const [theme, setTheme] = useState<ThemeType>('dark');
  const [preset, setPreset] = useState<string>('');
  const [exportMode, setExportMode] = useState<ExportMode>('full');
  const [barSize, setBarSize] = useState<ArcSize>('xl');
  const [pngQuality, setPngQuality] = useState<PngQuality>(6);
  
  // Typography states
  const [titleFontSize, setTitleFontSize] = useState(64);
  const [titleBold, setTitleBold] = useState(true);
  const [titleItalic, setTitleItalic] = useState(false);
  const [titleAlignment, setTitleAlignment] = useState<TextAlignment>('center');
  
  // Vertical alignment & composition states
  const [verticalAlignment, setVerticalAlignment] = useState<VerticalAlignment>('center');
  const [selectedCompositionPreset, setSelectedCompositionPreset] = useState<string>('centered');
  const [topMargin, setTopMargin] = useState<number>(0); // pourcentage de marge supérieure
  
  // Annonce fields
  const [badge, setBadge] = useState('Nouveauté');
  const [titre, setTitre] = useState('Découvrez notre nouvelle solution IA');
  const [ctaText, setCtaText] = useState('En savoir plus');
  
  // Chiffre fields
  const [chiffre, setChiffre] = useState('92%');
  const [contexte, setContexte] = useState('des entreprises accompagnées ont augmenté leur productivité');
  const [source, setSource] = useState('Résultats IArche 2024');

  // Témoignage fields
  const [citation, setCitation] = useState('"Grâce à IArche, nous avons automatisé 40% de nos tâches."');
  const [temoinNom, setTemoinNom] = useState('Jean-Pierre Martin');
  const [temoinFonction, setTemoinFonction] = useState('DG, Groupe ABC');

  // Conseil fields
  const [conseilNumero, setConseilNumero] = useState('01');
  const [conseilTitre, setConseilTitre] = useState('Commencez petit');
  const [conseilContenu, setConseilContenu] = useState('Identifiez un cas d\'usage simple avant de généraliser.');

  const applyPreset = (presetId: string) => {
    const selectedPreset = PRESET_TEMPLATES.find(p => p.id === presetId);
    if (selectedPreset) {
      setBadge(selectedPreset.badge);
      setTitre(selectedPreset.titre);
      setCtaText(selectedPreset.ctaText);
      setChiffre(selectedPreset.chiffre);
      setContexte(selectedPreset.contexte);
      setSource(selectedPreset.source);
      // Témoignage fields
      if (selectedPreset.citation) setCitation(selectedPreset.citation);
      if (selectedPreset.temoinNom) setTemoinNom(selectedPreset.temoinNom);
      if (selectedPreset.temoinFonction) setTemoinFonction(selectedPreset.temoinFonction);
      // Conseil fields
      if (selectedPreset.conseilNumero) setConseilNumero(selectedPreset.conseilNumero);
      if (selectedPreset.conseilTitre) setConseilTitre(selectedPreset.conseilTitre);
      if (selectedPreset.conseilContenu) setConseilContenu(selectedPreset.conseilContenu);
      // Auto-switch template based on category
      if (selectedPreset.category === 'temoignage') setTemplate('temoignage');
      else if (selectedPreset.category === 'conseil') setTemplate('conseil');
      else if (selectedPreset.category === 'question') setTemplate('question');
      else if (selectedPreset.category === 'chiffre') setTemplate('chiffre');
      else setTemplate('annonce');
    }
    setPreset(presetId);
  };

  // Apply composition preset
  const applyCompositionPreset = (preset: CompositionPreset) => {
    setSelectedCompositionPreset(preset.id);
    setVerticalAlignment(preset.verticalAlignment);
    setTopMargin(preset.topMargin);
  };

  // Get current data for saving template
  const getCurrentData = useCallback(() => ({
    template, theme, preset, exportMode, barSize, pngQuality,
    titleFontSize, titleBold, titleItalic, titleAlignment,
    verticalAlignment, selectedCompositionPreset, topMargin,
    badge, titre, ctaText, chiffre, contexte, source,
    citation, temoinNom, temoinFonction,
    conseilNumero, conseilTitre, conseilContenu,
  }), [template, theme, preset, exportMode, barSize, pngQuality, titleFontSize, titleBold, titleItalic, titleAlignment, verticalAlignment, selectedCompositionPreset, topMargin, badge, titre, ctaText, chiffre, contexte, source, citation, temoinNom, temoinFonction, conseilNumero, conseilTitre, conseilContenu]);

  // Load template data
  const loadTemplateData = useCallback((data: Record<string, unknown>) => {
    if (data.template) setTemplate(data.template as StoryTemplate);
    if (data.theme) setTheme(data.theme as ThemeType);
    if (data.exportMode) setExportMode(data.exportMode as ExportMode);
    if (data.barSize) setBarSize(data.barSize as ArcSize);
    if (data.pngQuality) setPngQuality(data.pngQuality as PngQuality);
    if (data.titleFontSize !== undefined) setTitleFontSize(data.titleFontSize as number);
    if (data.titleBold !== undefined) setTitleBold(data.titleBold as boolean);
    if (data.titleItalic !== undefined) setTitleItalic(data.titleItalic as boolean);
    if (data.titleAlignment !== undefined) setTitleAlignment(data.titleAlignment as TextAlignment);
    if (data.badge !== undefined) setBadge(data.badge as string);
    if (data.titre !== undefined) setTitre(data.titre as string);
    if (data.ctaText !== undefined) setCtaText(data.ctaText as string);
    if (data.chiffre !== undefined) setChiffre(data.chiffre as string);
    if (data.contexte !== undefined) setContexte(data.contexte as string);
    if (data.source !== undefined) setSource(data.source as string);
    // Témoignage
    if (data.citation !== undefined) setCitation(data.citation as string);
    if (data.temoinNom !== undefined) setTemoinNom(data.temoinNom as string);
    if (data.temoinFonction !== undefined) setTemoinFonction(data.temoinFonction as string);
    // Conseil
    if (data.conseilNumero !== undefined) setConseilNumero(data.conseilNumero as string);
    if (data.conseilTitre !== undefined) setConseilTitre(data.conseilTitre as string);
    if (data.conseilContenu !== undefined) setConseilContenu(data.conseilContenu as string);
    // Vertical alignment & composition
    if (data.verticalAlignment !== undefined) setVerticalAlignment(data.verticalAlignment as VerticalAlignment);
    if (data.selectedCompositionPreset !== undefined) setSelectedCompositionPreset(data.selectedCompositionPreset as string);
    if (data.topMargin !== undefined) setTopMargin(data.topMargin as number);
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
      await exportToPNG(storyRef, `story-${template}`, {
        pixelRatio: pngQuality,
        backgroundColor: theme === 'dark' ? IARCHE_COLORS.bleuNuit : IARCHE_COLORS.blancCasse,
      });
      toast.success(`Story exportée (${STORY_WIDTH * pngQuality}×${STORY_HEIGHT * pngQuality}px)`);
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    }
  };

  const textColor = theme === 'dark' ? IARCHE_COLORS.white : IARCHE_COLORS.bleuNuit;
  const subtextColor = theme === 'dark' ? 'rgba(255,255,255,0.7)' : IARCHE_COLORS.grey;
  const showCanalisations = exportMode === 'full';

  // Minimum spacing from logo to prevent content touching header
  const effectiveTopMargin = getContentSpacing(topMargin, 5);

  const renderStoryContent = () => {
    // Common main content container style with vertical alignment
    const mainContentStyle = {
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: getJustifyContent(verticalAlignment),
      alignItems: titleAlignment === 'center' ? 'center' : titleAlignment === 'left' ? 'flex-start' : 'flex-end',
      height: '100%',
      textAlign: titleAlignment as any,
      paddingTop: verticalAlignment === 'top' ? `${effectiveTopMargin}%` : 0,
    };

    switch (template) {
      case 'annonce':
        // v4.2: Scroll-stopper - titre 80px+, badge avec fond, spacing amélioré
        const storyDisplaySize = Math.max(80, Math.round(titleFontSize * IARCHE_TYPOGRAPHY.display.multiplier));
        
        return (
          <div style={mainContentStyle}>
            {/* Header */}
            <HTMLLogo size="xl" theme={theme} />
            
            {/* Main Content - Scroll-stopper v4.2 */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: `${IARCHE_SPACING.xl}px`, 
              alignItems: titleAlignment === 'center' ? 'center' : titleAlignment === 'left' ? 'flex-start' : 'flex-end',
              padding: `0 ${IARCHE_SPACING.md}px`,
            }}>
              {/* Badge v4.2 avec icône contextuelle et fond */}
              <span style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: '24px',
                fontWeight: IARCHE_BADGES.solid.fontWeight,
                color: theme === 'light' ? IARCHE_COLORS.terracotta : IARCHE_COLORS.white,
                background: theme === 'light' ? IARCHE_COLORS.terracottaLight30 : 'rgba(176, 74, 50, 0.3)',
                padding: '12px 24px',
                borderRadius: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                boxShadow: theme === 'dark' ? IARCHE_EFFECTS.shadow.md : 'none',
              }}>
                {badge}
              </span>
              {/* Titre v4.2 scroll-stopper (80px minimum) */}
              <h1 style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: `${storyDisplaySize}px`,
                fontWeight: titleBold ? IARCHE_TYPOGRAPHY.display.weight : 700,
                fontStyle: titleItalic ? 'italic' : 'normal',
                color: textColor,
                margin: 0,
                lineHeight: IARCHE_TYPOGRAPHY.display.lineHeight,
                letterSpacing: IARCHE_TYPOGRAPHY.display.letterSpacing,
                textShadow: theme === 'dark' ? IARCHE_EFFECTS.shadow.sm : 'none',
              }}>
                {titre}
              </h1>
            </div>

            {/* Swipe Up CTA v4.2 avec animation hint */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              gap: `${IARCHE_SPACING.sm}px`,
            }}>
              <ChevronUp size={48} color={IARCHE_COLORS.terracotta} />
              <span style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: '22px',
                fontWeight: 700,
                color: IARCHE_COLORS.terracotta,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                textShadow: IARCHE_EFFECTS.glow.terracotta,
              }}>
                {ctaText}
              </span>
            </div>
          </div>
        );

      case 'chiffre':
        // v4.2: Chiffre géant avec glow + scroll-stopper
        const storyChiffreSize = Math.round(titleFontSize * 3.5); // +17% vs avant
        
        return (
          <div style={mainContentStyle}>
            {/* Header */}
            <HTMLLogo size="xl" theme={theme} />
            
            {/* Main Content - Big Number v4.2 avec glow */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: `${IARCHE_SPACING.xl}px`, 
              alignItems: titleAlignment === 'center' ? 'center' : titleAlignment === 'left' ? 'flex-start' : 'flex-end',
            }}>
              <div style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: `${storyChiffreSize}px`,
                fontWeight: titleBold ? IARCHE_TYPOGRAPHY.display.weight : 700,
                fontStyle: titleItalic ? 'italic' : 'normal',
                color: IARCHE_COLORS.terracotta,
                lineHeight: 1,
                textShadow: IARCHE_EFFECTS.glow.terracottaStrong,
                letterSpacing: IARCHE_TYPOGRAPHY.display.letterSpacing,
              }}>
                {chiffre}
              </div>
              <p style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: `${Math.round(titleFontSize * 0.6)}px`,
                fontWeight: IARCHE_TYPOGRAPHY.heading.weight,
                color: textColor,
                margin: 0,
                maxWidth: '85%',
                lineHeight: IARCHE_TYPOGRAPHY.heading.lineHeight,
              }}>
                {contexte}
              </p>
            </div>

            {/* Footer v4.2 */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              gap: `${IARCHE_SPACING.sm}px`,
            }}>
              <span style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: `${Math.round(18 * IARCHE_TYPOGRAPHY.caption.multiplier)}px`,
                fontWeight: IARCHE_TYPOGRAPHY.caption.weight,
                color: subtextColor,
                fontStyle: 'italic',
                letterSpacing: IARCHE_TYPOGRAPHY.caption.letterSpacing,
              }}>
                {source}
              </span>
              <span style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: '20px',
                fontWeight: 600,
                color: IARCHE_COLORS.terracotta,
              }}>
                iarche.fr
              </span>
            </div>
          </div>
        );

      case 'temoignage':
        return (
          <div style={{
            ...mainContentStyle,
            alignItems: 'center',
            textAlign: 'center' as any,
          }}>
            {/* Header */}
            <HTMLLogo size="xl" theme={theme} />
            
            {/* Main Content - Citation */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '48px', 
              alignItems: 'center',
              padding: '0 60px',
            }}>
              <span style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: '28px',
                fontWeight: 700,
                color: IARCHE_COLORS.terracotta,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
              }}>
                {badge}
              </span>
              
              {/* Citation avec guillemets décoratifs */}
              <div style={{
                position: 'relative',
                padding: '20px 0',
              }}>
                <span style={{
                  position: 'absolute',
                  top: '-40px',
                  left: '-20px',
                  fontFamily: IARCHE_FONTS.primary,
                  fontSize: '120px',
                  fontWeight: 700,
                  color: IARCHE_COLORS.terracotta,
                  opacity: 0.3,
                  lineHeight: 1,
                }}>
                  "
                </span>
                <p style={{
                  fontFamily: IARCHE_FONTS.primary,
                  fontSize: `${titleFontSize * 0.7}px`,
                  fontWeight: titleBold ? 600 : 400,
                  fontStyle: 'italic',
                  color: textColor,
                  margin: 0,
                  lineHeight: 1.4,
                }}>
                  {citation.replace(/^"|"$/g, '')}
                </p>
              </div>
              
              {/* Auteur */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                alignItems: 'center',
              }}>
                <span style={{
                  fontFamily: IARCHE_FONTS.primary,
                  fontSize: '32px',
                  fontWeight: 700,
                  color: textColor,
                }}>
                  {temoinNom}
                </span>
                <span style={{
                  fontFamily: IARCHE_FONTS.primary,
                  fontSize: '24px',
                  fontWeight: 400,
                  color: subtextColor,
                }}>
                  {temoinFonction}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              gap: '12px',
            }}>
              <ChevronUp size={40} color={IARCHE_COLORS.terracotta} />
              <span style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: '24px',
                fontWeight: 600,
                color: IARCHE_COLORS.terracotta,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}>
                {ctaText}
              </span>
            </div>
          </div>
        );

      case 'conseil':
      case 'question':
        return (
          <div style={mainContentStyle}>
            {/* Header */}
            <HTMLLogo size="xl" theme={theme} />
            
            {/* Main Content */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '40px', 
              alignItems: titleAlignment === 'center' ? 'center' : titleAlignment === 'left' ? 'flex-start' : 'flex-end',
              padding: '0 60px',
            }}>
              <span style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: '28px',
                fontWeight: 700,
                color: IARCHE_COLORS.terracotta,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
              }}>
                {badge}
              </span>
              
              {/* Numéro décoratif */}
              <div style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: `${titleFontSize * 2.5}px`,
                fontWeight: 800,
                color: IARCHE_COLORS.terracotta,
                opacity: 0.2,
                lineHeight: 1,
              }}>
                {conseilNumero}
              </div>
              
              {/* Titre du conseil */}
              <h2 style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: `${titleFontSize}px`,
                fontWeight: titleBold ? 700 : 500,
                fontStyle: titleItalic ? 'italic' : 'normal',
                color: textColor,
                margin: 0,
                lineHeight: 1.2,
              }}>
                {conseilTitre}
              </h2>
              
              {/* Contenu */}
              <p style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: `${titleFontSize * 0.5}px`,
                fontWeight: 400,
                color: subtextColor,
                margin: 0,
                maxWidth: '90%',
                lineHeight: 1.5,
              }}>
                {conseilContenu}
              </p>
            </div>

            {/* Footer */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              gap: '12px',
            }}>
              <ChevronUp size={40} color={IARCHE_COLORS.terracotta} />
              <span style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: '24px',
                fontWeight: 600,
                color: IARCHE_COLORS.terracotta,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}>
                {ctaText}
              </span>
            </div>
          </div>
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
              <h1 className="text-2xl font-bold text-foreground">Stories</h1>
              <p className="text-muted-foreground">1080 × 1920 px (vertical)</p>
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
            <CardContent className="space-y-4">
              {/* Preset templates */}
              <div className="space-y-2">
                <Label>Templates pré-remplis</Label>
                <Select value={preset} onValueChange={applyPreset}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_TEMPLATES.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Template */}
              <div className="space-y-2">
                <Label>Template</Label>
                <Tabs value={template} onValueChange={(v) => setTemplate(v as StoryTemplate)}>
                  <TabsList className="grid grid-cols-5">
                    <TabsTrigger value="annonce" className="text-xs px-2">Annonce</TabsTrigger>
                    <TabsTrigger value="chiffre" className="text-xs px-2">Chiffre</TabsTrigger>
                    <TabsTrigger value="temoignage" className="text-xs px-2">Témoin.</TabsTrigger>
                    <TabsTrigger value="conseil" className="text-xs px-2">Conseil</TabsTrigger>
                    <TabsTrigger value="question" className="text-xs px-2">Question</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Theme */}
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

              {/* Typography controls */}
              <TypographyControls
                label="Typographie"
                fontSize={titleFontSize}
                onFontSizeChange={setTitleFontSize}
                isBold={titleBold}
                onBoldChange={setTitleBold}
                isItalic={titleItalic}
                onItalicChange={setTitleItalic}
                alignment={titleAlignment}
                onAlignmentChange={setTitleAlignment}
                minFontSize={40}
                maxFontSize={80}
              />

              {/* Vertical Alignment Controls */}
              <VerticalAlignmentControls
                value={verticalAlignment}
                onChange={setVerticalAlignment}
              />

              {/* Top Margin Slider */}
              <TopMarginSlider
                value={topMargin}
                onChange={setTopMargin}
              />

              {/* Composition Presets */}
              <CompositionPresets
                selectedPreset={selectedCompositionPreset}
                onSelectPreset={applyCompositionPreset}
                currentVerticalAlignment={verticalAlignment}
                currentTopMargin={topMargin}
                compact
              />

              {/* Export mode controls */}
              <ExportModeControls
                exportMode={exportMode}
                onExportModeChange={setExportMode}
                barSize={barSize}
                onBarSizeChange={setBarSize}
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

              {/* Template-specific fields */}
              {template === 'annonce' && (
                <>
                  <div className="space-y-2">
                    <Label>Badge</Label>
                    <Input value={badge} onChange={(e) => setBadge(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Titre</Label>
                    <Textarea value={titre} onChange={(e) => setTitre(e.target.value)} rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label>CTA (Swipe up)</Label>
                    <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
                  </div>
                </>
              )}

              {template === 'chiffre' && (
                <>
                  <div className="space-y-2">
                    <Label>Chiffre</Label>
                    <Input value={chiffre} onChange={(e) => setChiffre(e.target.value)} placeholder="92%" />
                  </div>
                  <div className="space-y-2">
                    <Label>Contexte</Label>
                    <Textarea value={contexte} onChange={(e) => setContexte(e.target.value)} rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label>Source</Label>
                    <Input value={source} onChange={(e) => setSource(e.target.value)} />
                  </div>
                </>
              )}

              {template === 'temoignage' && (
                <>
                  <div className="space-y-2">
                    <Label>Badge</Label>
                    <Input value={badge} onChange={(e) => setBadge(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Citation</Label>
                    <Textarea value={citation} onChange={(e) => setCitation(e.target.value)} rows={4} placeholder='"Grâce à IArche..."' />
                  </div>
                  <div className="space-y-2">
                    <Label>Nom du témoin</Label>
                    <Input value={temoinNom} onChange={(e) => setTemoinNom(e.target.value)} placeholder="Jean-Pierre Martin" />
                  </div>
                  <div className="space-y-2">
                    <Label>Fonction</Label>
                    <Input value={temoinFonction} onChange={(e) => setTemoinFonction(e.target.value)} placeholder="DG, Groupe ABC" />
                  </div>
                  <div className="space-y-2">
                    <Label>CTA (Swipe up)</Label>
                    <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
                  </div>
                </>
              )}

              {(template === 'conseil' || template === 'question') && (
                <>
                  <div className="space-y-2">
                    <Label>Badge</Label>
                    <Input value={badge} onChange={(e) => setBadge(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Numéro / Icône</Label>
                    <Input value={conseilNumero} onChange={(e) => setConseilNumero(e.target.value)} placeholder="01 ou ?" />
                  </div>
                  <div className="space-y-2">
                    <Label>Titre du conseil</Label>
                    <Input value={conseilTitre} onChange={(e) => setConseilTitre(e.target.value)} placeholder="Commencez petit" />
                  </div>
                  <div className="space-y-2">
                    <Label>Contenu</Label>
                    <Textarea value={conseilContenu} onChange={(e) => setConseilContenu(e.target.value)} rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label>CTA (Swipe up)</Label>
                    <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
                  </div>
                </>
              )}

              {/* Saved Templates */}
              <div className="pt-4 border-t">
                <SavedTemplatesPanel
                  editorType="story"
                  getCurrentData={getCurrentData}
                  onLoadTemplate={loadTemplateData}
                />
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Aperçu</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="overflow-auto rounded-lg border flex justify-center"
                style={{ 
                  backgroundColor: '#f0f0f0',
                  padding: '16px',
                }}
              >
                <div style={{ 
                  transform: `scale(${SCALE})`, 
                  transformOrigin: 'top center',
                  width: STORY_WIDTH * SCALE,
                  height: STORY_HEIGHT * SCALE,
                }}>
                  <HTMLBaseTemplate
                    ref={storyRef}
                    width={STORY_WIDTH}
                    height={STORY_HEIGHT}
                    theme={theme}
                    padding={80}
                    showArches={false}
                  >
                    {renderStoryContent()}
                  </HTMLBaseTemplate>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Aperçu à {Math.round(SCALE * 100)}% — Export en taille réelle (1080×1920px)
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}