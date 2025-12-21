import { useState, useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Brochure } from '@/types/brochure';
import { useToast } from '@/hooks/use-toast';

interface SlideData {
  type: string;
  data: any;
  label: string;
}

export function useBrochurePdfHdExport() {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const buildSlides = useCallback((brochure: Brochure): SlideData[] => {
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

    return slides;
  }, []);

  const exportPdfHd = useCallback(async (
    brochure: Brochure,
    renderSection: (slide: SlideData, brochure: Brochure) => React.ReactNode
  ) => {
    if (isExporting) return;

    setIsExporting(true);
    setProgress(0);

    try {
      const slides = buildSlides(brochure);
      const basePageWidth = 210; // mm

      // Create off-screen container
      const container = document.createElement('div');
      container.style.cssText = 'position:absolute;left:-9999px;top:0;width:1200px;opacity:1;pointer-events:none;';
      document.body.appendChild(container);
      containerRef.current = container;

      let pdf: jsPDF | null = null;
      let exportedPages = 0;

      for (let i = 0; i < slides.length; i++) {
        setProgress(Math.round(((i + 0.5) / slides.length) * 85));

        // Clear and render section
        const sectionWrapper = document.createElement('div');
        sectionWrapper.style.cssText = 'width:1200px;min-height:1600px;background:#FFFDF9;';
        container.innerHTML = '';
        container.appendChild(sectionWrapper);

        // We need to use ReactDOM to render the section
        const { createRoot } = await import('react-dom/client');
        const root = createRoot(sectionWrapper);

        await new Promise<void>((resolve) => {
          root.render(renderSection(slides[i], brochure) as React.ReactElement);
          // Wait for render + fonts
          setTimeout(resolve, 300);
        });

        // Capture as PNG
        const dataUrl = await toPng(sectionWrapper, {
          quality: 1,
          backgroundColor: '#FFFDF9',
          pixelRatio: 4,
          cacheBust: true,
        });

        root.unmount();

        // Load image dimensions
        const img = new Image();
        await new Promise((resolve) => {
          img.onload = resolve;
          img.src = dataUrl;
        });

        const imgAspect = img.width / img.height;
        const pageWidth = basePageWidth;
        const pageHeight = basePageWidth / imgAspect;
        const orientation = pageHeight > pageWidth ? 'portrait' : 'landscape';

        if (!pdf) {
          pdf = new jsPDF({ orientation, unit: 'mm', format: [pageWidth, pageHeight] });
        } else {
          pdf.addPage([pageWidth, pageHeight], orientation);
        }

        pdf.addImage(dataUrl, 'PNG', 0, 0, pageWidth, pageHeight);
        exportedPages++;

        setProgress(Math.round(((i + 1) / slides.length) * 85));
      }

      // Cleanup
      document.body.removeChild(container);
      containerRef.current = null;

      setProgress(95);

      if (!pdf || exportedPages === 0) {
        throw new Error("Aucune section n'a pu être exportée.");
      }

      pdf.save(`${brochure.slug || 'brochure'}-hd.pdf`);
      setProgress(100);

      toast({
        title: 'PDF Haute-Fidélité généré',
        description: `${exportedPages} page(s) exportée(s)`,
      });
    } catch (error) {
      console.error('PDF HD export error:', error);
      toast({
        title: 'Erreur d\'export',
        description: String(error),
        variant: 'destructive',
      });

      // Cleanup on error
      if (containerRef.current && containerRef.current.parentNode) {
        document.body.removeChild(containerRef.current);
        containerRef.current = null;
      }
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  }, [buildSlides, isExporting, toast]);

  return { exportPdfHd, isExporting, progress };
}
