import { Document, Page, View, Text, StyleSheet, Svg, Defs, LinearGradient, Stop, Line, Rect, Path } from '@react-pdf/renderer';

interface SlideData {
  id: number;
  title: string;
  subtitle: string;
  content: string;
  highlight?: string;
}

interface CarouselPDFProps {
  slides: SlideData[];
}

// IArche brand colors (from BrandBook V2)
const colors = {
  // Primary - Bleu Nuit HSL(218, 47%, 20%) → #1A2B4A
  primary: '#1A2B4A',
  primaryLight: '#233554',
  // Accent - Terracotta HSL(12, 60%, 53%) → #D15A3E
  accent: '#D15A3E',
  accentLight: '#c96442',
  // Background - Blanc Cassé HSL(30, 14%, 98%) → #FAF9F7
  background: '#FAF9F7',
  // Foreground - Anthracite
  foreground: '#2D2D2D',
  // Secondary
  secondary: '#F5F3EF',
  // Border
  border: '#E8E4DD',
  // Text subtle
  textSubtle: '#666666',
  // White
  white: '#FFFFFF',
};

const styles = StyleSheet.create({
  page: {
    width: 1080,
    height: 1350,
    backgroundColor: colors.primary,
    position: 'relative',
  },
  // Grid pattern overlay
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0.03,
  },
  // SVG decorative lines container
  svgDecoration: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    padding: 80,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    position: 'relative',
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  decorativeBar: {
    width: 100,
    height: 6,
    marginTop: 12,
    borderRadius: 3,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 60,
  },
  subtitle: {
    fontSize: 22,
    color: colors.white,
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 4,
    marginBottom: 20,
    fontFamily: 'Helvetica',
    fontWeight: 'medium',
  },
  title: {
    fontSize: 64,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 1.15,
    fontFamily: 'Helvetica-Bold',
  },
  text: {
    fontSize: 28,
    color: colors.white,
    opacity: 0.85,
    textAlign: 'center',
    lineHeight: 1.6,
    maxWidth: 900,
    fontFamily: 'Helvetica',
  },
  highlight: {
    fontSize: 80,
    fontWeight: 'bold',
    color: colors.accent,
    marginTop: 40,
    fontFamily: 'Helvetica-Bold',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 20,
  },
  footerText: {
    fontSize: 18,
    color: colors.white,
    opacity: 0.4,
    letterSpacing: 2,
    fontFamily: 'Helvetica',
  },
});

// Grid pattern component (simplified diagonal lines)
const GridPattern = () => (
  <Svg viewBox="0 0 1080 1350" style={styles.gridOverlay}>
    {/* Diagonal grid lines - 45° */}
    {Array.from({ length: 30 }).map((_, i) => (
      <Line
        key={`line1-${i}`}
        x1={i * 50}
        y1={0}
        x2={i * 50 + 1350}
        y2={1350}
        stroke={colors.border}
        strokeWidth={1}
      />
    ))}
    {/* Diagonal grid lines - -45° */}
    {Array.from({ length: 30 }).map((_, i) => (
      <Line
        key={`line2-${i}`}
        x1={1080 - i * 50}
        y1={0}
        x2={1080 - i * 50 - 1350}
        y2={1350}
        stroke={colors.border}
        strokeWidth={1}
      />
    ))}
  </Svg>
);

// SVG Arch decorative lines
const ArchLines = () => (
  <Svg viewBox="0 0 1080 1350" style={styles.svgDecoration}>
    <Defs>
      <LinearGradient id="archGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor={colors.primary} stopOpacity={0.7} />
        <Stop offset="100%" stopColor={colors.accent} stopOpacity={0.7} />
      </LinearGradient>
      <LinearGradient id="archGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor={colors.accent} stopOpacity={0.7} />
        <Stop offset="100%" stopColor={colors.primary} stopOpacity={0.7} />
      </LinearGradient>
    </Defs>
    {/* Arch line 1 - top right to middle left */}
    <Path
      d="M 1080 100 L 800 100 Q 790 100 790 110 L 790 400 Q 790 410 780 410 L 600 410"
      stroke="url(#archGradient1)"
      strokeWidth={3}
      fill="none"
    />
    {/* Arch line 2 - bottom left to middle right */}
    <Path
      d="M 0 1250 L 280 1250 Q 290 1250 290 1240 L 290 950 Q 290 940 300 940 L 480 940"
      stroke="url(#archGradient2)"
      strokeWidth={3}
      fill="none"
    />
  </Svg>
);

// Logo component (using Text instead of SVG Text for compatibility)
const LogoGradient = () => (
  <View style={{ alignItems: 'center' }}>
    <Text style={{
      fontSize: 52,
      fontWeight: 'bold',
      color: colors.accent,
      fontFamily: 'Helvetica-Bold',
    }}>
      IArche
    </Text>
  </View>
);

// Decorative bar with gradient
const DecorativeBar = () => (
  <Svg viewBox="0 0 100 6" style={styles.decorativeBar}>
    <Defs>
      <LinearGradient id="barGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <Stop offset="0%" stopColor={colors.primary} />
        <Stop offset="50%" stopColor={colors.accent} />
        <Stop offset="100%" stopColor={colors.primary} />
      </LinearGradient>
    </Defs>
    <Rect x="0" y="0" width="100" height="6" rx="3" fill="url(#barGradient)" />
  </Svg>
);

export const CarouselPDF = ({ slides }: CarouselPDFProps) => {
  return (
    <Document>
      {slides.map((slide) => (
        <Page key={slide.id} size={[1080, 1350]} style={styles.page}>
          {/* Background decorations */}
          <GridPattern />
          <ArchLines />
          
          {/* Main content */}
          <View style={styles.content}>
            {/* Header with logo */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <LogoGradient />
                <DecorativeBar />
              </View>
            </View>

            {/* Main content area */}
            <View style={styles.mainContent}>
              {slide.subtitle && (
                <Text style={styles.subtitle}>{slide.subtitle}</Text>
              )}
              {slide.title && (
                <Text style={styles.title}>{slide.title}</Text>
              )}
              {slide.content && (
                <Text style={styles.text}>{slide.content}</Text>
              )}
              {slide.highlight && (
                <Text style={styles.highlight}>{slide.highlight}</Text>
              )}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>iarche.fr</Text>
            </View>
          </View>
        </Page>
      ))}
    </Document>
  );
};
