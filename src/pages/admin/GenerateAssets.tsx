import { useRef, RefObject } from 'react';
import { toPng } from 'html-to-image';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const GenerateAssets = () => {
  const { toast } = useToast();
  
  // Refs for logo
  const logoGradientRef = useRef<HTMLDivElement>(null);
  const logoWhiteRef = useRef<HTMLDivElement>(null);
  const logoTerracottaRef = useRef<HTMLDivElement>(null);
  
  // Refs for bars
  const barSmRef = useRef<HTMLDivElement>(null);
  const barMdRef = useRef<HTMLDivElement>(null);
  const barLgRef = useRef<HTMLDivElement>(null);
  const barXlRef = useRef<HTMLDivElement>(null);
  
  // Ref for pattern
  const patternRef = useRef<HTMLDivElement>(null);

  const downloadPNG = async (ref: RefObject<HTMLDivElement>, name: string) => {
    if (!ref.current) return;
    try {
      const dataUrl = await toPng(ref.current, { 
        pixelRatio: 4, 
        backgroundColor: undefined,
        style: {
          background: 'transparent',
        }
      });
      const link = document.createElement('a');
      link.download = `${name}.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: `${name}.png téléchargé` });
    } catch (error) {
      console.error('Error generating PNG:', error);
      toast({ title: 'Erreur lors de la génération', variant: 'destructive' });
    }
  };

  const bars = [
    { ref: barSmRef, name: 'bar-sm', width: 48, height: 2, label: 'sm (48×2px)' },
    { ref: barMdRef, name: 'bar-md', width: 80, height: 4, label: 'md (80×4px)' },
    { ref: barLgRef, name: 'bar-lg', width: 96, height: 4, label: 'lg (96×4px)' },
    { ref: barXlRef, name: 'bar-xl', width: 128, height: 6, label: 'xl (128×6px)' },
  ];

  return (
    <AdminLayout>
      <div className="p-6 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Génération des Assets PNG</h1>
          <p className="text-muted-foreground mt-2">
            Ces assets seront utilisés dans les templates PDF pour garantir un rendu fidèle à la charte graphique.
          </p>
        </div>

        {/* LOGOS */}
        <Card>
          <CardHeader>
            <CardTitle>Logos IArche</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo Gradient */}
            <div className="flex items-center gap-6">
              <div 
                ref={logoGradientRef}
                className="p-4 bg-white rounded"
              >
                <span 
                  className="font-bold text-5xl"
                  style={{
                    fontFamily: 'Manrope, sans-serif',
                    background: 'linear-gradient(90deg, #1A2B4A 0%, #B04A32 50%, #1A2B4A 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  IArche
                </span>
              </div>
              <div className="flex-1">
                <p className="font-medium">Logo gradient (fond clair)</p>
                <p className="text-sm text-muted-foreground">Bleu Nuit → Terracotta → Bleu Nuit</p>
              </div>
              <Button onClick={() => downloadPNG(logoGradientRef, 'logo-iarche-gradient')}>
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
            </div>

            {/* Logo Blanc */}
            <div className="flex items-center gap-6">
              <div 
                ref={logoWhiteRef}
                className="p-4 rounded"
                style={{ backgroundColor: '#1A2B4A' }}
              >
                <span 
                  className="font-bold text-5xl text-white"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  IArche
                </span>
              </div>
              <div className="flex-1">
                <p className="font-medium">Logo blanc (fond sombre)</p>
                <p className="text-sm text-muted-foreground">Pour slides sur fond Bleu Nuit</p>
              </div>
              <Button onClick={() => downloadPNG(logoWhiteRef, 'logo-iarche-white')}>
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
            </div>

            {/* Logo Terracotta */}
            <div className="flex items-center gap-6">
              <div 
                ref={logoTerracottaRef}
                className="p-4 bg-white rounded"
              >
                <span 
                  className="font-bold text-5xl"
                  style={{ 
                    fontFamily: 'Manrope, sans-serif',
                    color: '#B04A32' 
                  }}
                >
                  IArche
                </span>
              </div>
              <div className="flex-1">
                <p className="font-medium">Logo Terracotta</p>
                <p className="text-sm text-muted-foreground">Version monochrome accent</p>
              </div>
              <Button onClick={() => downloadPNG(logoTerracottaRef, 'logo-iarche-terracotta')}>
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* BARRES DÉCORATIVES */}
        <Card>
          <CardHeader>
            <CardTitle>Barres Décoratives Gradient</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {bars.map(({ ref, name, width, height, label }) => (
              <div key={name} className="flex items-center gap-6">
                <div 
                  ref={ref}
                  className="p-4 bg-white rounded min-w-[200px] flex items-center justify-center"
                >
                  <div 
                    style={{
                      width,
                      height,
                      borderRadius: height / 2,
                      background: 'linear-gradient(90deg, #1A2B4A 0%, #B04A32 50%, #1A2B4A 100%)',
                    }}
                  />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Barre {label}</p>
                  <p className="text-sm text-muted-foreground">Gradient Bleu Nuit → Terracotta → Bleu Nuit</p>
                </div>
                <Button onClick={() => downloadPNG(ref, name)}>
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* PATTERN MAILLÉ */}
        <Card>
          <CardHeader>
            <CardTitle>Pattern Maillé</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div 
                ref={patternRef}
                style={{
                  width: 120,
                  height: 120,
                  backgroundImage: `
                    repeating-linear-gradient(45deg, transparent, transparent 59px, rgba(26,43,74,0.05) 59px, rgba(26,43,74,0.05) 60px),
                    repeating-linear-gradient(-45deg, transparent, transparent 59px, rgba(26,43,74,0.05) 59px, rgba(26,43,74,0.05) 60px)
                  `,
                  backgroundColor: '#FAF9F7',
                }}
                className="rounded border"
              />
              <div className="flex-1">
                <p className="font-medium">Pattern tile 120×120px</p>
                <p className="text-sm text-muted-foreground">Maillage diagonal subtil pour fond de page</p>
              </div>
              <Button onClick={() => downloadPNG(patternRef, 'pattern-mesh')}>
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* INSTRUCTIONS */}
        <Card className="border-accent/50 bg-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-accent" />
              Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>1. Téléchargez tous les assets PNG ci-dessus</p>
            <p>2. Les fichiers seront automatiquement utilisés dans les templates PDF</p>
            <p>3. Ces assets garantissent un rendu fidèle à la charte graphique</p>
            <p className="text-muted-foreground mt-4">
              Note : Les PNG sont générés en haute résolution (4x) pour un rendu optimal à l'impression.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default GenerateAssets;
