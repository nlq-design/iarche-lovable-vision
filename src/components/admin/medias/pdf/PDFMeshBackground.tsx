import { Svg, Line } from '@react-pdf/renderer';
import { IARCHE_COLORS } from './tokens';

interface PDFMeshBackgroundProps {
  /** Page width for calculating line positions */
  pageWidth?: number;
  /** Page height for calculating line positions */
  pageHeight?: number;
  /** Opacity of the mesh pattern (0.03-0.05 recommended) */
  opacity?: number;
}

/**
 * Diagonal mesh/grid background pattern
 * Replicates the animated mesh-grid-background from index.css as static SVG
 * 
 * Pattern: 45° and -45° diagonal lines at 60px intervals
 * Opacity: 0.05 for PDF (higher than web's 0.02-0.03 due to no backlight)
 */
export const PDFMeshBackground = ({ 
  pageWidth = 1080, 
  pageHeight = 1350,
  opacity = 0.05 
}: PDFMeshBackgroundProps) => {
  // Calculate number of lines needed to cover the page
  const spacing = 60;
  const diagonal = Math.sqrt(pageWidth * pageWidth + pageHeight * pageHeight);
  const lineCount = Math.ceil(diagonal / spacing) + 10;
  
  return (
    <Svg 
      viewBox={`0 0 ${pageWidth} ${pageHeight}`} 
      style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%',
      }}
    >
      {/* 45° diagonal lines */}
      {Array.from({ length: lineCount }).map((_, i) => {
        const offset = (i - lineCount / 2) * spacing;
        return (
          <Line
            key={`line45-${i}`}
            x1={offset}
            y1={0}
            x2={offset + pageHeight}
            y2={pageHeight}
            stroke={IARCHE_COLORS.bleuNuit}
            strokeWidth={0.5}
            opacity={opacity}
          />
        );
      })}
      
      {/* -45° diagonal lines */}
      {Array.from({ length: lineCount }).map((_, i) => {
        const offset = (i - lineCount / 2) * spacing;
        return (
          <Line
            key={`line-45-${i}`}
            x1={pageWidth + offset}
            y1={0}
            x2={offset}
            y2={pageHeight}
            stroke={IARCHE_COLORS.bleuNuit}
            strokeWidth={0.5}
            opacity={opacity}
          />
        );
      })}
    </Svg>
  );
};
