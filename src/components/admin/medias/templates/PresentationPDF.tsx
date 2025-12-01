import { Document, Page, View, Text, StyleSheet, Svg, Path } from '@react-pdf/renderer';
import { IARCHE_COLORS, PDF_FORMATS } from '../pdf';
import { PDFImageLogo, PDFImageBar, PDFPatternBackground } from '../pdf/PDFImageAssets';

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
  startTheme?: 'dark' | 'light';
}

const { width: PAGE_WIDTH, height: PAGE_HEIGHT } = PDF_FORMATS.presentation;

const styles = StyleSheet.create({
  pageDark: {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    backgroundColor: IARCHE_COLORS.bleuNuit,
    position: 'relative',
  },
  pageLight: {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    backgroundColor: IARCHE_COLORS.blancCasse,
    position: 'relative',
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
    padding: 80,
    position: 'relative',
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 50,
  },
  logoContainer: {
    alignItems: 'flex-start',
  },
  slideNumber: {
    fontSize: 24,
    color: IARCHE_COLORS.terracotta,
    fontWeight: 700,
    fontFamily: 'Manrope',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
  },
  mainContentCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Section row with number
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  sectionNumber: {
    fontSize: 96,
    fontWeight: 700,
    opacity: 0.15,
    marginRight: 30,
    fontFamily: 'Manrope',
  },
  sectionNumberDark: {
    color: IARCHE_COLORS.white,
  },
  sectionNumberLight: {
    color: IARCHE_COLORS.terracotta,
  },
  // Dark theme text
  titleDark: {
    fontSize: 56,
    fontWeight: 700,
    color: IARCHE_COLORS.white,
    marginBottom: 16,
    lineHeight: 1.2,
    fontFamily: 'Manrope',
  },
  subtitleDark: {
    fontSize: 20,
    color: IARCHE_COLORS.white,
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 4,
    marginBottom: 16,
    fontFamily: 'Manrope',
    fontWeight: 400,
  },
  textDark: {
    fontSize: 24,
    color: IARCHE_COLORS.white,
    opacity: 0.85,
    lineHeight: 1.6,
    fontFamily: 'Manrope',
    fontWeight: 400,
  },
  // Light theme text
  titleLight: {
    fontSize: 56,
    fontWeight: 700,
    color: IARCHE_COLORS.foreground,
    marginBottom: 16,
    lineHeight: 1.2,
    fontFamily: 'Manrope',
  },
  subtitleLight: {
    fontSize: 20,
    color: IARCHE_COLORS.subtle,
    textTransform: 'uppercase',
    letterSpacing: 4,
    marginBottom: 16,
    fontFamily: 'Manrope',
    fontWeight: 400,
  },
  textLight: {
    fontSize: 24,
    color: IARCHE_COLORS.foreground,
    opacity: 0.9,
    lineHeight: 1.6,
    fontFamily: 'Manrope',
    fontWeight: 400,
  },
  // Bullet list styles
  bulletsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 30,
  },
  bulletItem: {
    width: '48%',
    marginBottom: 24,
    paddingRight: 20,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bulletDash: {
    fontSize: 20,
    color: IARCHE_COLORS.terracotta,
    marginRight: 12,
    fontFamily: 'Manrope',
    fontWeight: 700,
  },
  bulletText: {
    fontSize: 20,
    lineHeight: 1.5,
    flex: 1,
    fontFamily: 'Manrope',
    fontWeight: 400,
  },
  bulletTextDark: {
    color: IARCHE_COLORS.white,
    opacity: 0.9,
  },
  bulletTextLight: {
    color: IARCHE_COLORS.foreground,
  },
  // CTA styles
  ctaText: {
    fontSize: 72,
    fontWeight: 700,
    color: IARCHE_COLORS.terracotta,
    textAlign: 'center',
    fontFamily: 'Manrope',
  },
  ctaSubtext: {
    fontSize: 24,
    textAlign: 'center',
    marginTop: 20,
    fontFamily: 'Manrope',
    fontWeight: 400,
  },
  ctaSubtextDark: {
    color: IARCHE_COLORS.white,
    opacity: 0.7,
  },
  ctaSubtextLight: {
    color: IARCHE_COLORS.subtle,
  },
  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
  },
  footerTextDark: {
    fontSize: 16,
    color: IARCHE_COLORS.white,
    opacity: 0.4,
    fontFamily: 'Manrope',
    fontWeight: 400,
  },
  footerTextLight: {
    fontSize: 16,
    color: IARCHE_COLORS.subtle,
    fontFamily: 'Manrope',
    fontWeight: 400,
  },
});

// Corner arches decoration
const ArchesDecoration = ({ isDark }: { isDark: boolean }) => {
  const strokeColor = isDark ? IARCHE_COLORS.white : IARCHE_COLORS.terracotta;
  const opacity = isDark ? 0.18 : 0.3;
  const cornerSize = 120;
  
  return (
    <Svg style={styles.backgroundLayer} viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`}>
      {/* Top-right corner */}
      <Path 
        d={`M${PAGE_WIDTH},0 L${PAGE_WIDTH},${cornerSize}`}
        fill="none" 
        stroke={strokeColor} 
        strokeWidth={3} 
        opacity={opacity}
      />
      <Path 
        d={`M${PAGE_WIDTH - cornerSize},0 L${PAGE_WIDTH},0`}
        fill="none" 
        stroke={strokeColor} 
        strokeWidth={3} 
        opacity={opacity}
      />
      {/* Bottom-left corner */}
      <Path 
        d={`M0,${PAGE_HEIGHT} L0,${PAGE_HEIGHT - cornerSize}`}
        fill="none" 
        stroke={strokeColor} 
        strokeWidth={3} 
        opacity={opacity}
      />
      <Path 
        d={`M${cornerSize},${PAGE_HEIGHT} L0,${PAGE_HEIGHT}`}
        fill="none" 
        stroke={strokeColor} 
        strokeWidth={3} 
        opacity={opacity}
      />
      {/* Secondary arches */}
      <Path 
        d={`M${PAGE_WIDTH},20 L${PAGE_WIDTH},${cornerSize - 30}`}
        fill="none" 
        stroke={strokeColor} 
        strokeWidth={2} 
        opacity={opacity * 0.5}
      />
      <Path 
        d={`M${PAGE_WIDTH - cornerSize + 30},20 L${PAGE_WIDTH - 20},20`}
        fill="none" 
        stroke={strokeColor} 
        strokeWidth={2} 
        opacity={opacity * 0.5}
      />
    </Svg>
  );
};

export const PresentationPDF = ({ slides, startTheme = 'dark' }: PresentationPDFProps) => {
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
        const isCentered = slide.type === 'title' || slide.type === 'cta';
        const showSectionNumber = slide.type === 'content' || slide.type === 'bullets';
        
        return (
          <Page 
            key={slide.id} 
            size={[PAGE_WIDTH, PAGE_HEIGHT]} 
            style={isDark ? styles.pageDark : styles.pageLight}
          >
            {/* Background elements */}
            <PDFPatternBackground 
              pageWidth={PAGE_WIDTH} 
              pageHeight={PAGE_HEIGHT} 
              opacity={isDark ? 0.05 : 0.07}
              isDark={isDark}
            />
            <ArchesDecoration isDark={isDark} />

            {/* Main content */}
            <View style={styles.content}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.logoContainer}>
                  {/* Logo PNG - white for dark, gradient for light */}
                  <PDFImageLogo 
                    width={140} 
                    variant={isDark ? 'white' : 'gradient'} 
                  />
                  {/* Small bar under logo - sm size */}
                  <PDFImageBar size="sm" style={{ marginTop: 6 }} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {/* Header bar - lg size */}
                  <PDFImageBar size="lg" width={300} height={3} style={{ marginRight: 20 }} />
                  <Text style={styles.slideNumber}>
                    {String(index + 1).padStart(2, '0')}
                  </Text>
                </View>
              </View>

              {/* Content area */}
              <View style={isCentered ? styles.mainContentCentered : styles.mainContent}>
                {/* Section number for content slides */}
                {showSectionNumber ? (
                  <View style={styles.sectionRow}>
                    <Text style={[styles.sectionNumber, isDark ? styles.sectionNumberDark : styles.sectionNumberLight]}>
                      {String(index).padStart(2, '0')}
                    </Text>
                    <View>
                      {slide.title && slide.title.length > 0 ? (
                        <Text style={isDark ? styles.titleDark : styles.titleLight}>
                          {slide.title}
                        </Text>
                      ) : null}
                      <PDFImageBar size="lg" style={{ marginTop: 12 }} />
                    </View>
                  </View>
                ) : null}
                
                {/* Title slide content */}
                {slide.type === 'title' ? (
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
                    <PDFImageBar size="xl" style={{ marginTop: 16 }} />
                    {slide.content && slide.content.length > 0 ? (
                      <Text style={[isDark ? styles.textDark : styles.textLight, { marginTop: 24, textAlign: 'center' }]}>
                        {slide.content}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
                
                {/* Content text */}
                {slide.type === 'content' && slide.content && slide.content.length > 0 ? (
                  <Text style={[isDark ? styles.textDark : styles.textLight, { marginTop: 20 }]}>
                    {slide.content}
                  </Text>
                ) : null}
                
                {/* Bullets list in 2-column grid */}
                {slide.type === 'bullets' && slide.bullets && slide.bullets.length > 0 ? (
                  <View style={styles.bulletsContainer}>
                    {slide.bullets.map((bullet, idx) => (
                      <View key={idx} style={styles.bulletItem}>
                        <View style={styles.bulletRow}>
                          <Text style={styles.bulletDash}>—</Text>
                          <Text style={[styles.bulletText, isDark ? styles.bulletTextDark : styles.bulletTextLight]}>
                            {bullet}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}
                
                {/* CTA slide */}
                {slide.type === 'cta' ? (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.ctaText}>{slide.title || 'Contact'}</Text>
                    <PDFImageBar size="xl" style={{ marginTop: 20, marginBottom: 20 }} />
                    {slide.content && slide.content.length > 0 ? (
                      <Text style={[styles.ctaSubtext, isDark ? styles.ctaSubtextDark : styles.ctaSubtextLight]}>
                        {slide.content}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>

              {/* Footer */}
              <View>
                {/* Footer bar - xl size */}
                <PDFImageBar size="xl" width={PAGE_WIDTH - 160} height={2} style={{ marginBottom: 16 }} />
                <View style={styles.footer}>
                  <Text style={isDark ? styles.footerTextDark : styles.footerTextLight}>
                    IArche · L'IA se construit avec vous
                  </Text>
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
