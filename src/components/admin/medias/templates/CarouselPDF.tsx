import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { 
  PDFLogoText, 
  PDFGradientBar, 
  PDFMeshBackground, 
  PDFArches,
  IARCHE_COLORS,
  TYPOGRAPHY,
  PDF_FORMATS,
} from '../pdf';

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
  page: {
    position: 'relative',
  },
  pageDark: {
    backgroundColor: IARCHE_COLORS.bleuNuit,
  },
  pageLight: {
    backgroundColor: IARCHE_COLORS.blancCasse,
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
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 60,
  },
  // Dark theme text styles
  subtitleDark: {
    ...TYPOGRAPHY.pdfSubtitle,
    textTransform: 'uppercase',
    letterSpacing: 4,
    marginBottom: 20,
  },
  titleDark: {
    ...TYPOGRAPHY.pdfTitle,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 1.15,
  },
  textDark: {
    ...TYPOGRAPHY.pdfBody,
    textAlign: 'center',
    maxWidth: 900,
  },
  highlightDark: {
    ...TYPOGRAPHY.pdfHighlight,
    marginTop: 40,
  },
  // Light theme text styles
  subtitleLight: {
    ...TYPOGRAPHY.pdfSubtitle,
    color: IARCHE_COLORS.subtle,
    opacity: 1,
    textTransform: 'uppercase',
    letterSpacing: 4,
    marginBottom: 20,
  },
  titleLight: {
    ...TYPOGRAPHY.pdfTitle,
    color: IARCHE_COLORS.foreground,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 1.15,
  },
  textLight: {
    ...TYPOGRAPHY.pdfBody,
    color: IARCHE_COLORS.foreground,
    opacity: 1,
    textAlign: 'center',
    maxWidth: 900,
  },
  highlightLight: {
    ...TYPOGRAPHY.pdfHighlight,
    marginTop: 40,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 20,
  },
  footerTextDark: {
    ...TYPOGRAPHY.caption,
    color: IARCHE_COLORS.white,
    opacity: 0.4,
    letterSpacing: 2,
  },
  footerTextLight: {
    ...TYPOGRAPHY.caption,
    color: IARCHE_COLORS.subtle,
    letterSpacing: 2,
  },
  slideNumber: {
    ...TYPOGRAPHY.caption,
    color: IARCHE_COLORS.subtle,
    position: 'absolute',
    bottom: 40,
    right: 60,
  },
});

export const CarouselPDF = ({ slides, format = 'linkedin' }: CarouselPDFProps) => {
  const dimensions = format === 'linkedin' 
    ? PDF_FORMATS.carouselLinkedIn 
    : PDF_FORMATS.carouselInstagram;

  return (
    <Document>
      {slides.map((slide, index) => {
        // Alternate between dark and light themes
        const isDark = index % 2 === 0;
        
        return (
          <Page 
            key={slide.id} 
            size={[dimensions.width, dimensions.height]} 
            style={[styles.page, isDark ? styles.pageDark : styles.pageLight]}
          >
            {/* Mesh background pattern */}
            <PDFMeshBackground 
              pageWidth={dimensions.width} 
              pageHeight={dimensions.height}
              opacity={isDark ? 0.03 : 0.05}
            />
            
            {/* Decorative arch lines */}
            <PDFArches 
              position="both"
              pageWidth={dimensions.width}
              pageHeight={dimensions.height}
              opacity={0.3}
            />
            
            {/* Main content */}
            <View style={styles.content}>
              {/* Header with logo */}
              <View style={styles.header}>
                <View style={styles.logoContainer}>
                  <PDFLogoText size="md" />
                  <PDFGradientBar size="sm" />
                </View>
              </View>

              {/* Main content area */}
              <View style={styles.mainContent}>
                {slide.subtitle && (
                  <Text style={isDark ? styles.subtitleDark : styles.subtitleLight}>
                    {slide.subtitle}
                  </Text>
                )}
                {slide.title && (
                  <>
                    <Text style={isDark ? styles.titleDark : styles.titleLight}>
                      {slide.title}
                    </Text>
                    <PDFGradientBar size="lg" />
                  </>
                )}
                {slide.content && (
                  <Text style={[
                    isDark ? styles.textDark : styles.textLight,
                    { marginTop: 24 }
                  ]}>
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
              <View style={styles.footer}>
                <Text style={isDark ? styles.footerTextDark : styles.footerTextLight}>
                  iarche.fr
                </Text>
              </View>
              
              {/* Slide number */}
              <Text style={styles.slideNumber}>
                {index + 1}/{slides.length}
              </Text>
            </View>
          </Page>
        );
      })}
    </Document>
  );
};
