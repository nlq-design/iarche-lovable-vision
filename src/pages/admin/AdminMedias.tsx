import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Linkedin, 
  FileText, 
  FileIcon, 
  Plus, 
  Image, 
  Mail, 
  Video, 
  Smartphone, 
  Globe,
  MailOpen,
  Bookmark,
  Trash2,
  Pencil,
  Loader2,
  ExternalLink,
  Wrench,
  Palette,
  QrCode,
  FileImage,
  MailPlus,
  Instagram,
  Twitter,
  Facebook,
  Layers,
  User
} from 'lucide-react';
import { useMediaTemplates, EditorType, MediaTemplate } from '@/hooks/useMediaTemplates';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { CarouselEditor } from '@/components/admin/medias/CarouselEditor';
import { PresentationEditor } from '@/components/admin/medias/PresentationEditor';
import { WordDocEditor } from '@/components/admin/medias/WordDocEditor';
import { COLORS_PERSO } from '@/components/admin/medias/perso/tokensPerso';
import { IARCHE_I_COLORS } from '@/components/admin/medias/CharterSelector';

type MediaType = 'carousel' | 'presentation' | 'word' | null;
type TemplateType = string | null;

const carouselTemplates = [
  { id: 'solution', name: 'Annonce Solution', description: 'Présenter une solution IArche', slides: 5 },
  { id: 'article', name: 'Partage Article', description: 'Transformer un article en carrousel', slides: 6 },
  { id: 'stats', name: 'Chiffres Clés', description: 'Mettre en avant des statistiques', slides: 4 },
];

const presentationTemplates = [
  { id: 'pitch', name: 'Pitch Commercial', description: 'Présentation de l\'agence et services', slides: 10 },
  { id: 'project', name: 'Présentation Projet', description: 'Détailler une solution à un prospect', slides: 12 },
  { id: 'report', name: 'Rapport / Bilan', description: 'Synthèse de résultats ou d\'activité', slides: 8 },
];

const wordTemplates = [
  { id: 'proposal', name: 'Proposition Commerciale', description: 'Devis et proposition client structurée', pages: 4 },
  { id: 'report', name: 'Compte-Rendu', description: 'Synthèse de réunion ou d\'audit', pages: 3 },
  { id: 'datasheet', name: 'Fiche Technique', description: 'Description détaillée d\'une solution', pages: 2 },
];

const visualTemplates = [
  { 
    id: 'banner', 
    name: 'Bannières LinkedIn', 
    description: 'Bannière de profil/page entreprise',
    dimensions: '1584×396px',
    icon: Linkedin,
    route: '/admin/medias/banner',
    ready: true,
  },
  { 
    id: 'post', 
    name: 'Posts LinkedIn', 
    description: 'Visuels carrés et paysage',
    dimensions: '1200×1200 / 1200×627px',
    icon: Image,
    route: '/admin/medias/post',
    ready: true,
  },
  { 
    id: 'signature', 
    name: 'Signature Email', 
    description: 'HTML + PNG compatible Outlook/Gmail',
    dimensions: '600×200px',
    icon: Mail,
    route: '/admin/medias/signature',
    ready: true,
  },
  { 
    id: 'thumbnail', 
    name: 'Miniatures', 
    description: 'Webinaires, ateliers, replays',
    dimensions: '1920×1080 / 1280×720px',
    icon: Video,
    route: '/admin/medias/thumbnail',
    ready: true,
  },
  { 
    id: 'story', 
    name: 'Stories', 
    description: 'Format vertical Instagram/LinkedIn',
    dimensions: '1080×1920px',
    icon: Smartphone,
    route: '/admin/medias/story',
    ready: true,
  },
  { 
    id: 'og', 
    name: 'Open Graph', 
    description: 'Aperçus de partage de liens',
    dimensions: '1200×630px',
    icon: Globe,
    route: '/admin/medias/og',
    ready: true,
  },
  { 
    id: 'header-email', 
    name: 'Header Email', 
    description: 'En-tête pour newsletters',
    dimensions: '600×150px',
    icon: MailOpen,
    route: '/admin/medias/header-email',
    ready: true,
  },
];

const toolsTemplates = [
  { 
    id: 'logo', 
    name: 'Variations Logo', 
    description: '4 déclinaisons (transparent, blanc, sombre, monochrome)',
    icon: FileImage,
    route: '/admin/medias/logo',
  },
  { 
    id: 'favicon', 
    name: 'Favicon Multi-Format', 
    description: 'Pack complet ICO + PNG + Manifest',
    icon: Globe,
    route: '/admin/medias/favicon',
  },
  { 
    id: 'charte', 
    name: 'Charte Graphique', 
    description: 'PDF A4 auto-généré',
    icon: Palette,
    route: '/admin/medias/charte',
  },
  { 
    id: 'qrcode', 
    name: 'QR Code Brandé', 
    description: 'QR aux couleurs IArche',
    icon: QrCode,
    route: '/admin/medias/qrcode',
  },
  { 
    id: 'header-doc', 
    name: 'En-tête Document', 
    description: 'PNG pour Word/Google Docs',
    icon: FileText,
    route: '/admin/medias/header-doc',
  },
  { 
    id: 'footer-email', 
    name: 'Footer Email HTML', 
    description: 'Pied de page newsletter',
    icon: MailPlus,
    route: '/admin/medias/footer-email',
  },
];

// Formats personnels (IArche II)
const persoFormats = [
  { 
    id: 'profile', 
    name: 'Photo de Profil', 
    description: 'Multi-réseaux',
    dimensions: '400×400px',
    icon: User,
    platforms: [Linkedin, Twitter, Instagram, Facebook],
    route: '/admin/medias-perso/profile',
  },
  { 
    id: 'post', 
    name: 'Post Carré', 
    description: 'LinkedIn & Instagram',
    dimensions: '1080×1080px',
    icon: Image,
    platforms: [Linkedin, Instagram],
    route: '/admin/medias-perso/post',
  },
  { 
    id: 'banner', 
    name: 'Bannière LinkedIn', 
    description: 'Profil ou page entreprise',
    dimensions: '1584×396px',
    icon: Linkedin,
    platforms: [Linkedin],
    route: '/admin/medias-perso/banner',
  },
  { 
    id: 'story', 
    name: 'Story', 
    description: 'Instagram & LinkedIn Stories',
    dimensions: '1080×1920px',
    icon: Smartphone,
    platforms: [Linkedin, Instagram],
    route: '/admin/medias-perso/story',
  },
  { 
    id: 'carousel', 
    name: 'Carrousel', 
    description: 'Multi-slides LinkedIn',
    dimensions: '1080×1350px',
    icon: Layers,
    platforms: [Linkedin],
    route: '/admin/medias-perso/carousel',
  },
];

const AdminMedias = () => {
  const navigate = useNavigate();
  const [selectedMedia, setSelectedMedia] = useState<MediaType>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>(null);

  const handleSelectTemplate = (mediaType: MediaType, templateId: string) => {
    setSelectedMedia(mediaType);
    setSelectedTemplate(templateId);
  };

  const handleBack = () => {
    setSelectedMedia(null);
    setSelectedTemplate(null);
  };

  // Render editor based on selection
  if (selectedMedia && selectedTemplate) {
    switch (selectedMedia) {
      case 'carousel':
        return <CarouselEditor templateId={selectedTemplate} onBack={handleBack} />;
      case 'presentation':
        return <PresentationEditor templateId={selectedTemplate} onBack={handleBack} />;
      case 'word':
        return <WordDocEditor templateId={selectedTemplate} onBack={handleBack} />;
    }
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Médias & Communication</h1>
          <p className="text-muted-foreground mt-1">
            Générez des supports de communication conformes aux chartes graphiques
          </p>
        </div>

        {/* Deux sections côte à côte */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          
          {/* === CHARTE IARCHE I (Officielle) === */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${IARCHE_I_COLORS.bleuNuit} 0%, ${IARCHE_I_COLORS.terracotta} 100%)` }}
              >
                <Palette className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">IArche I – Charte Officielle</h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: IARCHE_I_COLORS.bleuNuit }} title="Bleu Nuit" />
                  <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: IARCHE_I_COLORS.terracotta }} title="Terracotta" />
                  <div className="w-4 h-4 rounded-full border border-muted" style={{ backgroundColor: IARCHE_I_COLORS.blancCasse }} title="Blanc Cassé" />
                </div>
              </div>
            </div>

            <Tabs defaultValue="visuels-i" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="documents-i" className="text-xs">📄 PDF</TabsTrigger>
                <TabsTrigger value="visuels-i" className="text-xs">🖼️ PNG</TabsTrigger>
                <TabsTrigger value="outils-i" className="text-xs"><Wrench className="h-3 w-3 mr-1" />Outils</TabsTrigger>
                <TabsTrigger value="templates-i" className="text-xs"><Bookmark className="h-3 w-3 mr-1" />Mes</TabsTrigger>
              </TabsList>

              {/* Documents PDF */}
              <TabsContent value="documents-i" className="space-y-4">
                <Tabs defaultValue="carousel" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="carousel" className="text-xs"><Linkedin className="h-3 w-3 mr-1" />Carrousel</TabsTrigger>
                    <TabsTrigger value="presentation" className="text-xs"><FileText className="h-3 w-3 mr-1" />Présentation</TabsTrigger>
                    <TabsTrigger value="word" className="text-xs"><FileIcon className="h-3 w-3 mr-1" />Word</TabsTrigger>
                  </TabsList>
                  <TabsContent value="carousel" className="grid grid-cols-1 gap-3">
                    {carouselTemplates.map((template) => (
                      <Card key={template.id} className="cursor-pointer hover:border-primary/50 transition-all" onClick={() => handleSelectTemplate('carousel', template.id)}>
                        <CardHeader className="py-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">{template.name}</CardTitle>
                            <Badge variant="secondary" className="text-xs">{template.slides} slides</Badge>
                          </div>
                          <CardDescription className="text-xs">{template.description}</CardDescription>
                        </CardHeader>
                      </Card>
                    ))}
                  </TabsContent>
                  <TabsContent value="presentation" className="grid grid-cols-1 gap-3">
                    {presentationTemplates.map((template) => (
                      <Card key={template.id} className="cursor-pointer hover:border-primary/50 transition-all" onClick={() => handleSelectTemplate('presentation', template.id)}>
                        <CardHeader className="py-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">{template.name}</CardTitle>
                            <Badge variant="secondary" className="text-xs">{template.slides} slides</Badge>
                          </div>
                          <CardDescription className="text-xs">{template.description}</CardDescription>
                        </CardHeader>
                      </Card>
                    ))}
                  </TabsContent>
                  <TabsContent value="word" className="grid grid-cols-1 gap-3">
                    {wordTemplates.map((template) => (
                      <Card key={template.id} className="cursor-pointer hover:border-primary/50 transition-all" onClick={() => handleSelectTemplate('word', template.id)}>
                        <CardHeader className="py-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">{template.name}</CardTitle>
                            <Badge variant="secondary" className="text-xs">{template.pages} pages</Badge>
                          </div>
                          <CardDescription className="text-xs">{template.description}</CardDescription>
                        </CardHeader>
                      </Card>
                    ))}
                  </TabsContent>
                </Tabs>
              </TabsContent>

              {/* Visuels PNG */}
              <TabsContent value="visuels-i" className="grid grid-cols-2 gap-3">
                {visualTemplates.map((template) => {
                  const IconComponent = template.icon;
                  return (
                    <Card key={template.id} className="cursor-pointer hover:border-primary/50 transition-all" onClick={() => navigate(template.route)}>
                      <CardHeader className="py-3">
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4 text-primary/60" />
                          <CardTitle className="text-sm">{template.name}</CardTitle>
                        </div>
                        <CardDescription className="text-xs">{template.dimensions}</CardDescription>
                      </CardHeader>
                    </Card>
                  );
                })}
              </TabsContent>

              {/* Outils */}
              <TabsContent value="outils-i" className="grid grid-cols-2 gap-3">
                {toolsTemplates.map((template) => {
                  const IconComponent = template.icon;
                  return (
                    <Card key={template.id} className="cursor-pointer hover:border-primary/50 transition-all" onClick={() => navigate(template.route)}>
                      <CardHeader className="py-3">
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4 text-accent/60" />
                          <CardTitle className="text-sm">{template.name}</CardTitle>
                        </div>
                        <CardDescription className="text-xs">{template.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  );
                })}
              </TabsContent>

              {/* Templates sauvegardés */}
              <TabsContent value="templates-i">
                <SavedTemplatesGlobalView navigate={navigate} />
              </TabsContent>
            </Tabs>
          </section>

          {/* === CHARTE IARCHE II (Personnelle) === */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${COLORS_PERSO.terracotta} 0%, ${COLORS_PERSO.bleuProfond} 100%)` }}
              >
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">IArche II – Charte Alternative</h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: COLORS_PERSO.terracotta }} title="Terracotta" />
                  <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: COLORS_PERSO.bleuProfond }} title="Bleu Profond" />
                  <div className="w-4 h-4 rounded-full border border-muted" style={{ backgroundColor: COLORS_PERSO.blancCasse }} title="Blanc Cassé" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {persoFormats.map((format) => {
                const IconComponent = format.icon;
                return (
                  <Card 
                    key={format.id} 
                    className="cursor-pointer hover:border-primary/50 transition-all group"
                    onClick={() => navigate(format.route)}
                  >
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" style={{ color: COLORS_PERSO.terracotta }} />
                          <CardTitle className="text-sm">{format.name}</CardTitle>
                        </div>
                        <div className="flex gap-0.5">
                          {format.platforms.map((Platform, idx) => (
                            <Platform key={idx} className="h-3 w-3 text-muted-foreground" />
                          ))}
                        </div>
                      </div>
                      <CardDescription className="text-xs">{format.dimensions}</CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>

            {/* Info watermark */}
            <Card className="bg-muted/30">
              <CardContent className="py-3">
                <div className="flex items-start gap-2">
                  <Image className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <p className="text-xs font-medium">Logo IArche en watermark</p>
                    <p className="text-xs text-muted-foreground">
                      Tous les exports incluent le logo en filigrane (15% opacité). Option désactivable.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

        </div>
      </div>
    </AdminLayout>
  );

};

// Editor type labels and routes
const editorTypeConfig: Record<EditorType, { label: string; route: string; icon: React.ElementType }> = {
  banner: { label: 'Bannière LinkedIn', route: '/admin/medias/banner', icon: Linkedin },
  story: { label: 'Story', route: '/admin/medias/story', icon: Smartphone },
  thumbnail: { label: 'Miniature', route: '/admin/medias/thumbnail', icon: Video },
  opengraph: { label: 'Open Graph', route: '/admin/medias/og', icon: Globe },
  'header-email': { label: 'Header Email', route: '/admin/medias/header-email', icon: MailOpen },
  post: { label: 'Post LinkedIn', route: '/admin/medias/post', icon: Image },
  carousel: { label: 'Carrousel', route: '/admin/medias/carousel', icon: Linkedin },
  presentation: { label: 'Présentation', route: '/admin/medias/presentation', icon: FileText },
  'brevo-html': { label: 'HTML Brevo', route: '/admin/emails', icon: MailOpen },
};

function SavedTemplatesGlobalView({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const [filterType, setFilterType] = useState<EditorType | 'all'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  
  const { templates, isLoading, renameTemplate, deleteTemplate } = useMediaTemplates();

  const filteredTemplates = filterType === 'all' 
    ? templates 
    : templates.filter(t => t.editor_type === filterType);

  const handleStartRename = (template: MediaTemplate) => {
    setEditingId(template.id);
    setEditName(template.name);
  };

  const handleConfirmRename = () => {
    if (editingId && editName.trim()) {
      renameTemplate({ id: editingId, name: editName.trim() });
    }
    setEditingId(null);
  };

  const handleOpenTemplate = (template: MediaTemplate) => {
    const config = editorTypeConfig[template.editor_type as EditorType];
    if (config) {
      navigate(config.route, { state: { loadTemplate: template } });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold">Mes templates sauvegardés</h2>
          <p className="text-sm text-muted-foreground">
            {templates.length} template{templates.length > 1 ? 's' : ''} sauvegardé{templates.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterType} onValueChange={(v) => setFilterType(v as EditorType | 'all')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrer par type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {Object.entries(editorTypeConfig).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Quick create dropdown */}
          <Select onValueChange={(route) => navigate(route)}>
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span>Créer un template</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(editorTypeConfig)
                .filter(([key]) => !['carousel', 'presentation'].includes(key))
                .map(([key, { label, route, icon: Icon }]) => (
                  <SelectItem key={key} value={route}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {label}
                    </div>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredTemplates.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <Bookmark className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              {filterType === 'all' 
                ? "Aucun template sauvegardé" 
                : `Aucun template de type "${editorTypeConfig[filterType]?.label}"`}
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Créez un visuel et sauvegardez-le comme template
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTemplates.map((template) => {
            const config = editorTypeConfig[template.editor_type as EditorType];
            const IconComponent = config?.icon || FileText;
            
            return (
              <Card key={template.id} className="group hover:border-primary/50 transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    {editingId === template.id ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleConfirmRename()}
                        onBlur={handleConfirmRename}
                        className="h-7 text-sm"
                        autoFocus
                      />
                    ) : (
                      <CardTitle className="text-base truncate">{template.name}</CardTitle>
                    )}
                    <Badge variant="secondary" className="shrink-0 ml-2">
                      {config?.label || template.editor_type}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Créé le {format(new Date(template.created_at), 'dd MMM yyyy', { locale: fr })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div 
                    className="aspect-video bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg flex items-center justify-center cursor-pointer hover:from-primary/20 hover:to-accent/20 transition-colors"
                    onClick={() => handleOpenTemplate(template)}
                  >
                    <IconComponent className="h-10 w-10 text-primary/30" />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleOpenTemplate(template)}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Ouvrir
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleStartRename(template)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer le template ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action est irréversible. Le template "{template.name}" sera définitivement supprimé.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteTemplate(template.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AdminMedias;
