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
    return `${window.location.origin}/logos/iarche-arc.svg`;
  }
  return '/logos/iarche-arc.svg';
};

/**
 * Arc décoratif IArche pour PDF - Version v4.0
 * 
 * Utilise directement le fichier SVG de référence fourni
 * Remplace PDFGradientBar pour les exports PDF
 */
export const PDFLogoArc = ({ 
  size = 'md', 
  style = {} 
}: PDFLogoArcProps) => {
  const sizeConfig = {
    sm: { width: 100, height: 30 },
    md: { width: 160, height: 49 },
    lg: { width: 240, height: 73 },
    xl: { width: 360, height: 110 },
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
