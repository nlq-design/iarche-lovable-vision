import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

export interface PdfHdExportOptions {
  filename: string;
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'custom';
  customWidth?: number; // in mm
  customHeight?: number; // in mm
  pixelRatio?: number;
  backgroundColor?: string;
  onProgress?: (progress: number) => void;
}

/**
 * Export a single HTML element to PDF HD by capturing it as a high-resolution PNG
 */
export async function exportSingleSlideToPdfHd(
  element: HTMLElement,
  options: PdfHdExportOptions
): Promise<void> {
  const {
    filename,
    orientation = 'landscape',
    format = 'a4',
    customWidth,
    customHeight,
    pixelRatio = 4,
    backgroundColor,
    onProgress,
  } = options;

  // Page dimensions in mm
  const pageWidth = format === 'custom' && customWidth ? customWidth : (orientation === 'landscape' ? 297 : 210);
  const pageHeight = format === 'custom' && customHeight ? customHeight : (orientation === 'landscape' ? 210 : 297);

  onProgress?.(10);

  // Capture element as high-res PNG
  const dataUrl = await toPng(element, {
    pixelRatio,
    backgroundColor,
    cacheBust: true,
  });

  onProgress?.(60);

  // Create PDF
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: format === 'custom' ? [pageWidth, pageHeight] : 'a4',
  });

  // Calculate dimensions to fit page while preserving aspect ratio
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

  onProgress?.(90);

  // Save PDF
  pdf.save(`${filename}.pdf`);

  onProgress?.(100);
}

/**
 * Export multiple HTML slides to a multi-page PDF HD
 * Each slide is captured as a high-resolution PNG and added as a page
 */
export async function exportMultiSlidesToPdfHd(
  captureSlide: (slideIndex: number) => Promise<HTMLElement | null>,
  totalSlides: number,
  options: PdfHdExportOptions
): Promise<void> {
  const {
    filename,
    orientation = 'landscape',
    format = 'a4',
    customWidth,
    customHeight,
    pixelRatio = 4,
    backgroundColor,
    onProgress,
  } = options;

  // Page dimensions in mm
  const pageWidth = format === 'custom' && customWidth ? customWidth : (orientation === 'landscape' ? 297 : 210);
  const pageHeight = format === 'custom' && customHeight ? customHeight : (orientation === 'landscape' ? 210 : 297);

  // Create PDF
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: format === 'custom' ? [pageWidth, pageHeight] : 'a4',
  });

  for (let i = 0; i < totalSlides; i++) {
    const element = await captureSlide(i);
    if (!element) continue;

    onProgress?.(Math.round(((i + 1) / totalSlides) * 85));

    // Capture slide as high-res PNG
    const dataUrl = await toPng(element, {
      pixelRatio,
      backgroundColor,
      cacheBust: true,
    });

    // Add new page (except for first)
    if (i > 0) {
      pdf.addPage();
    }

    // Calculate dimensions to fit page while preserving aspect ratio
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

  onProgress?.(95);

  // Save PDF
  pdf.save(`${filename}.pdf`);

  onProgress?.(100);
}
