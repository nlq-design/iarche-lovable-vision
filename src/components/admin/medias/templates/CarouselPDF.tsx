import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { IARCHE_COLORS, PDF_FORMATS } from '../pdf';
import { PDFImageLogo } from '../pdf/PDFImageAssets';
import { PDFLogoArc } from '../pdf/PDFLogoArc';

export type ExportMode = 'simple' | 'with-bar' | 'full';
export type BarSize = 'sm' | 'md' | 'lg' | 'xl';
export type ThemeType = 'dark' | 'light' | 'terra' | 'contrast';

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
}

// Theme configurations
const THEME_COLORS = {
  dark: {
    background: IARCHE_COLORS.bleuNuit,
    text: IARCHE_COLORS.blancCasse,
    subtext: 'rgba(250, 249, 247, 0.7)',
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
    background: '#8B3A2F',
    text: IARCHE_COLORS.blancCasse,
    subtext: 'rgba(250, 249, 247, 0.7)',
    highlightBg: 'rgba(26, 43, 74, 0.15)',
    highlightText: IARCHE_COLORS.bleuNuit,
    logoVariant: 'white' as const,
  },
  contrast: {
    background: '#0A0A0A',
    text: '#FAFAFA',
    subtext: 'rgba(250, 250, 250, 0.7)',
    highlightBg: 'rgba(176, 74, 50, 0.2)',
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
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 40,
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
  startTheme = 'dark' 
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
        
        return (
          <Page 
            key={slide.id} 
            size={[width, height]} 
            style={{ position: 'relative', backgroundColor: colors.background }}
          >
            
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
                <Text style={[styles.slideNumber, { color: colors.subtext }]}>
                  {String(index + 1).padStart(2, '0')}/{String(slides.length).padStart(2, '0')}
                </Text>
              </View>

              {/* Body content */}
              <View style={styles.body}>
                <Text style={[styles.title, { color: colors.text }]}>
                  {slide.title}
                </Text>
                {slide.subtitle && (
                  <Text style={[styles.subtitle, { color: colors.subtext }]}>
                    {slide.subtitle}
                  </Text>
                )}
                {slide.content && (
                  <Text style={[styles.contentText, { color: colors.text }]}>
                    {slide.content}
                  </Text>
                )}
                {slide.highlight && (
                  <View style={[styles.highlight, { backgroundColor: colors.highlightBg }]}>
                    <Text style={[styles.highlightText, { color: colors.highlightText }]}>
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
