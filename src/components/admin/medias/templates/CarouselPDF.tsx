import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { IARCHE_COLORS, PDF_FORMATS } from '../pdf';
import { PDFImageLogo, PDFPatternBackground } from '../pdf/PDFImageAssets';
import { PDFGradientBar } from '../pdf/PDFGradientBar';

export type ExportMode = 'simple' | 'with-bar' | 'full';
export type BarSize = 'sm' | 'md' | 'lg' | 'xl';

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

export const CarouselPDF: React.FC<CarouselPDFProps> = ({ 
  slides, 
  format = 'linkedin',
  startTheme = 'dark' 
}) => {
  const { width, height } = FORMATS[format];

  return (
    <Document>
      {slides.map((slide, index) => {
        // Alternate themes starting from startTheme
        const isDark = startTheme === 'dark' ? index % 2 === 0 : index % 2 !== 0;
        
        const textColor = isDark ? IARCHE_COLORS.blancCasse : IARCHE_COLORS.bleuNuit;
        const subtextColor = isDark ? 'rgba(250, 249, 247, 0.7)' : IARCHE_COLORS.subtle;
        const highlightBg = isDark 
          ? 'rgba(176, 74, 50, 0.15)' 
          : 'rgba(26, 43, 74, 0.08)';
        const highlightTextColor = isDark 
          ? IARCHE_COLORS.terracotta 
          : IARCHE_COLORS.bleuNuit;
        
        // Per-slide export mode (default to 'full' for backward compatibility)
        const exportMode = slide.exportMode || 'full';
        const barSize = slide.barSize || 'md';
        const showBar = exportMode === 'with-bar' || exportMode === 'full';
        
        return (
          <Page 
            key={slide.id} 
            size={[width, height]} 
            style={isDark ? styles.pageDark : styles.pageLight}
          >
            {/* Mesh background pattern - always shown */}
            <PDFPatternBackground 
              pageWidth={width} 
              pageHeight={height} 
              opacity={isDark ? 0.06 : 0.08}
              isDark={isDark}
            />
            
            {/* Main content */}
            <View style={styles.content}>
              {/* Header with logo PNG and optional bar PNG */}
              <View style={styles.header}>
                <View style={styles.logoContainer}>
                  <PDFImageLogo 
                    width={120} 
                    variant={isDark ? 'terracotta' : 'gradient'} 
                  />
                  {showBar && (
                    <PDFGradientBar 
                      size={barSize} 
                      width={120} 
                      isDark={isDark}
                      style={{ marginTop: 8 }}
                    />
                  )}
                </View>
                <Text style={[styles.slideNumber, { color: subtextColor }]}>
                  {String(index + 1).padStart(2, '0')}/{String(slides.length).padStart(2, '0')}
                </Text>
              </View>

              {/* Body content */}
              <View style={styles.body}>
                <Text style={[styles.title, { color: textColor }]}>
                  {slide.title}
                </Text>
                {slide.subtitle && (
                  <Text style={[styles.subtitle, { color: subtextColor }]}>
                    {slide.subtitle}
                  </Text>
                )}
                {slide.content && (
                  <Text style={[styles.contentText, { color: textColor }]}>
                    {slide.content}
                  </Text>
                )}
                {slide.highlight && (
                  <View style={[styles.highlight, { backgroundColor: highlightBg }]}>
                    <Text style={[styles.highlightText, { color: highlightTextColor }]}>
                      {slide.highlight}
                    </Text>
                  </View>
                )}
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={[styles.footerText, { color: subtextColor }]}>
                  iarche.fr
                </Text>
                {index < slides.length - 1 && (
                  <View style={styles.swipeIndicator}>
                    <Text style={[styles.footerText, { color: subtextColor }]}>
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
