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
  startTheme?: 'dark' | 'light';
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

// Corner arches decoration component (SVG) - More visible version
const ArchesDecoration = ({ isDark, width, height }: { isDark: boolean; width: number; height: number }) => {
  const strokeColor = isDark ? '#FFFFFF' : IARCHE_COLORS.terracotta;
  const opacity = isDark ? 0.25 : 0.4;
  const cornerSize = 120;
  
  return (
    <Svg style={styles.backgroundLayer} viewBox={`0 0 ${width} ${height}`}>
      {/* Top-right corner arch - L shape */}
      <Path 
        d={`M${width - cornerSize} 0 L${width} 0 L${width} ${cornerSize}`}
        fill="none" 
        stroke={strokeColor} 
        strokeWidth={3} 
        opacity={opacity}
      />
      {/* Bottom-left corner arch - inverted L shape */}
      <Path 
        d={`M0 ${height - cornerSize} L0 ${height} L${cornerSize} ${height}`}
        fill="none" 
        stroke={strokeColor} 
        strokeWidth={3} 
        opacity={opacity}
      />
      {/* Secondary arches (inner, smaller) */}
      <Path 
        d={`M${width - cornerSize + 20} 20 L${width - 20} 20 L${width - 20} ${cornerSize - 20}`}
        fill="none" 
        stroke={strokeColor} 
        strokeWidth={1.5} 
        opacity={opacity * 0.5}
      />
      <Path 
        d={`M20 ${height - cornerSize + 20} L20 ${height - 20} L${cornerSize - 20} ${height - 20}`}
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

// Header bar (full width gradient) - using solid colors since SVG gradients can be unreliable
const HeaderBar = ({ width }: { width: number }) => (
  <View style={{ flexDirection: 'row', width: width - 120, height: 3, marginTop: 8, borderRadius: 1.5, overflow: 'hidden' }}>
    <View style={{ flex: 1, backgroundColor: IARCHE_COLORS.bleuNuit }} />
    <View style={{ flex: 1, backgroundColor: '#2A4A6A' }} />
    <View style={{ flex: 1, backgroundColor: IARCHE_COLORS.terracotta }} />
    <View style={{ flex: 1, backgroundColor: '#2A4A6A' }} />
    <View style={{ flex: 1, backgroundColor: IARCHE_COLORS.bleuNuit }} />
  </View>
);

// Small bar under logo
const LogoBar = ({ isDark }: { isDark: boolean }) => (
  <View style={{ flexDirection: 'row', width: 48, height: 2, marginTop: 6, borderRadius: 1, overflow: 'hidden' }}>
    <View style={{ flex: 1, backgroundColor: isDark ? IARCHE_COLORS.white : IARCHE_COLORS.bleuNuit, opacity: isDark ? 0.6 : 1 }} />
    <View style={{ flex: 1, backgroundColor: IARCHE_COLORS.terracotta }} />
  </View>
);

// Footer separator bar - using solid colors for reliable rendering
const FooterBar = ({ width, isDark }: { width: number; isDark: boolean }) => (
  <View style={{ flexDirection: 'row', width: width - 120, height: 2, marginBottom: 12, borderRadius: 1, overflow: 'hidden' }}>
    <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : IARCHE_COLORS.bleuNuit, opacity: isDark ? 0.5 : 0.3 }} />
    <View style={{ flex: 1, backgroundColor: isDark ? '#4A6A8A' : '#2A4A6A' }} />
    <View style={{ flex: 2, backgroundColor: IARCHE_COLORS.terracotta, opacity: isDark ? 0.7 : 0.8 }} />
    <View style={{ flex: 1, backgroundColor: isDark ? '#4A6A8A' : '#2A4A6A' }} />
    <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : IARCHE_COLORS.bleuNuit, opacity: isDark ? 0.5 : 0.3 }} />
  </View>
);

export const CarouselPDF = ({ slides, format = 'linkedin', startTheme = 'dark' }: CarouselPDFProps) => {
  const dimensions = format === 'linkedin' 
    ? PDF_FORMATS.carouselLinkedIn 
    : PDF_FORMATS.carouselInstagram;
  const { width, height } = dimensions;

  // Theme alternation based on startTheme
  const getSlideTheme = (slideIndex: number): boolean => {
    // slideIndex is 0-based
    if (startTheme === 'dark') {
      return slideIndex % 2 === 0; // 0,2,4 = dark, 1,3,5 = light
    } else {
      return slideIndex % 2 !== 0; // 0,2,4 = light, 1,3,5 = dark
    }
  };

  return (
    <Document>
      {slides.map((slide, index) => {
        const isDark = getSlideTheme(index);
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
              {/* Header with logo, bar under logo, and header bar */}
              <View style={styles.header}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.logoText, isDark ? styles.logoTextDark : styles.logoTextLight]}>
                    IArche
                  </Text>
                  <LogoBar isDark={isDark} />
                </View>
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
