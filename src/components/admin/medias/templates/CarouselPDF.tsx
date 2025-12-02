import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { IARCHE_COLORS, PDF_FORMATS } from '../pdf';
import { PDFImageLogo, PDFPatternBackground } from '../pdf/PDFImageAssets';
import { PDFGradientBar } from '../pdf/PDFGradientBar';
import { PDFCanalisationLines } from '../pdf/PDFCanalisationLines';

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

  const getSlideTheme = (slideIndex: number): boolean => {
    if (startTheme === 'dark') {
      return slideIndex % 2 === 0;
    } else {
      return slideIndex % 2 !== 0;
    }
  };

  return (
    <Document>
      {slides.map((slide, index) => {
        const isDark = getSlideTheme(index);
        const isFirst = index === 0;
        const isLast = index === slides.length - 1;
        const showSectionNumber = !isFirst && !isLast;
        
        // Per-slide export mode (default to 'full' for backward compatibility)
        const exportMode = slide.exportMode || 'full';
        const barSize = slide.barSize || 'md';
        const showBar = exportMode === 'with-bar' || exportMode === 'full';
        const showCanalisations = exportMode === 'full';
        
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
            
            {/* Canalisation lines - only in 'full' mode */}
            {showCanalisations && (
              <PDFCanalisationLines 
                width={width} 
                height={height} 
                isDark={isDark}
                opacity={0.6}
                strokeWidth={7}
              />
            )}
            
            {/* Main content */}
            <View style={styles.content}>
              {/* Header with logo PNG and optional bar PNG */}
              <View style={styles.header}>
                <View style={styles.logoContainer}>
                  <PDFImageLogo 
                    width={120} 
                    variant={isDark ? 'terracotta' : 'gradient'} 
                  />
                  {/* Bar under logo - only if showBar */}
                  {showBar && (
                    <PDFGradientBar size={barSize} style={{ marginTop: 6 }} />
                  )}
                </View>
                {/* Header bar - only if showBar */}
                {showBar && (
                  <PDFGradientBar 
                    size="xl" 
                    width={width - 120} 
                    height={3} 
                    style={{ marginTop: 8 }} 
                  />
                )}
              </View>

              {/* Content area */}
              <View style={styles.mainContent}>
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
                      {showBar && <PDFGradientBar size={barSize} style={{ marginTop: 8 }} />}
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
                    {showBar && <PDFGradientBar size={barSize} style={{ marginTop: 12, marginBottom: 16 }} />}
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

              {/* Footer with optional gradient bar separator */}
              <View>
                {showBar && (
                  <PDFGradientBar 
                    size="xl" 
                    width={width - 120} 
                    height={2} 
                    style={{ marginBottom: 12 }} 
                  />
                )}
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