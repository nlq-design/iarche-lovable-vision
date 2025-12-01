import { Document, Page, View, Text, StyleSheet, Svg, Line, Path, Rect, Defs, LinearGradient, Stop } from '@react-pdf/renderer';
import { IARCHE_COLORS, PDF_FORMATS } from '../pdf';

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

const styles = StyleSheet.create({
  pageDark: {
    position: 'relative',
    backgroundColor: IARCHE_COLORS.bleuNuit,
  },
  pageLight: {
    position: 'relative',
    backgroundColor: IARCHE_COLORS.blancCasse,
  },
  backgroundLayer: {
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
  // Logo text styles
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },
  logoTextDark: {
    color: IARCHE_COLORS.white,
  },
  logoTextLight: {
    color: IARCHE_COLORS.bleuNuit,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  // Section indicator with number
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionNumber: {
    fontSize: 72,
    fontWeight: 'bold',
    opacity: 0.2,
    marginRight: 20,
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
    fontSize: 16,
    color: IARCHE_COLORS.white,
    opacity: 0.5,
    textTransform: 'uppercase',
    letterSpacing: 4,
    marginBottom: 10,
    fontFamily: 'Helvetica',
    textAlign: 'center',
  },
  titleDark: {
    fontSize: 40,
    fontWeight: 'bold',
    color: IARCHE_COLORS.white,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 1.2,
    fontFamily: 'Helvetica-Bold',
  },
  textDark: {
    fontSize: 18,
    color: IARCHE_COLORS.white,
    opacity: 0.8,
    textAlign: 'center',
    lineHeight: 1.6,
    fontFamily: 'Helvetica',
    marginTop: 16,
  },
  highlightDark: {
    fontSize: 48,
    fontWeight: 'bold',
    color: IARCHE_COLORS.terracotta,
    marginTop: 20,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },
  // Light theme text
  subtitleLight: {
    fontSize: 16,
    color: IARCHE_COLORS.subtle,
    textTransform: 'uppercase',
    letterSpacing: 4,
    marginBottom: 10,
    fontFamily: 'Helvetica',
    textAlign: 'center',
  },
  titleLight: {
    fontSize: 40,
    fontWeight: 'bold',
    color: IARCHE_COLORS.foreground,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 1.2,
    fontFamily: 'Helvetica-Bold',
  },
  textLight: {
    fontSize: 18,
    color: IARCHE_COLORS.foreground,
    opacity: 0.85,
    textAlign: 'center',
    lineHeight: 1.6,
    fontFamily: 'Helvetica',
    marginTop: 16,
  },
  highlightLight: {
    fontSize: 48,
    fontWeight: 'bold',
    color: IARCHE_COLORS.terracotta,
    marginTop: 20,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
  },
  footerTextDark: {
    fontSize: 13,
    color: IARCHE_COLORS.white,
    opacity: 0.4,
    fontFamily: 'Helvetica',
  },
  footerTextLight: {
    fontSize: 13,
    color: IARCHE_COLORS.subtle,
    fontFamily: 'Helvetica',
  },
  baselineDark: {
    fontSize: 11,
    color: IARCHE_COLORS.white,
    opacity: 0.3,
    fontFamily: 'Helvetica',
  },
  baselineLight: {
    fontSize: 11,
    color: IARCHE_COLORS.subtle,
    opacity: 0.7,
    fontFamily: 'Helvetica',
  },
});

// Mesh background pattern component (SVG)
const MeshBackground = ({ isDark, width, height }: { isDark: boolean; width: number; height: number }) => {
  const strokeColor = isDark ? '#FFFFFF' : IARCHE_COLORS.bleuNuit;
  const opacity = isDark ? 0.06 : 0.08;
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
    <Svg style={styles.backgroundLayer} viewBox={`0 0 ${width} ${height}`}>
      {lines}
    </Svg>
  );
};

// Corner arches decoration component (SVG)
const ArchesDecoration = ({ isDark, width, height }: { isDark: boolean; width: number; height: number }) => {
  const strokeColor = isDark ? '#FFFFFF' : IARCHE_COLORS.terracotta;
  const opacity = isDark ? 0.2 : 0.35;
  const cornerSize = 100;
  
  return (
    <Svg style={styles.backgroundLayer} viewBox={`0 0 ${width} ${height}`}>
      {/* Top-right corner arch - main */}
      <Path 
        d={`M${width},0 L${width},${cornerSize}`}
        fill="none" 
        stroke={strokeColor} 
        strokeWidth={2.5} 
        opacity={opacity}
      />
      <Path 
        d={`M${width - cornerSize},0 L${width},0`}
        fill="none" 
        stroke={strokeColor} 
        strokeWidth={2.5} 
        opacity={opacity}
      />
      {/* Bottom-left corner arch - main */}
      <Path 
        d={`M0,${height} L0,${height - cornerSize}`}
        fill="none" 
        stroke={strokeColor} 
        strokeWidth={2.5} 
        opacity={opacity}
      />
      <Path 
        d={`M${cornerSize},${height} L0,${height}`}
        fill="none" 
        stroke={strokeColor} 
        strokeWidth={2.5} 
        opacity={opacity}
      />
      {/* Secondary arches (smaller, more subtle) */}
      <Path 
        d={`M${width},15 L${width},${cornerSize - 25}`}
        fill="none" 
        stroke={strokeColor} 
        strokeWidth={1.5} 
        opacity={opacity * 0.5}
      />
      <Path 
        d={`M${width - cornerSize + 25},15 L${width - 15},15`}
        fill="none" 
        stroke={strokeColor} 
        strokeWidth={1.5} 
        opacity={opacity * 0.5}
      />
      <Path 
        d={`M15,${height - 15} L15,${height - cornerSize + 25}`}
        fill="none" 
        stroke={strokeColor} 
        strokeWidth={1.5} 
        opacity={opacity * 0.5}
      />
      <Path 
        d={`M${cornerSize - 25},${height - 15} L15,${height - 15}`}
        fill="none" 
        stroke={strokeColor} 
        strokeWidth={1.5} 
        opacity={opacity * 0.5}
      />
    </Svg>
  );
};

// Gradient bar component (pure SVG - no PNG needed)
const GradientBar = ({ width, height, style }: { width: number; height: number; style?: object }) => (
  <Svg viewBox={`0 0 ${width} ${height}`} style={{ width, height, ...style }}>
    <Defs>
      <LinearGradient id="barGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <Stop offset="0%" stopColor={IARCHE_COLORS.bleuNuit} />
        <Stop offset="50%" stopColor={IARCHE_COLORS.terracotta} />
        <Stop offset="100%" stopColor={IARCHE_COLORS.bleuNuit} />
      </LinearGradient>
    </Defs>
    <Rect 
      width={width} 
      height={height} 
      rx={height / 2} 
      fill="url(#barGradient)" 
    />
  </Svg>
);

// Header bar (full width gradient)
const HeaderBar = ({ width }: { width: number }) => (
  <Svg viewBox={`0 0 ${width} 3`} style={{ width: width - 120, height: 3, marginTop: 8 }}>
    <Defs>
      <LinearGradient id="headerBarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <Stop offset="0%" stopColor={IARCHE_COLORS.bleuNuit} />
        <Stop offset="50%" stopColor={IARCHE_COLORS.terracotta} />
        <Stop offset="100%" stopColor={IARCHE_COLORS.bleuNuit} />
      </LinearGradient>
    </Defs>
    <Rect 
      width={width} 
      height={3} 
      rx={1.5} 
      fill="url(#headerBarGrad)" 
    />
  </Svg>
);

// Footer separator bar
const FooterBar = ({ width, isDark }: { width: number; isDark: boolean }) => (
  <Svg viewBox={`0 0 ${width} 2`} style={{ width: width - 120, height: 2, marginBottom: 12 }}>
    <Defs>
      <LinearGradient id="footerBarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <Stop offset="0%" stopColor={isDark ? 'rgba(255,255,255,0.1)' : IARCHE_COLORS.bleuNuit} stopOpacity={isDark ? 0.3 : 0.2} />
        <Stop offset="50%" stopColor={IARCHE_COLORS.terracotta} stopOpacity={isDark ? 0.5 : 0.6} />
        <Stop offset="100%" stopColor={isDark ? 'rgba(255,255,255,0.1)' : IARCHE_COLORS.bleuNuit} stopOpacity={isDark ? 0.3 : 0.2} />
      </LinearGradient>
    </Defs>
    <Rect 
      width={width} 
      height={2} 
      rx={1} 
      fill="url(#footerBarGrad)" 
    />
  </Svg>
);

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
        const showSectionNumber = !isFirst && !isLast;
        
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
              {/* Header with logo and bar */}
              <View style={styles.header}>
                <Text style={[styles.logoText, isDark ? styles.logoTextDark : styles.logoTextLight]}>
                  IArche
                </Text>
                <HeaderBar width={width} />
              </View>

              {/* Content area */}
              <View style={styles.mainContent}>
                {/* Section number + title row */}
                {showSectionNumber ? (
                  <View style={styles.sectionRow}>
                    <Text style={[styles.sectionNumber, isDark ? styles.sectionNumberDark : styles.sectionNumberLight]}>
                      {String(index).padStart(2, '0')}
                    </Text>
                    <View style={{ alignItems: 'flex-start' }}>
                      {slide.title && (
                        <Text style={isDark ? styles.titleDark : styles.titleLight}>
                          {slide.title}
                        </Text>
                      )}
                      <GradientBar width={80} height={4} style={{ marginTop: 8 }} />
                    </View>
                  </View>
                ) : (
                  <>
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
                    <GradientBar width={96} height={4} style={{ marginTop: 12, marginBottom: 16 }} />
                  </>
                )}
                
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

              {/* Footer with gradient bar separator */}
              <View>
                <FooterBar width={width} isDark={isDark} />
                <View style={styles.footer}>
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
            </View>
          </Page>
        );
      })}
    </Document>
  );
};
