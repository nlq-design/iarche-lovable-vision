import { Document, Page, View, Text, StyleSheet, Svg, Line, Path, Rect, Defs, LinearGradient, Stop } from '@react-pdf/renderer';
import { IARCHE_COLORS, PDF_FORMATS } from '../pdf';

interface SlideData {
  id: number;
  type: 'title' | 'content' | 'bullets' | 'cta';
  title: string;
  subtitle: string;
  content: string;
  bullets: string[];
}

interface PresentationPDFProps {
  slides: SlideData[];
}

const { width: PAGE_WIDTH, height: PAGE_HEIGHT } = PDF_FORMATS.presentation;

const styles = StyleSheet.create({
  pageDark: {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    backgroundColor: IARCHE_COLORS.bleuNuit,
    position: 'relative',
  },
  pageLight: {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    backgroundColor: IARCHE_COLORS.blancCasse,
    position: 'relative',
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
    padding: 80,
    position: 'relative',
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 50,
  },
  logoContainer: {
    alignItems: 'flex-start',
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
  },
  logoTextDark: {
    color: IARCHE_COLORS.white,
  },
  logoTextLight: {
    color: IARCHE_COLORS.bleuNuit,
  },
  slideNumber: {
    fontSize: 24,
    color: IARCHE_COLORS.terracotta,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
  },
  mainContentCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Section row with number
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  sectionNumber: {
    fontSize: 96,
    fontWeight: 'bold',
    opacity: 0.15,
    marginRight: 30,
    fontFamily: 'Helvetica-Bold',
  },
  sectionNumberDark: {
    color: IARCHE_COLORS.white,
  },
  sectionNumberLight: {
    color: IARCHE_COLORS.terracotta,
  },
  // Dark theme text
  titleDark: {
    fontSize: 56,
    fontWeight: 'bold',
    color: IARCHE_COLORS.white,
    marginBottom: 16,
    lineHeight: 1.2,
    fontFamily: 'Helvetica-Bold',
  },
  subtitleDark: {
    fontSize: 20,
    color: IARCHE_COLORS.white,
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 4,
    marginBottom: 16,
    fontFamily: 'Helvetica',
  },
  textDark: {
    fontSize: 24,
    color: IARCHE_COLORS.white,
    opacity: 0.85,
    lineHeight: 1.6,
    fontFamily: 'Helvetica',
  },
  // Light theme text
  titleLight: {
    fontSize: 56,
    fontWeight: 'bold',
    color: IARCHE_COLORS.foreground,
    marginBottom: 16,
    lineHeight: 1.2,
    fontFamily: 'Helvetica-Bold',
  },
  subtitleLight: {
    fontSize: 20,
    color: IARCHE_COLORS.subtle,
    textTransform: 'uppercase',
    letterSpacing: 4,
    marginBottom: 16,
    fontFamily: 'Helvetica',
  },
  textLight: {
    fontSize: 24,
    color: IARCHE_COLORS.foreground,
    opacity: 0.9,
    lineHeight: 1.6,
    fontFamily: 'Helvetica',
  },
  // Bullet list styles
  bulletsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 30,
  },
  bulletItem: {
    width: '48%',
    marginBottom: 24,
    paddingRight: 20,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bulletDash: {
    fontSize: 20,
    color: IARCHE_COLORS.terracotta,
    marginRight: 12,
    fontFamily: 'Helvetica-Bold',
  },
  bulletText: {
    fontSize: 20,
    lineHeight: 1.5,
    flex: 1,
    fontFamily: 'Helvetica',
  },
  bulletTextDark: {
    color: IARCHE_COLORS.white,
    opacity: 0.9,
  },
  bulletTextLight: {
    color: IARCHE_COLORS.foreground,
  },
  // CTA styles
  ctaText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: IARCHE_COLORS.terracotta,
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
  },
  ctaSubtext: {
    fontSize: 24,
    textAlign: 'center',
    marginTop: 20,
    fontFamily: 'Helvetica',
  },
  ctaSubtextDark: {
    color: IARCHE_COLORS.white,
    opacity: 0.7,
  },
  ctaSubtextLight: {
    color: IARCHE_COLORS.subtle,
  },
  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
  },
  footerTextDark: {
    fontSize: 16,
    color: IARCHE_COLORS.white,
    opacity: 0.4,
    fontFamily: 'Helvetica',
  },
  footerTextLight: {
    fontSize: 16,
    color: IARCHE_COLORS.subtle,
    fontFamily: 'Helvetica',
  },
});

// Mesh background pattern
const MeshBackground = ({ isDark }: { isDark: boolean }) => {
  const strokeColor = isDark ? '#FFFFFF' : IARCHE_COLORS.bleuNuit;
  const opacity = isDark ? 0.05 : 0.07;
  const spacing = 60;
  const lines = [];
  
  for (let i = -PAGE_HEIGHT; i < PAGE_WIDTH + PAGE_HEIGHT; i += spacing) {
    lines.push(
      <Line 
        key={`d1-${i}`}
        x1={i} 
        y1={0} 
        x2={i + PAGE_HEIGHT} 
        y2={PAGE_HEIGHT} 
        stroke={strokeColor} 
        strokeWidth={0.5} 
        opacity={opacity}
      />
    );
    lines.push(
      <Line 
        key={`d2-${i}`}
        x1={i + PAGE_HEIGHT} 
        y1={0} 
        x2={i} 
        y2={PAGE_HEIGHT} 
        stroke={strokeColor} 
        strokeWidth={0.5} 
        opacity={opacity}
      />
    );
  }
  
  return (
    <Svg style={styles.backgroundLayer} viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`}>
      {lines}
    </Svg>
  );
};

// Corner arches decoration
const ArchesDecoration = ({ isDark }: { isDark: boolean }) => {
  const strokeColor = isDark ? '#FFFFFF' : IARCHE_COLORS.terracotta;
  const opacity = isDark ? 0.18 : 0.3;
  const cornerSize = 120;
  
  return (
    <Svg style={styles.backgroundLayer} viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`}>
      {/* Top-right corner */}
      <Path 
        d={`M${PAGE_WIDTH},0 L${PAGE_WIDTH},${cornerSize}`}
        fill="none" 
        stroke={strokeColor} 
        strokeWidth={3} 
        opacity={opacity}
      />
      <Path 
        d={`M${PAGE_WIDTH - cornerSize},0 L${PAGE_WIDTH},0`}
        fill="none" 
        stroke={strokeColor} 
        strokeWidth={3} 
        opacity={opacity}
      />
      {/* Bottom-left corner */}
      <Path 
        d={`M0,${PAGE_HEIGHT} L0,${PAGE_HEIGHT - cornerSize}`}
        fill="none" 
        stroke={strokeColor} 
        strokeWidth={3} 
        opacity={opacity}
      />
      <Path 
        d={`M${cornerSize},${PAGE_HEIGHT} L0,${PAGE_HEIGHT}`}
        fill="none" 
        stroke={strokeColor} 
        strokeWidth={3} 
        opacity={opacity}
      />
      {/* Secondary arches */}
      <Path 
        d={`M${PAGE_WIDTH},20 L${PAGE_WIDTH},${cornerSize - 30}`}
        fill="none" 
        stroke={strokeColor} 
        strokeWidth={2} 
        opacity={opacity * 0.5}
      />
      <Path 
        d={`M${PAGE_WIDTH - cornerSize + 30},20 L${PAGE_WIDTH - 20},20`}
        fill="none" 
        stroke={strokeColor} 
        strokeWidth={2} 
        opacity={opacity * 0.5}
      />
    </Svg>
  );
};

// Gradient bar component
const GradientBar = ({ width, height, style }: { width: number; height: number; style?: object }) => (
  <Svg viewBox={`0 0 ${width} ${height}`} style={{ width, height, ...style }}>
    <Defs>
      <LinearGradient id="barGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <Stop offset="0%" stopColor={IARCHE_COLORS.bleuNuit} />
        <Stop offset="50%" stopColor={IARCHE_COLORS.terracotta} />
        <Stop offset="100%" stopColor={IARCHE_COLORS.bleuNuit} />
      </LinearGradient>
    </Defs>
    <Rect width={width} height={height} rx={height / 2} fill="url(#barGrad)" />
  </Svg>
);

// Header bar
const HeaderBar = () => (
  <Svg viewBox="0 0 300 3" style={{ width: 300, height: 3, marginTop: 10 }}>
    <Defs>
      <LinearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <Stop offset="0%" stopColor={IARCHE_COLORS.bleuNuit} />
        <Stop offset="50%" stopColor={IARCHE_COLORS.terracotta} />
        <Stop offset="100%" stopColor={IARCHE_COLORS.bleuNuit} />
      </LinearGradient>
    </Defs>
    <Rect width={300} height={3} rx={1.5} fill="url(#headerGrad)" />
  </Svg>
);

// Footer bar
const FooterBar = ({ isDark }: { isDark: boolean }) => (
  <Svg viewBox="0 0 1760 2" style={{ width: 1760, height: 2, marginBottom: 16 }}>
    <Defs>
      <LinearGradient id="footerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <Stop offset="0%" stopColor={isDark ? 'rgba(255,255,255,0.1)' : IARCHE_COLORS.bleuNuit} stopOpacity={0.3} />
        <Stop offset="50%" stopColor={IARCHE_COLORS.terracotta} stopOpacity={0.5} />
        <Stop offset="100%" stopColor={isDark ? 'rgba(255,255,255,0.1)' : IARCHE_COLORS.bleuNuit} stopOpacity={0.3} />
      </LinearGradient>
    </Defs>
    <Rect width={1760} height={2} rx={1} fill="url(#footerGrad)" />
  </Svg>
);

export const PresentationPDF = ({ slides }: PresentationPDFProps) => {
  return (
    <Document>
      {slides.map((slide, index) => {
        const isDark = slide.type === 'title' || slide.type === 'cta' || index % 2 === 0;
        const isCentered = slide.type === 'title' || slide.type === 'cta';
        const showSectionNumber = slide.type === 'content' || slide.type === 'bullets';
        
        return (
          <Page 
            key={slide.id} 
            size={[PAGE_WIDTH, PAGE_HEIGHT]} 
            style={isDark ? styles.pageDark : styles.pageLight}
          >
            {/* Background elements */}
            <MeshBackground isDark={isDark} />
            <ArchesDecoration isDark={isDark} />

            {/* Main content */}
            <View style={styles.content}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.logoContainer}>
                  <Text style={[styles.logoText, isDark ? styles.logoTextDark : styles.logoTextLight]}>
                    IArche
                  </Text>
                  <HeaderBar />
                </View>
                <Text style={styles.slideNumber}>
                  {String(index + 1).padStart(2, '0')}
                </Text>
              </View>

              {/* Content area */}
              <View style={isCentered ? styles.mainContentCentered : styles.mainContent}>
                {/* Section number for content slides */}
                {showSectionNumber && (
                  <View style={styles.sectionRow}>
                    <Text style={[styles.sectionNumber, isDark ? styles.sectionNumberDark : styles.sectionNumberLight]}>
                      {String(index).padStart(2, '0')}
                    </Text>
                    <View>
                      {slide.title && (
                        <Text style={isDark ? styles.titleDark : styles.titleLight}>
                          {slide.title}
                        </Text>
                      )}
                      <GradientBar width={100} height={5} style={{ marginTop: 12 }} />
                    </View>
                  </View>
                )}
                
                {/* Title slide content */}
                {slide.type === 'title' && (
                  <>
                    {slide.subtitle && (
                      <Text style={isDark ? styles.subtitleDark : styles.subtitleLight}>
                        {slide.subtitle}
                      </Text>
                    )}
                    <Text style={isDark ? styles.titleDark : styles.titleLight}>
                      {slide.title}
                    </Text>
                    <GradientBar width={128} height={6} style={{ marginTop: 16 }} />
                    {slide.content && (
                      <Text style={[isDark ? styles.textDark : styles.textLight, { marginTop: 24, textAlign: 'center' }]}>
                        {slide.content}
                      </Text>
                    )}
                  </>
                )}
                
                {/* Content text */}
                {(slide.type === 'content') && slide.content && (
                  <Text style={[isDark ? styles.textDark : styles.textLight, { marginTop: 20 }]}>
                    {slide.content}
                  </Text>
                )}
                
                {/* Bullets list in 2-column grid */}
                {slide.type === 'bullets' && slide.bullets && slide.bullets.length > 0 && (
                  <View style={styles.bulletsContainer}>
                    {slide.bullets.map((bullet, idx) => (
                      <View key={idx} style={styles.bulletItem}>
                        <View style={styles.bulletRow}>
                          <Text style={styles.bulletDash}>—</Text>
                          <Text style={[styles.bulletText, isDark ? styles.bulletTextDark : styles.bulletTextLight]}>
                            {bullet}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
                
                {/* CTA slide */}
                {slide.type === 'cta' && (
                  <>
                    <Text style={styles.ctaText}>{slide.title}</Text>
                    <GradientBar width={160} height={6} style={{ marginTop: 20, marginBottom: 20 }} />
                    {slide.content && (
                      <Text style={[styles.ctaSubtext, isDark ? styles.ctaSubtextDark : styles.ctaSubtextLight]}>
                        {slide.content}
                      </Text>
                    )}
                  </>
                )}
              </View>

              {/* Footer */}
              <View>
                <FooterBar isDark={isDark} />
                <View style={styles.footer}>
                  <Text style={isDark ? styles.footerTextDark : styles.footerTextLight}>
                    IArche · L'IA se construit avec vous
                  </Text>
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
