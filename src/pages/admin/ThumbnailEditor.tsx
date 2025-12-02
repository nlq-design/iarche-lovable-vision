import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Download, Calendar, Clock, User } from 'lucide-react';
import { MediaTemplate } from '@/hooks/useMediaTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import AdminLayout from '@/components/layouts/AdminLayout';
import { exportToPNG } from '@/lib/exportPng';
import TypographyControls, { TextAlignment } from '@/components/admin/medias/TypographyControls';
import SavedTemplatesPanel from '@/components/admin/medias/SavedTemplatesPanel';
import ExportModeControls, { ExportMode } from '@/components/admin/medias/ExportModeControls';
import { BarSize } from '@/components/admin/medias/html/tokens';
import {
  HTMLBaseTemplate,
  HTMLLogo,
  HTMLGradientBar,
  IARCHE_COLORS,
  IARCHE_FONTS,
  ThemeType,
} from '@/components/admin/medias/html';

type ThumbnailFormat = 'standard' | 'youtube';
type EventType = 'webinaire' | 'atelier' | 'replay';

type PresetTemplate = {
  id: string;
  label: string;
  titre: string;
  sousTitre: string;
  date: string;
  heure: string;
  eventType: EventType;
};

const PRESET_TEMPLATES: PresetTemplate[] = [
  { id: 'webinaire-ia', label: 'Webinaire IA PME', titre: 'Intégrer l\'IA dans votre PME', sousTitre: 'Les étapes clés pour réussir votre transformation', date: '15 Janvier 2025', heure: '14h00', eventType: 'webinaire' },
  { id: 'atelier-audit', label: 'Atelier Audit', titre: 'Audit IA : Diagnostiquez votre entreprise', sousTitre: 'Identifiez les opportunités d\'automatisation', date: '22 Janvier 2025', heure: '10h00', eventType: 'atelier' },
  { id: 'replay-formation', label: 'Replay Formation', titre: 'Formation IA pour dirigeants', sousTitre: 'Comprendre et piloter l\'IA dans votre organisation', date: 'Disponible', heure: '2h30', eventType: 'replay' },
  { id: 'webinaire-chatbot', label: 'Webinaire Chatbot', titre: 'Créer un chatbot IA performant', sousTitre: 'De la conception au déploiement', date: '5 Février 2025', heure: '11h00', eventType: 'webinaire' },
  { id: 'atelier-donnees', label: 'Atelier Données', titre: 'Exploitez vos données avec l\'IA', sousTitre: 'Analyse et visualisation avancées', date: '12 Février 2025', heure: '14h30', eventType: 'atelier' },
];

const DIMENSIONS = {
  standard: { width: 1920, height: 1080 },
  youtube: { width: 1280, height: 720 },
};

const EVENT_LABELS: Record<EventType, string> = {
  webinaire: 'Webinaire',
  atelier: 'Atelier',
  replay: 'Replay',
};

const SCALE = 0.3;

export default function ThumbnailEditor() {
  const navigate = useNavigate();
  const location = useLocation();
  const thumbnailRef = useRef<HTMLDivElement>(null);
  
  const [format, setFormat] = useState<ThumbnailFormat>('standard');
  const [theme, setTheme] = useState<ThemeType>('dark');
  const [eventType, setEventType] = useState<EventType>('webinaire');
  const [preset, setPreset] = useState<string>('');
  const [exportMode, setExportMode] = useState<ExportMode>('full');
  const [barSize, setBarSize] = useState<BarSize>('xl');
  
  // Typography states
  const [titleFontSize, setTitleFontSize] = useState(72);
  const [titleBold, setTitleBold] = useState(true);
  const [titleItalic, setTitleItalic] = useState(false);
  const [titleAlignment, setTitleAlignment] = useState<TextAlignment>('left');
  
  // Content fields
  const [titre, setTitre] = useState('Intégrer l\'IA dans votre PME');
  const [sousTitre, setSousTitre] = useState('Les étapes clés pour réussir votre transformation');
  const [date, setDate] = useState('15 Janvier 2025');
  const [heure, setHeure] = useState('14h00');
  
  // Speaker fields
  const [speakerNom, setSpeakerNom] = useState('Nicolas Lara-Quétier');
  const [speakerFonction, setSpeakerFonction] = useState('CEO & Fondateur, IArche');
  const [showSpeaker, setShowSpeaker] = useState(true);

  const applyPreset = (presetId: string) => {
    const selectedPreset = PRESET_TEMPLATES.find(p => p.id === presetId);
    if (selectedPreset) {
      setTitre(selectedPreset.titre);
      setSousTitre(selectedPreset.sousTitre);
      setDate(selectedPreset.date);
      setHeure(selectedPreset.heure);
      setEventType(selectedPreset.eventType);
    }
    setPreset(presetId);
  };

  // Get current data for saving template
  const getCurrentData = useCallback(() => ({
    format, theme, eventType, preset, exportMode, barSize,
    titleFontSize, titleBold, titleItalic, titleAlignment,
    titre, sousTitre, date, heure,
    speakerNom, speakerFonction, showSpeaker,
  }), [format, theme, eventType, preset, exportMode, barSize, titleFontSize, titleBold, titleItalic, titleAlignment, titre, sousTitre, date, heure, speakerNom, speakerFonction, showSpeaker]);

  // Load template data
  const loadTemplateData = useCallback((data: Record<string, unknown>) => {
    if (data.format) setFormat(data.format as ThumbnailFormat);
    if (data.theme) setTheme(data.theme as ThemeType);
    if (data.eventType) setEventType(data.eventType as EventType);
    if (data.exportMode) setExportMode(data.exportMode as ExportMode);
    if (data.barSize) setBarSize(data.barSize as BarSize);
    if (data.titleFontSize !== undefined) setTitleFontSize(data.titleFontSize as number);
    if (data.titleBold !== undefined) setTitleBold(data.titleBold as boolean);
    if (data.titleItalic !== undefined) setTitleItalic(data.titleItalic as boolean);
    if (data.titleAlignment !== undefined) setTitleAlignment(data.titleAlignment as TextAlignment);
    if (data.titre !== undefined) setTitre(data.titre as string);
    if (data.sousTitre !== undefined) setSousTitre(data.sousTitre as string);
    if (data.date !== undefined) setDate(data.date as string);
    if (data.heure !== undefined) setHeure(data.heure as string);
    if (data.speakerNom !== undefined) setSpeakerNom(data.speakerNom as string);
    if (data.speakerFonction !== undefined) setSpeakerFonction(data.speakerFonction as string);
    if (data.showSpeaker !== undefined) setShowSpeaker(data.showSpeaker as boolean);
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
      await exportToPNG(thumbnailRef, `thumbnail-${eventType}-${format}`, {
        pixelRatio: 2,
        backgroundColor: theme === 'dark' ? IARCHE_COLORS.bleuNuit : IARCHE_COLORS.blancCasse,
      });
      toast.success('Miniature exportée avec succès');
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    }
  };

  const { width, height } = DIMENSIONS[format];
  const textColor = theme === 'dark' ? IARCHE_COLORS.white : IARCHE_COLORS.bleuNuit;
  const subtextColor = theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(26,43,74,0.7)';

  const badgeBg = eventType === 'replay' 
    ? (theme === 'dark' ? 'rgba(255,255,255,0.9)' : IARCHE_COLORS.bleuNuit)
    : IARCHE_COLORS.terracotta;
  const badgeText = eventType === 'replay' 
    ? (theme === 'dark' ? IARCHE_COLORS.bleuNuit : IARCHE_COLORS.white)
    : IARCHE_COLORS.white;

  const showBar = exportMode === 'with-bar' || exportMode === 'full';
  const actualTitleSize = format === 'standard' ? titleFontSize : titleFontSize * 0.78;
  const actualSubtitleSize = format === 'standard' ? titleFontSize * 0.44 : titleFontSize * 0.33;

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
              <h1 className="text-2xl font-bold text-foreground">Miniatures Webinaire</h1>
              <p className="text-muted-foreground">
                {format === 'standard' ? '1920×1080px' : '1280×720px'}
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

              {/* Format */}
              <div className="space-y-2">
                <Label>Format</Label>
                <Select value={format} onValueChange={(v) => setFormat(v as ThumbnailFormat)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard (1920×1080)</SelectItem>
                    <SelectItem value="youtube">YouTube (1280×720)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Theme */}
              <div className="space-y-2">
                <Label>Thème</Label>
                <Select value={theme} onValueChange={(v) => setTheme(v as ThemeType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Bleu Nuit (sombre)</SelectItem>
                    <SelectItem value="light">Blanc Cassé (clair)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Event Type */}
              <div className="space-y-2">
                <Label>Type d'événement</Label>
                <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="webinaire">Webinaire</SelectItem>
                    <SelectItem value="atelier">Atelier</SelectItem>
                    <SelectItem value="replay">Replay</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Typography controls */}
              <TypographyControls
                label="Typographie titre"
                fontSize={titleFontSize}
                onFontSizeChange={setTitleFontSize}
                isBold={titleBold}
                onBoldChange={setTitleBold}
                isItalic={titleItalic}
                onItalicChange={setTitleItalic}
                alignment={titleAlignment}
                onAlignmentChange={setTitleAlignment}
                minFontSize={48}
                maxFontSize={96}
              />

              {/* Content */}
              <div className="space-y-2">
                <Label>Titre</Label>
                <Input value={titre} onChange={(e) => setTitre(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Sous-titre</Label>
                <Input value={sousTitre} onChange={(e) => setSousTitre(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Heure</Label>
                  <Input value={heure} onChange={(e) => setHeure(e.target.value)} />
                </div>
              </div>

              {/* Speaker */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="showSpeaker"
                    checked={showSpeaker} 
                    onChange={(e) => setShowSpeaker(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="showSpeaker">Afficher l'intervenant</Label>
                </div>
              </div>
              {showSpeaker && (
                <>
                  <div className="space-y-2">
                    <Label>Nom intervenant</Label>
                    <Input value={speakerNom} onChange={(e) => setSpeakerNom(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Fonction</Label>
                    <Input value={speakerFonction} onChange={(e) => setSpeakerFonction(e.target.value)} />
                  </div>
                </>
              )}

              {/* Export Mode Controls */}
              <ExportModeControls
                exportMode={exportMode}
                onExportModeChange={setExportMode}
                barSize={barSize}
                onBarSizeChange={setBarSize}
                compact={true}
              />

              {/* Saved Templates */}
              <div className="pt-4 border-t">
                <SavedTemplatesPanel
                  editorType="thumbnail"
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
                className="overflow-auto rounded-lg border"
                style={{ 
                  maxWidth: '100%',
                  backgroundColor: '#f0f0f0',
                  padding: '16px',
                }}
              >
                <div style={{ 
                  transform: `scale(${SCALE})`, 
                  transformOrigin: 'top left',
                  width: width * SCALE,
                  height: height * SCALE,
                }}>
                  <HTMLBaseTemplate
                    ref={thumbnailRef}
                    width={width}
                    height={height}
                    theme={theme}
                    padding={80}
                    showArches={false}
                    showCanalisations={exportMode === 'full'}
                    canalisationOpacity={0.4}
                    canalisationStrokeWidth={format === 'standard' ? 7 : 5}
                  >
                    <div style={{
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'space-between',
                      height: '100%',
                    }}>
                      {/* Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <HTMLLogo size="xl" theme={theme} />
                        <span style={{
                          fontFamily: IARCHE_FONTS.primary,
                          fontSize: '20px',
                          fontWeight: 700,
                          color: badgeText,
                          backgroundColor: badgeBg,
                          padding: '12px 24px',
                          borderRadius: '8px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}>
                          {EVENT_LABELS[eventType]}
                        </span>
                      </div>

                      {/* Main Content */}
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '24px',
                        maxWidth: '70%',
                        textAlign: titleAlignment,
                      }}>
                        {showBar && <HTMLGradientBar size={barSize} />}
                        <h1 style={{
                          fontFamily: IARCHE_FONTS.primary,
                          fontSize: `${actualTitleSize}px`,
                          fontWeight: titleBold ? 700 : 400,
                          fontStyle: titleItalic ? 'italic' : 'normal',
                          color: textColor,
                          margin: 0,
                          lineHeight: 1.1,
                        }}>
                          {titre}
                        </h1>
                        <p style={{
                          fontFamily: IARCHE_FONTS.primary,
                          fontSize: `${actualSubtitleSize}px`,
                          fontWeight: 400,
                          color: subtextColor,
                          margin: 0,
                          lineHeight: 1.4,
                        }}>
                          {sousTitre}
                        </p>
                      </div>

                      {/* Footer */}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'flex-end',
                      }}>
                        {/* Date & Time */}
                        <div style={{ display: 'flex', gap: '32px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Calendar size={24} color={IARCHE_COLORS.terracotta} />
                            <span style={{
                              fontFamily: IARCHE_FONTS.primary,
                              fontSize: '24px',
                              fontWeight: 600,
                              color: textColor,
                            }}>
                              {date}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Clock size={24} color={IARCHE_COLORS.terracotta} />
                            <span style={{
                              fontFamily: IARCHE_FONTS.primary,
                              fontSize: '24px',
                              fontWeight: 600,
                              color: textColor,
                            }}>
                              {heure}
                            </span>
                          </div>
                        </div>

                        {/* Speaker */}
                        {showSpeaker && (
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '16px',
                            backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(26,43,74,0.05)',
                            padding: '16px 24px',
                            borderRadius: '12px',
                          }}>
                            <div style={{
                              width: '56px',
                              height: '56px',
                              borderRadius: '50%',
                              backgroundColor: IARCHE_COLORS.terracotta,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              <User size={28} color={IARCHE_COLORS.white} />
                            </div>
                            <div>
                              <div style={{
                                fontFamily: IARCHE_FONTS.primary,
                                fontSize: '20px',
                                fontWeight: 700,
                                color: textColor,
                              }}>
                                {speakerNom}
                              </div>
                              <div style={{
                                fontFamily: IARCHE_FONTS.primary,
                                fontSize: '16px',
                                fontWeight: 400,
                                color: subtextColor,
                              }}>
                                {speakerFonction}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </HTMLBaseTemplate>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Aperçu à {Math.round(SCALE * 100)}% — Export en taille réelle ({width}×{height}px)
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}