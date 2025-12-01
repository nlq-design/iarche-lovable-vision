import { Document, Page, View, Text, Image, StyleSheet, Svg, Line, Path } from '@react-pdf/renderer';
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

// Get the base URL for public assets
const getAssetUrl = (path: string) => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path}`;
  }
  return path;
};

// Asset paths - use public folder URLs for react-pdf compatibility
const ASSETS = {
  logoGradient: getAssetUrl('/assets/logo-iarche-gradient.png'),
  logoWhite: getAssetUrl('/assets/logo-iarche-white.png'),
  barSm: getAssetUrl('/assets/bar-sm.png'),
  barMd: getAssetUrl('/assets/bar-md.png'),
  barLg: getAssetUrl('/assets/bar-lg.png'),
  barXl: getAssetUrl('/assets/bar-xl.png'),
};

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
    padding: 80,
    position: 'relative',
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 50,
    borderBottomWidth: 1,
    paddingBottom: 24,
  },
  headerDark: {
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerLight: {
    borderBottomColor: IARCHE_COLORS.border,
  },
  logoContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  logo: {
    width: 160,
    height: 64,
    objectFit: 'contain',
  },
  barMd: {
    width: 80,
    height: 4,
    marginTop: 10,
  },
  slideNumberContainer: {
    alignItems: 'flex-end',
  },
  slideNumberLarge: {
    fontSize: 48,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
  },
  slideNumberDark: {
    color: IARCHE_COLORS.terracotta,
    opacity: 0.8,
  },
  slideNumberLight: {
    color: IARCHE_COLORS.terracotta,
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
  // Section with number indicator
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 30,
  },
  sectionNumber: {
    fontSize: 96,
    fontWeight: 'bold',
    opacity: 0.1,
    marginRight: 24,
    marginTop: -20,
    fontFamily: 'Helvetica-Bold',
  },
  sectionNumberDark: {
    color: IARCHE_COLORS.white,
  },
  sectionNumberLight: {
    color: IARCHE_COLORS.terracotta,
  },
  sectionTitleContainer: {
    flex: 1,
  },
  subtitle: {
    fontSize: 24,
    textTransform: 'uppercase',
    letterSpacing: 5,
    marginBottom: 16,
    fontFamily: 'Helvetica',
  },
  subtitleDark: {
    color: IARCHE_COLORS.white,
    opacity: 0.5,
  },
  subtitleLight: {
    color: IARCHE_COLORS.muted,
  },
  title: {
    fontSize: 64,
    fontWeight: 'bold',
    marginBottom: 16,
    lineHeight: 1.15,
    fontFamily: 'Helvetica-Bold',
  },
  titleDark: {
    color: IARCHE_COLORS.white,
  },
  titleLight: {
    color: IARCHE_COLORS.foreground,
  },
  titleCentered: {
    textAlign: 'center',
  },
  barXl: {
    width: 128,
    height: 6,
    marginBottom: 30,
  },
  barLg: {
    width: 96,
    height: 4,
    marginTop: 12,
    marginBottom: 30,
  },
  text: {
    fontSize: 32,
    lineHeight: 1.7,
    maxWidth: 1400,
    fontFamily: 'Helvetica',
  },
  textDark: {
    color: IARCHE_COLORS.white,
    opacity: 0.85,
  },
  textLight: {
    color: IARCHE_COLORS.muted,
  },
  textCentered: {
    textAlign: 'center',
  },
  bulletList: {
    marginTop: 30,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  bulletDot: {
    fontSize: 32,
    color: IARCHE_COLORS.terracotta,
    marginRight: 20,
    marginTop: -4,
  },
  bulletText: {
    fontSize: 32,
    lineHeight: 1.5,
    flex: 1,
    fontFamily: 'Helvetica',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
  },
  footerDark: {
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  footerLight: {
    borderTopColor: '#E8E4DD',
  },
  footerText: {
    fontSize: 18,
    letterSpacing: 1,
    fontFamily: 'Helvetica',
  },
  footerTextDark: {
    color: IARCHE_COLORS.white,
    opacity: 0.4,
  },
  footerTextLight: {
    color: IARCHE_COLORS.subtle,
  },
  // CTA specific styles
  ctaText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: IARCHE_COLORS.terracotta,
    textAlign: 'center',
    marginTop: 20,
    fontFamily: 'Helvetica-Bold',
  },
});

// Mesh background pattern
const MeshBackground = ({ isDark }: { isDark: boolean }) => {
  const strokeColor = isDark ? '#FFFFFF' : IARCHE_COLORS.bleuNuit;
  const opacity = isDark ? 0.08 : 0.1; // Increased for visibility
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
    <Svg style={styles.meshBackground} viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`}>
      {lines}
    </Svg>
  );
};

// Corner arches decoration
const ArchesDecoration = ({ isDark }: { isDark: boolean }) => {
  const strokeColor = isDark ? '#FFFFFF' : IARCHE_COLORS.terracotta;
  const opacity = isDark ? 0.2 : 0.35; // Increased for visibility
  const cornerSize = 140;
  
  return (
    <Svg style={styles.archesOverlay} viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`}>
      {/* Top-right corner */}
      <Path 
        d={`M${PAGE_WIDTH},0 L${PAGE_WIDTH},${cornerSize} M${PAGE_WIDTH - cornerSize},0 L${PAGE_WIDTH},0`}
        fill="none" 
        stroke={strokeColor} 
        strokeWidth={3} 
        opacity={opacity}
      />
      {/* Bottom-left corner */}
      <Path 
        d={`M0,${PAGE_HEIGHT} L0,${PAGE_HEIGHT - cornerSize} M${cornerSize},${PAGE_HEIGHT} L0,${PAGE_HEIGHT}`}
        fill="none" 
        stroke={strokeColor} 
        strokeWidth={3} 
        opacity={opacity}
      />
      {/* Secondary arches */}
      <Path 
        d={`M${PAGE_WIDTH},30 L${PAGE_WIDTH},${cornerSize - 30} M${PAGE_WIDTH - cornerSize + 30},30 L${PAGE_WIDTH - 30},30`}
        fill="none" 
        stroke={strokeColor} 
        strokeWidth={1.5} 
        opacity={opacity * 0.5}
      />
      <Path 
        d={`M30,${PAGE_HEIGHT - 30} L30,${PAGE_HEIGHT - cornerSize + 30} M${cornerSize - 30},${PAGE_HEIGHT - 30} L30,${PAGE_HEIGHT - 30}`}
        fill="none" 
        stroke={strokeColor} 
        strokeWidth={1.5} 
        opacity={opacity * 0.5}
      />
    </Svg>
  );
};

export const PresentationPDF = ({ slides }: PresentationPDFProps) => {
  return (
    <Document>
      {slides.map((slide, index) => {
        const isDark = slide.type === 'title' || slide.type === 'cta';
        const isCentered = slide.type === 'title' || slide.type === 'cta';
        const showSectionNumber = slide.type === 'content' || slide.type === 'bullets';

        return (
          <Page 
            key={slide.id} 
            size={[PAGE_WIDTH, PAGE_HEIGHT]} 
            style={isDark ? styles.pageDark : styles.pageLight}
          >
            {/* Mesh background */}
            <MeshBackground isDark={isDark} />
            
            {/* Corner arches */}
            <ArchesDecoration isDark={isDark} />

            {/* Main content */}
            <View style={styles.content}>
              {/* Header */}
              <View style={[styles.header, isDark ? styles.headerDark : styles.headerLight]}>
                <View style={styles.logoContainer}>
                  <Image 
                    src={isDark ? ASSETS.logoWhite : ASSETS.logoGradient} 
                    style={styles.logo} 
                  />
                  <Image src={ASSETS.barMd} style={styles.barMd} />
                </View>
                <View style={styles.slideNumberContainer}>
                  <Text style={[styles.slideNumberLarge, isDark ? styles.slideNumberDark : styles.slideNumberLight]}>
                    {String(index + 1).padStart(2, '0')}
                  </Text>
                </View>
              </View>

              {/* Main content */}
              <View style={isCentered ? styles.mainContentCentered : styles.mainContent}>
                {showSectionNumber ? (
                  // Content/bullets slides with section number
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionNumber, isDark ? styles.sectionNumberDark : styles.sectionNumberLight]}>
                      {String(index).padStart(2, '0')}
                    </Text>
                    <View style={styles.sectionTitleContainer}>
                      {slide.subtitle && (
                        <Text style={[styles.subtitle, isDark ? styles.subtitleDark : styles.subtitleLight]}>
                          {slide.subtitle}
                        </Text>
                      )}
                      <Text style={[styles.title, isDark ? styles.titleDark : styles.titleLight]}>
                        {slide.title}
                      </Text>
                      <Image src={ASSETS.barLg} style={styles.barLg} />
                    </View>
                  </View>
                ) : (
                  // Title/CTA slides centered
                  <>
                    {slide.subtitle && (
                      <Text style={[styles.subtitle, isDark ? styles.subtitleDark : styles.subtitleLight]}>
                        {slide.subtitle}
                      </Text>
                    )}
                    <Text style={[styles.title, isDark ? styles.titleDark : styles.titleLight, isCentered && styles.titleCentered]}>
                      {slide.title}
                    </Text>
                    <Image src={ASSETS.barXl} style={styles.barXl} />
                  </>
                )}

                {slide.content && (
                  <Text style={[styles.text, isDark ? styles.textDark : styles.textLight, isCentered && styles.textCentered]}>
                    {slide.content}
                  </Text>
                )}

                {slide.bullets && slide.bullets.length > 0 && (
                  <View style={styles.bulletList}>
                    {slide.bullets.map((bullet, idx) => (
                      <View key={idx} style={styles.bulletItem}>
                        <Text style={styles.bulletDot}>●</Text>
                        <Text style={[styles.bulletText, isDark ? styles.textDark : styles.textLight]}>
                          {bullet}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* CTA highlight */}
                {slide.type === 'cta' && (
                  <Text style={styles.ctaText}>
                    Parlons de votre projet →
                  </Text>
                )}
              </View>

              {/* Footer */}
              <View style={[styles.footer, isDark ? styles.footerDark : styles.footerLight]}>
                <Text style={[styles.footerText, isDark ? styles.footerTextDark : styles.footerTextLight]}>
                  {slide.type === 'cta' ? "L'IA se construit avec vous" : 'IArche · Agence IA'}
                </Text>
                <Text style={[styles.footerText, isDark ? styles.footerTextDark : styles.footerTextLight]}>
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
