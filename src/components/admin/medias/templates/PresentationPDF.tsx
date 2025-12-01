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

const styles = StyleSheet.create({
  // Dark page (title, cta)
  pageDark: {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    backgroundColor: IARCHE_COLORS.bleuNuit,
    position: 'relative',
  },
  // Light page (content, bullets)
  pageLight: {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    backgroundColor: IARCHE_COLORS.blancCasse,
    position: 'relative',
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
    borderBottomColor: IARCHE_COLORS.border,
    paddingBottom: 30,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontFamily: 'Manrope',
    fontWeight: 500,
  },
  subtitleDark: {
    color: IARCHE_COLORS.white,
    opacity: 0.6,
  },
  subtitleLight: {
    color: IARCHE_COLORS.muted,
  },
  title: {
    fontSize: 72,
    fontWeight: 'bold',
    marginBottom: 40,
    lineHeight: 1.15,
    fontFamily: 'Manrope',
  },
  titleDark: {
    color: IARCHE_COLORS.white,
  },
  titleLight: {
    color: IARCHE_COLORS.foreground,
  },
  titleContainer: {
    alignItems: 'flex-start',
  },
  titleContainerCentered: {
    alignItems: 'center',
  },
  text: {
    fontSize: 36,
    lineHeight: 1.6,
    maxWidth: 1400,
    fontFamily: 'Manrope',
    marginTop: 24,
  },
  textDark: {
    color: IARCHE_COLORS.white,
    opacity: 0.85,
  },
  textLight: {
    color: IARCHE_COLORS.muted,
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
    color: IARCHE_COLORS.terracotta,
    marginRight: 24,
    marginTop: -6,
  },
  bulletText: {
    fontSize: 36,
    lineHeight: 1.4,
    flex: 1,
    fontFamily: 'Manrope',
  },
  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
  },
  footerText: {
    fontSize: 20,
    letterSpacing: 2,
    fontFamily: 'Manrope',
  },
  footerTextDark: {
    color: IARCHE_COLORS.white,
    opacity: 0.4,
  },
  footerTextLight: {
    color: IARCHE_COLORS.subtle,
    opacity: 0.6,
  },
  slideNumber: {
    ...TYPOGRAPHY.caption,
    fontSize: 18,
  },
});

export const PresentationPDF = ({ slides }: PresentationPDFProps) => {
  return (
    <Document>
      {slides.map((slide, index) => {
        const isDark = slide.type === 'title' || slide.type === 'cta';
        const pageStyle = isDark ? styles.pageDark : styles.pageLight;

        return (
          <Page key={slide.id} size={[PAGE_WIDTH, PAGE_HEIGHT]} style={pageStyle}>
            {/* Mesh background pattern */}
            <PDFMeshBackground 
              pageWidth={PAGE_WIDTH} 
              pageHeight={PAGE_HEIGHT}
              opacity={isDark ? 0.02 : 0.03}
            />
            
            {/* Decorative arch lines */}
            <PDFArches 
              position="both"
              pageWidth={PAGE_WIDTH}
              pageHeight={PAGE_HEIGHT}
              opacity={0.3}
            />

            {/* Content */}
            <View style={styles.content}>
              {/* Header */}
              <View style={[styles.header, isDark ? styles.headerDark : styles.headerLight]}>
                <View style={styles.logoContainer}>
                  <PDFLogoText size="md" />
                </View>
                <PDFGradientBar size="xl" />
              </View>

              {/* Main content */}
              <View style={isDark ? styles.mainContentCentered : styles.mainContent}>
                {slide.subtitle && (
                  <Text style={[styles.subtitle, isDark ? styles.subtitleDark : styles.subtitleLight]}>
                    {slide.subtitle}
                  </Text>
                )}
                
                <View style={isDark ? styles.titleContainerCentered : styles.titleContainer}>
                  <Text style={[styles.title, isDark ? styles.titleDark : styles.titleLight]}>
                    {slide.title}
                  </Text>
                  <PDFGradientBar size="lg" />
                </View>

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
                <Text style={[styles.slideNumber, isDark ? styles.footerTextDark : styles.footerTextLight]}>
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
