import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { IARCHE_COLORS, PDF_FORMATS } from '../pdf';
import { PDFImageLogo, PDFImageBar, PDFPatternBackground, PDFArchesDecoration } from '../pdf/PDFImageAssets';

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
  logoContainer: {
    alignItems: 'center',
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
    fontWeight: 'normal',
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
    fontWeight: 'normal',
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
    fontWeight: 'normal',
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
    fontWeight: 'normal',
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
    fontWeight: 'normal',
  },
  footerTextLight: {
    fontSize: 13,
    color: IARCHE_COLORS.subtle,
    fontFamily: 'Helvetica',
    fontWeight: 'normal',
  },
  baselineDark: {
    fontSize: 11,
    color: IARCHE_COLORS.white,
    opacity: 0.3,
    fontFamily: 'Helvetica',
    fontWeight: 'normal',
  },
  baselineLight: {
    fontSize: 11,
    color: IARCHE_COLORS.subtle,
    opacity: 0.7,
    fontFamily: 'Helvetica',
    fontWeight: 'normal',
  },
});

export const CarouselPDF = ({ slides, format = 'linkedin', startTheme = 'dark' }: CarouselPDFProps) => {
  const dimensions = format === 'linkedin' 
    ? PDF_FORMATS.carouselLinkedIn 
    : PDF_FORMATS.carouselInstagram;
  const { width, height } = dimensions;

  // Theme alternation based on startTheme
  const getSlideTheme = (slideIndex: number): boolean => {
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
            <PDFPatternBackground 
              pageWidth={width} 
              pageHeight={height} 
              opacity={isDark ? 0.06 : 0.08}
              isDark={isDark}
            />
            
            {/* Corner arches decoration with gradient */}
            <PDFArchesDecoration width={width} height={height} isDark={isDark} />
            
            {/* Main content */}
            <View style={styles.content}>
              {/* Header with logo PNG and bar PNG */}
              <View style={styles.header}>
                <View style={styles.logoContainer}>
                  {/* Logo PNG - terracotta on dark slides, gradient on light slides */}
                  <PDFImageLogo 
                    width={120} 
                    variant={isDark ? 'terracotta' : 'gradient'} 
                  />
                  {/* Small bar under logo - sm size (48×2) */}
                  <PDFImageBar size="sm" style={{ marginTop: 6 }} />
                </View>
                {/* Header bar - xl size */}
                <PDFImageBar 
                  size="xl" 
                  width={width - 120} 
                  height={3} 
                  style={{ marginTop: 8 }} 
                />
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
                      {slide.title && slide.title.length > 0 ? (
                        <Text style={isDark ? styles.titleDark : styles.titleLight}>
                          {slide.title}
                        </Text>
                      ) : null}
                      <PDFImageBar size="md" style={{ marginTop: 8 }} />
                    </View>
                  </View>
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    {slide.subtitle && slide.subtitle.length > 0 ? (
                      <Text style={isDark ? styles.subtitleDark : styles.subtitleLight}>
                        {slide.subtitle}
                      </Text>
                    ) : null}
                    {slide.title && slide.title.length > 0 ? (
                      <Text style={isDark ? styles.titleDark : styles.titleLight}>
                        {slide.title}
                      </Text>
                    ) : null}
                    <PDFImageBar size="lg" style={{ marginTop: 12, marginBottom: 16 }} />
                  </View>
                )}
                
                {slide.content && slide.content.length > 0 ? (
                  <Text style={isDark ? styles.textDark : styles.textLight}>
                    {slide.content}
                  </Text>
                ) : null}
                {slide.highlight && slide.highlight.length > 0 ? (
                  <Text style={isDark ? styles.highlightDark : styles.highlightLight}>
                    {slide.highlight}
                  </Text>
                ) : null}
              </View>

              {/* Footer with gradient bar separator */}
              <View>
                {/* Footer bar - xl size */}
                <PDFImageBar 
                  size="xl" 
                  width={width - 120} 
                  height={2} 
                  style={{ marginBottom: 12 }} 
                />
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
