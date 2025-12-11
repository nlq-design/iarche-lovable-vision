import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Package, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import AdminLayout from '@/components/layouts/AdminLayout';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toPng } from 'html-to-image';
import { COLORS, EXPORT_BAR_MAPPING, BAR_SIZES } from '@/components/admin/medias/shared/tokens';
import { HTMLMeshBackground } from '@/components/admin/medias/html/HTMLMeshBackground';
import { HTMLCanalisationLines } from '@/components/admin/medias/html/HTMLCanalisationLines';
import { HTMLLogoWithBar } from '@/components/admin/medias/html/HTMLLogoWithBar';
import { BarSize, LogoSize as LogoSizeToken } from '@/components/admin/medias/html/tokens';

type LogoSize = '500' | '250' | '100';
// Suppression de 'logo' (Seul) - Charte 3.1 exige que le logo soit TOUJOURS accompagné de sa barre
type ExportMode = 'logo-bar' | 'full';

const LOGO_SIZES: Record<LogoSize, { width: number; label: string }> = {
  '500': { width: 500, label: '500px (Grande)' },
  '250': { width: 250, label: '250px (Moyenne)' },
  '100': { width: 100, label: '100px (Petite)' },
};

// Options de barre disponibles (xs à 2xl)
const BAR_SIZE_OPTIONS: BarSize[] = Object.keys(BAR_SIZES) as BarSize[];

// Modes d'export conformes à la charte 3.1 - Le logo est TOUJOURS avec sa barre
const EXPORT_MODES: Record<ExportMode, { label: string }> = {
  'logo-bar': { label: 'Standard' },
  'full': { label: 'Complet (fond)' },
};

// Mapping des tailles d'export vers les tailles de logo du composant
const LOGO_SIZE_MAP: Record<LogoSize, LogoSizeToken> = {
  '500': 'xl',
  '250': 'lg',
  '100': 'md',
};

// Barre par défaut proportionnelle à l'export
const getDefaultBarSize = (exportSize: LogoSize): BarSize => {
  return EXPORT_BAR_MAPPING[exportSize] as BarSize;
};

const LOGO_VARIANTS = {
  gradient: {
    label: 'Logo Dégradé',
    description: 'Version principale sur fond clair',
    bgColor: COLORS.blancCasse,
    theme: 'light' as const,
    filename: 'logo-iarche-gradient',
  },
  terracotta: {
    label: 'Logo Terracotta',
    description: 'Version accent sur fond sombre',
    bgColor: COLORS.bleuNuit,
    theme: 'dark' as const,
    filename: 'logo-iarche-terracotta',
  },
};

type LogoVariant = keyof typeof LOGO_VARIANTS;

interface LogoPreviewCardProps {
  variant: typeof LOGO_VARIANTS[LogoVariant];
  variantKey: LogoVariant;
  exportMode: ExportMode;
  onModeChange: (mode: ExportMode) => void;
  barSize: BarSize;
  onBarSizeChange: (size: BarSize) => void;
  onDownload: () => void;
  isExporting: boolean;
  sizeLabel: string;
  logoSize: LogoSizeToken;
  exportRef: React.RefObject<HTMLDivElement>;
}

const LogoPreviewCard: React.FC<LogoPreviewCardProps> = ({ 
  variant, 
  variantKey,
  exportMode,
  onModeChange,
  barSize,
  onBarSizeChange,
  onDownload, 
  isExporting,
  sizeLabel,
  logoSize,
  exportRef,
}) => {
  const [dimensions, setDimensions] = useState({ width: 300, height: 200 });

  useEffect(() => {
    if (exportRef.current) {
      const { offsetWidth, offsetHeight } = exportRef.current;
      setDimensions({ width: offsetWidth, height: offsetHeight });
    }
  }, [exportRef]);

  const showBackground = exportMode === 'full';

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{variant.label}</CardTitle>
        <CardDescription>{variant.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup 
          value={exportMode} 
          onValueChange={(v) => onModeChange(v as ExportMode)}
          className="flex gap-2"
        >
          {(Object.entries(EXPORT_MODES) as [ExportMode, typeof EXPORT_MODES[ExportMode]][]).map(([key, mode]) => (
            <div key={key} className="flex items-center space-x-1">
              <RadioGroupItem value={key} id={`${variantKey}-${key}`} className="h-3 w-3" />
              <Label htmlFor={`${variantKey}-${key}`} className="text-xs cursor-pointer">
                {mode.label}
              </Label>
            </div>
          ))}
        </RadioGroup>

        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Barre :</Label>
          <div className="flex gap-1">
            {BAR_SIZE_OPTIONS.map((size) => (
              <Button
                key={size}
                variant={barSize === size ? 'default' : 'outline'}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => onBarSizeChange(size)}
              >
                {size.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>

        <div
          ref={exportRef}
          className="aspect-[3/2] rounded-lg overflow-hidden relative"
          style={{ backgroundColor: variant.bgColor }}
        >
          {showBackground && (
            <HTMLMeshBackground theme={variant.theme} opacity={0.05} />
          )}
          
          {showBackground && (
            <HTMLCanalisationLines
              width={dimensions.width}
              height={dimensions.height}
              theme={variant.theme}
              opacity={0.4}
              strokeWidth={3}
            />
          )}
          
          <div className="absolute inset-0 flex items-center justify-center p-6 z-10">
            <HTMLLogoWithBar 
              size={logoSize} 
              theme={variant.theme}
              barSize={barSize}
            />
          </div>
        </div>
        
        <Button
          variant="outline"
          className="w-full gap-2"
          disabled={isExporting}
          onClick={onDownload}
        >
          <Download className="h-4 w-4" />
          PNG ({sizeLabel})
        </Button>
      </CardContent>
    </Card>
  );
};

export default function LogoEditor() {
  const navigate = useNavigate();
  const [size, setSize] = useState<LogoSize>('500');
  const [isExporting, setIsExporting] = useState(false);
  
  // Par défaut 'logo-bar' (standard) - conforme à la charte 3.1
  const [exportModes, setExportModes] = useState<Record<LogoVariant, ExportMode>>({
    gradient: 'logo-bar',
    terracotta: 'logo-bar',
  });
  
  // Barres par défaut proportionnelles à la taille d'export
  const [barSizes, setBarSizes] = useState<Record<LogoVariant, BarSize>>({
    gradient: getDefaultBarSize('500'),
    terracotta: getDefaultBarSize('500'),
  });
  
  // Mettre à jour les barres quand la taille d'export change
  useEffect(() => {
    const newBarSize = getDefaultBarSize(size);
    setBarSizes({
      gradient: newBarSize,
      terracotta: newBarSize,
    });
  }, [size]);
  
  const gradientRef = useRef<HTMLDivElement>(null);
  const terracottaRef = useRef<HTMLDivElement>(null);
  
  const refs: Record<LogoVariant, React.RefObject<HTMLDivElement>> = {
    gradient: gradientRef,
    terracotta: terracottaRef,
  };

  const updateExportMode = (variant: LogoVariant, mode: ExportMode) => {
    setExportModes(prev => ({ ...prev, [variant]: mode }));
  };

  const updateBarSize = (variant: LogoVariant, barSize: BarSize) => {
    setBarSizes(prev => ({ ...prev, [variant]: barSize }));
  };

  const capturePreview = async (ref: React.RefObject<HTMLDivElement>, targetWidth: number): Promise<Blob | null> => {
    if (!ref.current) return null;
    try {
      const currentWidth = ref.current.offsetWidth;
      const pixelRatio = targetWidth / currentWidth;
      const dataUrl = await toPng(ref.current, {
        quality: 1,
        pixelRatio: Math.max(pixelRatio, 3),
        cacheBust: true,
      });
      const response = await fetch(dataUrl);
      return await response.blob();
    } catch (error) {
      console.error('Error capturing preview:', error);
      return null;
    }
  };

  const handleExportSingle = async (variantKey: LogoVariant) => {
    setIsExporting(true);
    try {
      const variant = LOGO_VARIANTS[variantKey];
      const targetWidth = LOGO_SIZES[size].width;
      const mode = exportModes[variantKey];
      
      const blob = await capturePreview(refs[variantKey], targetWidth);
      const suffix = mode === 'logo-bar' ? '-barre' : '-complet';
      
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

  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      const targetWidth = LOGO_SIZES[size].width;

      for (const [key, variant] of Object.entries(LOGO_VARIANTS) as [LogoVariant, typeof LOGO_VARIANTS[LogoVariant]][]) {
        const mode = exportModes[key];
        const blob = await capturePreview(refs[key], targetWidth);
        const suffix = mode === 'logo-bar' ? '-barre' : '-complet';
        
        if (blob) {
          zip.file(`${variant.filename}${suffix}-${targetWidth}px.png`, blob);
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
          <Button onClick={handleExportAll} disabled={isExporting} className="gap-2">
            <Package className="h-4 w-4" />
            Télécharger tout (ZIP)
          </Button>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Charte 3.1 :</strong> Le logo IArche doit toujours être accompagné de sa barre décorative. 
            L'option "logo seul" n'est plus disponible.
          </AlertDescription>
        </Alert>

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
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(Object.entries(LOGO_VARIANTS) as [LogoVariant, typeof LOGO_VARIANTS[LogoVariant]][]).map(([key, variant]) => (
            <LogoPreviewCard
              key={key}
              variantKey={key}
              variant={variant}
              exportMode={exportModes[key]}
              onModeChange={(mode) => updateExportMode(key, mode)}
              barSize={barSizes[key]}
              onBarSizeChange={(size) => updateBarSize(key, size)}
              onDownload={() => handleExportSingle(key)}
              isExporting={isExporting}
              sizeLabel={`${LOGO_SIZES[size].width}px`}
              logoSize={LOGO_SIZE_MAP[size]}
              exportRef={refs[key]}
            />
          ))}
        </div>

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
