import { Svg, Defs, LinearGradient, Stop, Path, G } from '@react-pdf/renderer';
import { IARCHE_COLORS } from './tokens';

type ArchPosition = 'top-right' | 'bottom-left' | 'both';

interface PDFArchesProps {
  /** Which arches to display */
  position?: ArchPosition;
  /** Page width for positioning */
  pageWidth?: number;
  /** Page height for positioning */
  pageHeight?: number;
  /** Opacity of the arches (0.3 recommended) */
  opacity?: number;
}

/**
 * Decorative "L" and inverted "L" arch lines
 * Creates the signature IArche visual element
 * 
 * Stroke: Gradient BleuNuit → Terracotta
 * Width: 2-3px
 * Opacity: 0.3 (static, no animation)
 */
export const PDFArches = ({ 
  position = 'both',
  pageWidth = 1080,
  pageHeight = 1350,
  opacity = 0.3,
}: PDFArchesProps) => {
  // Calculate proportional arch sizes based on page dimensions
  const archLength = Math.min(pageWidth, pageHeight) * 0.15;
  const margin = 50;
  
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
      <Defs>
        {/* Gradient for top-right arch */}
        <LinearGradient id="archGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={IARCHE_COLORS.bleuNuit} stopOpacity={0.7} />
          <Stop offset="100%" stopColor={IARCHE_COLORS.terracotta} stopOpacity={0.7} />
        </LinearGradient>
        
        {/* Gradient for bottom-left arch (inverted) */}
        <LinearGradient id="archGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={IARCHE_COLORS.terracotta} stopOpacity={0.7} />
          <Stop offset="100%" stopColor={IARCHE_COLORS.bleuNuit} stopOpacity={0.7} />
        </LinearGradient>
      </Defs>
      
      <G opacity={opacity}>
        {/* Top-right arch: horizontal line → 90° turn → vertical line down */}
        {(position === 'top-right' || position === 'both') && (
          <Path
            d={`M ${pageWidth} ${margin + archLength * 0.3} 
                L ${pageWidth - archLength * 0.7} ${margin + archLength * 0.3} 
                Q ${pageWidth - archLength * 0.8} ${margin + archLength * 0.3} ${pageWidth - archLength * 0.8} ${margin + archLength * 0.4}
                L ${pageWidth - archLength * 0.8} ${margin + archLength}`}
            fill="none"
            stroke="url(#archGradient1)"
            strokeWidth={3}
          />
        )}
        
        {/* Bottom-left arch: vertical line → 90° turn → horizontal line right */}
        {(position === 'bottom-left' || position === 'both') && (
          <Path
            d={`M 0 ${pageHeight - margin - archLength * 0.3} 
                L ${archLength * 0.7} ${pageHeight - margin - archLength * 0.3} 
                Q ${archLength * 0.8} ${pageHeight - margin - archLength * 0.3} ${archLength * 0.8} ${pageHeight - margin - archLength * 0.4}
                L ${archLength * 0.8} ${pageHeight - margin - archLength}`}
            fill="none"
            stroke="url(#archGradient2)"
            strokeWidth={3}
          />
        )}
      </G>
    </Svg>
  );
};
