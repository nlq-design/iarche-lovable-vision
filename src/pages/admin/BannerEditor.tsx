import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const BANNER_WIDTH = 1584;
const BANNER_HEIGHT = 396;
const SCALE = 0.4; // Preview scale

const SOLUTIONS = [
  { id: 'collaboria', name: 'Collaboria', description: 'Plateforme collaborative IA pour équipes' },
  { id: 'datalia', name: 'Datalia', description: 'Analyse de données augmentée par l\'IA' },
  { id: 'team5connect', name: 'Team 5 Connect', description: 'Communication d\'équipe intelligente' },
  { id: 'erp-avocat', name: 'ERP Avocat', description: 'Gestion de cabinet boostée à l\'IA' },
  { id: 'chatbot-rag', name: 'Chatbot RAG Avancé', description: 'Assistant conversationnel expert' },
];

type BannerTemplate = 'entreprise' | 'solution' | 'ceo';

export default function BannerEditor() {
  const navigate = useNavigate();
  const bannerRef = useRef<HTMLDivElement>(null);
  
  const [template, setTemplate] = useState<BannerTemplate>('entreprise');
  const [theme, setTheme] = useState<ThemeType>('dark');
  
  // Entreprise fields
  const [tagline, setTagline] = useState("L'IA se construit avec vous");
  
  // Solution fields
  const [selectedSolution, setSelectedSolution] = useState(SOLUTIONS[0].id);
  
  // CEO fields
  const [ceoName, setCeoName] = useState('Nicolas Lara-Quétier');
  const [ceoTitle, setCeoTitle] = useState('CEO & Fondateur');

  const handleExport = async () => {
    try {
      await exportToPNG(bannerRef, `banner-${template}`, {
        pixelRatio: 2,
        backgroundColor: theme === 'dark' ? IARCHE_COLORS.bleuNuit : IARCHE_COLORS.blancCasse,
      });
      toast.success('Bannière exportée avec succès');
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    }
  };

  const textColor = theme === 'dark' ? IARCHE_COLORS.white : IARCHE_COLORS.bleuNuit;
  const subtextColor = theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(26,43,74,0.7)';

  const renderBannerContent = () => {
    switch (template) {
      case 'entreprise':
        return (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center',
            height: '100%',
            gap: '24px',
          }}>
            <HTMLLogo size="xl" theme={theme} />
            <HTMLGradientBar size="lg" />
            <p style={{
              fontFamily: IARCHE_FONTS.primary,
              fontSize: '32px',
              fontWeight: 400,
              color: subtextColor,
              margin: 0,
              letterSpacing: '0.02em',
            }}>
              {tagline}
            </p>
          </div>
        );

      case 'solution':
        const solution = SOLUTIONS.find(s => s.id === selectedSolution) || SOLUTIONS[0];
        return (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center',
            height: '100%',
            gap: '20px',
          }}>
            <HTMLLogo size="lg" theme={theme} />
            <HTMLGradientBar size="md" />
            <h2 style={{
              fontFamily: IARCHE_FONTS.primary,
              fontSize: '48px',
              fontWeight: 700,
              color: textColor,
              margin: 0,
            }}>
              {solution.name}
            </h2>
            <p style={{
              fontFamily: IARCHE_FONTS.primary,
              fontSize: '24px',
              fontWeight: 400,
              color: subtextColor,
              margin: 0,
            }}>
              {solution.description}
            </p>
          </div>
        );

      case 'ceo':
        return (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            height: '100%',
            gap: '48px',
          }}>
            {/* Photo placeholder */}
            <div style={{
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(26,43,74,0.1)',
              border: `3px solid ${IARCHE_COLORS.terracotta}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Image size={48} color={subtextColor} />
            </div>
            
            {/* Info */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: '16px',
            }}>
              <HTMLLogo size="lg" theme={theme} />
              <HTMLGradientBar size="md" />
              <h2 style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: '36px',
                fontWeight: 700,
                color: textColor,
                margin: 0,
              }}>
                {ceoName}
              </h2>
              <p style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: '24px',
                fontWeight: 400,
                color: IARCHE_COLORS.terracotta,
                margin: 0,
              }}>
                {ceoTitle}
              </p>
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
              <h1 className="text-2xl font-bold text-foreground">Bannières LinkedIn</h1>
              <p className="text-muted-foreground">1584 × 396 px</p>
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
              {/* Template selector */}
              <div className="space-y-2">
                <Label>Template</Label>
                <Tabs value={template} onValueChange={(v) => setTemplate(v as BannerTemplate)}>
                  <TabsList className="grid grid-cols-3">
                    <TabsTrigger value="entreprise">Entreprise</TabsTrigger>
                    <TabsTrigger value="solution">Solution</TabsTrigger>
                    <TabsTrigger value="ceo">CEO</TabsTrigger>
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
                    <SelectItem value="dark">Bleu Nuit (sombre)</SelectItem>
                    <SelectItem value="light">Blanc Cassé (clair)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Template-specific fields */}
              {template === 'entreprise' && (
                <div className="space-y-2">
                  <Label>Tagline</Label>
                  <Input
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="L'IA se construit avec vous"
                  />
                </div>
              )}

              {template === 'solution' && (
                <div className="space-y-2">
                  <Label>Solution</Label>
                  <Select value={selectedSolution} onValueChange={setSelectedSolution}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOLUTIONS.map((sol) => (
                        <SelectItem key={sol.id} value={sol.id}>
                          {sol.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {template === 'ceo' && (
                <>
                  <div className="space-y-2">
                    <Label>Nom</Label>
                    <Input
                      value={ceoName}
                      onChange={(e) => setCeoName(e.target.value)}
                      placeholder="Prénom Nom"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Titre</Label>
                    <Input
                      value={ceoTitle}
                      onChange={(e) => setCeoTitle(e.target.value)}
                      placeholder="CEO & Fondateur"
                    />
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
                <div style={{ transform: `scale(${SCALE})`, transformOrigin: 'top left' }}>
                  <HTMLBaseTemplate
                    ref={bannerRef}
                    width={BANNER_WIDTH}
                    height={BANNER_HEIGHT}
                    theme={theme}
                    padding={60}
                    archSize={80}
                  >
                    {renderBannerContent()}
                  </HTMLBaseTemplate>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Aperçu à {Math.round(SCALE * 100)}% — Export en taille réelle (1584×396px)
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
