import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

interface SlideData {
  id: number;
  title: string;
  subtitle: string;
  content: string;
  highlight?: string;
}

interface CarouselPDFProps {
  slides: SlideData[];
}

// IArche brand colors
const colors = {
  nightBlue: '#233554',
  nightBlueDark: '#1a2840',
  terracotta: '#c96442',
  offWhite: '#f8f7f4',
  white: '#ffffff',
};

const styles = StyleSheet.create({
  page: {
    width: 1080,
    height: 1350,
    backgroundColor: colors.nightBlue,
    padding: 60,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.terracotta,
  },
  decorativeLine: {
    width: 80,
    height: 4,
    backgroundColor: colors.terracotta,
    marginTop: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  subtitle: {
    fontSize: 18,
    color: colors.white,
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginBottom: 16,
  },
  title: {
    fontSize: 56,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 1.2,
  },
  text: {
    fontSize: 24,
    color: colors.white,
    opacity: 0.85,
    textAlign: 'center',
    lineHeight: 1.6,
    maxWidth: 800,
  },
  highlight: {
    fontSize: 72,
    fontWeight: 'bold',
    color: colors.terracotta,
    marginTop: 32,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: colors.white,
    opacity: 0.4,
  },
});

export const CarouselPDF = ({ slides }: CarouselPDFProps) => {
  return (
    <Document>
      {slides.map((slide, index) => (
        <Page key={slide.id} size={[1080, 1350]} style={styles.page}>
          {/* Header with logo */}
          <View style={styles.header}>
            <Text style={styles.logo}>IArche</Text>
            <View style={styles.decorativeLine} />
          </View>

          {/* Main content */}
          <View style={styles.content}>
            {slide.subtitle && (
              <Text style={styles.subtitle}>{slide.subtitle}</Text>
            )}
            {slide.title && (
              <Text style={styles.title}>{slide.title}</Text>
            )}
            {slide.content && (
              <Text style={styles.text}>{slide.content}</Text>
            )}
            {slide.highlight && (
              <Text style={styles.highlight}>{slide.highlight}</Text>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>iarche.fr</Text>
          </View>
        </Page>
      ))}
    </Document>
  );
};
