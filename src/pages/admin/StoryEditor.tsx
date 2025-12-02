import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

type StoryTemplate = 'annonce' | 'chiffre';

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;
const SCALE = 0.22;

export default function StoryEditor() {
  const navigate = useNavigate();
  const storyRef = useRef<HTMLDivElement>(null);
  
  const [template, setTemplate] = useState<StoryTemplate>('annonce');
  const [theme, setTheme] = useState<ThemeType>('dark');
  
  // Annonce fields
  const [badge, setBadge] = useState('Nouveauté');
  const [titre, setTitre] = useState('Découvrez notre nouvelle solution IA');
  const [ctaText, setCtaText] = useState('En savoir plus');
  
  // Chiffre fields
  const [chiffre, setChiffre] = useState('92%');
  const [contexte, setContexte] = useState('des entreprises accompagnées ont augmenté leur productivité');
  const [source, setSource] = useState('Résultats IArche 2024');

  const handleExport = async () => {
    try {
      await exportToPNG(storyRef, `story-${template}`, {
        pixelRatio: 2,
        backgroundColor: theme === 'dark' ? IARCHE_COLORS.bleuNuit : IARCHE_COLORS.blancCasse,
      });
      toast.success('Story exportée avec succès');
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    }
  };

  const textColor = theme === 'dark' ? IARCHE_COLORS.white : IARCHE_COLORS.bleuNuit;
  const subtextColor = theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(26,43,74,0.7)';

  const renderStoryContent = () => {
    switch (template) {
      case 'annonce':
        return (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            alignItems: 'center',
            height: '100%',
            textAlign: 'center',
          }}>
            {/* Header */}
            <HTMLLogo size="xl" theme={theme} />
            
            {/* Main Content */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '40px', 
              alignItems: 'center',
              padding: '0 20px',
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
              <HTMLGradientBar size="xl" />
              <h1 style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: '64px',
                fontWeight: 700,
                color: textColor,
                margin: 0,
                lineHeight: 1.15,
              }}>
                {titre}
              </h1>
            </div>

            {/* Swipe Up CTA */}
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

      case 'chiffre':
        return (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            alignItems: 'center',
            height: '100%',
            textAlign: 'center',
          }}>
            {/* Header */}
            <HTMLLogo size="xl" theme={theme} />
            
            {/* Main Content - Big Number */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '48px', 
              alignItems: 'center',
            }}>
              <div style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: '220px',
                fontWeight: 800,
                color: IARCHE_COLORS.terracotta,
                lineHeight: 1,
              }}>
                {chiffre}
              </div>
              <HTMLGradientBar size="xl" />
              <p style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: '36px',
                fontWeight: 500,
                color: textColor,
                margin: 0,
                maxWidth: '85%',
                lineHeight: 1.4,
              }}>
                {contexte}
              </p>
            </div>

            {/* Footer */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              gap: '16px',
            }}>
              <span style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: '18px',
                fontWeight: 400,
                color: subtextColor,
                fontStyle: 'italic',
              }}>
                {source}
              </span>
              <span style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: '20px',
                fontWeight: 500,
                color: subtextColor,
              }}>
                iarche.fr
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
              {/* Template */}
              <div className="space-y-2">
                <Label>Template</Label>
                <Tabs value={template} onValueChange={(v) => setTemplate(v as StoryTemplate)}>
                  <TabsList className="grid grid-cols-2">
                    <TabsTrigger value="annonce">Annonce</TabsTrigger>
                    <TabsTrigger value="chiffre">Chiffre</TabsTrigger>
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
                    <SelectItem value="dark">Bleu Nuit (sombre)</SelectItem>
                    <SelectItem value="light">Blanc Cassé (clair)</SelectItem>
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
                    archSize={150}
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
