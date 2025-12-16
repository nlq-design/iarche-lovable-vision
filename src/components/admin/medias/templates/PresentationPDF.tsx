import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { IARCHE_COLORS, PDF_FORMATS } from '../pdf';
import { PDFImageLogo } from '../pdf/PDFImageAssets';
import { PDFLogoArc } from '../pdf/PDFLogoArc';

export type ExportMode = 'simple' | 'with-bar' | 'full';
export type BarSize = 'sm' | 'md' | 'lg' | 'xl';
export type ThemeType = 'dark' | 'light' | 'terra' | 'contrast';

interface SlideData {
  id: number;
  type: 'title' | 'content' | 'bullets' | 'cta';
  title: string;
  subtitle: string;
  content: string;
  bullets: string[];
  exportMode?: ExportMode;
  barSize?: BarSize;
}

interface PresentationPDFProps {
  slides: SlideData[];
  startTheme?: ThemeType;
}

// Theme configurations
const THEME_COLORS = {
  dark: {
    background: IARCHE_COLORS.bleuNuit,
    text: IARCHE_COLORS.white,
    subtext: 'rgba(255, 255, 255, 0.8)',
    accent: IARCHE_COLORS.terracotta,
    logoVariant: 'terracotta' as const,
    sectionNumberColor: IARCHE_COLORS.white,
    footerOpacity: 0.4,
  },
  light: {
    background: IARCHE_COLORS.blancCasse,
    text: IARCHE_COLORS.bleuNuit,
    subtext: IARCHE_COLORS.subtle,
    accent: IARCHE_COLORS.terracotta,
    logoVariant: 'gradient' as const,
    sectionNumberColor: IARCHE_COLORS.terracotta,
    footerOpacity: 1,
  },
  terra: {
    background: '#8B3A2F',
    text: IARCHE_COLORS.blancCasse,
    subtext: 'rgba(250, 249, 247, 0.8)',
    accent: IARCHE_COLORS.bleuNuit,
    logoVariant: 'white' as const,
    sectionNumberColor: IARCHE_COLORS.blancCasse,
    footerOpacity: 0.5,
  },
  contrast: {
    background: '#0A0A0A',
    text: '#FAFAFA',
    subtext: 'rgba(250, 250, 250, 0.8)',
    accent: IARCHE_COLORS.terracotta,
    logoVariant: 'white' as const,
    sectionNumberColor: '#FAFAFA',
    footerOpacity: 0.5,
  },
};

// Theme alternation pairs
const THEME_ALTERNATES: Record<ThemeType, ThemeType> = {
  dark: 'light',
  light: 'dark',
  terra: 'dark',
  contrast: 'light',
};

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
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
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
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  sectionNumber: {
    fontSize: 96,
    fontWeight: 'bold',
    opacity: 0.15,
    marginRight: 30,
    fontFamily: 'Helvetica-Bold',
  },
  sectionNumberDark: {
    color: IARCHE_COLORS.white,
  },
  sectionNumberLight: {
    color: IARCHE_COLORS.terracotta,
  },
  titleDark: {
    fontSize: 56,
    fontWeight: 'bold',
    color: IARCHE_COLORS.white,
    marginBottom: 16,
    lineHeight: 1.2,
    fontFamily: 'Helvetica-Bold',
  },
  subtitleDark: {
    fontSize: 20,
    color: IARCHE_COLORS.white,
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 4,
    marginBottom: 16,
    fontFamily: 'Helvetica',
    fontWeight: 'normal',
  },
  textDark: {
    fontSize: 24,
    color: IARCHE_COLORS.white,
    opacity: 0.85,
    lineHeight: 1.6,
    fontFamily: 'Helvetica',
    fontWeight: 'normal',
  },
  titleLight: {
    fontSize: 56,
    fontWeight: 'bold',
    color: IARCHE_COLORS.foreground,
    marginBottom: 16,
    lineHeight: 1.2,
    fontFamily: 'Helvetica-Bold',
  },
  subtitleLight: {
    fontSize: 20,
    color: IARCHE_COLORS.subtle,
    textTransform: 'uppercase',
    letterSpacing: 4,
    marginBottom: 16,
    fontFamily: 'Helvetica',
    fontWeight: 'normal',
  },
  textLight: {
    fontSize: 24,
    color: IARCHE_COLORS.foreground,
    opacity: 0.9,
    lineHeight: 1.6,
    fontFamily: 'Helvetica',
    fontWeight: 'normal',
  },
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
    fontFamily: 'Helvetica-Bold',
    fontWeight: 'bold',
  },
  bulletText: {
    fontSize: 20,
    lineHeight: 1.5,
    flex: 1,
    fontFamily: 'Helvetica',
    fontWeight: 'normal',
  },
  bulletTextDark: {
    color: IARCHE_COLORS.white,
    opacity: 0.9,
  },
  bulletTextLight: {
    color: IARCHE_COLORS.foreground,
  },
  ctaText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: IARCHE_COLORS.terracotta,
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
  },
  ctaSubtext: {
    fontSize: 24,
    textAlign: 'center',
    marginTop: 20,
    fontFamily: 'Helvetica',
    fontWeight: 'normal',
  },
  ctaSubtextDark: {
    color: IARCHE_COLORS.white,
    opacity: 0.7,
  },
  ctaSubtextLight: {
    color: IARCHE_COLORS.subtle,
  },
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
    fontFamily: 'Helvetica',
    fontWeight: 'normal',
  },
  footerTextLight: {
    fontSize: 16,
    color: IARCHE_COLORS.subtle,
    fontFamily: 'Helvetica',
    fontWeight: 'normal',
  },
});

export const PresentationPDF = ({ slides, startTheme = 'dark' }: PresentationPDFProps) => {
  const getSlideTheme = (slideIndex: number): ThemeType => {
    if (slideIndex % 2 === 0) return startTheme;
    return THEME_ALTERNATES[startTheme];
  };

  return (
    <Document>
      {slides.map((slide, index) => {
        const currentTheme = getSlideTheme(index);
        const colors = THEME_COLORS[currentTheme];
        const isDark = currentTheme !== 'light'; // For backward compatibility with existing styles
        const isCentered = slide.type === 'title' || slide.type === 'cta';
        const showSectionNumber = slide.type === 'content' || slide.type === 'bullets';
        
        // Per-slide export mode (default to 'full' for backward compatibility)
        const exportMode = slide.exportMode || 'full';
        const barSize = slide.barSize || 'lg';
        const showBar = exportMode === 'with-bar' || exportMode === 'full';
        
        return (
          <Page 
            key={slide.id} 
            size={[PAGE_WIDTH, PAGE_HEIGHT]} 
            style={{ 
              width: PAGE_WIDTH, 
              height: PAGE_HEIGHT, 
              backgroundColor: colors.background, 
              position: 'relative' 
            }}
          >

            {/* Main content */}
            <View style={styles.content}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.logoContainer}>
                  <PDFImageLogo 
                    width={140} 
                    variant={colors.logoVariant} 
                  />
                  {/* v4.0: pas d'arc sous le logo */}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.slideNumber}>
                    {String(index + 1).padStart(2, '0')}
                  </Text>
                </View>
              </View>

              {/* Content area */}
              <View style={isCentered ? styles.mainContentCentered : styles.mainContent}>
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
                      {showBar && <PDFLogoArc size={barSize} style={{ marginTop: 12 }} />}
                    </View>
                  </View>
                ) : null}
                
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
                    {showBar && <PDFLogoArc size="xl" style={{ marginTop: 16 }} />}
                    {slide.content && slide.content.length > 0 ? (
                      <Text style={[isDark ? styles.textDark : styles.textLight, { marginTop: 24, textAlign: 'center' }]}>
                        {slide.content}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
                
                {slide.type === 'content' && slide.content && slide.content.length > 0 ? (
                  <Text style={[isDark ? styles.textDark : styles.textLight, { marginTop: 20 }]}>
                    {slide.content}
                  </Text>
                ) : null}
                
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
                
                {slide.type === 'cta' ? (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.ctaText}>{slide.title || 'Contact'}</Text>
                    {showBar && <PDFLogoArc size="xl" style={{ marginTop: 20, marginBottom: 20 }} />}
                    {slide.content && slide.content.length > 0 ? (
                      <Text style={[styles.ctaSubtext, isDark ? styles.ctaSubtextDark : styles.ctaSubtextLight]}>
                        {slide.content}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>

              {/* Footer - v4.0: pas d'arc décoratif dans le footer */}
              <View>
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