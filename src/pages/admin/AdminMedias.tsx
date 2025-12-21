import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Linkedin, 
  FileText, 
  FileIcon, 
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
  ArrowRight,
  Layers,
  Sparkles,
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
import { IARCHE_COLORS } from '@/components/admin/medias/html';

type MediaType = 'carousel' | 'presentation' | 'word' | null;
type TemplateType = string | null;

const carouselTemplates = [
  { id: 'solution', name: 'Annonce Solution', description: 'Présenter une solution IArche', slides: 5, icon: '🚀' },
  { id: 'article', name: 'Partage Article', description: 'Transformer un article en carrousel', slides: 6, icon: '📰' },
  { id: 'stats', name: 'Chiffres Clés', description: 'Mettre en avant des statistiques', slides: 4, icon: '📊' },
];

const presentationTemplates = [
  { id: 'pitch', name: 'Pitch Commercial', description: 'Présentation de l\'agence et services', slides: 10, icon: '🎯' },
  { id: 'project', name: 'Présentation Projet', description: 'Détailler une solution à un prospect', slides: 12, icon: '📋' },
  { id: 'report', name: 'Rapport / Bilan', description: 'Synthèse de résultats ou d\'activité', slides: 8, icon: '📈' },
];

const wordTemplates = [
  { id: 'proposal', name: 'Proposition Commerciale', description: 'Devis et proposition client structurée', pages: 4, icon: '💼' },
  { id: 'report', name: 'Compte-Rendu', description: 'Synthèse de réunion ou d\'audit', pages: 3, icon: '📝' },
  { id: 'datasheet', name: 'Fiche Technique', description: 'Description détaillée d\'une solution', pages: 2, icon: '📄' },
];

const visualTemplates = [
  { 
    id: 'post', 
    name: 'Posts LinkedIn', 
    description: 'Visuels carrés et paysage',
    dimensions: '1200×1200px',
    icon: Image,
    route: '/admin/medias/post',
    color: '#0A66C2',
  },
  { 
    id: 'banner', 
    name: 'Bannières LinkedIn', 
    description: 'Bannière de profil/page',
    dimensions: '1584×396px',
    icon: Linkedin,
    route: '/admin/medias/banner',
    color: '#0A66C2',
  },
  { 
    id: 'story', 
    name: 'Stories', 
    description: 'Format vertical social',
    dimensions: '1080×1920px',
    icon: Smartphone,
    route: '/admin/medias/story',
    color: '#E1306C',
  },
  { 
    id: 'thumbnail', 
    name: 'Miniatures', 
    description: 'Webinaires, replays',
    dimensions: '1920×1080px',
    icon: Video,
    route: '/admin/medias/thumbnail',
    color: '#FF0000',
  },
  { 
    id: 'og', 
    name: 'Open Graph', 
    description: 'Aperçus de liens',
    dimensions: '1200×630px',
    icon: Globe,
    route: '/admin/medias/og',
    color: '#4267B2',
  },
  { 
    id: 'signature', 
    name: 'Signature Email', 
    description: 'HTML + PNG',
    dimensions: '600×200px',
    icon: Mail,
    route: '/admin/medias/signature',
    color: IARCHE_COLORS.terracotta,
  },
  { 
    id: 'header-email', 
    name: 'Header Email', 
    description: 'En-tête newsletter',
    dimensions: '600×150px',
    icon: MailOpen,
    route: '/admin/medias/header-email',
    color: IARCHE_COLORS.bleuNuit,
  },
];

const toolsTemplates = [
  { 
    id: 'logo', 
    name: 'Variations Logo', 
    description: '4 déclinaisons',
    icon: FileImage,
    route: '/admin/medias/logo',
  },
  { 
    id: 'favicon', 
    name: 'Favicon', 
    description: 'ICO + PNG + Manifest',
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
    name: 'QR Code', 
    description: 'Aux couleurs IArche',
    icon: QrCode,
    route: '/admin/medias/qrcode',
  },
  { 
    id: 'header-doc', 
    name: 'En-tête Document', 
    description: 'PNG pour Word/Docs',
    icon: FileText,
    route: '/admin/medias/header-doc',
  },
  { 
    id: 'footer-email', 
    name: 'Footer Email', 
    description: 'Pied de page HTML',
    icon: MailPlus,
    route: '/admin/medias/footer-email',
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
      <div className="p-6 space-y-8 max-w-7xl mx-auto">
        {/* Header with gradient */}
        <div className="relative overflow-hidden rounded-xl p-6" style={{ 
          background: `linear-gradient(135deg, ${IARCHE_COLORS.bleuNuit} 0%, ${IARCHE_COLORS.terracotta}80 100%)` 
        }}>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="h-6 w-6 text-white/80" />
              <h1 className="text-2xl font-bold text-white">Médias & Communication</h1>
            </div>
            <p className="text-white/80 text-sm max-w-xl">
              Générez des supports de communication conformes à la charte graphique v4.0 — exports PNG, PDF HD, SVG
            </p>
            <div className="flex items-center gap-3 mt-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: IARCHE_COLORS.bleuNuit }} />
                <span className="text-xs text-white/90">Bleu Nuit</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: IARCHE_COLORS.terracotta }} />
                <span className="text-xs text-white/90">Terracotta</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm">
                <div className="w-3 h-3 rounded-full border border-white/30" style={{ backgroundColor: IARCHE_COLORS.blancCasse }} />
                <span className="text-xs text-white/90">Blanc Cassé</span>
              </div>
            </div>
          </div>
          {/* Decorative arc */}
          <div className="absolute -bottom-20 -right-20 w-64 h-64 opacity-10">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <path d="M200 0 Q200 200 0 200" fill="none" stroke="white" strokeWidth="3" />
            </svg>
          </div>
        </div>

        {/* Main tabs */}
        <Tabs defaultValue="visuels" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-12">
            <TabsTrigger value="visuels" className="gap-2 data-[state=active]:bg-accent/10">
              <Image className="h-4 w-4" />
              <span className="hidden sm:inline">Visuels PNG</span>
              <span className="sm:hidden">PNG</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2 data-[state=active]:bg-accent/10">
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Documents PDF</span>
              <span className="sm:hidden">PDF</span>
            </TabsTrigger>
            <TabsTrigger value="outils" className="gap-2 data-[state=active]:bg-accent/10">
              <Wrench className="h-4 w-4" />
              <span className="hidden sm:inline">Outils</span>
              <span className="sm:hidden">Outils</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2 data-[state=active]:bg-accent/10">
              <Bookmark className="h-4 w-4" />
              <span className="hidden sm:inline">Mes templates</span>
              <span className="sm:hidden">Mes</span>
            </TabsTrigger>
          </TabsList>

          {/* Visuels PNG */}
          <TabsContent value="visuels" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {visualTemplates.map((template) => {
                const IconComponent = template.icon;
                return (
                  <Card 
                    key={template.id} 
                    className="group cursor-pointer border-2 border-transparent hover:border-accent/50 transition-all duration-200 hover:shadow-lg"
                    onClick={() => navigate(template.route)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                          style={{ backgroundColor: `${template.color}15` }}
                        >
                          <IconComponent className="h-5 w-5" style={{ color: template.color }} />
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <CardTitle className="text-base font-semibold">{template.name}</CardTitle>
                      <CardDescription className="text-xs">{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Badge variant="secondary" className="text-[10px] font-mono">
                        {template.dimensions}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Documents PDF */}
          <TabsContent value="documents" className="space-y-6">
            <Tabs defaultValue="carousel" className="space-y-4">
              <TabsList className="w-auto inline-flex">
                <TabsTrigger value="carousel" className="gap-2">
                  <Linkedin className="h-4 w-4" />
                  Carrousels
                </TabsTrigger>
                <TabsTrigger value="presentation" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Présentations
                </TabsTrigger>
                <TabsTrigger value="word" className="gap-2">
                  <FileIcon className="h-4 w-4" />
                  Documents Word
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="carousel" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {carouselTemplates.map((template) => (
                  <Card 
                    key={template.id} 
                    className="group cursor-pointer border-2 border-transparent hover:border-accent/50 transition-all duration-200 hover:shadow-lg" 
                    onClick={() => handleSelectTemplate('carousel', template.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <span className="text-2xl mb-2">{template.icon}</span>
                        <Badge variant="outline" className="text-xs">{template.slides} slides</Badge>
                      </div>
                      <CardTitle className="text-base font-semibold">{template.name}</CardTitle>
                      <CardDescription className="text-xs">{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">LinkedIn 1080×1350px</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
              
              <TabsContent value="presentation" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {presentationTemplates.map((template) => (
                  <Card 
                    key={template.id} 
                    className="group cursor-pointer border-2 border-transparent hover:border-accent/50 transition-all duration-200 hover:shadow-lg" 
                    onClick={() => handleSelectTemplate('presentation', template.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <span className="text-2xl mb-2">{template.icon}</span>
                        <Badge variant="outline" className="text-xs">{template.slides} slides</Badge>
                      </div>
                      <CardTitle className="text-base font-semibold">{template.name}</CardTitle>
                      <CardDescription className="text-xs">{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">16:9 — 1920×1080px</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
              
              <TabsContent value="word" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {wordTemplates.map((template) => (
                  <Card 
                    key={template.id} 
                    className="group cursor-pointer border-2 border-transparent hover:border-accent/50 transition-all duration-200 hover:shadow-lg" 
                    onClick={() => handleSelectTemplate('word', template.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <span className="text-2xl mb-2">{template.icon}</span>
                        <Badge variant="outline" className="text-xs">{template.pages} pages</Badge>
                      </div>
                      <CardTitle className="text-base font-semibold">{template.name}</CardTitle>
                      <CardDescription className="text-xs">{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Format .docx</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Outils */}
          <TabsContent value="outils" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {toolsTemplates.map((template) => {
                const IconComponent = template.icon;
                return (
                  <Card 
                    key={template.id} 
                    className="group cursor-pointer border-2 border-transparent hover:border-accent/50 transition-all duration-200 hover:shadow-lg" 
                    onClick={() => navigate(template.route)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-muted transition-transform group-hover:scale-110">
                          <IconComponent className="h-5 w-5 text-foreground/70" />
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <CardTitle className="text-base font-semibold">{template.name}</CardTitle>
                      <CardDescription className="text-xs">{template.description}</CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Templates sauvegardés */}
          <TabsContent value="templates">
            <SavedTemplatesGlobalView navigate={navigate} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

// Component to show all saved templates
const SavedTemplatesGlobalView: React.FC<{ navigate: (path: string, state?: object) => void }> = ({ navigate }) => {
  const { templates, isLoading, deleteTemplate, renameTemplate } = useMediaTemplates();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

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

  const getEditorRoute = (editorType: string) => {
    const routes: Record<string, string> = {
      banner: '/admin/medias/banner',
      post: '/admin/medias/post',
      story: '/admin/medias/story',
      thumbnail: '/admin/medias/thumbnail',
      og: '/admin/medias/og',
      'header-email': '/admin/medias/header-email',
      signature: '/admin/medias/signature',
    };
    return routes[editorType] || '/admin/medias';
  };

  const getEditorIcon = (editorType: string) => {
    const icons: Record<string, React.ReactNode> = {
      banner: <Linkedin className="h-4 w-4" />,
      post: <Image className="h-4 w-4" />,
      story: <Smartphone className="h-4 w-4" />,
      thumbnail: <Video className="h-4 w-4" />,
      og: <Globe className="h-4 w-4" />,
      'header-email': <MailOpen className="h-4 w-4" />,
      signature: <Mail className="h-4 w-4" />,
    };
    return icons[editorType] || <FileImage className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <Bookmark className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-lg font-medium text-muted-foreground">Aucun template sauvegardé</p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Créez des visuels dans les éditeurs et sauvegardez-les pour les retrouver ici
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((template) => (
        <Card key={template.id} className="relative group">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                {getEditorIcon(template.editor_type)}
              </div>
              {editingId === template.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-8 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirmRename();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                  <Button size="sm" onClick={handleConfirmRename}>OK</Button>
                </div>
              ) : (
                <CardTitle className="text-base flex-1">{template.name}</CardTitle>
              )}
            </div>
            <CardDescription className="text-xs flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">{template.editor_type}</Badge>
              <span>·</span>
              <span>{format(new Date(template.created_at), 'dd MMM yyyy', { locale: fr })}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="default"
                className="flex-1 gap-2"
                onClick={() => navigate(getEditorRoute(template.editor_type), { state: { loadTemplate: template } })}
              >
                <ExternalLink className="h-3 w-3" />
                Ouvrir
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStartRename(template)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer ce template ?</AlertDialogTitle>
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
      ))}
    </div>
  );
};

export default AdminMedias;
