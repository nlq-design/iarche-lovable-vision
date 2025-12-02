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
  Plus, 
  Image, 
  Mail, 
  Video, 
  Smartphone, 
  Globe,
  MailOpen 
} from 'lucide-react';
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
    ready: false,
  },
  { 
    id: 'signature', 
    name: 'Signature Email', 
    description: 'HTML + PNG compatible Outlook/Gmail',
    dimensions: '600×200px',
    icon: Mail,
    route: '/admin/medias/signature',
    ready: false,
  },
  { 
    id: 'thumbnail', 
    name: 'Miniatures', 
    description: 'Webinaires, ateliers, replays',
    dimensions: '1920×1080 / 1280×720px',
    icon: Video,
    route: '/admin/medias/thumbnail',
    ready: false,
  },
  { 
    id: 'story', 
    name: 'Stories', 
    description: 'Format vertical Instagram/LinkedIn',
    dimensions: '1080×1920px',
    icon: Smartphone,
    route: '/admin/medias/story',
    ready: false,
  },
  { 
    id: 'og', 
    name: 'Open Graph', 
    description: 'Aperçus de partage de liens',
    dimensions: '1200×630px',
    icon: Globe,
    route: '/admin/medias/og',
    ready: false,
  },
  { 
    id: 'header-email', 
    name: 'Header Email', 
    description: 'En-tête pour newsletters',
    dimensions: '600×150px',
    icon: MailOpen,
    route: '/admin/medias/header-email',
    ready: false,
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
        <div>
          <h1 className="text-2xl font-bold text-foreground">Médias & Communication</h1>
          <p className="text-muted-foreground mt-1">
            Générez des supports de communication conformes à la charte graphique IArche
          </p>
        </div>

        <Tabs defaultValue="documents" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="documents" className="flex items-center gap-2">
              📄 Documents PDF
            </TabsTrigger>
            <TabsTrigger value="visuels" className="flex items-center gap-2">
              🖼️ Visuels PNG
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
                    className={`cursor-pointer transition-all ${
                      template.ready 
                        ? 'hover:border-primary/50 hover:shadow-md' 
                        : 'opacity-60 cursor-not-allowed'
                    }`}
                    onClick={() => template.ready && navigate(template.route)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        {!template.ready && (
                          <Badge variant="outline" className="text-xs">Bientôt</Badge>
                        )}
                      </div>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="aspect-video bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg flex flex-col items-center justify-center gap-2">
                        <IconComponent className="h-10 w-10 text-primary/30" />
                        <span className="text-xs text-muted-foreground">{template.dimensions}</span>
                      </div>
                      <Button 
                        className="w-full mt-4" 
                        variant={template.ready ? "outline" : "ghost"}
                        disabled={!template.ready}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {template.ready ? 'Créer' : 'Prochainement'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminMedias;
