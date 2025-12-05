import { useState, useRef, useEffect } from 'react';
import { toSvg, toPng } from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Brochure } from '@/types/brochure';
import { Button } from '@/components/ui/button';
import { Download, X, Image, FileImage, Loader2, Package, FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import BrochureSectionRenderer from './BrochureSectionRenderer';

interface BrochureSVGExportProps {
  brochure: Brochure;
  isOpen: boolean;
  onClose: () => void;
}

type ExportFormat = 'svg' | 'png';
type ExportMode = 'single' | 'multi';

interface SlideData {
  type: string;
  data: any;
  label: string;
}

const BrochureSVGExport = ({ brochure, isOpen, onClose }: BrochureSVGExportProps) => {
  const { toast } = useToast();
  const [format, setFormat] = useState<ExportFormat>('png');
  const [mode, setMode] = useState<ExportMode>('multi');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewReady, setPreviewReady] = useState(false);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Build slides array
  const slides: SlideData[] = [];
  slides.push({ type: 'cover', data: brochure, label: '01-couverture' });
  
  if (brochure.sections.introduction.enabled && brochure.sections.introduction.content) {
    slides.push({ type: 'introduction', data: brochure.sections.introduction, label: '02-introduction' });
  }
  if (brochure.sections.keyPoints.enabled && brochure.sections.keyPoints.points.length > 0) {
    slides.push({ type: 'keyPoints', data: brochure.sections.keyPoints, label: '03-points-cles' });
  }
  if (brochure.sections.details.enabled && brochure.sections.details.content) {
    slides.push({ type: 'details', data: brochure.sections.details, label: '04-details' });
  }
  if (brochure.sections.pricing.enabled && brochure.sections.pricing.plans.length > 0) {
    slides.push({ type: 'pricing', data: brochure.sections.pricing, label: '05-tarifs' });
  }
  if (brochure.sections.testimonial.enabled && brochure.sections.testimonial.quote) {
    slides.push({ type: 'testimonial', data: brochure.sections.testimonial, label: '06-temoignage' });
  }
  if (brochure.sections.contact.enabled) {
    slides.push({ type: 'contact', data: brochure.sections.contact, label: '07-contact' });
  }

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setPreviewReady(true), 800);
      return () => clearTimeout(timer);
    } else {
      setPreviewReady(false);
      setProgress(0);
    }
  }, [isOpen]);

  const exportOptions = {
    quality: 1,
    backgroundColor: '#FFFDF9',
    pixelRatio: format === 'png' ? 3 : 2,
    cacheBust: true,
  };

  const handleExportSingle = async () => {
    // Export all sections as one combined image
    const allSectionsContainer = document.getElementById('brochure-all-sections');
    if (!allSectionsContainer) {
      toast({ title: 'Erreur', description: 'Impossible de capturer', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    setProgress(50);

    try {
      const dataUrl = format === 'svg' 
        ? await toSvg(allSectionsContainer, exportOptions)
        : await toPng(allSectionsContainer, exportOptions);

      const link = document.createElement('a');
      link.download = `${brochure.slug || 'brochure'}-complet.${format}`;
      link.href = dataUrl;
      link.click();

      setProgress(100);
      toast({ title: 'Export réussi', description: `Image complète téléchargée` });
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: 'Erreur', description: String(error), variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportMulti = async () => {
    setIsGenerating(true);
    setProgress(0);

    try {
      const zip = new JSZip();
      const folder = zip.folder(`${brochure.slug || 'brochure'}-sections`);
      
      for (let i = 0; i < slides.length; i++) {
        const ref = sectionRefs.current[i];
        if (!ref) continue;

        setProgress(Math.round(((i + 1) / slides.length) * 80));

        const dataUrl = format === 'svg'
          ? await toSvg(ref, exportOptions)
          : await toPng(ref, exportOptions);

        // Convert data URL to blob
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        
        folder?.file(`${slides[i].label}.${format}`, blob);
      }

      setProgress(90);
      
      // Generate and download zip
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `${brochure.slug || 'brochure'}-sections.zip`);

      setProgress(100);
      toast({ 
        title: 'Export réussi', 
        description: `${slides.length} sections exportées en ${format.toUpperCase()}` 
      });
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: 'Erreur', description: String(error), variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = () => {
    if (mode === 'single') {
      handleExportSingle();
    } else {
      handleExportMulti();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-background rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-semibold">Export Image (SVG/PNG)</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Capture haute-fidélité avec dégradés préservés
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
              {/* Export Mode */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Mode d'export</Label>
                <RadioGroup value={mode} onValueChange={(v) => setMode(v as ExportMode)}>
                  <div className="grid grid-cols-2 gap-4">
                    <label 
                      htmlFor="multi-mode" 
                      className={`flex flex-col items-center gap-2 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        mode === 'multi' ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                      }`}
                    >
                      <RadioGroupItem value="multi" id="multi-mode" className="sr-only" />
                      <Package className="h-8 w-8 text-muted-foreground" />
                      <span className="font-medium">Multi-sections</span>
                      <span className="text-xs text-muted-foreground text-center">
                        {slides.length} fichiers dans un ZIP
                      </span>
                    </label>
                    <label 
                      htmlFor="single-mode" 
                      className={`flex flex-col items-center gap-2 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        mode === 'single' ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                      }`}
                    >
                      <RadioGroupItem value="single" id="single-mode" className="sr-only" />
                      <FileDown className="h-8 w-8 text-muted-foreground" />
                      <span className="font-medium">Image unique</span>
                      <span className="text-xs text-muted-foreground text-center">
                        Toute la brochure en 1 fichier
                      </span>
                    </label>
                  </div>
                </RadioGroup>
              </div>

              {/* Format */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Format</Label>
                <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
                  <div className="grid grid-cols-2 gap-4">
                    <label 
                      htmlFor="png-format" 
                      className={`flex flex-col items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                        format === 'png' ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                      }`}
                    >
                      <RadioGroupItem value="png" id="png-format" className="sr-only" />
                      <FileImage className="h-6 w-6 text-muted-foreground" />
                      <span className="font-medium text-sm">PNG</span>
                      <span className="text-xs text-muted-foreground">Haute résolution</span>
                    </label>
                    <label 
                      htmlFor="svg-format" 
                      className={`flex flex-col items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                        format === 'svg' ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                      }`}
                    >
                      <RadioGroupItem value="svg" id="svg-format" className="sr-only" />
                      <Image className="h-6 w-6 text-muted-foreground" />
                      <span className="font-medium text-sm">SVG</span>
                      <span className="text-xs text-muted-foreground">Vectoriel</span>
                    </label>
                  </div>
                </RadioGroup>
              </div>

              {/* Info */}
              <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm">Sections à exporter</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {slides.map((slide, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded bg-accent/20 text-accent text-[10px] flex items-center justify-center font-medium">
                        {i + 1}
                      </span>
                      {slide.label.replace(/^\d+-/, '').replace(/-/g, ' ')}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Aperçu des sections</Label>
              <div className="border rounded-lg overflow-hidden bg-muted/20 h-80 relative">
                {!previewReady ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="w-full h-full overflow-auto p-2">
                    <div className="grid grid-cols-3 gap-2">
                      {slides.map((slide, index) => (
                        <div 
                          key={index}
                          className="aspect-[4/3] rounded border border-border overflow-hidden bg-background relative"
                        >
                          <div className="transform scale-[0.08] origin-top-left absolute">
                            <div 
                              ref={el => sectionRefs.current[index] = el}
                              style={{ width: '1200px', minHeight: '800px' }}
                            >
                              <BrochureSectionRenderer 
                                slide={slide} 
                                brochure={brochure}
                              />
                            </div>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm px-1 py-0.5">
                            <span className="text-[9px] text-muted-foreground truncate block">
                              {slide.label}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Hidden container for single export */}
              <div className="absolute -left-[9999px] opacity-0 pointer-events-none">
                <div id="brochure-all-sections" style={{ width: '1200px' }}>
                  {slides.map((slide, index) => (
                    <BrochureSectionRenderer 
                      key={index}
                      slide={slide} 
                      brochure={brochure}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-secondary/30">
          {isGenerating && (
            <div className="mb-3">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                Export en cours... {progress}%
              </p>
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {mode === 'multi' ? (
                <>{slides.length} sections → ZIP ({format.toUpperCase()})</>
              ) : (
                <>Image complète ({format.toUpperCase()})</>
              )}
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
                    Télécharger
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrochureSVGExport;
