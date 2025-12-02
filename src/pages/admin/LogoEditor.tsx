import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import AdminLayout from '@/components/layouts/AdminLayout';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toPng } from 'html-to-image';
import { COLORS } from '@/components/admin/medias/shared/tokens';
import { HTMLMeshBackground } from '@/components/admin/medias/html/HTMLMeshBackground';
import { HTMLCanalisationLines } from '@/components/admin/medias/html/HTMLCanalisationLines';
import { HTMLGradientBar } from '@/components/admin/medias/html/HTMLGradientBar';

type LogoSize = '500' | '250' | '100';
type ExportMode = 'logo' | 'logo-bar' | 'full';

const LOGO_SIZES = {
  '500': { width: 500, label: '500px (Grande)' },
  '250': { width: 250, label: '250px (Moyenne)' },
  '100': { width: 100, label: '100px (Petite)' },
};

const EXPORT_MODES = {
  'logo': { label: 'Logo seul', description: 'PNG du logo uniquement' },
  'logo-bar': { label: 'Logo + barre', description: 'Logo avec trait dégradé' },
  'full': { label: 'Logo complet', description: 'Logo + barre + maillage + canalisations' },
};

// Logos officiels IArche
const LOGO_VARIANTS = {
  gradient: {
    src: '/assets/logo-iarche-gradient.png',
    label: 'Logo Dégradé',
    description: 'Version principale',
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
    description: 'Version accent',
    bgColor: COLORS.blancCasse,
    theme: 'light' as const,
    filename: 'logo-iarche-terracotta',
  },
};

type LogoVariant = keyof typeof LOGO_VARIANTS;

// Preview component with conditional layers
const LogoPreviewCard = ({ 
  variant, 
  variantKey,
  exportMode,
  onDownload, 
  isExporting,
  sizeLabel,
  exportRef,
}: { 
  variant: typeof LOGO_VARIANTS[LogoVariant];
  variantKey: LogoVariant;
  exportMode: ExportMode;
  onDownload: () => void;
  isExporting: boolean;
  sizeLabel: string;
  exportRef: React.RefObject<HTMLDivElement>;
}) => {
  const [dimensions, setDimensions] = useState({ width: 300, height: 200 });

  useEffect(() => {
    if (exportRef.current) {
      const { offsetWidth, offsetHeight } = exportRef.current;
      setDimensions({ width: offsetWidth, height: offsetHeight });
    }
  }, [exportRef]);

  const showBar = exportMode === 'logo-bar' || exportMode === 'full';
  const showBackground = exportMode === 'full';

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{variant.label}</CardTitle>
        <CardDescription>{variant.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preview - this div will be captured for export */}
        <div 
          ref={exportRef}
          className="aspect-[3/2] rounded-lg overflow-hidden relative"
          style={{ backgroundColor: variant.bgColor }}
        >
          {/* Mesh background - only in full mode */}
          {showBackground && (
            <HTMLMeshBackground 
              theme={variant.theme} 
              opacity={0.05}
            />
          )}
          
          {/* Canalisation lines - only in full mode */}
          {showBackground && (
            <HTMLCanalisationLines
              width={dimensions.width}
              height={dimensions.height}
              theme={variant.theme}
              opacity={0.4}
              strokeWidth={3}
            />
          )}
          
          {/* Logo + optional bar centered */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 z-10">
            <img 
              src={variant.src} 
              alt={variant.label}
              className="max-w-[60%] max-h-[50%] object-contain"
            />
            {showBar && (
              <HTMLGradientBar size="lg" />
            )}
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
          Télécharger ({sizeLabel})
        </Button>
      </CardContent>
    </Card>
  );
};

export default function LogoEditor() {
  const navigate = useNavigate();
  const [size, setSize] = useState<LogoSize>('500');
  const [exportMode, setExportMode] = useState<ExportMode>('logo');
  const [isExporting, setIsExporting] = useState(false);
  
  // Refs for each variant's export container
  const gradientRef = useRef<HTMLDivElement>(null);
  const whiteRef = useRef<HTMLDivElement>(null);
  const terracottaRef = useRef<HTMLDivElement>(null);
  
  const refs: Record<LogoVariant, React.RefObject<HTMLDivElement>> = {
    gradient: gradientRef,
    white: whiteRef,
    terracotta: terracottaRef,
  };

  // Resize image only (for logo-only mode)
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

  // Capture preview with html-to-image (for logo-bar and full modes)
  const capturePreview = async (ref: React.RefObject<HTMLDivElement>, targetWidth: number): Promise<Blob | null> => {
    if (!ref.current) return null;
    
    try {
      const currentWidth = ref.current.offsetWidth;
      const pixelRatio = targetWidth / currentWidth;
      
      const dataUrl = await toPng(ref.current, {
        quality: 1,
        pixelRatio: Math.max(pixelRatio, 2),
        cacheBust: true,
      });
      
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      return await response.blob();
    } catch (error) {
      console.error('Error capturing preview:', error);
      return null;
    }
  };

  // Export single logo
  const handleExportSingle = async (variantKey: LogoVariant) => {
    setIsExporting(true);
    try {
      const variant = LOGO_VARIANTS[variantKey];
      const targetWidth = LOGO_SIZES[size].width;
      
      let blob: Blob | null = null;
      let suffix = '';
      
      if (exportMode === 'logo') {
        // Logo only - just resize PNG
        blob = await resizeAndExport(variant.src, targetWidth);
        suffix = '';
      } else {
        // Logo + bar or full - capture preview
        blob = await capturePreview(refs[variantKey], targetWidth);
        suffix = exportMode === 'logo-bar' ? '-barre' : '-complet';
      }
      
      if (blob) {
        saveAs(blob, `${variant.filename}${suffix}-${targetWidth}px.png`);
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
      const suffix = exportMode === 'logo' ? '' : exportMode === 'logo-bar' ? '-barre' : '-complet';

      for (const [key, variant] of Object.entries(LOGO_VARIANTS) as [LogoVariant, typeof LOGO_VARIANTS[LogoVariant]][]) {
        let blob: Blob | null = null;
        
        if (exportMode === 'logo') {
          blob = await resizeAndExport(variant.src, targetWidth);
        } else {
          blob = await capturePreview(refs[key], targetWidth);
        }
        
        if (blob) {
          zip.file(`${variant.filename}${suffix}-${targetWidth}px.png`, blob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `logos-iarche${suffix}-${targetWidth}px.zip`);
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
              <p className="text-muted-foreground">Téléchargez les logos officiels</p>
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

        {/* Controls */}
        <Card>
          <CardContent className="pt-6 space-y-6">
            {/* Size Selector */}
            <div className="flex items-center gap-4">
              <Label className="whitespace-nowrap min-w-24">Taille :</Label>
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
            </div>
            
            {/* Export Mode Selector */}
            <div className="space-y-3">
              <Label>Mode d'export :</Label>
              <RadioGroup 
                value={exportMode} 
                onValueChange={(v) => setExportMode(v as ExportMode)}
                className="flex flex-wrap gap-4"
              >
                {(Object.entries(EXPORT_MODES) as [ExportMode, typeof EXPORT_MODES[ExportMode]][]).map(([key, mode]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <RadioGroupItem value={key} id={key} />
                    <Label htmlFor={key} className="cursor-pointer">
                      <span className="font-medium">{mode.label}</span>
                      <span className="text-muted-foreground text-sm ml-1">({mode.description})</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
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
              exportMode={exportMode}
              onDownload={() => handleExportSingle(key)}
              isExporting={isExporting}
              sizeLabel={`${LOGO_SIZES[size].width}px`}
              exportRef={refs[key]}
            />
          ))}
        </div>

        {/* Color Palette Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Palette de couleurs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded border" style={{ backgroundColor: COLORS.bleuNuit }} />
                <span className="text-sm">Bleu Nuit</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded border" style={{ backgroundColor: COLORS.terracotta }} />
                <span className="text-sm">Terracotta</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded border" style={{ backgroundColor: COLORS.blancCasse }} />
                <span className="text-sm">Blanc Cassé</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
