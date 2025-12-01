import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { IARCHE_COLORS, PDF_FORMATS } from '../pdf';

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

// Asset paths in /public/assets/
const ASSETS = {
  logoGradient: '/assets/logo-iarche-gradient.png',
  logoWhite: '/assets/logo-iarche-white.png',
  barSm: '/assets/bar-sm.png',
  barMd: '/assets/bar-md.png',
  barLg: '/assets/bar-lg.png',
  barXl: '/assets/bar-xl.png',
};

const styles = StyleSheet.create({
  // Dark page (title, cta)
  pageDark: {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    backgroundColor: IARCHE_COLORS.bleuNuit,
    position: 'relative',
    padding: 100,
  },
  // Light page (content, bullets)
  pageLight: {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    backgroundColor: IARCHE_COLORS.blancCasse,
    position: 'relative',
    padding: 100,
  },
  // Header bar
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 60,
    borderBottomWidth: 1,
    paddingBottom: 30,
  },
  headerDark: {
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerLight: {
    borderBottomColor: IARCHE_COLORS.border,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 180,
    height: 72,
    objectFit: 'contain',
  },
  barXl: {
    width: 128,
    height: 6,
  },
  barLg: {
    width: 96,
    height: 4,
    marginTop: 16,
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
    color: IARCHE_COLORS.white,
    opacity: 0.6,
  },
  subtitleLight: {
    color: IARCHE_COLORS.muted,
  },
  title: {
    fontSize: 72,
    fontWeight: 'bold',
    marginBottom: 20,
    lineHeight: 1.15,
    fontFamily: 'Helvetica-Bold',
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
    fontFamily: 'Helvetica',
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
    fontFamily: 'Helvetica',
  },
  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E8E4DD',
  },
  footerText: {
    fontSize: 20,
    letterSpacing: 2,
    fontFamily: 'Helvetica',
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
    fontSize: 18,
    fontFamily: 'Helvetica',
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
            {/* Header with PNG logo */}
            <View style={[styles.header, isDark ? styles.headerDark : styles.headerLight]}>
              <View style={styles.logoContainer}>
                <Image 
                  src={isDark ? ASSETS.logoWhite : ASSETS.logoGradient} 
                  style={styles.logo} 
                />
              </View>
              <Image src={ASSETS.barXl} style={styles.barXl} />
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
                <Image src={ASSETS.barLg} style={styles.barLg} />
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
                IArche · L'IA se construit avec vous
              </Text>
              <Text style={[styles.slideNumber, isDark ? styles.footerTextDark : styles.footerTextLight]}>
                {index + 1}/{slides.length}
              </Text>
            </View>
          </Page>
        );
      })}
    </Document>
  );
};
