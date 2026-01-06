import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

export interface CockpitPdfExportOptions {
  filename: string;
  onProgress?: (progress: number) => void;
}

// A4 dimensions
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const A4_WIDTH_PX = 794; // 210mm at 96dpi
const MARGIN_MM = 10;
const CONTENT_WIDTH_MM = A4_WIDTH_MM - (MARGIN_MM * 2);
const CONTENT_HEIGHT_MM = A4_HEIGHT_MM - (MARGIN_MM * 2);
const PIXEL_RATIO = 3;

/**
 * Export a cockpit document preview to PDF by capturing sections individually
 * Ensures 1 section = 1+ pages (no mixed sections on same page)
 * Prevents paragraph/content from being cut between pages
 */
export async function exportCockpitDocumentToPdf(
  element: HTMLElement,
  options: CockpitPdfExportOptions
): Promise<void> {
  const { filename, onProgress } = options;

  onProgress?.(5);

  // Store original styles to restore later
  const originalWidth = element.style.width;
  const originalMinWidth = element.style.minWidth;
  const originalMaxWidth = element.style.maxWidth;
  
  // Force fixed A4 width for consistent capture
  element.style.width = `${A4_WIDTH_PX}px`;
  element.style.minWidth = `${A4_WIDTH_PX}px`;
  element.style.maxWidth = `${A4_WIDTH_PX}px`;

  // Wait for reflow
  await new Promise(resolve => setTimeout(resolve, 100));

  onProgress?.(10);

  // Find all sections in the document
  const sections = element.querySelectorAll('[data-pdf-section]');
  const hasMultipleSections = sections.length > 1;

  // Create PDF
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  try {
    if (hasMultipleSections) {
      // Multi-section export: capture each section separately
      await exportSections(element, sections, pdf, onProgress);
    } else {
      // Single section or no sections marked: capture entire element
      await exportFullDocument(element, pdf, onProgress);
    }

    onProgress?.(95);

    // Save PDF
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüç\s-_]/gi, '').trim() || 'document';
    pdf.save(`${sanitizedFilename}.pdf`);

    onProgress?.(100);
  } finally {
    // Restore original styles
    element.style.width = originalWidth;
    element.style.minWidth = originalMinWidth;
    element.style.maxWidth = originalMaxWidth;
  }
}

/**
 * Export multiple sections, each starting on a new page
 */
async function exportSections(
  container: HTMLElement,
  sections: NodeListOf<Element>,
  pdf: jsPDF,
  onProgress?: (progress: number) => void
): Promise<void> {
  const totalSections = sections.length;
  
  for (let i = 0; i < totalSections; i++) {
    const section = sections[i] as HTMLElement;
    
    // Add new page for sections after the first
    if (i > 0) {
      pdf.addPage();
    }

    // Capture section as high-res PNG
    const dataUrl = await toPng(section, {
      pixelRatio: PIXEL_RATIO,
      backgroundColor: '#FAF9F7',
      cacheBust: true,
      filter: (node) => {
        if (node instanceof HTMLElement && node.tagName === 'BUTTON') {
          return false;
        }
        return true;
      },
    });

    // Load image to get dimensions
    const img = await loadImage(dataUrl);
    
    // Calculate scaled dimensions to fit A4 width
    const imgWidthPx = img.width / PIXEL_RATIO;
    const imgHeightPx = img.height / PIXEL_RATIO;
    
    // Scale to fit content width
    const scale = CONTENT_WIDTH_MM / (imgWidthPx * 0.264583); // px to mm conversion
    const scaledHeightMM = imgHeightPx * 0.264583 * scale;
    
    // Check if section fits on one page
    if (scaledHeightMM <= CONTENT_HEIGHT_MM) {
      // Fits on one page - center vertically
      pdf.addImage(dataUrl, 'PNG', MARGIN_MM, MARGIN_MM, CONTENT_WIDTH_MM, scaledHeightMM);
    } else {
      // Section is too tall - split across multiple pages
      await addMultiPageImage(pdf, img, dataUrl, MARGIN_MM, CONTENT_WIDTH_MM, CONTENT_HEIGHT_MM);
    }

    // Update progress
    const progress = 10 + ((i + 1) / totalSections) * 80;
    onProgress?.(Math.round(progress));
  }
}

/**
 * Export the full document (fallback for documents without marked sections)
 */
async function exportFullDocument(
  element: HTMLElement,
  pdf: jsPDF,
  onProgress?: (progress: number) => void
): Promise<void> {
  onProgress?.(20);

  // Capture entire element as high-res PNG
  const dataUrl = await toPng(element, {
    pixelRatio: PIXEL_RATIO,
    backgroundColor: '#FAF9F7',
    cacheBust: true,
    filter: (node) => {
      if (node instanceof HTMLElement && node.tagName === 'BUTTON') {
        return false;
      }
      return true;
    },
  });

  onProgress?.(60);

  // Load image
  const img = await loadImage(dataUrl);
  
  // Calculate dimensions
  const imgWidthPx = img.width / PIXEL_RATIO;
  const imgHeightPx = img.height / PIXEL_RATIO;
  
  // Scale to fit A4 width
  const scaleX = CONTENT_WIDTH_MM / (imgWidthPx * 0.264583);
  const scaledHeightMM = imgHeightPx * 0.264583 * scaleX;

  onProgress?.(70);

  if (scaledHeightMM <= CONTENT_HEIGHT_MM) {
    // Fits on one page
    pdf.addImage(dataUrl, 'PNG', MARGIN_MM, MARGIN_MM, CONTENT_WIDTH_MM, scaledHeightMM);
  } else {
    // Multi-page export with smart splitting
    await addMultiPageImage(pdf, img, dataUrl, MARGIN_MM, CONTENT_WIDTH_MM, CONTENT_HEIGHT_MM);
  }
}

/**
 * Add a tall image across multiple pages with proper splitting
 */
async function addMultiPageImage(
  pdf: jsPDF,
  img: HTMLImageElement,
  dataUrl: string,
  margin: number,
  contentWidth: number,
  contentHeight: number
): Promise<void> {
  const imgWidthPx = img.width;
  const imgHeightPx = img.height;
  
  // Calculate how much of the image height fits per page (in pixels)
  const pxPerMm = imgWidthPx / (contentWidth / 0.264583);
  const pageHeightPx = contentHeight / 0.264583 * pxPerMm;
  
  const totalPages = Math.ceil(imgHeightPx / pageHeightPx);
  
  for (let page = 0; page < totalPages; page++) {
    if (page > 0) {
      pdf.addPage();
    }
    
    // Calculate source region in the original image
    const srcY = page * pageHeightPx;
    const srcHeight = Math.min(pageHeightPx, imgHeightPx - srcY);
    
    // Create a canvas to extract this portion
    const canvas = document.createElement('canvas');
    canvas.width = imgWidthPx;
    canvas.height = srcHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, srcY, imgWidthPx, srcHeight, 0, 0, imgWidthPx, srcHeight);
      const pageDataUrl = canvas.toDataURL('image/png', 1.0);
      
      // Calculate height for this page slice
      const sliceHeightMM = (srcHeight / imgWidthPx) * contentWidth;
      
      pdf.addImage(pageDataUrl, 'PNG', margin, margin, contentWidth, sliceHeightMM);
    }
  }
}

/**
 * Load an image from a data URL
 */
function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}
