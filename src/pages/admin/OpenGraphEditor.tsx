import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Briefcase, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

type OGTemplate = 'page' | 'article' | 'solution';

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const SCALE = 0.45;

const SOLUTIONS = [
  { id: 'collaboria', name: 'Collaboria', description: 'Plateforme collaborative IA' },
  { id: 'datalia', name: 'Datalia', description: 'Analyse de données augmentée' },
  { id: 'team5connect', name: 'Team 5 Connect', description: 'Communication d\'équipe intelligente' },
  { id: 'erp-avocat', name: 'ERP Avocat', description: 'Gestion de cabinet boostée à l\'IA' },
  { id: 'chatbot-rag', name: 'Chatbot RAG', description: 'Assistant conversationnel expert' },
];

export default function OpenGraphEditor() {
  const navigate = useNavigate();
  const ogRef = useRef<HTMLDivElement>(null);
  
  const [template, setTemplate] = useState<OGTemplate>('page');
  const [theme, setTheme] = useState<ThemeType>('dark');
  
  // Page fields
  const [pageTitle, setPageTitle] = useState('Services');
  const [pageTagline, setPageTagline] = useState("L'IA se construit avec vous");
  
  // Article fields
  const [articleTitle, setArticleTitle] = useState('Comment intégrer l\'IA dans votre PME');
  const [articleDate, setArticleDate] = useState('15 Janvier 2025');
  const [articleCategory, setArticleCategory] = useState('Guide');
  
  // Solution fields
  const [selectedSolution, setSelectedSolution] = useState(SOLUTIONS[0].id);

  const handleExport = async () => {
    try {
      await exportToPNG(ogRef, `og-${template}`, {
        pixelRatio: 2,
        backgroundColor: theme === 'dark' ? IARCHE_COLORS.bleuNuit : IARCHE_COLORS.blancCasse,
      });
      toast.success('Image Open Graph exportée');
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    }
  };

  const textColor = theme === 'dark' ? IARCHE_COLORS.white : IARCHE_COLORS.bleuNuit;
  const subtextColor = theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(26,43,74,0.7)';

  const renderOGContent = () => {
    switch (template) {
      case 'page':
        return (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            gap: '32px',
            textAlign: 'center',
          }}>
            <HTMLLogo size="xl" theme={theme} />
            <HTMLGradientBar size="lg" />
            <h1 style={{
              fontFamily: IARCHE_FONTS.primary,
              fontSize: '72px',
              fontWeight: 700,
              color: textColor,
              margin: 0,
            }}>
              {pageTitle}
            </h1>
            <p style={{
              fontFamily: IARCHE_FONTS.primary,
              fontSize: '28px',
              fontWeight: 400,
              color: subtextColor,
              margin: 0,
            }}>
              {pageTagline}
            </p>
          </div>
        );

      case 'article':
        return (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            height: '100%',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <HTMLLogo size="lg" theme={theme} />
              <span style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: '18px',
                fontWeight: 600,
                color: IARCHE_COLORS.white,
                backgroundColor: IARCHE_COLORS.terracotta,
                padding: '8px 20px',
                borderRadius: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {articleCategory}
              </span>
            </div>

            {/* Content */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '24px',
              maxWidth: '85%',
            }}>
              <HTMLGradientBar size="lg" />
              <h1 style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: '52px',
                fontWeight: 700,
                color: textColor,
                margin: 0,
                lineHeight: 1.15,
              }}>
                {articleTitle}
              </h1>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <FileText size={24} color={IARCHE_COLORS.terracotta} />
              <span style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: '20px',
                fontWeight: 500,
                color: subtextColor,
              }}>
                {articleDate} · iarche.fr
              </span>
            </div>
          </div>
        );

      case 'solution':
        const solution = SOLUTIONS.find(s => s.id === selectedSolution) || SOLUTIONS[0];
        return (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            height: '100%',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <HTMLLogo size="lg" theme={theme} />
              <span style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: '16px',
                fontWeight: 500,
                color: subtextColor,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}>
                Solution IArche
              </span>
            </div>

            {/* Content */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: '48px',
            }}>
              {/* Icon */}
              <div style={{
                width: '140px',
                height: '140px',
                borderRadius: '24px',
                backgroundColor: IARCHE_COLORS.terracotta,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Briefcase size={64} color={IARCHE_COLORS.white} />
              </div>
              
              {/* Text */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <HTMLGradientBar size="lg" />
                <h1 style={{
                  fontFamily: IARCHE_FONTS.primary,
                  fontSize: '64px',
                  fontWeight: 700,
                  color: textColor,
                  margin: 0,
                }}>
                  {solution.name}
                </h1>
                <p style={{
                  fontFamily: IARCHE_FONTS.primary,
                  fontSize: '28px',
                  fontWeight: 400,
                  color: subtextColor,
                  margin: 0,
                }}>
                  {solution.description}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Globe size={20} color={IARCHE_COLORS.terracotta} />
              <span style={{
                fontFamily: IARCHE_FONTS.primary,
                fontSize: '18px',
                fontWeight: 500,
                color: subtextColor,
              }}>
                iarche.fr/solutions/{solution.id}
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
              <h1 className="text-2xl font-bold text-foreground">Open Graph</h1>
              <p className="text-muted-foreground">1200 × 630 px — Aperçus de partage</p>
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
                <Tabs value={template} onValueChange={(v) => setTemplate(v as OGTemplate)}>
                  <TabsList className="grid grid-cols-3">
                    <TabsTrigger value="page">Page</TabsTrigger>
                    <TabsTrigger value="article">Article</TabsTrigger>
                    <TabsTrigger value="solution">Solution</TabsTrigger>
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
              {template === 'page' && (
                <>
                  <div className="space-y-2">
                    <Label>Titre de la page</Label>
                    <Input value={pageTitle} onChange={(e) => setPageTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tagline</Label>
                    <Input value={pageTagline} onChange={(e) => setPageTagline(e.target.value)} />
                  </div>
                </>
              )}

              {template === 'article' && (
                <>
                  <div className="space-y-2">
                    <Label>Titre de l'article</Label>
                    <Input value={articleTitle} onChange={(e) => setArticleTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input value={articleDate} onChange={(e) => setArticleDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Catégorie</Label>
                    <Input value={articleCategory} onChange={(e) => setArticleCategory(e.target.value)} />
                  </div>
                </>
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
                  backgroundColor: '#f0f0f0',
                  padding: '16px',
                }}
              >
                <div style={{ 
                  transform: `scale(${SCALE})`, 
                  transformOrigin: 'top left',
                  width: OG_WIDTH * SCALE,
                  height: OG_HEIGHT * SCALE,
                }}>
                  <HTMLBaseTemplate
                    ref={ogRef}
                    width={OG_WIDTH}
                    height={OG_HEIGHT}
                    theme={theme}
                    padding={60}
                    showArches={false}
                    showCanalisations={true}
                    canalisationOpacity={0.4}
                    canalisationStrokeWidth={5}
                  >
                    {renderOGContent()}
                  </HTMLBaseTemplate>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Aperçu à {Math.round(SCALE * 100)}% — Export en taille réelle (1200×630px)
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
