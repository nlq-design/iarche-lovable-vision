import React, { useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Upload, ImageIcon, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import AdminLayout from '@/components/layouts/AdminLayout';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { COLORS } from '@/components/admin/medias/shared/tokens';

type LogoSize = '500' | '250' | '100';

const LOGO_SIZES = {
  '500': { width: 500, label: '500px (Grande)' },
  '250': { width: 250, label: '250px (Moyenne)' },
  '100': { width: 100, label: '100px (Petite)' },
};

export default function LogoEditor() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [sourceFileName, setSourceFileName] = useState<string>('');
  const [size, setSize] = useState<LogoSize>('500');
  const [isExporting, setIsExporting] = useState(false);

  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner un fichier image (PNG, SVG, JPG)');
      return;
    }

    setSourceFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setSourceImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  // Generate logo variation
  const generateVariation = useCallback(async (
    variation: 'transparent' | 'white' | 'dark' | 'monochrome',
    targetWidth: number
  ): Promise<Blob | null> => {
    if (!sourceImage) return null;

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

        // Calculate proportional height
        const aspectRatio = img.height / img.width;
        const targetHeight = Math.round(targetWidth * aspectRatio);

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Apply background based on variation
        switch (variation) {
          case 'white':
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            break;
          case 'dark':
            ctx.fillStyle = COLORS.bleuNuit;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            break;
          case 'transparent':
          case 'monochrome':
            // Transparent background
            break;
        }

        // Draw image
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Apply monochrome filter if needed
        if (variation === 'monochrome') {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            // Convert to white while preserving alpha
            if (data[i + 3] > 0) {
              data[i] = 255;     // R
              data[i + 1] = 255; // G
              data[i + 2] = 255; // B
            }
          }
          ctx.putImageData(imageData, 0, 0);
        }

        canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
      };
      img.src = sourceImage;
    });
  }, [sourceImage]);

  // Export single variation
  const handleExportSingle = async (variation: 'transparent' | 'white' | 'dark' | 'monochrome') => {
    if (!sourceImage) {
      toast.error('Veuillez d\'abord uploader un logo');
      return;
    }

    setIsExporting(true);
    try {
      const targetWidth = LOGO_SIZES[size].width;
      const blob = await generateVariation(variation, targetWidth);
      if (blob) {
        const variationNames = {
          transparent: 'transparent',
          white: 'fond-blanc',
          dark: 'fond-sombre',
          monochrome: 'monochrome',
        };
        saveAs(blob, `logo-${variationNames[variation]}-${targetWidth}px.png`);
        toast.success('Logo exporté avec succès');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    } finally {
      setIsExporting(false);
    }
  };

  // Export all as ZIP
  const handleExportAll = async () => {
    if (!sourceImage) {
      toast.error('Veuillez d\'abord uploader un logo');
      return;
    }

    setIsExporting(true);
    try {
      const zip = new JSZip();
      const targetWidth = LOGO_SIZES[size].width;

      const variations: Array<{ key: 'transparent' | 'white' | 'dark' | 'monochrome'; filename: string }> = [
        { key: 'transparent', filename: 'logo-transparent.png' },
        { key: 'white', filename: 'logo-fond-blanc.png' },
        { key: 'dark', filename: 'logo-fond-sombre.png' },
        { key: 'monochrome', filename: 'logo-monochrome.png' },
      ];

      for (const { key, filename } of variations) {
        const blob = await generateVariation(key, targetWidth);
        if (blob) {
          zip.file(filename, blob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `logos-iarche-${targetWidth}px.zip`);
      toast.success('Pack de logos téléchargé avec succès');
    } catch (error) {
      toast.error('Erreur lors de la création du ZIP');
    } finally {
      setIsExporting(false);
    }
  };

  // Preview component for a single variation
  const LogoPreview = ({ 
    variation, 
    label, 
    bgColor, 
    borderStyle 
  }: { 
    variation: 'transparent' | 'white' | 'dark' | 'monochrome'; 
    label: string; 
    bgColor: string; 
    borderStyle?: string;
  }) => {
    const previewWidth = 150;
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    React.useEffect(() => {
      if (sourceImage) {
        generateVariation(variation, previewWidth).then((blob) => {
          if (blob) {
            setPreviewUrl(URL.createObjectURL(blob));
          }
        });
      } else {
        setPreviewUrl(null);
      }
    }, [sourceImage, variation]);

    return (
      <Card className="flex-1 min-w-[180px]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{label}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div 
            className={`aspect-square rounded-lg flex items-center justify-center p-4 ${borderStyle || ''}`}
            style={{ backgroundColor: bgColor }}
          >
            {previewUrl ? (
              <img 
                src={previewUrl} 
                alt={label} 
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled={!sourceImage || isExporting}
            onClick={() => handleExportSingle(variation)}
          >
            <Download className="h-3 w-3 mr-1" />
            PNG
          </Button>
        </CardContent>
      </Card>
    );
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
              <h1 className="text-2xl font-bold text-foreground">Variations Logo</h1>
              <p className="text-muted-foreground">Générez 4 déclinaisons de votre logo</p>
            </div>
          </div>
          <Button 
            onClick={handleExportAll} 
            disabled={!sourceImage || isExporting}
            className="gap-2"
          >
            <Package className="h-4 w-4" />
            Télécharger tout (ZIP)
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Panel */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>Uploadez votre logo et choisissez la taille</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Upload */}
              <div className="space-y-2">
                <Label>Logo source (PNG, SVG, JPG)</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label htmlFor="logo-upload" className="cursor-pointer">
                    {sourceImage ? (
                      <div className="space-y-2">
                        <img 
                          src={sourceImage} 
                          alt="Logo source" 
                          className="max-h-24 mx-auto object-contain"
                        />
                        <p className="text-sm text-muted-foreground">{sourceFileName}</p>
                        <p className="text-xs text-primary">Cliquer pour changer</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Cliquer ou glisser-déposer
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PNG, SVG ou JPG recommandé
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Size selector */}
              <div className="space-y-2">
                <Label>Taille d'export</Label>
                <Select value={size} onValueChange={(v) => setSize(v as LogoSize)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LOGO_SIZES).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Color palette info */}
              <div className="space-y-2">
                <Label>Palette utilisée</Label>
                <div className="flex gap-2">
                  <div 
                    className="w-8 h-8 rounded border" 
                    style={{ backgroundColor: COLORS.bleuNuit }}
                    title="Bleu Nuit #1A2B4A"
                  />
                  <div 
                    className="w-8 h-8 rounded border" 
                    style={{ backgroundColor: COLORS.terracotta }}
                    title="Terracotta #D15A3E"
                  />
                  <div 
                    className="w-8 h-8 rounded border" 
                    style={{ backgroundColor: COLORS.blancCasse }}
                    title="Blanc Cassé #FAF9F7"
                  />
                  <div 
                    className="w-8 h-8 rounded border" 
                    style={{ backgroundColor: '#FFFFFF' }}
                    title="Blanc #FFFFFF"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Previews Grid */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Aperçu des 4 variations</CardTitle>
                <CardDescription>
                  Taille d'export : {LOGO_SIZES[size].width}px de large
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <LogoPreview
                    variation="transparent"
                    label="Fond transparent"
                    bgColor="transparent"
                    borderStyle="border border-dashed border-border bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZjBmMGYwIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNmMGYwZjAiLz48L3N2Zz4=')]"
                  />
                  <LogoPreview
                    variation="white"
                    label="Fond blanc"
                    bgColor="#FFFFFF"
                    borderStyle="border border-border"
                  />
                  <LogoPreview
                    variation="dark"
                    label="Fond sombre"
                    bgColor={COLORS.bleuNuit}
                  />
                  <LogoPreview
                    variation="monochrome"
                    label="Monochrome (blanc)"
                    bgColor={COLORS.bleuNuit}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Hidden canvas for processing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </AdminLayout>
  );
}
