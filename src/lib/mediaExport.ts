import { toPng, toBlob } from 'html-to-image';
import { supabase } from '@/integrations/supabase/client';

export type ExportFormat = 'png' | 'webp';
export type PngQuality = 1 | 2 | 3 | 4 | 6 | 8;

export const PNG_QUALITY_OPTIONS: { value: PngQuality; label: string; description: string }[] = [
  { value: 1, label: '1x', description: 'Taille native' },
  { value: 2, label: '2x', description: 'Retina (recommandé)' },
  { value: 3, label: '3x', description: 'Haute résolution' },
  { value: 4, label: '4x', description: 'Très haute' },
  { value: 6, label: '6x', description: 'Ultra (gros fichiers)' },
  { value: 8, label: '8x', description: 'Maximum (très gros)' },
];

export interface ExportOptions {
  pixelRatio?: number;
  backgroundColor?: string;
  width?: number;
  height?: number;
}

/**
 * Export element to PNG and trigger download
 */
export async function exportToPNG(
  elementRef: React.RefObject<HTMLDivElement>,
  filename: string,
  options?: ExportOptions
): Promise<void> {
  if (!elementRef.current) {
    throw new Error('Element ref is not defined');
  }

  const element = elementRef.current;
  
  // Sauvegarder le transform actuel
  const originalTransform = element.style.transform;
  const originalTransformOrigin = element.style.transformOrigin;
  
  // Retirer temporairement le transform pour capturer les vraies dimensions
  element.style.transform = 'none';
  element.style.transformOrigin = 'top left';

  // Attendre que les fonts soient chargées
  await document.fonts.ready;

  try {
    const dataUrl = await toPng(element, {
      pixelRatio: options?.pixelRatio || 2,
      backgroundColor: options?.backgroundColor,
      cacheBust: true,
      width: options?.width || element.scrollWidth,
      height: options?.height || element.scrollHeight,
      skipFonts: false,
    });

    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = dataUrl;
    link.click();
  } finally {
    // Restaurer le transform original
    element.style.transform = originalTransform;
    element.style.transformOrigin = originalTransformOrigin;
  }
}

/**
 * Export element to WebP and trigger download
 */
export async function exportToWebP(
  elementRef: React.RefObject<HTMLDivElement>,
  filename: string,
  options?: ExportOptions & { quality?: number }
): Promise<void> {
  if (!elementRef.current) {
    throw new Error('Element ref is not defined');
  }

  const element = elementRef.current;
  
  // Sauvegarder le transform actuel
  const originalTransform = element.style.transform;
  const originalTransformOrigin = element.style.transformOrigin;
  
  // Retirer temporairement le transform
  element.style.transform = 'none';
  element.style.transformOrigin = 'top left';

  // Attendre que les fonts soient chargées
  await document.fonts.ready;

  let pngBlob: Blob | null = null;
  
  try {
    pngBlob = await toBlob(element, {
      pixelRatio: options?.pixelRatio || 2,
      backgroundColor: options?.backgroundColor,
      cacheBust: true,
      width: options?.width || element.scrollWidth,
      height: options?.height || element.scrollHeight,
      skipFonts: false,
    });
  } finally {
    // Restaurer le transform original
    element.style.transform = originalTransform;
    element.style.transformOrigin = originalTransformOrigin;
  }

  if (!pngBlob) {
    throw new Error('Failed to create blob');
  }

  // Convert to WebP using canvas
  const img = new Image();
  const pngUrl = URL.createObjectURL(pngBlob);
  
  return new Promise((resolve, reject) => {
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(pngUrl);
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob(
        (webpBlob) => {
          URL.revokeObjectURL(pngUrl);
          
          if (!webpBlob) {
            reject(new Error('Failed to create WebP blob'));
            return;
          }

          const link = document.createElement('a');
          link.download = `${filename}.webp`;
          link.href = URL.createObjectURL(webpBlob);
          link.click();
          URL.revokeObjectURL(link.href);
          resolve();
        },
        'image/webp',
        options?.quality || 0.9
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(pngUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = pngUrl;
  });
}

/**
 * Upload element as image to Supabase media-library bucket
 */
export async function uploadToMediaLibrary(
  elementRef: React.RefObject<HTMLDivElement>,
  filename: string,
  format: ExportFormat = 'png',
  options?: ExportOptions
): Promise<string> {
  if (!elementRef.current) {
    throw new Error('Element ref is not defined');
  }

  const element = elementRef.current;
  
  // Sauvegarder le transform actuel
  const originalTransform = element.style.transform;
  const originalTransformOrigin = element.style.transformOrigin;
  
  // Retirer temporairement le transform
  element.style.transform = 'none';
  element.style.transformOrigin = 'top left';

  // Attendre que les fonts soient chargées
  await document.fonts.ready;

  let pngBlob: Blob | null = null;
  
  try {
    pngBlob = await toBlob(element, {
      pixelRatio: options?.pixelRatio || 2,
      backgroundColor: options?.backgroundColor,
      cacheBust: true,
      width: options?.width || element.scrollWidth,
      height: options?.height || element.scrollHeight,
      skipFonts: false,
    });
  } finally {
    // Restaurer le transform original
    element.style.transform = originalTransform;
    element.style.transformOrigin = originalTransformOrigin;
  }

  if (!pngBlob) {
    throw new Error('Failed to create blob');
  }

  let finalBlob: Blob = pngBlob;
  let contentType = 'image/png';
  let extension = 'png';

  // Convert to WebP if requested
  if (format === 'webp') {
    const webpBlob = await convertToWebP(pngBlob, 0.9);
    finalBlob = webpBlob;
    contentType = 'image/webp';
    extension = 'webp';
  }

  // Generate unique filename
  const timestamp = Date.now();
  const fullFilename = `exports/${filename}-${timestamp}.${extension}`;

  // Upload to Supabase
  const { data, error } = await supabase.storage
    .from('media-library')
    .upload(fullFilename, finalBlob, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('media-library')
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

/**
 * Helper to convert PNG blob to WebP
 */
function convertToWebP(pngBlob: Blob, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const pngUrl = URL.createObjectURL(pngBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(pngUrl);
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (webpBlob) => {
          URL.revokeObjectURL(pngUrl);
          if (!webpBlob) {
            reject(new Error('Failed to create WebP blob'));
            return;
          }
          resolve(webpBlob);
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(pngUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = pngUrl;
  });
}

/**
 * Get estimated file size based on dimensions and quality
 */
export function getEstimatedFileSize(
  width: number,
  height: number,
  quality: PngQuality,
  format: ExportFormat
): string {
  const pixels = width * height * quality * quality;
  // Rough estimation: PNG ~3 bytes/pixel, WebP ~1.5 bytes/pixel
  const bytesPerPixel = format === 'webp' ? 1.5 : 3;
  const bytes = pixels * bytesPerPixel;

  if (bytes < 1024) return `${bytes.toFixed(0)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
