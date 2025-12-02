import { toPng } from 'html-to-image';

interface ExportOptions {
  pixelRatio?: number;
  backgroundColor?: string;
}

/**
 * Export un élément HTML en PNG
 * Fonction partagée pour tous les éditeurs de visuels
 */
export const exportToPNG = async (
  elementRef: React.RefObject<HTMLDivElement>,
  filename: string,
  options?: ExportOptions
): Promise<void> => {
  if (!elementRef.current) {
    console.error('Element ref is null');
    return;
  }

  try {
    const dataUrl = await toPng(elementRef.current, {
      quality: 1,
      pixelRatio: options?.pixelRatio ?? 2,
      backgroundColor: options?.backgroundColor ?? '#FAF9F7',
      cacheBust: true,
    });

    const link = document.createElement('a');
    link.download = `iarche-${filename}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Error exporting to PNG:', error);
    throw error;
  }
};

/**
 * Génère un data URL PNG sans téléchargement
 * Utile pour preview ou upload
 */
export const generatePNGDataUrl = async (
  elementRef: React.RefObject<HTMLDivElement>,
  options?: ExportOptions
): Promise<string | null> => {
  if (!elementRef.current) {
    console.error('Element ref is null');
    return null;
  }

  try {
    return await toPng(elementRef.current, {
      quality: 1,
      pixelRatio: options?.pixelRatio ?? 2,
      backgroundColor: options?.backgroundColor ?? '#FAF9F7',
      cacheBust: true,
    });
  } catch (error) {
    console.error('Error generating PNG data URL:', error);
    return null;
  }
};
