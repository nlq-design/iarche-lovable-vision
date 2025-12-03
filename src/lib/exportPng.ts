import { toPng } from 'html-to-image';

interface ExportOptions {
  pixelRatio?: number;
  backgroundColor?: string;
  /** Largeur de sortie en pixels (pour export haute résolution) */
  width?: number;
  /** Hauteur de sortie en pixels (pour export haute résolution) */
  height?: number;
}

/**
 * Export un élément HTML en PNG haute résolution
 * Fonction partagée pour tous les éditeurs de visuels
 * 
 * @param elementRef - Référence à l'élément HTML à exporter
 * @param filename - Nom du fichier sans extension
 * @param options - Options d'export (pixelRatio, backgroundColor, width, height)
 * 
 * Pour une qualité maximale similaire à HeaderDocEditor:
 * - Utiliser width/height pour spécifier les dimensions finales
 * - pixelRatio: 2 ou 3 pour une résolution ultra-haute
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
      pixelRatio: options?.pixelRatio ?? 3, // Augmenté de 2 à 3 pour haute résolution
      backgroundColor: options?.backgroundColor ?? '#FAF9F7',
      cacheBust: true,
      ...(options?.width && { width: options.width }),
      ...(options?.height && { height: options.height }),
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
      pixelRatio: options?.pixelRatio ?? 3, // Augmenté de 2 à 3 pour haute résolution
      backgroundColor: options?.backgroundColor ?? '#FAF9F7',
      cacheBust: true,
      ...(options?.width && { width: options.width }),
      ...(options?.height && { height: options.height }),
    });
  } catch (error) {
    console.error('Error generating PNG data URL:', error);
    return null;
  }
};
