import { Document, Page, View, Text, Image, StyleSheet, Svg, Line, Path } from '@react-pdf/renderer';
import { IARCHE_COLORS, PDF_FORMATS } from '../pdf';

// Import PNG assets as ES6 modules for react-pdf compatibility
import logoGradient from '@/assets/pdf/logo-iarche-gradient.png';
import logoWhite from '@/assets/pdf/logo-iarche-white.png';
import barSm from '@/assets/pdf/bar-sm.png';
import barMd from '@/assets/pdf/bar-md.png';
import barLg from '@/assets/pdf/bar-lg.png';
import barXl from '@/assets/pdf/bar-xl.png';

interface SlideData {
  id: number;
  title: string;
  subtitle: string;
  content: string;
  highlight?: string;
}

interface CarouselPDFProps {
  slides: SlideData[];
  format?: 'linkedin' | 'instagram';
}

// Asset paths using ES6 imports
const ASSETS = {
  logoGradient,
  logoWhite,
  barSm,
  barMd,
  barLg,
  barXl,
};

const styles = StyleSheet.create({
  pageDark: {
    position: 'relative',
    backgroundColor: IARCHE_COLORS.bleuNuit,
  },
  pageLight: {
    position: 'relative',
    backgroundColor: IARCHE_COLORS.blancCasse,
  },
  meshBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  archesOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    padding: 60,
    position: 'relative',
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 140,
    height: 56,
    objectFit: 'contain',
  },
  barSm: {
    width: 48,
    height: 2,
    marginTop: 12,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  // Numbered section indicator
  sectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionNumber: {
    fontSize: 80,
    fontWeight: 'bold',
    opacity: 0.15,
    marginRight: 16,
    fontFamily: 'Helvetica-Bold',
  },
  sectionNumberDark: {
    color: IARCHE_COLORS.white,
  },
  sectionNumberLight: {
    color: IARCHE_COLORS.terracotta,
  },
  // Dark theme text
  subtitleDark: {
    fontSize: 18,
    color: IARCHE_COLORS.white,
    opacity: 0.5,
    textTransform: 'uppercase',
    letterSpacing: 4,
    marginBottom: 12,
    fontFamily: 'Helvetica',
  },
  titleDark: {
    fontSize: 42,
    fontWeight: 'bold',
    color: IARCHE_COLORS.white,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 1.2,
    fontFamily: 'Helvetica-Bold',
  },
  textDark: {
    fontSize: 20,
    color: IARCHE_COLORS.white,
    opacity: 0.8,
    textAlign: 'center',
    lineHeight: 1.6,
    fontFamily: 'Helvetica',
  },
  highlightDark: {
    fontSize: 56,
    fontWeight: 'bold',
    color: IARCHE_COLORS.terracotta,
    marginTop: 24,
    fontFamily: 'Helvetica-Bold',
  },
  // Light theme text
  subtitleLight: {
    fontSize: 18,
    color: IARCHE_COLORS.subtle,
    textTransform: 'uppercase',
    letterSpacing: 4,
    marginBottom: 12,
    fontFamily: 'Helvetica',
  },
  titleLight: {
    fontSize: 42,
    fontWeight: 'bold',
    color: IARCHE_COLORS.foreground,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 1.2,
    fontFamily: 'Helvetica-Bold',
  },
  textLight: {
    fontSize: 20,
    color: IARCHE_COLORS.foreground,
    opacity: 0.85,
    textAlign: 'center',
    lineHeight: 1.6,
    fontFamily: 'Helvetica',
  },
  highlightLight: {
    fontSize: 56,
    fontWeight: 'bold',
    color: IARCHE_COLORS.terracotta,
    marginTop: 24,
    fontFamily: 'Helvetica-Bold',
  },
  barLg: {
    width: 96,
    height: 4,
    marginTop: 14,
    marginBottom: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 16,
  },
  footerDark: {
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  footerLight: {
    borderTopColor: '#E8E4DD',
  },
  footerTextDark: {
    fontSize: 14,
    color: IARCHE_COLORS.white,
    opacity: 0.4,
    fontFamily: 'Helvetica',
  },
  footerTextLight: {
    fontSize: 14,
    color: IARCHE_COLORS.subtle,
    fontFamily: 'Helvetica',
  },
  baselineDark: {
    fontSize: 12,
    color: IARCHE_COLORS.white,
    opacity: 0.3,
    fontFamily: 'Helvetica',
  },
  baselineLight: {
    fontSize: 12,
    color: IARCHE_COLORS.subtle,
    opacity: 0.7,
    fontFamily: 'Helvetica',
  },
});

// Mesh background pattern component
const MeshBackground = ({ isDark, width, height }: { isDark: boolean; width: number; height: number }) => {
  const strokeColor = isDark ? '#FFFFFF' : IARCHE_COLORS.bleuNuit;
  const opacity = isDark ? 0.08 : 0.1; // Increased opacity for visibility
  const spacing = 50;
  const lines = [];
  
  // Diagonal lines (top-left to bottom-right)
  for (let i = -height; i < width + height; i += spacing) {
    lines.push(
      <Line 
        key={`d1-${i}`}
        x1={i} 
        y1={0} 
        x2={i + height} 
        y2={height} 
        stroke={strokeColor} 
        strokeWidth={0.5} 
        opacity={opacity}
      />
    );
  }
  
  // Diagonal lines (top-right to bottom-left)
  for (let i = -height; i < width + height; i += spacing) {
    lines.push(
      <Line 
        key={`d2-${i}`}
        x1={i + height} 
        y1={0} 
        x2={i} 
        y2={height} 
        stroke={strokeColor} 
        strokeWidth={0.5} 
        opacity={opacity}
      />
    );
  }
  
  return (
    <Svg style={styles.meshBackground} viewBox={`0 0 ${width} ${height}`}>
      {lines}
    </Svg>
  );
};

// Corner arches decoration component
const ArchesDecoration = ({ isDark, width, height }: { isDark: boolean; width: number; height: number }) => {
  const strokeColor = isDark ? '#FFFFFF' : IARCHE_COLORS.terracotta;
  const opacity = isDark ? 0.25 : 0.4; // Increased opacity for visibility
  const cornerSize = 120;
  
  return (
    <Svg style={styles.archesOverlay} viewBox={`0 0 ${width} ${height}`}>
      {/* Top-right corner arch */}
      <Path 
        d={`M${width},0 L${width},${cornerSize} M${width - cornerSize},0 L${width},0`}
        fill="none" 
        stroke={strokeColor} 
        strokeWidth={2.5} 
        opacity={opacity}
      />
      {/* Bottom-left corner arch */}
      <Path 
        d={`M0,${height} L0,${height - cornerSize} M${cornerSize},${height} L0,${height}`}
        fill="none" 
        stroke={strokeColor} 
        strokeWidth={2.5} 
        opacity={opacity}
      />
      {/* Secondary arches (smaller, more subtle) */}
      <Path 
        d={`M${width},20 L${width},${cornerSize - 20} M${width - cornerSize + 20},20 L${width - 20},20`}
        fill="none" 
        stroke={strokeColor} 
        strokeWidth={1.5} 
        opacity={opacity * 0.5}
      />
      <Path 
        d={`M20,${height - 20} L20,${height - cornerSize + 20} M${cornerSize - 20},${height - 20} L20,${height - 20}`}
        fill="none" 
        stroke={strokeColor} 
        strokeWidth={1.5} 
        opacity={opacity * 0.5}
      />
    </Svg>
  );
};

export const CarouselPDF = ({ slides, format = 'linkedin' }: CarouselPDFProps) => {
  const dimensions = format === 'linkedin' 
    ? PDF_FORMATS.carouselLinkedIn 
    : PDF_FORMATS.carouselInstagram;
  const { width, height } = dimensions;

  return (
    <Document>
      {slides.map((slide, index) => {
        const isDark = index % 2 === 0;
        const isFirst = index === 0;
        const isLast = index === slides.length - 1;
        
        return (
          <Page 
            key={slide.id} 
            size={[width, height]} 
            style={isDark ? styles.pageDark : styles.pageLight}
          >
            {/* Mesh background pattern */}
            <MeshBackground isDark={isDark} width={width} height={height} />
            
            {/* Corner arches decoration */}
            <ArchesDecoration isDark={isDark} width={width} height={height} />
            
            {/* Main content */}
            <View style={styles.content}>
              {/* Header */}
              <View style={styles.header}>
                <Image 
                  src={isDark ? ASSETS.logoWhite : ASSETS.logoGradient} 
                  style={styles.logo} 
                />
                <Image src={ASSETS.barSm} style={styles.barSm} />
              </View>

              {/* Content area */}
              <View style={styles.mainContent}>
                {/* Section number indicator (not on first/last slides) */}
                {!isFirst && !isLast && (
                  <Text style={[styles.sectionNumber, isDark ? styles.sectionNumberDark : styles.sectionNumberLight]}>
                    {String(index).padStart(2, '0')}
                  </Text>
                )}
                
                {slide.subtitle && (
                  <Text style={isDark ? styles.subtitleDark : styles.subtitleLight}>
                    {slide.subtitle}
                  </Text>
                )}
                {slide.title && (
                  <Text style={isDark ? styles.titleDark : styles.titleLight}>
                    {slide.title}
                  </Text>
                )}
                <Image src={ASSETS.barLg} style={styles.barLg} />
                {slide.content && (
                  <Text style={isDark ? styles.textDark : styles.textLight}>
                    {slide.content}
                  </Text>
                )}
                {slide.highlight && (
                  <Text style={isDark ? styles.highlightDark : styles.highlightLight}>
                    {slide.highlight}
                  </Text>
                )}
              </View>

              {/* Footer */}
              <View style={[styles.footer, isDark ? styles.footerDark : styles.footerLight]}>
                <View>
                  <Text style={isDark ? styles.footerTextDark : styles.footerTextLight}>
                    iarche.fr
                  </Text>
                  {isLast && (
                    <Text style={isDark ? styles.baselineDark : styles.baselineLight}>
                      L'IA se construit avec vous
                    </Text>
                  )}
                </View>
                <Text style={isDark ? styles.footerTextDark : styles.footerTextLight}>
                  {index + 1}/{slides.length}
                </Text>
              </View>
            </View>
          </Page>
        );
      })}
    </Document>
  );
};
