import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Linkedin, 
  Instagram, 
  Twitter,
  Facebook,
  Plus, 
  Image, 
  Smartphone, 
  Layers,
  User,
  ArrowLeft
} from 'lucide-react';
import { COLORS_PERSO, EXPORT_FORMATS_PERSO } from '@/components/admin/medias/perso/tokensPerso';

const visualFormats = [
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

const AdminMediasPerso = () => {
  const navigate = useNavigate();

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header avec retour */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/admin/medias')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${COLORS_PERSO.terracotta} 0%, ${COLORS_PERSO.bleuProfond} 100%)` }}
              >
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Médias Personnel</h1>
                <p className="text-muted-foreground">
                  Charte graphique Nicolas Lara - Réseaux sociaux
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Palette de couleurs */}
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Palette active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                  style={{ backgroundColor: COLORS_PERSO.terracotta }}
                  title="Terracotta"
                />
                <span className="text-xs text-muted-foreground">Terracotta</span>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                  style={{ backgroundColor: COLORS_PERSO.bleuProfond }}
                  title="Bleu Profond"
                />
                <span className="text-xs text-muted-foreground">Bleu Profond</span>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded-full border-2 border-muted shadow-md"
                  style={{ backgroundColor: COLORS_PERSO.blancCasse }}
                  title="Blanc Cassé"
                />
                <span className="text-xs text-muted-foreground">Blanc Cassé</span>
              </div>
              <div 
                className="ml-auto h-8 w-32 rounded-lg shadow-inner"
                style={{ background: `linear-gradient(135deg, ${COLORS_PERSO.terracotta} 0%, ${COLORS_PERSO.bleuProfond} 100%)` }}
                title="Dégradé diagonal"
              />
            </div>
          </CardContent>
        </Card>

        {/* Formats disponibles */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Formats disponibles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {visualFormats.map((format) => {
              const IconComponent = format.icon;
              return (
                <Card 
                  key={format.id} 
                  className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
                  onClick={() => navigate(format.route)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{format.name}</CardTitle>
                      <div className="flex gap-1">
                        {format.platforms.map((Platform, idx) => (
                          <Platform key={idx} className="h-4 w-4 text-muted-foreground" />
                        ))}
                      </div>
                    </div>
                    <CardDescription>{format.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="aspect-square rounded-lg flex flex-col items-center justify-center gap-2 transition-all group-hover:scale-[1.02]"
                      style={{ 
                        background: `linear-gradient(135deg, ${COLORS_PERSO.terracotta}20 0%, ${COLORS_PERSO.bleuProfond}20 100%)` 
                      }}
                    >
                      <IconComponent className="h-10 w-10" style={{ color: COLORS_PERSO.terracotta }} />
                      <span className="text-xs text-muted-foreground">{format.dimensions}</span>
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
        </div>

        {/* Info watermark */}
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Image className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Logo IArche en watermark</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tous les exports incluent le logo IArche en filigrane discret (15% opacité) en bas à droite.
                  Cette option peut être désactivée dans chaque éditeur.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminMediasPerso;
