import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

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

const colors = {
  nightBlue: '#233554',
  nightBlueDark: '#1a2840',
  terracotta: '#c96442',
  offWhite: '#f8f7f4',
  white: '#ffffff',
  textDark: '#374151',
  textMuted: '#6b7280',
};

const styles = StyleSheet.create({
  pageDark: {
    width: 1920,
    height: 1080,
    backgroundColor: colors.nightBlue,
    padding: 80,
    display: 'flex',
    flexDirection: 'column',
  },
  pageLight: {
    width: 1920,
    height: 1080,
    backgroundColor: colors.offWhite,
    padding: 80,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.terracotta,
  },
  decorativeLine: {
    width: 120,
    height: 4,
    backgroundColor: colors.terracotta,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  contentCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 24,
    textTransform: 'uppercase',
    letterSpacing: 4,
    marginBottom: 16,
  },
  subtitleDark: {
    color: colors.white,
    opacity: 0.6,
  },
  subtitleLight: {
    color: colors.textMuted,
  },
  title: {
    fontSize: 72,
    fontWeight: 'bold',
    marginBottom: 32,
    lineHeight: 1.2,
  },
  titleDark: {
    color: colors.white,
  },
  titleLight: {
    color: colors.textDark,
  },
  text: {
    fontSize: 32,
    lineHeight: 1.6,
    maxWidth: 1400,
  },
  textDark: {
    color: colors.white,
    opacity: 0.85,
  },
  textLight: {
    color: colors.textMuted,
  },
  bulletList: {
    marginTop: 32,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  bulletDot: {
    fontSize: 32,
    color: colors.terracotta,
    marginRight: 20,
    marginTop: -4,
  },
  bulletText: {
    fontSize: 32,
    lineHeight: 1.4,
    flex: 1,
  },
  footer: {
    alignItems: 'flex-end',
  },
  footerText: {
    fontSize: 18,
    color: colors.textMuted,
    opacity: 0.6,
  },
});

export const PresentationPDF = ({ slides }: PresentationPDFProps) => {
  return (
    <Document>
      {slides.map((slide) => {
        const isDark = slide.type === 'title' || slide.type === 'cta';
        const pageStyle = isDark ? styles.pageDark : styles.pageLight;
        const contentStyle = isDark ? styles.contentCentered : styles.content;

        return (
          <Page key={slide.id} size={[1920, 1080]} style={pageStyle}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.logo}>IArche</Text>
              <View style={styles.decorativeLine} />
            </View>

            {/* Content */}
            <View style={contentStyle}>
              {slide.subtitle && (
                <Text style={[styles.subtitle, isDark ? styles.subtitleDark : styles.subtitleLight]}>
                  {slide.subtitle}
                </Text>
              )}
              
              <Text style={[styles.title, isDark ? styles.titleDark : styles.titleLight]}>
                {slide.title}
              </Text>

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
              <Text style={[styles.footerText, { color: isDark ? colors.white : colors.textMuted }]}>
                iarche.fr
              </Text>
            </View>
          </Page>
        );
      })}
    </Document>
  );
};
