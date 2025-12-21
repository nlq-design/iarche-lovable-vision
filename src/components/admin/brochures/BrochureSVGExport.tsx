import { useState, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import { Brochure } from '@/types/brochure';
import { Button } from '@/components/ui/button';
import { Download, X, FileImage, Loader2, Package, FileText, ChevronLeft, ChevronRight, Eye, EyeOff, ZoomIn, ZoomOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import BrochureSectionRenderer from './BrochureSectionRenderer';

interface BrochureSVGExportProps {
  brochure: Brochure;
  isOpen: boolean;
  onClose: () => void;
}

type ExportMode = 'multi-png' | 'single-png' | 'pdf-hd';

interface SlideData {
  type: string;
  data: any;
  label: string;
}

const BrochureSVGExport = ({ brochure, isOpen, onClose }: BrochureSVGExportProps) => {
  const { toast } = useToast();
  const [mode, setMode] = useState<ExportMode>('pdf-hd');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewReady, setPreviewReady] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [previewScale, setPreviewScale] = useState(0.5);
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
      setCurrentSlide(0);
    }
  }, [isOpen]);

  const exportOptions = {
    quality: 1,
    backgroundColor: '#FFFDF9',
    pixelRatio: 3,
    cacheBust: true,
  };

  const handleExportSinglePng = async () => {
    const allSectionsContainer = document.getElementById('brochure-all-sections');
    if (!allSectionsContainer) {
      toast({ title: 'Erreur', description: 'Impossible de capturer', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    setProgress(50);

    try {
      const dataUrl = await toPng(allSectionsContainer, exportOptions);

      const link = document.createElement('a');
      link.download = `${brochure.slug || 'brochure'}-complet.png`;
      link.href = dataUrl;
      link.click();

      setProgress(100);
      toast({ title: 'Export réussi', description: 'Image complète téléchargée' });
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: 'Erreur', description: String(error), variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportMultiPng = async () => {
    setIsGenerating(true);
    setProgress(0);

    try {
      const zip = new JSZip();
      const folder = zip.folder(`${brochure.slug || 'brochure'}-sections`);
      
      for (let i = 0; i < slides.length; i++) {
        const ref = sectionRefs.current[i];
        if (!ref) continue;

        setProgress(Math.round(((i + 1) / slides.length) * 80));

        const dataUrl = await toPng(ref, exportOptions);
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        
        folder?.file(`${slides[i].label}.png`, blob);
      }

      setProgress(90);
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `${brochure.slug || 'brochure'}-sections.zip`);

      setProgress(100);
      toast({ 
        title: 'Export réussi', 
        description: `${slides.length} sections exportées` 
      });
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: 'Erreur', description: String(error), variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPdfHd = async () => {
    setIsGenerating(true);
    setProgress(0);

    try {
      // On va créer le PDF avec des pages qui correspondent exactement au ratio des sections
      // Format brochure - pages personnalisées pour éviter les bordures blanches
      const basePageWidth = 210; // mm

      let pdf: jsPDF | null = null;
      let exportedPages = 0;

      for (let i = 0; i < slides.length; i++) {
        const ref = sectionRefs.current[i];
        if (!ref) continue;

        setProgress(Math.round(((i + 1) / slides.length) * 90));

        // Capture section as high-res PNG
        const dataUrl = await toPng(ref, {
          ...exportOptions,
          pixelRatio: 4, // Higher quality for PDF
        });

        // Charger l'image pour obtenir ses dimensions réelles
        const img = new Image();
        await new Promise((resolve) => {
          img.onload = resolve;
          img.src = dataUrl;
        });

        // Page PDF au ratio exact de l'image (zéro marge)
        const imgAspect = img.width / img.height;
        const pageWidth = basePageWidth;
        const pageHeight = basePageWidth / imgAspect;
        const orientation = pageHeight > pageWidth ? 'portrait' : 'landscape';

        if (!pdf) {
          // Première section réellement exportée
          pdf = new jsPDF({
            orientation,
            unit: 'mm',
            format: [pageWidth, pageHeight],
          });
        } else {
          // Nouvelle page avec dimensions exactes
          pdf.addPage([pageWidth, pageHeight], orientation);
        }

        pdf.addImage(dataUrl, 'PNG', 0, 0, pageWidth, pageHeight);
        exportedPages++;
      }

      setProgress(95);

      if (!pdf || exportedPages === 0) {
        throw new Error("Aucune section n'a pu être exportée (rien à capturer).");
      }

      // Save PDF
      pdf.save(`${brochure.slug || 'brochure'}-hd.pdf`);

      setProgress(100);
      toast({
        title: 'PDF Ultra HD généré',
        description: `${exportedPages} page(s) haute-fidélité sans bordures`,
      });
      onClose();
    } catch (error) {
      console.error('PDF export error:', error);
      toast({ title: 'Erreur', description: String(error), variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = () => {
    switch (mode) {
      case 'pdf-hd':
        handleExportPdfHd();
        break;
      case 'multi-png':
        handleExportMultiPng();
        break;
      case 'single-png':
        handleExportSinglePng();
        break;
    }
  };

  const goToPrevSlide = () => {
    setCurrentSlide(prev => prev > 0 ? prev - 1 : slides.length - 1);
  };

  const goToNextSlide = () => {
    setCurrentSlide(prev => prev < slides.length - 1 ? prev + 1 : 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col lg:flex-row">
        {/* Live Preview Panel */}
        {showLivePreview && (
          <div className="flex-1 bg-muted/30 border-r flex flex-col min-h-[400px]">
            {/* Preview Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-background/80">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">
                  Page {currentSlide + 1} / {slides.length}
                </span>
                <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
                  {slides[currentSlide]?.type}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPreviewScale(s => Math.max(0.2, s - 0.1))}
                  className="h-8 w-8"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground w-12 text-center">
                  {Math.round(previewScale * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPreviewScale(s => Math.min(1, s + 0.1))}
                  className="h-8 w-8"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 relative overflow-auto p-4">
              {!previewReady ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="flex items-center justify-center min-h-full">
                  <div 
                    className="bg-white shadow-2xl rounded-lg overflow-hidden transition-transform"
                    style={{ 
                      transform: `scale(${previewScale})`,
                      transformOrigin: 'center center',
                    }}
                  >
                    <div 
                      ref={el => sectionRefs.current[currentSlide] = el}
                      style={{ width: '1200px', minHeight: '1600px' }}
                    >
                      <BrochureSectionRenderer 
                        slide={slides[currentSlide]} 
                        brochure={brochure}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Preview Navigation */}
            <div className="flex items-center justify-between px-4 py-3 border-t bg-background/80">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPrevSlide}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Précédent
              </Button>
              <div className="flex items-center gap-1">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === currentSlide ? 'bg-accent' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                    }`}
                  />
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextSlide}
                className="gap-2"
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Controls Panel */}
        <div className="w-full lg:w-96 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div>
              <h2 className="text-lg font-semibold">Export Haute-Fidélité</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Capture du rendu web avec dégradés préservés
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Options */}
          <div className="flex-1 overflow-auto p-6 space-y-5">
            {/* Toggle Preview */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowLivePreview(!showLivePreview)}
              className="w-full"
            >
              {showLivePreview ? (
                <>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Masquer l'aperçu
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Afficher l'aperçu
                </>
              )}
            </Button>

            {/* Export Mode */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Mode d'export</Label>
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as ExportMode)}>
                <div className="space-y-2">
                  {/* PDF HD - Recommended */}
                  <label 
                    htmlFor="pdf-hd-mode" 
                    className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                      mode === 'pdf-hd' ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                    }`}
                  >
                    <RadioGroupItem value="pdf-hd" id="pdf-hd-mode" className="mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-accent" />
                        <span className="font-medium text-sm">PDF Haute-Fidélité</span>
                        <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full">
                          Recommandé
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        PDF multi-pages avec capture web
                      </p>
                    </div>
                  </label>

                  {/* Multi PNG */}
                  <label 
                    htmlFor="multi-png-mode" 
                    className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                      mode === 'multi-png' ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                    }`}
                  >
                    <RadioGroupItem value="multi-png" id="multi-png-mode" className="mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">Images séparées (ZIP)</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {slides.length} fichiers PNG dans une archive
                      </p>
                    </div>
                  </label>

                  {/* Single PNG */}
                  <label 
                    htmlFor="single-png-mode" 
                    className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                      mode === 'single-png' ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                    }`}
                  >
                    <RadioGroupItem value="single-png" id="single-png-mode" className="mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <FileImage className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">Image unique</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Toute la brochure en un seul PNG
                      </p>
                    </div>
                  </label>
                </div>
              </RadioGroup>
            </div>

            {/* Slides thumbnails - for navigation */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Sections ({slides.length})</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {slides.map((slide, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`aspect-[3/4] rounded border-2 overflow-hidden transition-colors ${
                      index === currentSlide ? 'border-accent' : 'border-border hover:border-accent/50'
                    }`}
                  >
                    <div className="w-full h-full bg-muted/50 flex items-center justify-center">
                      <span className="text-xs font-medium text-muted-foreground">
                        {index + 1}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Info */}
            <div className="bg-secondary/50 rounded-lg p-3 space-y-1">
              <h4 className="font-medium text-xs">
                {mode === 'pdf-hd' ? 'Avantages PDF HD' : 'Export sélectionné'}
              </h4>
              {mode === 'pdf-hd' ? (
                <ul className="text-[11px] text-muted-foreground space-y-0.5">
                  <li>✓ Dégradés de texte préservés</li>
                  <li>✓ Format PDF partageable</li>
                  <li>✓ Résolution 4x pour impression</li>
                </ul>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  {mode === 'multi-png' ? `${slides.length} images PNG en archive ZIP` : 'Image PNG longue unique'}
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-secondary/30">
            {isGenerating && (
              <div className="mb-3">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {mode === 'pdf-hd' ? 'Génération du PDF HD...' : 'Export en cours...'} {progress}%
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Annuler
              </Button>
              <Button 
                onClick={handleExport} 
                disabled={isGenerating || !previewReady}
                className="flex-1 gap-2"
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

        {/* Hidden containers for export - must render all sections */}
        <div className="absolute -left-[9999px] opacity-0 pointer-events-none">
          {/* Individual sections for multi-png */}
          {slides.map((slide, index) => (
            <div 
              key={index}
              ref={el => {
                // Only set ref if not the current slide (which is visible in preview)
                if (index !== currentSlide) {
                  sectionRefs.current[index] = el;
                }
              }}
              style={{ width: '1200px', minHeight: '1600px' }}
            >
              <BrochureSectionRenderer 
                slide={slide} 
                brochure={brochure}
              />
            </div>
          ))}
          
          {/* All sections for single-png */}
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
  );
};

export default BrochureSVGExport;
