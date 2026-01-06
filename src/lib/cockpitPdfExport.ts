import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

export interface CockpitPdfExportOptions {
  filename: string;
  onProgress?: (progress: number) => void;
}

/**
 * Export a cockpit document preview to PDF by capturing it as a high-resolution PNG
 * This ensures 100% visual parity between preview and PDF (headers, footers, colors, etc.)
 */
export async function exportCockpitDocumentToPdf(
  element: HTMLElement,
  options: CockpitPdfExportOptions
): Promise<void> {
  const { filename, onProgress } = options;

  onProgress?.(5);

  // Get element dimensions
  const elementWidth = element.offsetWidth;
  const elementHeight = element.offsetHeight;

  // A4 dimensions in mm
  const pageWidth = 210;
  const pageHeight = 297;

  // Calculate aspect ratios
  const elementAspect = elementWidth / elementHeight;
  const pageAspect = pageWidth / pageHeight;

  onProgress?.(10);

  // Capture element as high-res PNG with pixelRatio 3 for quality
  const dataUrl = await toPng(element, {
    pixelRatio: 3,
    backgroundColor: '#FAF9F7', // IArche blanc cassé
    cacheBust: true,
    // Ensure all images are loaded
    filter: (node) => {
      // Skip any nodes that might cause issues
      if (node instanceof HTMLElement && node.tagName === 'BUTTON') {
        return false;
      }
      return true;
    },
  });

  onProgress?.(60);

  // Determine if we need multiple pages based on aspect ratio
  // If element is much taller than A4, we'll scale to fit width and use multiple pages
  const needsMultiplePages = elementAspect < pageAspect * 0.5; // Element is significantly taller

  // Create PDF
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Load image to get actual pixel dimensions
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = dataUrl;
  });

  onProgress?.(70);

  if (needsMultiplePages) {
    // Multi-page export: fit to width, split across pages
    const imgWidthPx = img.width;
    const imgHeightPx = img.height;
    
    // Scale to fit page width with margins
    const margin = 10; // 10mm margins
    const contentWidth = pageWidth - (margin * 2);
    const scale = contentWidth / (imgWidthPx / 3); // Divide by pixelRatio
    const scaledHeight = (imgHeightPx / 3) * scale;
    
    // How much content height fits per page
    const contentHeightPerPage = pageHeight - (margin * 2);
    const totalPages = Math.ceil(scaledHeight / contentHeightPerPage);
    
    for (let page = 0; page < totalPages; page++) {
      if (page > 0) {
        pdf.addPage();
      }
      
      // Calculate source position in original image
      const srcY = (page * contentHeightPerPage) / scale * 3; // Convert back to pixels
      const srcHeight = Math.min(contentHeightPerPage / scale * 3, imgHeightPx - srcY);
      
      // Create a canvas to extract this portion of the image
      const canvas = window.document.createElement('canvas');
      canvas.width = imgWidthPx;
      canvas.height = srcHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, srcY, imgWidthPx, srcHeight, 0, 0, imgWidthPx, srcHeight);
        const pageDataUrl = canvas.toDataURL('image/png', 1.0);
        
        const pageImgHeight = (srcHeight / 3) * scale;
        pdf.addImage(pageDataUrl, 'PNG', margin, margin, contentWidth, pageImgHeight);
      }
      
      onProgress?.(70 + (page / totalPages) * 25);
    }
  } else {
    // Single page: fit entire content with aspect ratio preservation
    const margin = 10;
    const maxWidth = pageWidth - (margin * 2);
    const maxHeight = pageHeight - (margin * 2);
    
    let finalWidth = maxWidth;
    let finalHeight = maxWidth / elementAspect;
    
    if (finalHeight > maxHeight) {
      finalHeight = maxHeight;
      finalWidth = maxHeight * elementAspect;
    }
    
    const offsetX = margin + (maxWidth - finalWidth) / 2;
    const offsetY = margin;
    
    pdf.addImage(dataUrl, 'PNG', offsetX, offsetY, finalWidth, finalHeight);
  }

  onProgress?.(95);

  // Save PDF
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüç\s-_]/gi, '').trim() || 'document';
  pdf.save(`${sanitizedFilename}.pdf`);

  onProgress?.(100);
}
