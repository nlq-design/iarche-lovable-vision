import { Document, Page, View, Text, StyleSheet, Svg, Defs, LinearGradient, Stop, Line, Rect, Path } from '@react-pdf/renderer';

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

// IArche brand colors (from BrandBook V2)
const colors = {
  primary: '#1A2B4A',
  primaryLight: '#233554',
  accent: '#D15A3E',
  accentLight: '#c96442',
  background: '#FAF9F7',
  foreground: '#2D2D2D',
  secondary: '#F5F3EF',
  border: '#E8E4DD',
  textSubtle: '#666666',
  textMuted: '#6B7280',
  white: '#FFFFFF',
};

const styles = StyleSheet.create({
  // Dark page (title, cta)
  pageDark: {
    width: 1920,
    height: 1080,
    backgroundColor: colors.primary,
    position: 'relative',
  },
  // Light page (content, bullets)
  pageLight: {
    width: 1920,
    height: 1080,
    backgroundColor: colors.background,
    position: 'relative',
  },
  // Grid overlay
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  // SVG lines decoration
  svgDecoration: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  // Content container
  content: {
    flex: 1,
    padding: 100,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    zIndex: 10,
  },
  // Header bar
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 60,
  },
  headerDark: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 30,
  },
  headerLight: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 30,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  decorativeLineHeader: {
    width: 160,
    height: 4,
  },
  // Main content
  mainContent: {
    flex: 1,
    justifyContent: 'center',
  },
  mainContentCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 28,
    textTransform: 'uppercase',
    letterSpacing: 5,
    marginBottom: 24,
    fontFamily: 'Helvetica',
  },
  subtitleDark: {
    color: colors.white,
    opacity: 0.6,
  },
  subtitleLight: {
    color: colors.textMuted,
  },
  title: {
    fontSize: 72,
    fontWeight: 'bold',
    marginBottom: 40,
    lineHeight: 1.15,
    fontFamily: 'Helvetica-Bold',
  },
  titleDark: {
    color: colors.white,
  },
  titleLight: {
    color: colors.foreground,
  },
  text: {
    fontSize: 36,
    lineHeight: 1.6,
    maxWidth: 1400,
    fontFamily: 'Helvetica',
  },
  textDark: {
    color: colors.white,
    opacity: 0.85,
  },
  textLight: {
    color: colors.textMuted,
  },
  // Bullets
  bulletList: {
    marginTop: 40,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  bulletDot: {
    fontSize: 36,
    color: colors.accent,
    marginRight: 24,
    marginTop: -6,
  },
  bulletText: {
    fontSize: 36,
    lineHeight: 1.4,
    flex: 1,
    fontFamily: 'Helvetica',
  },
  // Footer
  footer: {
    alignItems: 'flex-end',
    paddingTop: 20,
  },
  footerText: {
    fontSize: 20,
    letterSpacing: 2,
    fontFamily: 'Helvetica',
  },
  footerTextDark: {
    color: colors.white,
    opacity: 0.4,
  },
  footerTextLight: {
    color: colors.textSubtle,
    opacity: 0.6,
  },
});

// Grid pattern for light pages
const GridPatternLight = () => (
  <Svg viewBox="0 0 1920 1080" style={[styles.gridOverlay, { opacity: 0.03 }]}>
    {Array.from({ length: 50 }).map((_, i) => (
      <Line
        key={`l1-${i}`}
        x1={i * 60}
        y1={0}
        x2={i * 60 + 1080}
        y2={1080}
        stroke={colors.border}
        strokeWidth={1}
      />
    ))}
    {Array.from({ length: 50 }).map((_, i) => (
      <Line
        key={`l2-${i}`}
        x1={1920 - i * 60}
        y1={0}
        x2={1920 - i * 60 - 1080}
        y2={1080}
        stroke={colors.border}
        strokeWidth={1}
      />
    ))}
  </Svg>
);

// Grid pattern for dark pages
const GridPatternDark = () => (
  <Svg viewBox="0 0 1920 1080" style={[styles.gridOverlay, { opacity: 0.02 }]}>
    {Array.from({ length: 50 }).map((_, i) => (
      <Line
        key={`d1-${i}`}
        x1={i * 60}
        y1={0}
        x2={i * 60 + 1080}
        y2={1080}
        stroke={colors.white}
        strokeWidth={1}
      />
    ))}
    {Array.from({ length: 50 }).map((_, i) => (
      <Line
        key={`d2-${i}`}
        x1={1920 - i * 60}
        y1={0}
        x2={1920 - i * 60 - 1080}
        y2={1080}
        stroke={colors.white}
        strokeWidth={1}
      />
    ))}
  </Svg>
);

// SVG Arch lines
const ArchLines = ({ isDark }: { isDark: boolean }) => (
  <Svg viewBox="0 0 1920 1080" style={styles.svgDecoration}>
    <Defs>
      <LinearGradient id="archG1" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor={isDark ? colors.primaryLight : colors.primary} stopOpacity={0.5} />
        <Stop offset="100%" stopColor={colors.accent} stopOpacity={0.5} />
      </LinearGradient>
      <LinearGradient id="archG2" x1="100%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor={colors.accent} stopOpacity={0.5} />
        <Stop offset="100%" stopColor={isDark ? colors.primaryLight : colors.primary} stopOpacity={0.5} />
      </LinearGradient>
    </Defs>
    {/* Top-right arch */}
    <Path
      d="M 1920 80 L 1500 80 Q 1490 80 1490 90 L 1490 300 Q 1490 310 1480 310 L 1300 310"
      stroke="url(#archG1)"
      strokeWidth={3}
      fill="none"
    />
    {/* Bottom-left arch */}
    <Path
      d="M 0 1000 L 420 1000 Q 430 1000 430 990 L 430 770 Q 430 760 440 760 L 620 760"
      stroke="url(#archG2)"
      strokeWidth={3}
      fill="none"
    />
  </Svg>
);

// Logo component (using Text instead of SVG Text for compatibility)
const LogoGradient = () => (
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <Text style={{
      fontSize: 42,
      fontWeight: 'bold',
      color: colors.accent,
      fontFamily: 'Helvetica-Bold',
    }}>
      IArche
    </Text>
  </View>
);

// Decorative bar with gradient
const DecorativeBarHeader = () => (
  <Svg viewBox="0 0 160 4" style={styles.decorativeLineHeader}>
    <Defs>
      <LinearGradient id="barGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <Stop offset="0%" stopColor={colors.primary} />
        <Stop offset="50%" stopColor={colors.accent} />
        <Stop offset="100%" stopColor={colors.primary} />
      </LinearGradient>
    </Defs>
    <Rect x="0" y="0" width="160" height="4" rx="2" fill="url(#barGrad)" />
  </Svg>
);

export const PresentationPDF = ({ slides }: PresentationPDFProps) => {
  return (
    <Document>
      {slides.map((slide) => {
        const isDark = slide.type === 'title' || slide.type === 'cta';
        const pageStyle = isDark ? styles.pageDark : styles.pageLight;

        return (
          <Page key={slide.id} size={[1920, 1080]} style={pageStyle}>
            {/* Background decorations */}
            {isDark ? <GridPatternDark /> : <GridPatternLight />}
            <ArchLines isDark={isDark} />

            {/* Content */}
            <View style={styles.content}>
              {/* Header */}
              <View style={[styles.header, isDark ? styles.headerDark : styles.headerLight]}>
                <View style={styles.logoContainer}>
                  <LogoGradient />
                </View>
                <DecorativeBarHeader />
              </View>

              {/* Main content */}
              <View style={isDark ? styles.mainContentCentered : styles.mainContent}>
                {slide.subtitle && (
                  <Text style={[styles.subtitle, isDark ? styles.subtitleDark : styles.subtitleLight]}>
                    {slide.subtitle}
                  </Text>
                )}
                
                <Text style={[styles.title, isDark ? styles.titleDark : styles.titleLight]}>
                  {slide.title}
                </Text>

                {slide.content && (
                  <Text style={[styles.text, isDark ? styles.textDark : styles.textLight]}>
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
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={[styles.footerText, isDark ? styles.footerTextDark : styles.footerTextLight]}>
                  iarche.fr
                </Text>
              </View>
            </View>
          </Page>
        );
      })}
    </Document>
  );
};
