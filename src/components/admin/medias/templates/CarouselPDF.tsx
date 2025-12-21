import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { IARCHE_COLORS, PDF_FORMATS } from '../pdf';
import { PDFImageLogo } from '../pdf/PDFImageAssets';
import { PDFLogoArc } from '../pdf/PDFLogoArc';

export type ExportMode = 'simple' | 'with-bar' | 'full';
export type BarSize = 'sm' | 'md' | 'lg' | 'xl';
export type ThemeType = 'dark' | 'light' | 'terra' | 'contrast' | 'gradient';

interface SlideData {
  id: number;
  title: string;
  subtitle: string;
  content: string;
  highlight?: string;
  exportMode?: ExportMode;
  barSize?: BarSize;
}

interface CarouselPDFProps {
  slides: SlideData[];
  format?: 'linkedin' | 'instagram';
  startTheme?: ThemeType;
  showDecorativeArc?: boolean;
}

// Theme configurations - v4.1 DA compliant
// Règle 2: Terra Theme - subtext = #FAF9F7 (pas de rgba < 0.88)
const THEME_COLORS = {
  dark: {
    background: IARCHE_COLORS.bleuNuit,
    text: IARCHE_COLORS.blancCasse,           // #FAF9F7
    subtext: IARCHE_COLORS.blancCasse,        // v4.1: Opaque pour contraste WCAG
    highlightBg: 'rgba(176, 74, 50, 0.15)',
    highlightText: IARCHE_COLORS.terracotta,
    logoVariant: 'terracotta' as const,
  },
  light: {
    background: IARCHE_COLORS.blancCasse,
    text: IARCHE_COLORS.bleuNuit,
    subtext: IARCHE_COLORS.subtle,
    highlightBg: 'rgba(26, 43, 74, 0.08)',
    highlightText: IARCHE_COLORS.bleuNuit,
    logoVariant: 'gradient' as const,
  },
  terra: {
    background: IARCHE_COLORS.terracotta,     // v4.1: Utiliser token (#B04A32)
    text: IARCHE_COLORS.blancCasse,           // #FAF9F7
    subtext: IARCHE_COLORS.blancCasse,        // v4.1: Opaque pour contraste WCAG
    highlightBg: 'rgba(26, 43, 74, 0.15)',
    highlightText: IARCHE_COLORS.bleuNuit,
    logoVariant: 'white' as const,
  },
  contrast: {
    background: '#0A0A0A',
    text: '#FAFAFA',
    subtext: '#FAFAFA',                       // v4.1: Opaque pour contraste WCAG
    highlightBg: 'rgba(176, 74, 50, 0.2)',
    highlightText: IARCHE_COLORS.terracotta,
    logoVariant: 'white' as const,
  },
  // v4.2 - Thème gradient (style email) - Blanc cassé pour police
  gradient: {
    background: IARCHE_COLORS.bleuNuit,       // Note: PDF ne supporte pas les gradients CSS
    text: IARCHE_COLORS.blancCasse,           // #FAF9F7 - Blanc cassé
    subtext: IARCHE_COLORS.blancCasse,
    highlightBg: 'rgba(176, 74, 50, 0.15)',
    highlightText: IARCHE_COLORS.terracotta,
    logoVariant: 'white' as const,
  },
};

// Theme alternation pairs
const THEME_ALTERNATES: Record<ThemeType, ThemeType> = {
  dark: 'light',
  light: 'dark',
  terra: 'dark',
  contrast: 'light',
  gradient: 'light',
};

// Safe zones - Règle 4: Carousel LinkedIn = 64px min
const SAFE_ZONE_CAROUSEL = 64;

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: SAFE_ZONE_CAROUSEL,              // v4.1: 64px safe zone
    justifyContent: 'space-between',
    position: 'relative',
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
  },
  logoContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  slideNumber: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  body: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 24,
    lineHeight: 1.4,
    opacity: 0.8,
  },
  contentText: {
    fontSize: 14,
    lineHeight: 1.6,
    opacity: 0.9,
  },
  highlight: {
    marginTop: 20,
    padding: 16,
    borderRadius: 8,
  },
  highlightText: {
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 1.4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 10,
    opacity: 0.6,
  },
  swipeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  swipeArrow: {
    fontSize: 12,
    opacity: 0.6,
  },
});

// Format dimensions
const FORMATS = {
  linkedin: { width: 1080, height: 1080 },
  instagram: { width: 1080, height: 1350 },
};

// Get theme for a specific slide index
const getSlideTheme = (index: number, startTheme: ThemeType): ThemeType => {
  if (index % 2 === 0) return startTheme;
  return THEME_ALTERNATES[startTheme];
};

export const CarouselPDF: React.FC<CarouselPDFProps> = ({ 
  slides, 
  format = 'linkedin',
  startTheme = 'dark',
  showDecorativeArc = true
}) => {
  const { width, height } = FORMATS[format];

  return (
    <Document>
      {slides.map((slide, index) => {
        const currentTheme = getSlideTheme(index, startTheme);
        const colors = THEME_COLORS[currentTheme];
        
        // Per-slide export mode (default to 'full' for backward compatibility)
        const exportMode = slide.exportMode || 'full';
        const barSize = slide.barSize || 'md';
        const showBar = exportMode === 'with-bar' || exportMode === 'full';
        
        // v4.2 - Detect if highlight is a number/stat for special styling
        const isStatHighlight = slide.highlight && /^[+\-]?\d/.test(slide.highlight);
        
        const isDark = currentTheme !== 'light';
        
        return (
          <Page 
            key={slide.id} 
            size={[width, height]} 
            style={{ position: 'relative', backgroundColor: colors.background }}
          >
            {/* v4.3 - Arc décoratif mode continuité: plus grand et débordant */}
            {showDecorativeArc && (
              <View style={{
                position: 'absolute',
                // Mode continuité: arc 40% plus grand, déborde de 40% hors cadre
                bottom: -width * 0.18,
                right: -width * 0.18,
                width: width * 0.45,
                height: width * 0.45,
                opacity: 0.06,
              }}>
                <View style={{
                  width: '100%',
                  height: '100%',
                  borderWidth: 2,
                  borderColor: isDark ? '#ffffff' : '#B04A32',
                  borderRadius: width * 0.225,
                  borderTopLeftRadius: 0,
                }} />
              </View>
            )}
            
            {/* Main content */}
            <View style={styles.content}>
              {/* Header with logo PNG and optional bar PNG */}
              <View style={styles.header}>
                <View style={styles.logoContainer}>
                  <PDFImageLogo 
                    width={120} 
                    variant={colors.logoVariant} 
                  />
                  {/* v4.0: pas d'arc sous le logo */}
                </View>
                {/* v4.2 - Enhanced slide number */}
                <View style={{ 
                  backgroundColor: currentTheme !== 'light' ? 'rgba(255,255,255,0.1)' : 'rgba(26,43,74,0.08)',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 12,
                }}>
                  <Text style={[styles.slideNumber, { color: colors.subtext, opacity: 0.8 }]}>
                    {String(index + 1).padStart(2, '0')}/{String(slides.length).padStart(2, '0')}
                  </Text>
                </View>
              </View>

              {/* Body content */}
              <View style={styles.body}>
                {/* v4.2 - Styled subtitle badge */}
                {slide.subtitle && (
                  <View style={{
                    backgroundColor: currentTheme !== 'light' ? 'rgba(176, 74, 50, 0.25)' : 'rgba(176, 74, 50, 0.15)',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    alignSelf: 'flex-start',
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: currentTheme !== 'light' ? 'rgba(176, 74, 50, 0.4)' : 'rgba(176, 74, 50, 0.3)',
                  }}>
                    <Text style={{ 
                      fontSize: 12, 
                      color: currentTheme !== 'light' ? '#E8B4A0' : '#8B3A2F',
                      textTransform: 'uppercase',
                      letterSpacing: 1.5,
                      fontWeight: 'bold',
                    }}>
                      {slide.subtitle}
                    </Text>
                  </View>
                )}
                
                {slide.title && (
                  <>
                    <Text style={[styles.title, { 
                      color: colors.text,
                      fontSize: slide.highlight ? 28 : 32, // Slightly smaller if there's a highlight
                      letterSpacing: -0.5,
                    }]}>
                      {slide.title}
                    </Text>
                    {/* v4.1: Arc sous le titre H1 (Règle 1) */}
                    {showBar && (
                      <PDFLogoArc size={barSize} style={{ marginTop: 12, marginBottom: 16 }} />
                    )}
                  </>
                )}
                
                {slide.content && (
                  <Text style={[styles.contentText, { 
                    color: colors.text,
                    lineHeight: 1.7,
                    opacity: 0.85,
                  }]}>
                    {slide.content}
                  </Text>
                )}
                
                {/* v4.2 - Enhanced highlight with gradient-like styling */}
                {slide.highlight && (
                  <View style={[styles.highlight, { 
                    backgroundColor: colors.highlightBg,
                    borderLeftWidth: 3,
                    borderLeftColor: IARCHE_COLORS.terracotta,
                    marginTop: 24,
                  }]}>
                    <Text style={[styles.highlightText, { 
                      color: colors.highlightText,
                      fontSize: isStatHighlight ? 36 : 16,
                      fontWeight: 'bold',
                      letterSpacing: isStatHighlight ? -1 : 0,
                    }]}>
                      {slide.highlight}
                    </Text>
                  </View>
                )}
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={[styles.footerText, { color: colors.subtext }]}>
                  iarche.fr
                </Text>
                {index < slides.length - 1 && (
                  <View style={styles.swipeIndicator}>
                    <Text style={[styles.footerText, { color: colors.subtext }]}>
                      Swipe
                    </Text>
                    <Text style={[styles.swipeArrow, { color: IARCHE_COLORS.terracotta }]}>
                      →
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Page>
        );
      })}
    </Document>
  );
};

export default CarouselPDF;
