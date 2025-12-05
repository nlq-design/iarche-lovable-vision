import { useState, useRef, useEffect } from 'react';
import { toSvg, toPng } from 'html-to-image';
import { Brochure } from '@/types/brochure';
import { Button } from '@/components/ui/button';
import { Download, X, Image, FileImage, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import BrochureWebView from './BrochureWebView';

interface BrochureSVGExportProps {
  brochure: Brochure;
  isOpen: boolean;
  onClose: () => void;
}

type ExportFormat = 'svg' | 'png';

const BrochureSVGExport = ({ brochure, isOpen, onClose }: BrochureSVGExportProps) => {
  const { toast } = useToast();
  const [format, setFormat] = useState<ExportFormat>('svg');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Wait for render
      const timer = setTimeout(() => setPreviewReady(true), 500);
      return () => clearTimeout(timer);
    } else {
      setPreviewReady(false);
    }
  }, [isOpen]);

  const handleExport = async () => {
    if (!captureRef.current) {
      toast({
        title: "Erreur",
        description: "Impossible de capturer la brochure",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      const options = {
        quality: 1,
        backgroundColor: '#FFFDF9',
        pixelRatio: 2,
        cacheBust: true,
        // Filter out any problematic elements
        filter: (node: HTMLElement) => {
          // Remove any navigation elements
          if (node.classList?.contains('slide-navigation')) return false;
          return true;
        }
      };

      let dataUrl: string;
      let filename: string;
      let mimeType: string;

      if (format === 'svg') {
        dataUrl = await toSvg(captureRef.current, options);
        filename = `${brochure.slug || 'brochure'}-web.svg`;
        mimeType = 'image/svg+xml';
      } else {
        dataUrl = await toPng(captureRef.current, {
          ...options,
          pixelRatio: 3, // Higher quality for PNG
        });
        filename = `${brochure.slug || 'brochure'}-web.png`;
        mimeType = 'image/png';
      }

      // Download
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();

      toast({
        title: "Export réussi",
        description: `${format.toUpperCase()} téléchargé avec succès`,
      });

      onClose();
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Erreur d'export",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-semibold">Export Image (SVG/PNG)</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Capture haute-fidélité du rendu web avec dégradés
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Options */}
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Format d'export</Label>
                <RadioGroup 
                  value={format} 
                  onValueChange={(v) => setFormat(v as ExportFormat)}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <label 
                      htmlFor="svg-format" 
                      className={`flex flex-col items-center gap-2 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        format === 'svg' ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                      }`}
                    >
                      <RadioGroupItem value="svg" id="svg-format" className="sr-only" />
                      <Image className="h-8 w-8 text-muted-foreground" />
                      <span className="font-medium">SVG</span>
                      <span className="text-xs text-muted-foreground text-center">
                        Vectoriel, éditable, scalable
                      </span>
                    </label>
                    <label 
                      htmlFor="png-format" 
                      className={`flex flex-col items-center gap-2 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        format === 'png' ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                      }`}
                    >
                      <RadioGroupItem value="png" id="png-format" className="sr-only" />
                      <FileImage className="h-8 w-8 text-muted-foreground" />
                      <span className="font-medium">PNG</span>
                      <span className="text-xs text-muted-foreground text-center">
                        Image bitmap haute résolution
                      </span>
                    </label>
                  </div>
                </RadioGroup>
              </div>

              {/* Info */}
              <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm">Avantages de l'export image</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>✓ Dégradés de texte préservés</li>
                  <li>✓ Rendu identique au web</li>
                  <li>✓ Couleurs exactes de la charte</li>
                  <li>✓ Polices correctement rendues</li>
                </ul>
                <p className="text-xs text-muted-foreground pt-2 border-t border-border mt-2">
                  <strong>Note :</strong> L'export capture la page entière en une seule image. 
                  Pour un document multi-pages, utilisez l'export PDF.
                </p>
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Aperçu</Label>
              <div className="border rounded-lg overflow-hidden bg-muted/20 h-64 relative">
                {!previewReady ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="w-full h-full overflow-auto">
                    <div className="transform scale-[0.15] origin-top-left">
                      <div 
                        ref={captureRef}
                        style={{ width: '1200px' }}
                      >
                        <BrochureWebView brochure={{
                          ...brochure,
                          export_settings: {
                            ...brochure.export_settings,
                            web_scroll: 'vertical' // Force vertical for capture
                          }
                        }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                La brochure sera exportée en mode vertical complet
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-secondary/30">
          <p className="text-sm text-muted-foreground">
            Format : <strong>{format.toUpperCase()}</strong>
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button 
              onClick={handleExport} 
              disabled={isGenerating || !previewReady}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Télécharger {format.toUpperCase()}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrochureSVGExport;
