import { useState, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import { Brochure } from '@/types/brochure';
import { Button } from '@/components/ui/button';
import { Download, X, FileImage, Loader2, Package, FileDown, FileText } from 'lucide-react';
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
      // A4 dimensions in mm
      const pageWidth = 210;
      const pageHeight = 297;
      
      // Create PDF in portrait A4
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      for (let i = 0; i < slides.length; i++) {
        const ref = sectionRefs.current[i];
        if (!ref) continue;

        setProgress(Math.round(((i + 1) / slides.length) * 90));

        // Capture section as high-res PNG
        const dataUrl = await toPng(ref, {
          ...exportOptions,
          pixelRatio: 4, // Higher quality for PDF
        });

        // Add new page (except for first)
        if (i > 0) {
          pdf.addPage();
        }

        // Calculate dimensions to fit A4 while preserving aspect ratio
        const img = new Image();
        await new Promise((resolve) => {
          img.onload = resolve;
          img.src = dataUrl;
        });

        const imgAspect = img.width / img.height;
        const pageAspect = pageWidth / pageHeight;

        let finalWidth = pageWidth;
        let finalHeight = pageHeight;
        let offsetX = 0;
        let offsetY = 0;

        if (imgAspect > pageAspect) {
          // Image is wider - fit to width
          finalHeight = pageWidth / imgAspect;
          offsetY = (pageHeight - finalHeight) / 2;
        } else {
          // Image is taller - fit to height
          finalWidth = pageHeight * imgAspect;
          offsetX = (pageWidth - finalWidth) / 2;
        }

        // Add image to PDF
        pdf.addImage(dataUrl, 'PNG', offsetX, offsetY, finalWidth, finalHeight);
      }

      setProgress(95);

      // Save PDF
      pdf.save(`${brochure.slug || 'brochure'}-hd.pdf`);

      setProgress(100);
      toast({ 
        title: 'PDF HD généré', 
        description: `${slides.length} pages avec rendu web haute-fidélité` 
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-background rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-semibold">Export Haute-Fidélité</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Capture du rendu web avec dégradés et styles préservés
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
                  <div className="space-y-3">
                    {/* PDF HD - Recommended */}
                    <label 
                      htmlFor="pdf-hd-mode" 
                      className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        mode === 'pdf-hd' ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                      }`}
                    >
                      <RadioGroupItem value="pdf-hd" id="pdf-hd-mode" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-accent" />
                          <span className="font-medium">PDF Haute-Fidélité</span>
                          <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">
                            Recommandé
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          PDF multi-pages avec capture web (dégradés préservés)
                        </p>
                      </div>
                    </label>

                    {/* Multi PNG */}
                    <label 
                      htmlFor="multi-png-mode" 
                      className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        mode === 'multi-png' ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                      }`}
                    >
                      <RadioGroupItem value="multi-png" id="multi-png-mode" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Package className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">Images séparées (ZIP)</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {slides.length} fichiers PNG dans une archive
                        </p>
                      </div>
                    </label>

                    {/* Single PNG */}
                    <label 
                      htmlFor="single-png-mode" 
                      className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        mode === 'single-png' ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                      }`}
                    >
                      <RadioGroupItem value="single-png" id="single-png-mode" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <FileImage className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">Image unique</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Toute la brochure en un seul PNG
                        </p>
                      </div>
                    </label>
                  </div>
                </RadioGroup>
              </div>

              {/* Info */}
              <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm">
                  {mode === 'pdf-hd' ? 'Avantages du PDF HD' : 'Sections à exporter'}
                </h4>
                {mode === 'pdf-hd' ? (
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>✓ Dégradés de texte préservés à 100%</li>
                    <li>✓ Format PDF standard partageable</li>
                    <li>✓ Multi-pages automatique</li>
                    <li>✓ Résolution 4x pour impression</li>
                  </ul>
                ) : (
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
                )}
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Aperçu des {slides.length} sections</Label>
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
                          className="aspect-[3/4] rounded border border-border overflow-hidden bg-background relative"
                        >
                          <div className="transform scale-[0.06] origin-top-left absolute">
                            <div 
                              ref={el => sectionRefs.current[index] = el}
                              style={{ width: '1200px', minHeight: '1600px' }}
                            >
                              <BrochureSectionRenderer 
                                slide={slide} 
                                brochure={brochure}
                              />
                            </div>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-background/90 backdrop-blur-sm px-1.5 py-1">
                            <span className="text-[9px] text-muted-foreground truncate block font-medium">
                              {index + 1}. {slide.type}
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
                {mode === 'pdf-hd' ? 'Génération du PDF HD...' : 'Export en cours...'} {progress}%
              </p>
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {mode === 'pdf-hd' && <>PDF {slides.length} pages · Résolution 4x</>}
              {mode === 'multi-png' && <>{slides.length} PNG → ZIP</>}
              {mode === 'single-png' && <>PNG unique · Résolution 3x</>}
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
                    {mode === 'pdf-hd' ? 'Télécharger PDF HD' : 'Télécharger'}
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
