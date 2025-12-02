import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import AdminLayout from '@/components/layouts/AdminLayout';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { COLORS } from '@/components/admin/medias/shared/tokens';
import { HTMLMeshBackground } from '@/components/admin/medias/html/HTMLMeshBackground';
import { HTMLCanalisationLines } from '@/components/admin/medias/html/HTMLCanalisationLines';

type LogoSize = '500' | '250' | '100';

const LOGO_SIZES = {
  '500': { width: 500, label: '500px (Grande)' },
  '250': { width: 250, label: '250px (Moyenne)' },
  '100': { width: 100, label: '100px (Petite)' },
};

// Logos officiels IArche
const LOGO_VARIANTS = {
  gradient: {
    src: '/assets/logo-iarche-gradient.png',
    label: 'Logo Dégradé',
    description: 'Version principale avec dégradé Bleu Nuit → Terracotta',
    bgColor: COLORS.blancCasse,
    theme: 'light' as const,
    filename: 'logo-iarche-gradient',
  },
  white: {
    src: '/assets/logo-iarche-white.png',
    label: 'Logo Blanc',
    description: 'Pour fonds sombres',
    bgColor: COLORS.bleuNuit,
    theme: 'dark' as const,
    filename: 'logo-iarche-white',
  },
  terracotta: {
    src: '/assets/logo-iarche-terracotta.png',
    label: 'Logo Terracotta',
    description: 'Version monochrome accent',
    bgColor: COLORS.blancCasse,
    theme: 'light' as const,
    filename: 'logo-iarche-terracotta',
  },
};

type LogoVariant = keyof typeof LOGO_VARIANTS;

// Preview component with mesh and canalisation lines
const LogoPreviewCard = ({ 
  variant, 
  variantKey,
  onDownload, 
  isExporting,
  sizeLabel,
}: { 
  variant: typeof LOGO_VARIANTS[LogoVariant];
  variantKey: LogoVariant;
  onDownload: () => void;
  isExporting: boolean;
  sizeLabel: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 300, height: 200 });

  useEffect(() => {
    if (containerRef.current) {
      const { offsetWidth, offsetHeight } = containerRef.current;
      setDimensions({ width: offsetWidth, height: offsetHeight });
    }
  }, []);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{variant.label}</CardTitle>
        <CardDescription>{variant.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preview with mesh and canalisation lines */}
        <div 
          ref={containerRef}
          className="aspect-[3/2] rounded-lg overflow-hidden relative border border-border"
          style={{ backgroundColor: variant.bgColor }}
        >
          {/* Mesh background */}
          <HTMLMeshBackground 
            theme={variant.theme} 
            opacity={0.05}
          />
          
          {/* Canalisation lines */}
          <HTMLCanalisationLines
            width={dimensions.width}
            height={dimensions.height}
            theme={variant.theme}
            opacity={0.4}
            strokeWidth={3}
          />
          
          {/* Logo centered */}
          <div className="absolute inset-0 flex items-center justify-center p-6 z-10">
            <img 
              src={variant.src} 
              alt={variant.label}
              className="max-w-[70%] max-h-[70%] object-contain"
            />
          </div>
        </div>
        
        {/* Download Button */}
        <Button
          variant="outline"
          className="w-full gap-2"
          disabled={isExporting}
          onClick={onDownload}
        >
          <Download className="h-4 w-4" />
          Télécharger PNG ({sizeLabel})
        </Button>
      </CardContent>
    </Card>
  );
};

export default function LogoEditor() {
  const navigate = useNavigate();
  const [size, setSize] = useState<LogoSize>('500');
  const [isExporting, setIsExporting] = useState(false);

  // Resize image and return blob
  const resizeAndExport = async (src: string, targetWidth: number): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        const aspectRatio = img.height / img.width;
        const targetHeight = Math.round(targetWidth * aspectRatio);

        canvas.width = targetWidth;
        canvas.height = targetHeight;
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  };

  // Export single logo
  const handleExportSingle = async (variant: LogoVariant) => {
    setIsExporting(true);
    try {
      const { src, filename } = LOGO_VARIANTS[variant];
      const targetWidth = LOGO_SIZES[size].width;
      const blob = await resizeAndExport(src, targetWidth);
      
      if (blob) {
        saveAs(blob, `${filename}-${targetWidth}px.png`);
        toast.success('Logo téléchargé');
      } else {
        toast.error('Erreur lors du téléchargement');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    } finally {
      setIsExporting(false);
    }
  };

  // Export all as ZIP
  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      const targetWidth = LOGO_SIZES[size].width;

      for (const [key, { src, filename }] of Object.entries(LOGO_VARIANTS)) {
        const blob = await resizeAndExport(src, targetWidth);
        if (blob) {
          zip.file(`${filename}-${targetWidth}px.png`, blob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `logos-iarche-${targetWidth}px.zip`);
      toast.success('Pack logos téléchargé');
    } catch (error) {
      toast.error('Erreur lors de la création du ZIP');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/medias')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Logos IArche</h1>
              <p className="text-muted-foreground">Téléchargez les logos officiels aux différentes tailles</p>
            </div>
          </div>
          <Button 
            onClick={handleExportAll} 
            disabled={isExporting}
            className="gap-2"
          >
            <Package className="h-4 w-4" />
            Télécharger tout (ZIP)
          </Button>
        </div>

        {/* Size Selector */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Label className="whitespace-nowrap">Taille d'export :</Label>
              <Select value={size} onValueChange={(v) => setSize(v as LogoSize)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LOGO_SIZES).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                Largeur : {LOGO_SIZES[size].width}px
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Logo Variants Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(Object.entries(LOGO_VARIANTS) as [LogoVariant, typeof LOGO_VARIANTS[LogoVariant]][]).map(([key, variant]) => (
            <LogoPreviewCard
              key={key}
              variantKey={key}
              variant={variant}
              onDownload={() => handleExportSingle(key)}
              isExporting={isExporting}
              sizeLabel={`${LOGO_SIZES[size].width}px`}
            />
          ))}
        </div>

        {/* Color Palette Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Palette de couleurs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded border" 
                  style={{ backgroundColor: COLORS.bleuNuit }}
                />
                <span className="text-sm">Bleu Nuit {COLORS.bleuNuit}</span>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded border" 
                  style={{ backgroundColor: COLORS.terracotta }}
                />
                <span className="text-sm">Terracotta {COLORS.terracotta}</span>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded border" 
                  style={{ backgroundColor: COLORS.blancCasse }}
                />
                <span className="text-sm">Blanc Cassé {COLORS.blancCasse}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
