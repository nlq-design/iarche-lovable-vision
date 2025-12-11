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
  MailPlus
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
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Médias & Communication</h1>
            <p className="text-muted-foreground mt-1">
              Générez des supports de communication conformes à la charte graphique IArche
            </p>
          </div>
          <Button 
            variant="outline"
            onClick={() => navigate('/admin/medias-perso')}
            className="flex items-center gap-2"
          >
            <div 
              className="w-4 h-4 rounded-full"
              style={{ background: 'linear-gradient(135deg, #D4633A 0%, #213A6B 100%)' }}
            />
            Média IArche II
          </Button>
        </div>

        <Tabs defaultValue="documents" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="documents" className="flex items-center gap-2">
              📄 Documents PDF
            </TabsTrigger>
            <TabsTrigger value="visuels" className="flex items-center gap-2">
              🖼️ Visuels PNG
            </TabsTrigger>
            <TabsTrigger value="outils" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Outils
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Bookmark className="h-4 w-4" />
              Mes templates
            </TabsTrigger>
          </TabsList>

          {/* === DOCUMENTS PDF (Phase 1 - Figée) === */}
          <TabsContent value="documents" className="space-y-6">
            <Tabs defaultValue="carousel" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 max-w-lg">
                <TabsTrigger value="carousel" className="flex items-center gap-2">
                  <Linkedin className="h-4 w-4" />
                  Carrousel
                </TabsTrigger>
                <TabsTrigger value="presentation" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Présentation
                </TabsTrigger>
                <TabsTrigger value="word" className="flex items-center gap-2">
                  <FileIcon className="h-4 w-4" />
                  Word
                </TabsTrigger>
              </TabsList>

              {/* Carrousel LinkedIn */}
              <TabsContent value="carousel" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Carrousels LinkedIn</h2>
                    <p className="text-sm text-muted-foreground">Format 1080×1350px - Export PDF multi-pages</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {carouselTemplates.map((template) => (
                    <Card 
                      key={template.id} 
                      className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                      onClick={() => handleSelectTemplate('carousel', template.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <Badge variant="secondary">{template.slides} slides</Badge>
                        </div>
                        <CardDescription>{template.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="aspect-[4/5] bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg flex items-center justify-center">
                          <Linkedin className="h-12 w-12 text-primary/30" />
                        </div>
                        <Button className="w-full mt-4" variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Créer
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Présentation PDF */}
              <TabsContent value="presentation" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Présentations PDF</h2>
                    <p className="text-sm text-muted-foreground">Format 1920×1080px - Export PDF</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {presentationTemplates.map((template) => (
                    <Card 
                      key={template.id} 
                      className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                      onClick={() => handleSelectTemplate('presentation', template.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <Badge variant="secondary">{template.slides} slides</Badge>
                        </div>
                        <CardDescription>{template.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="aspect-video bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg flex items-center justify-center">
                          <FileText className="h-12 w-12 text-primary/30" />
                        </div>
                        <Button className="w-full mt-4" variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Créer
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Document Word */}
              <TabsContent value="word" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Documents Word</h2>
                    <p className="text-sm text-muted-foreground">Format A4 - Export DOCX</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {wordTemplates.map((template) => (
                    <Card 
                      key={template.id} 
                      className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                      onClick={() => handleSelectTemplate('word', template.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <Badge variant="secondary">{template.pages} pages</Badge>
                        </div>
                        <CardDescription>{template.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="aspect-[3/4] bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg flex items-center justify-center">
                          <FileIcon className="h-12 w-12 text-primary/30" />
                        </div>
                        <Button className="w-full mt-4" variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Créer
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* === VISUELS PNG (Phase 2) === */}
          <TabsContent value="visuels" className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Visuels PNG</h2>
              <p className="text-sm text-muted-foreground">Export haute résolution via html-to-image</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {visualTemplates.map((template) => {
                const IconComponent = template.icon;
                return (
                  <Card 
                    key={template.id} 
                    className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                    onClick={() => navigate(template.route)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="aspect-video bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg flex flex-col items-center justify-center gap-2">
                        <IconComponent className="h-10 w-10 text-primary/30" />
                        <span className="text-xs text-muted-foreground">{template.dimensions}</span>
                      </div>
                      <Button className="w-full mt-4" variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Créer
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* === OUTILS (Phase 3) === */}
          <TabsContent value="outils" className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Outils de marque</h2>
              <p className="text-sm text-muted-foreground">Générateurs pour votre identité visuelle</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {toolsTemplates.map((template) => {
                const IconComponent = template.icon;
                return (
                  <Card 
                    key={template.id} 
                    className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                    onClick={() => navigate(template.route)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="aspect-video bg-gradient-to-br from-accent/10 to-primary/10 rounded-lg flex items-center justify-center">
                        <IconComponent className="h-12 w-12 text-accent/40" />
                      </div>
                      <Button className="w-full mt-4" variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Ouvrir
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* === MES TEMPLATES === */}
          <TabsContent value="templates" className="space-y-4">
            <SavedTemplatesGlobalView navigate={navigate} />
          </TabsContent>
        </Tabs>
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
