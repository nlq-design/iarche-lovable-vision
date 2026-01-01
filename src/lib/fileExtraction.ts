/**
 * Client-side file content extraction
 * Uses pdf.js for PDFs and mammoth for DOCX
 */

import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ExtractionResult {
  success: boolean;
  text: string;
  error?: string;
  needsOcr?: boolean;
  pageCount?: number;
}

/**
 * Extract text from a PDF file
 */
export async function extractPdfText(file: File): Promise<ExtractionResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    const numPages = pdf.numPages;
    
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
    }

    // If text is very short compared to pages, might be scanned
    const avgCharsPerPage = fullText.length / numPages;
    const needsOcr = avgCharsPerPage < 50;

    if (needsOcr) {
      return {
        success: false,
        text: '',
        needsOcr: true,
        pageCount: numPages,
        error: 'PDF semble être scanné, OCR requis',
      };
    }

    return {
      success: true,
      text: fullText.trim(),
      pageCount: numPages,
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    return {
      success: false,
      text: '',
      error: error instanceof Error ? error.message : 'Extraction PDF échouée',
      needsOcr: true,
    };
  }
}

/**
 * Extract text from a DOCX file
 */
export async function extractDocxText(file: File): Promise<ExtractionResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    if (result.value.length < 10) {
      return {
        success: false,
        text: '',
        error: 'Document vide ou protégé',
      };
    }

    return {
      success: true,
      text: result.value,
    };
  } catch (error) {
    console.error('DOCX extraction error:', error);
    return {
      success: false,
      text: '',
      error: error instanceof Error ? error.message : 'Extraction DOCX échouée',
    };
  }
}

/**
 * Extract text from a plain text file
 */
export async function extractTxtText(file: File): Promise<ExtractionResult> {
  try {
    const text = await file.text();
    return {
      success: true,
      text,
    };
  } catch (error) {
    return {
      success: false,
      text: '',
      error: 'Lecture du fichier texte échouée',
    };
  }
}

/**
 * Main extraction function that routes to the appropriate extractor
 */
export async function extractFileContent(file: File): Promise<ExtractionResult> {
  const mimeType = file.type.toLowerCase();
  const extension = file.name.split('.').pop()?.toLowerCase();

  // PDF
  if (mimeType === 'application/pdf' || extension === 'pdf') {
    return extractPdfText(file);
  }

  // DOCX
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    extension === 'docx'
  ) {
    return extractDocxText(file);
  }

  // DOC (old format) - cannot extract client-side
  if (mimeType === 'application/msword' || extension === 'doc') {
    return {
      success: false,
      text: '',
      error: 'Format .doc non supporté, veuillez convertir en .docx',
    };
  }

  // Plain text
  if (mimeType.startsWith('text/') || ['txt', 'md', 'csv', 'json', 'xml'].includes(extension || '')) {
    return extractTxtText(file);
  }

  // Images - need OCR
  if (mimeType.startsWith('image/')) {
    return {
      success: false,
      text: '',
      needsOcr: true,
      error: 'Image détectée, OCR requis',
    };
  }

  // Unknown format
  return {
    success: false,
    text: '',
    error: `Format non supporté: ${mimeType || extension}`,
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
