import React, { useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Upload, Package, Chrome, Apple } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import AdminLayout from '@/components/layouts/AdminLayout';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const FAVICON_SIZES = [
  { name: 'favicon.ico', sizes: [16, 32], description: 'Multi-resolution ICO' },
  { name: 'favicon-16x16.png', size: 16, description: 'Standard 16px' },
  { name: 'favicon-32x32.png', size: 32, description: 'Standard 32px' },
  { name: 'apple-touch-icon.png', size: 180, description: 'Apple Touch Icon' },
  { name: 'android-chrome-192x192.png', size: 192, description: 'Android 192px' },
  { name: 'android-chrome-512x512.png', size: 512, description: 'Android 512px' },
];

export default function FaviconEditor() {
  const navigate = useNavigate();
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [sourceFileName, setSourceFileName] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner un fichier image carré (512px minimum)');
      return;
    }

    setSourceFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        if (img.width < 512 || img.height < 512) {
          toast.warning('Image recommandée : 512×512px minimum pour une qualité optimale');
        }
        if (img.width !== img.height) {
          toast.warning('Image non carrée - elle sera redimensionnée');
        }
        setSourceImage(event.target?.result as string);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, []);

  const generateFavicon = useCallback(async (size: number): Promise<Blob | null> => {
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

        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);
        canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
      };
      img.src = sourceImage;
    });
  }, [sourceImage]);

  const generateWebManifest = () => {
    return JSON.stringify({
      name: 'IArche',
      short_name: 'IArche',
      icons: [
        {
          src: '/android-chrome-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/android-chrome-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ],
      theme_color: '#1A2B4A',
      background_color: '#FAF9F7',
      display: 'standalone'
    }, null, 2);
  };

  const handleExportAll = async () => {
    if (!sourceImage) {
      toast.error('Veuillez d\'abord uploader une icône');
      return;
    }

    setIsExporting(true);
    try {
      const zip = new JSZip();

      // Generate all PNG favicons
      for (const item of FAVICON_SIZES) {
        if ('size' in item) {
          const blob = await generateFavicon(item.size);
          if (blob) {
            zip.file(item.name, blob);
          }
        }
      }

      // Generate ICO (simplified as 32x32 PNG - browsers accept PNG as ICO)
      const icoBlob = await generateFavicon(32);
      if (icoBlob) {
        zip.file('favicon.ico', icoBlob);
      }

      // Generate manifest
      zip.file('site.webmanifest', generateWebManifest());

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, 'favicon-pack-iarche.zip');
      toast.success('Pack favicon téléchargé avec succès');
    } catch (error) {
      toast.error('Erreur lors de la création du pack');
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
              <h1 className="text-2xl font-bold text-foreground">Générateur Favicon</h1>
              <p className="text-muted-foreground">Créez tous les formats de favicon en un clic</p>
            </div>
          </div>
          <Button 
            onClick={handleExportAll} 
            disabled={!sourceImage || isExporting}
            className="gap-2"
          >
            <Package className="h-4 w-4" />
            Télécharger pack favicon
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Icône source</CardTitle>
              <CardDescription>Image carrée 512×512px minimum</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="favicon-upload"
                />
                <label htmlFor="favicon-upload" className="cursor-pointer">
                  {sourceImage ? (
                    <div className="space-y-3">
                      <img 
                        src={sourceImage} 
                        alt="Source" 
                        className="w-32 h-32 mx-auto object-contain rounded-lg border"
                      />
                      <p className="text-sm text-muted-foreground">{sourceFileName}</p>
                      <p className="text-xs text-primary">Cliquer pour changer</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Cliquer ou glisser-déposer
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PNG ou SVG carré recommandé
                      </p>
                    </div>
                  )}
                </label>
              </div>

              {/* Browser preview mockups */}
              {sourceImage && (
                <div className="space-y-4">
                  <Label>Aperçu navigateur</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Chrome mockup */}
                    <div className="border rounded-lg p-3 bg-background">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <Chrome className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Chrome</span>
                      </div>
                      <div className="flex items-center gap-2 mt-3 bg-muted rounded px-2 py-1">
                        <img src={sourceImage} alt="Favicon" className="w-4 h-4" />
                        <span className="text-xs truncate">IArche | L'IA se construit...</span>
                      </div>
                    </div>
                    {/* Safari mockup */}
                    <div className="border rounded-lg p-3 bg-background">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <Apple className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Safari</span>
                      </div>
                      <div className="flex items-center gap-2 mt-3 bg-muted rounded px-2 py-1">
                        <img src={sourceImage} alt="Favicon" className="w-4 h-4" />
                        <span className="text-xs truncate">IArche</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generated files preview */}
          <Card>
            <CardHeader>
              <CardTitle>Fichiers générés</CardTitle>
              <CardDescription>Le pack contiendra les fichiers suivants</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {FAVICON_SIZES.map((item) => (
                  <div 
                    key={item.name}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      {sourceImage ? (
                        <img 
                          src={sourceImage} 
                          alt={item.name}
                          className="rounded"
                          style={{ 
                            width: Math.min('size' in item ? item.size : 32, 32), 
                            height: Math.min('size' in item ? item.size : 32, 32) 
                          }}
                        />
                      ) : (
                        <div 
                          className="bg-muted rounded"
                          style={{ 
                            width: Math.min('size' in item ? item.size : 32, 32), 
                            height: Math.min('size' in item ? item.size : 32, 32) 
                          }}
                        />
                      )}
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {'size' in item ? `${item.size}×${item.size}` : '16×16 + 32×32'}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                      <span className="text-xs font-mono text-primary">{'{}'}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">site.webmanifest</p>
                      <p className="text-xs text-muted-foreground">PWA manifest JSON</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">JSON</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
