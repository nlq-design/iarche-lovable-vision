import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { IARCHE_COLORS, PDF_FORMATS } from '../pdf';

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
  // Dark theme
  pageDark: {
    position: 'relative',
    backgroundColor: IARCHE_COLORS.bleuNuit,
    padding: 60,
  },
  // Light theme
  pageLight: {
    position: 'relative',
    backgroundColor: IARCHE_COLORS.blancCasse,
    padding: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 140,
    height: 56,
    objectFit: 'contain',
  },
  barSm: {
    width: 48,
    height: 2,
    marginTop: 12,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  // Dark theme text
  subtitleDark: {
    fontSize: 20,
    color: IARCHE_COLORS.white,
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 4,
    marginBottom: 16,
    fontFamily: 'Helvetica',
  },
  titleDark: {
    fontSize: 48,
    fontWeight: 'bold',
    color: IARCHE_COLORS.white,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 1.2,
    fontFamily: 'Helvetica-Bold',
  },
  textDark: {
    fontSize: 24,
    color: IARCHE_COLORS.white,
    opacity: 0.85,
    textAlign: 'center',
    lineHeight: 1.6,
    fontFamily: 'Helvetica',
  },
  highlightDark: {
    fontSize: 64,
    fontWeight: 'bold',
    color: IARCHE_COLORS.terracotta,
    marginTop: 32,
    fontFamily: 'Helvetica-Bold',
  },
  // Light theme text
  subtitleLight: {
    fontSize: 20,
    color: IARCHE_COLORS.subtle,
    textTransform: 'uppercase',
    letterSpacing: 4,
    marginBottom: 16,
    fontFamily: 'Helvetica',
  },
  titleLight: {
    fontSize: 48,
    fontWeight: 'bold',
    color: IARCHE_COLORS.foreground,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 1.2,
    fontFamily: 'Helvetica-Bold',
  },
  textLight: {
    fontSize: 24,
    color: IARCHE_COLORS.foreground,
    textAlign: 'center',
    lineHeight: 1.6,
    fontFamily: 'Helvetica',
  },
  highlightLight: {
    fontSize: 64,
    fontWeight: 'bold',
    color: IARCHE_COLORS.terracotta,
    marginTop: 32,
    fontFamily: 'Helvetica-Bold',
  },
  barLg: {
    width: 96,
    height: 4,
    marginTop: 16,
    marginBottom: 24,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 60,
    right: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E8E4DD',
    paddingTop: 16,
  },
  footerTextDark: {
    fontSize: 16,
    color: IARCHE_COLORS.white,
    opacity: 0.5,
    fontFamily: 'Helvetica',
  },
  footerTextLight: {
    fontSize: 16,
    color: IARCHE_COLORS.subtle,
    fontFamily: 'Helvetica',
  },
});

// Asset paths in /public/assets/
const ASSETS = {
  logoGradient: '/assets/logo-iarche-gradient.png',
  logoWhite: '/assets/logo-iarche-white.png',
  barSm: '/assets/bar-sm.png',
  barMd: '/assets/bar-md.png',
  barLg: '/assets/bar-lg.png',
  barXl: '/assets/bar-xl.png',
};

export const CarouselPDF = ({ slides, format = 'linkedin' }: CarouselPDFProps) => {
  const dimensions = format === 'linkedin' 
    ? PDF_FORMATS.carouselLinkedIn 
    : PDF_FORMATS.carouselInstagram;

  return (
    <Document>
      {slides.map((slide, index) => {
        const isDark = index % 2 === 0;
        
        return (
          <Page 
            key={slide.id} 
            size={[dimensions.width, dimensions.height]} 
            style={isDark ? styles.pageDark : styles.pageLight}
          >
            {/* Header */}
            <View style={styles.header}>
              <Image 
                src={isDark ? ASSETS.logoWhite : ASSETS.logoGradient} 
                style={styles.logo} 
              />
              <Image src={ASSETS.barSm} style={styles.barSm} />
            </View>

            {/* Content */}
            <View style={styles.content}>
              {slide.subtitle && (
                <Text style={isDark ? styles.subtitleDark : styles.subtitleLight}>
                  {slide.subtitle}
                </Text>
              )}
              {slide.title && (
                <Text style={isDark ? styles.titleDark : styles.titleLight}>
                  {slide.title}
                </Text>
              )}
              <Image src={ASSETS.barLg} style={styles.barLg} />
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
              <Text style={isDark ? styles.footerTextDark : styles.footerTextLight}>
                {index + 1}/{slides.length}
              </Text>
            </View>
          </Page>
        );
      })}
    </Document>
  );
};
