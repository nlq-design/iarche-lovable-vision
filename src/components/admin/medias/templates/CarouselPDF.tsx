import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { 
  PDFImageLogo,
  PDFImageBarSized,
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
    marginBottom: 12,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 60,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  // Dark theme text styles
  subtitleDark: {
    fontSize: 22,
    color: IARCHE_COLORS.white,
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 4,
    marginBottom: 20,
    fontFamily: 'Helvetica',
  },
  titleDark: {
    fontSize: 64,
    fontWeight: 'bold',
    color: IARCHE_COLORS.white,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 1.15,
    fontFamily: 'Helvetica-Bold',
  },
  textDark: {
    fontSize: 28,
    color: IARCHE_COLORS.white,
    opacity: 0.85,
    textAlign: 'center',
    lineHeight: 1.6,
    maxWidth: 900,
    fontFamily: 'Helvetica',
  },
  highlightDark: {
    fontSize: 80,
    fontWeight: 'bold',
    color: IARCHE_COLORS.terracotta,
    marginTop: 40,
    fontFamily: 'Helvetica-Bold',
  },
  // Light theme text styles
  subtitleLight: {
    fontSize: 22,
    color: IARCHE_COLORS.subtle,
    textTransform: 'uppercase',
    letterSpacing: 4,
    marginBottom: 20,
    fontFamily: 'Helvetica',
  },
  titleLight: {
    fontSize: 64,
    fontWeight: 'bold',
    color: IARCHE_COLORS.foreground,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 1.15,
    fontFamily: 'Helvetica-Bold',
  },
  textLight: {
    fontSize: 28,
    color: IARCHE_COLORS.foreground,
    textAlign: 'center',
    lineHeight: 1.6,
    maxWidth: 900,
    fontFamily: 'Helvetica',
  },
  highlightLight: {
    fontSize: 80,
    fontWeight: 'bold',
    color: IARCHE_COLORS.terracotta,
    marginTop: 40,
    fontFamily: 'Helvetica-Bold',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 20,
  },
  footerTextDark: {
    fontSize: 18,
    color: IARCHE_COLORS.white,
    opacity: 0.4,
    letterSpacing: 2,
    fontFamily: 'Helvetica',
  },
  footerTextLight: {
    fontSize: 18,
    color: IARCHE_COLORS.subtle,
    letterSpacing: 2,
    fontFamily: 'Helvetica',
  },
  slideNumber: {
    fontSize: 14,
    color: IARCHE_COLORS.subtle,
    position: 'absolute',
    bottom: 40,
    right: 60,
    fontFamily: 'Helvetica',
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
              {/* Header with PNG logo */}
              <View style={styles.header}>
                <View style={styles.logoContainer}>
                  <PDFImageLogo width={180} />
                </View>
                <PDFImageBarSized size="sm" />
              </View>

              {/* Main content area */}
              <View style={styles.mainContent}>
                {slide.subtitle && (
                  <Text style={isDark ? styles.subtitleDark : styles.subtitleLight}>
                    {slide.subtitle}
                  </Text>
                )}
                {slide.title && (
                  <View style={styles.titleContainer}>
                    <Text style={isDark ? styles.titleDark : styles.titleLight}>
                      {slide.title}
                    </Text>
                    <PDFImageBarSized size="lg" />
                  </View>
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
