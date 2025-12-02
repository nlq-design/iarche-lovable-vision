import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Calendar, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import AdminLayout from '@/components/layouts/AdminLayout';
import { exportToPNG } from '@/lib/exportPng';
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
  const thumbnailRef = useRef<HTMLDivElement>(null);
  
  const [format, setFormat] = useState<ThumbnailFormat>('standard');
  const [theme, setTheme] = useState<ThemeType>('dark');
  const [eventType, setEventType] = useState<EventType>('webinaire');
  
  // Content fields
  const [titre, setTitre] = useState('Intégrer l\'IA dans votre PME');
  const [sousTitre, setSousTitre] = useState('Les étapes clés pour réussir votre transformation');
  const [date, setDate] = useState('15 Janvier 2025');
  const [heure, setHeure] = useState('14h00');
  
  // Speaker fields
  const [speakerNom, setSpeakerNom] = useState('Nicolas Lara-Quétier');
  const [speakerFonction, setSpeakerFonction] = useState('CEO & Fondateur, IArche');
  const [showSpeaker, setShowSpeaker] = useState(true);

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

  const badgeColor = eventType === 'replay' ? IARCHE_COLORS.bleuNuit : IARCHE_COLORS.terracotta;
  const badgeBg = eventType === 'replay' 
    ? (theme === 'dark' ? 'rgba(255,255,255,0.9)' : IARCHE_COLORS.bleuNuit)
    : IARCHE_COLORS.terracotta;
  const badgeText = eventType === 'replay' 
    ? (theme === 'dark' ? IARCHE_COLORS.bleuNuit : IARCHE_COLORS.white)
    : IARCHE_COLORS.white;

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
                    showCanalisations={true}
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
                      }}>
                        <HTMLGradientBar size="xl" />
                        <h1 style={{
                          fontFamily: IARCHE_FONTS.primary,
                          fontSize: format === 'standard' ? '72px' : '56px',
                          fontWeight: 700,
                          color: textColor,
                          margin: 0,
                          lineHeight: 1.1,
                        }}>
                          {titre}
                        </h1>
                        <p style={{
                          fontFamily: IARCHE_FONTS.primary,
                          fontSize: format === 'standard' ? '32px' : '24px',
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
