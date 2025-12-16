import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Package, Info, Circle, Square, FileImage, FileCode, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import AdminLayout from '@/components/layouts/AdminLayout';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toPng, toSvg } from 'html-to-image';
import { pdf, Document, Page, View, Text, Svg, Defs, LinearGradient, Stop, Rect, Image } from '@react-pdf/renderer';
import { IARCHE_COLORS } from '@/components/admin/medias/html';
import { BAR_SIZES, LOGO_SIZES, GRADIENTS } from '@/components/admin/medias/shared/tokens';

import { HTMLLogo } from '@/components/admin/medias/html/HTMLLogo';
import { BarSize, LogoSize as LogoSizeToken } from '@/components/admin/medias/html/tokens';

// Types
type ExportFormat = 'png' | 'svg' | 'pdf';
type ExportMode = 'logo-bar' | 'full';
type FormatCategory = 'standard' | 'profile';
type PngQuality = '4' | '6' | '8';

const PNG_QUALITY_OPTIONS: Record<PngQuality, { label: string; description: string }> = {
  '4': { label: '4x', description: 'Web & réseaux' },
  '6': { label: '6x', description: 'Documents' },
  '8': { label: '8x', description: 'Print HD' },
};

// Standard sizes
type StandardSize = '500' | '250' | '100';

// Profile formats for social media
type ProfileFormat = 'linkedin' | 'facebook' | 'instagram' | 'twitter' | 'youtube';

const STANDARD_SIZES: Record<StandardSize, { width: number; label: string }> = {
  '500': { width: 500, label: '500px (Grande)' },
  '250': { width: 250, label: '250px (Moyenne)' },
  '100': { width: 100, label: '100px (Petite)' },
};

const PROFILE_FORMATS: Record<ProfileFormat, { size: number; label: string; icon: string }> = {
  linkedin: { size: 400, label: 'LinkedIn', icon: 'in' },
  facebook: { size: 320, label: 'Facebook', icon: 'f' },
  instagram: { size: 320, label: 'Instagram', icon: 'ig' },
  twitter: { size: 400, label: 'Twitter/X', icon: 'x' },
  youtube: { size: 800, label: 'YouTube', icon: 'yt' },
};

const EXPORT_FORMATS: Record<ExportFormat, { label: string; icon: React.ReactNode; description: string }> = {
  png: { label: 'PNG', icon: <FileImage className="h-4 w-4" />, description: 'Raster haute résolution' },
  svg: { label: 'SVG', icon: <FileCode className="h-4 w-4" />, description: 'Vectoriel, scalable' },
  pdf: { label: 'PDF', icon: <FileText className="h-4 w-4" />, description: 'Vectoriel, impression' },
};

const BAR_SIZE_OPTIONS: BarSize[] = ['sm', 'md', 'lg', 'xl'];

const EXPORT_MODES: Record<ExportMode, { label: string }> = {
  'logo-bar': { label: 'Standard' },
  'full': { label: 'Complet (fond)' },
};

// Mapping for logo sizes
const LOGO_SIZE_MAP: Record<StandardSize, LogoSizeToken> = {
  '500': 'xl',
  '250': 'lg',
  '100': 'md',
};

const getDefaultBarSize = (size: string): BarSize => {
  if (size === '500' || parseInt(size) >= 400) return 'xl';
  if (size === '250' || parseInt(size) >= 250) return 'lg';
  return 'md';
};

const getLogoVariants = (charterColors: typeof IARCHE_COLORS) => ({
  gradient: {
    label: 'Logo Dégradé',
    description: 'Version principale sur fond clair',
    bgColor: charterColors.blancCasse,
    theme: 'light' as const,
    filename: 'logo-iarche-gradient',
  },
  terracotta: {
    label: 'Logo Terracotta',
    description: 'Version accent sur fond sombre',
    bgColor: charterColors.bleuNuit,
    theme: 'dark' as const,
    filename: 'logo-iarche-terracotta',
  },
});

type LogoVariant = 'gradient' | 'terracotta';

// PDF Logo Document Component - v4.0: Logo PNG officiel sans arc sous le logo
const PDFLogoDocument: React.FC<{
  variant: LogoVariant;
  size: number;
  isProfile: boolean;
  showBackground: boolean;
  charterColors: typeof IARCHE_COLORS;
}> = ({ variant, size, isProfile, showBackground, charterColors }) => {
  const logoVariants = getLogoVariants(charterColors);
  const variantData = logoVariants[variant];
  
  // v4.0: Utiliser les images PNG officielles du logo
  const logoSrc = variant === 'terracotta' 
    ? '/logos/iarche-white.png'  // Logo blanc sur fond sombre
    : '/logos/iarche-main.png';  // Logo gradient sur fond clair
  
  const logoWidth = Math.max(size * 0.5, 80);
  const logoHeight = logoWidth / 3.5; // Ratio approximatif du logo
  
  return (
    <Document>
      <Page
        size={isProfile ? { width: size, height: size } : { width: size, height: size * 0.67 }}
        style={{ backgroundColor: variantData.bgColor }}
      >
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center',
        }}>
          {/* Logo PNG officiel v4.0 - sans arc sous le logo */}
          <Image
            src={logoSrc}
            style={{ 
              width: logoWidth, 
              height: logoHeight,
              objectFit: 'contain',
            }}
          />
        </View>
      </Page>
    </Document>
  );
};

interface LogoPreviewCardProps {
  variant: ReturnType<typeof getLogoVariants>[LogoVariant];
  variantKey: LogoVariant;
  exportMode: ExportMode;
  onModeChange: (mode: ExportMode) => void;
  barSize: BarSize;
  onBarSizeChange: (size: BarSize) => void;
  onDownload: (format: ExportFormat) => void;
  isExporting: boolean;
  sizeLabel: string;
  logoSize: LogoSizeToken;
  exportRef: React.RefObject<HTMLDivElement>;
  exportFormat: ExportFormat;
  onFormatChange: (format: ExportFormat) => void;
  isProfile: boolean;
  pngQuality: PngQuality;
  onQualityChange: (quality: PngQuality) => void;
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
  exportFormat,
  onFormatChange,
  isProfile,
  pngQuality,
  onQualityChange,
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
        {/* Export Mode */}
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

        {/* Bar Size */}
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

        {/* Preview Container */}
        <div className="relative">
          <div
            ref={exportRef}
            className={`${isProfile ? 'aspect-square' : 'aspect-[3/2]'} rounded-lg overflow-hidden relative`}
            style={{ backgroundColor: variant.bgColor }}
          >
            
            <div className="absolute inset-0 flex items-center justify-center p-6 z-10">
              <HTMLLogo 
                size={logoSize} 
                theme={variant.theme}
              />
            </div>
          </div>
          
          {/* Circular Mask Overlay for Profile Preview */}
          {isProfile && (
            <div className="absolute inset-0 pointer-events-none">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <defs>
                  <mask id={`circle-mask-${variantKey}`}>
                    <rect width="100" height="100" fill="white" />
                    <circle cx="50" cy="50" r="48" fill="black" />
                  </mask>
                </defs>
                <rect 
                  width="100" 
                  height="100" 
                  fill="rgba(0,0,0,0.5)" 
                  mask={`url(#circle-mask-${variantKey})`} 
                />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="48" 
                  fill="none" 
                  stroke="white" 
                  strokeWidth="0.5" 
                  strokeDasharray="2,2"
                />
              </svg>
            </div>
          )}
        </div>
        
        {isProfile && (
          <p className="text-xs text-muted-foreground text-center">
            <Circle className="h-3 w-3 inline mr-1" />
            Prévisualisation du masque circulaire
          </p>
        )}

        {/* Export Format Selection */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Format :</Label>
          <div className="flex gap-1">
            {(Object.entries(EXPORT_FORMATS) as [ExportFormat, typeof EXPORT_FORMATS[ExportFormat]][]).map(([key, format]) => (
              <Button
                key={key}
                variant={exportFormat === key ? 'default' : 'outline'}
                size="sm"
                className="h-7 px-2 text-xs gap-1"
                onClick={() => onFormatChange(key)}
                title={format.description}
              >
                {format.icon}
                {format.label}
              </Button>
            ))}
          </div>
        </div>

        {/* PNG Quality Selection - only show when PNG is selected */}
        {exportFormat === 'png' && (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Qualité :</Label>
            <div className="flex gap-1">
              {(Object.entries(PNG_QUALITY_OPTIONS) as [PngQuality, typeof PNG_QUALITY_OPTIONS[PngQuality]][]).map(([key, option]) => (
                <Button
                  key={key}
                  variant={pngQuality === key ? 'default' : 'outline'}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => onQualityChange(key)}
                  title={option.description}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        )}
        
        <Button
          variant="outline"
          className="w-full gap-2"
          disabled={isExporting}
          onClick={() => onDownload(exportFormat)}
        >
          <Download className="h-4 w-4" />
          {EXPORT_FORMATS[exportFormat].label} ({sizeLabel})
        </Button>
      </CardContent>
    </Card>
  );
};

export default function LogoEditor() {
  const navigate = useNavigate();
  const [formatCategory, setFormatCategory] = useState<FormatCategory>('standard');
  const [standardSize, setStandardSize] = useState<StandardSize>('500');
  const [profileFormat, setProfileFormat] = useState<ProfileFormat>('linkedin');
  const [isExporting, setIsExporting] = useState(false);
  
  // Use official IArche colors
  const charterColors = IARCHE_COLORS;
  const LOGO_VARIANTS = getLogoVariants(charterColors);
  
  const [exportModes, setExportModes] = useState<Record<LogoVariant, ExportMode>>({
    gradient: 'logo-bar',
    terracotta: 'logo-bar',
  });
  
  const [barSizes, setBarSizes] = useState<Record<LogoVariant, BarSize>>({
    gradient: getDefaultBarSize('500'),
    terracotta: getDefaultBarSize('500'),
  });

  const [exportFormats, setExportFormats] = useState<Record<LogoVariant, ExportFormat>>({
    gradient: 'png',
    terracotta: 'png',
  });

  const [pngQualities, setPngQualities] = useState<Record<LogoVariant, PngQuality>>({
    gradient: '8',
    terracotta: '8',
  });
  
  // Update bar sizes when size changes
  useEffect(() => {
    const newSize = formatCategory === 'standard' 
      ? standardSize 
      : PROFILE_FORMATS[profileFormat].size.toString();
    const newBarSize = getDefaultBarSize(newSize);
    setBarSizes({
      gradient: newBarSize,
      terracotta: newBarSize,
    });
  }, [standardSize, profileFormat, formatCategory]);
  
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

  const updateExportFormat = (variant: LogoVariant, format: ExportFormat) => {
    setExportFormats(prev => ({ ...prev, [variant]: format }));
  };

  const updatePngQuality = (variant: LogoVariant, quality: PngQuality) => {
    setPngQualities(prev => ({ ...prev, [variant]: quality }));
  };

  const getCurrentSize = (): number => {
    return formatCategory === 'standard'
      ? STANDARD_SIZES[standardSize].width
      : PROFILE_FORMATS[profileFormat].size;
  };

  const getCurrentSizeLabel = (): string => {
    return formatCategory === 'standard'
      ? `${STANDARD_SIZES[standardSize].width}px`
      : `${PROFILE_FORMATS[profileFormat].label} ${PROFILE_FORMATS[profileFormat].size}px`;
  };

  const getLogoSize = (): LogoSizeToken => {
    if (formatCategory === 'standard') {
      return LOGO_SIZE_MAP[standardSize];
    }
    const size = PROFILE_FORMATS[profileFormat].size;
    if (size >= 600) return 'xl';
    if (size >= 350) return 'lg';
    return 'md';
  };

  // PNG Export
  const capturePng = async (ref: React.RefObject<HTMLDivElement>, targetWidth: number, quality: PngQuality): Promise<Blob | null> => {
    if (!ref.current) return null;
    try {
      const currentWidth = ref.current.offsetWidth;
      const qualityMultiplier = parseInt(quality);
      const pixelRatio = Math.max((targetWidth / currentWidth) * qualityMultiplier, qualityMultiplier);
      const dataUrl = await toPng(ref.current, {
        quality: 1,
        pixelRatio,
        cacheBust: true,
      });
      const response = await fetch(dataUrl);
      return await response.blob();
    } catch (error) {
      console.error('Error capturing PNG:', error);
      return null;
    }
  };

  // SVG Export
  const captureSvg = async (ref: React.RefObject<HTMLDivElement>): Promise<Blob | null> => {
    if (!ref.current) return null;
    try {
      const svgString = await toSvg(ref.current, {
        cacheBust: true,
        filter: (node) => {
          // Include all nodes
          return true;
        },
      });
      return new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    } catch (error) {
      console.error('Error capturing SVG:', error);
      return null;
    }
  };

  // PDF Export
  const capturePdf = async (variantKey: LogoVariant, targetSize: number, isProfile: boolean, showBackground: boolean): Promise<Blob | null> => {
    try {
      const doc = (
        <PDFLogoDocument
          variant={variantKey}
          size={targetSize}
          isProfile={isProfile}
          showBackground={showBackground}
          charterColors={charterColors}
        />
      );
      const blob = await pdf(doc).toBlob();
      return blob;
    } catch (error) {
      console.error('Error generating PDF:', error);
      return null;
    }
  };

  const handleExportSingle = async (variantKey: LogoVariant, format: ExportFormat) => {
    setIsExporting(true);
    try {
      const variant = LOGO_VARIANTS[variantKey];
      const targetWidth = getCurrentSize();
      const mode = exportModes[variantKey];
      const isProfile = formatCategory === 'profile';
      
      let blob: Blob | null = null;
      let extension = format;
      
      switch (format) {
        case 'png':
          blob = await capturePng(refs[variantKey], targetWidth, pngQualities[variantKey]);
          break;
        case 'svg':
          blob = await captureSvg(refs[variantKey]);
          break;
        case 'pdf':
          blob = await capturePdf(variantKey, targetWidth, isProfile, mode === 'full');
          break;
      }
      
      const suffix = mode === 'logo-bar' ? '-barre' : '-complet';
      const profileSuffix = isProfile ? `-${profileFormat}` : '';
      
      if (blob) {
        saveAs(blob, `${variant.filename}${suffix}${profileSuffix}-${targetWidth}px.${extension}`);
        toast.success(`Logo ${format.toUpperCase()} téléchargé`);
      } else {
        toast.error('Erreur lors du téléchargement');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erreur lors de l\'export');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      const targetWidth = getCurrentSize();
      const isProfile = formatCategory === 'profile';

      for (const [key, variant] of Object.entries(LOGO_VARIANTS) as [LogoVariant, typeof LOGO_VARIANTS[LogoVariant]][]) {
        const mode = exportModes[key];
        const format = exportFormats[key];
        const suffix = mode === 'logo-bar' ? '-barre' : '-complet';
        const profileSuffix = isProfile ? `-${profileFormat}` : '';
        
        let blob: Blob | null = null;
        
        switch (format) {
          case 'png':
            blob = await capturePng(refs[key], targetWidth, pngQualities[key]);
            break;
          case 'svg':
            blob = await captureSvg(refs[key]);
            break;
          case 'pdf':
            blob = await capturePdf(key, targetWidth, isProfile, mode === 'full');
            break;
        }
        
        if (blob) {
          zip.file(`${variant.filename}${suffix}${profileSuffix}-${targetWidth}px.${format}`, blob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const profileSuffix = isProfile ? `-${profileFormat}` : '';
      saveAs(zipBlob, `logos-iarche${profileSuffix}-${targetWidth}px.zip`);
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
              <p className="text-muted-foreground">Exports PNG, SVG vectoriel, PDF impression</p>
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
            Les formats SVG et PDF sont vectoriels et offrent une qualité d'impression optimale.
          </AlertDescription>
        </Alert>

        {/* Format Category Tabs */}
        <Tabs value={formatCategory} onValueChange={(v) => setFormatCategory(v as FormatCategory)}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="standard" className="gap-2">
              <Square className="h-4 w-4" />
              Standard
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <Circle className="h-4 w-4" />
              Profil (Réseaux)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="standard" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Label className="whitespace-nowrap">Taille d'export :</Label>
                  <Select value={standardSize} onValueChange={(v) => setStandardSize(v as StandardSize)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STANDARD_SIZES).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <Label>Format profil (carré avec masque circulaire) :</Label>
                  <div className="flex flex-wrap gap-2">
                    {(Object.entries(PROFILE_FORMATS) as [ProfileFormat, typeof PROFILE_FORMATS[ProfileFormat]][]).map(([key, format]) => (
                      <Button
                        key={key}
                        variant={profileFormat === key ? 'default' : 'outline'}
                        size="sm"
                        className="gap-2"
                        onClick={() => setProfileFormat(key)}
                      >
                        <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                          {format.icon}
                        </span>
                        {format.label}
                        <span className="text-xs text-muted-foreground">({format.size}px)</span>
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Les photos de profil s'affichent en cercle sur ces réseaux. La prévisualisation montre la zone visible.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
              onDownload={(format) => handleExportSingle(key, format)}
              isExporting={isExporting}
              sizeLabel={getCurrentSizeLabel()}
              logoSize={getLogoSize()}
              exportRef={refs[key]}
              exportFormat={exportFormats[key]}
              onFormatChange={(format) => updateExportFormat(key, format)}
              isProfile={formatCategory === 'profile'}
              pngQuality={pngQualities[key]}
              onQualityChange={(quality) => updatePngQuality(key, quality)}
            />
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Formats d'export</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(Object.entries(EXPORT_FORMATS) as [ExportFormat, typeof EXPORT_FORMATS[ExportFormat]][]).map(([key, format]) => (
                <div key={key} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="p-2 rounded-md bg-background">
                    {format.icon}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{format.label}</p>
                    <p className="text-xs text-muted-foreground">{format.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Palette de couleurs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded border" style={{ backgroundColor: charterColors.bleuNuit }} />
                <span className="text-sm">Bleu Nuit</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded border" style={{ backgroundColor: charterColors.terracotta }} />
                <span className="text-sm">Terracotta</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded border" style={{ backgroundColor: charterColors.blancCasse }} />
                <span className="text-sm">Blanc Cassé</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
