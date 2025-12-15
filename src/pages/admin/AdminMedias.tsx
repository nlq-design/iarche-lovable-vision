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
            Générez des supports de communication conformes à la charte graphique v4.0
          </p>
        </div>

        {/* Charte Graphique v4.0 */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${IARCHE_COLORS.bleuNuit} 0%, ${IARCHE_COLORS.terracotta} 100%)` }}
            >
              <Palette className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Charte Graphique v4.0</h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: IARCHE_COLORS.bleuNuit }} title="Bleu Nuit" />
                <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: IARCHE_COLORS.terracotta }} title="Terracotta" />
                <div className="w-4 h-4 rounded-full border border-muted" style={{ backgroundColor: IARCHE_COLORS.blancCasse }} title="Blanc Cassé" />
              </div>
            </div>
          </div>

          <Tabs defaultValue="visuels" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="documents" className="text-xs">📄 PDF</TabsTrigger>
              <TabsTrigger value="visuels" className="text-xs">🖼️ PNG</TabsTrigger>
              <TabsTrigger value="outils" className="text-xs"><Wrench className="h-3 w-3 mr-1" />Outils</TabsTrigger>
              <TabsTrigger value="templates" className="text-xs"><Bookmark className="h-3 w-3 mr-1" />Mes</TabsTrigger>
            </TabsList>

            {/* Documents PDF */}
            <TabsContent value="documents" className="space-y-4">
              <Tabs defaultValue="carousel" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="carousel" className="text-xs"><Linkedin className="h-3 w-3 mr-1" />Carrousel</TabsTrigger>
                  <TabsTrigger value="presentation" className="text-xs"><FileText className="h-3 w-3 mr-1" />Présentation</TabsTrigger>
                  <TabsTrigger value="word" className="text-xs"><FileIcon className="h-3 w-3 mr-1" />Word</TabsTrigger>
                </TabsList>
                <TabsContent value="carousel" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
                <TabsContent value="presentation" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
                <TabsContent value="word" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
            <TabsContent value="visuels" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
            <TabsContent value="outils" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
            <TabsContent value="templates">
              <SavedTemplatesGlobalView navigate={navigate} />
            </TabsContent>
          </Tabs>
        </section>
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Aucun template sauvegardé</p>
        <p className="text-sm text-muted-foreground mt-1">
          Créez des visuels et sauvegardez-les pour les retrouver ici
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card key={template.id} className="relative">
            <CardHeader className="pb-2">
              {editingId === template.id ? (
                <div className="flex items-center gap-2">
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
                <CardTitle className="text-base">{template.name}</CardTitle>
              )}
              <CardDescription className="text-xs">
                {template.editor_type} · {format(new Date(template.created_at), 'dd MMM yyyy', { locale: fr })}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="default"
                  className="flex-1 gap-1"
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
                    <Button size="sm" variant="outline" className="text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer le template ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est irréversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteTemplate(template.id)}
                        className="bg-destructive text-destructive-foreground"
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
    </div>
  );
};

export default AdminMedias;
