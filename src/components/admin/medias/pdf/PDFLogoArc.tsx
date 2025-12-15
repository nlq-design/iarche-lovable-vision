import { Image } from '@react-pdf/renderer';

type ArcSize = 'sm' | 'md' | 'lg' | 'xl';

interface PDFLogoArcProps {
  size?: ArcSize;
  style?: object;
}

// URL absolue pour react-pdf (ne peut pas utiliser les imports ES6)
const getArcUrl = () => {
  // En production, utiliser le chemin absolu
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/assets/arc-iarche-v4.png`;
  }
  return '/assets/arc-iarche-v4.png';
};

/**
 * Arc décoratif IArche pour PDF - Version v4.0
 * 
 * Utilise directement le fichier PNG de référence fourni
 * Remplace PDFGradientBar pour les exports PDF
 */
export const PDFLogoArc = ({ 
  size = 'md', 
  style = {} 
}: PDFLogoArcProps) => {
  const sizeConfig = {
    sm: { width: 80, height: 10 },
    md: { width: 120, height: 14 },
    lg: { width: 180, height: 20 },
    xl: { width: 260, height: 28 },
  };

  const { width, height } = sizeConfig[size];

  return (
    <Image 
      src={getArcUrl()}
      style={{ 
        width, 
        height, 
        objectFit: 'contain',
        ...style,
      }}
    />
  );
};

export default PDFLogoArc;
