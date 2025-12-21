import { Document, Page, Text, View, StyleSheet, pdf, Image, Svg, Path, Circle, PDFViewer, Defs, LinearGradient, Stop, G } from '@react-pdf/renderer';
import { Brochure, PDFOrientation } from '@/types/brochure';
import { COLORS, FONTS, THEMES } from '@/components/admin/medias/shared/tokens';
import { BASE64_ASSETS } from '@/components/admin/medias/pdf/base64Assets';
import { Button } from '@/components/ui/button';
import { Download, X, FileText, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

// A4 dimensions in points (72 points = 1 inch)
const A4_PORTRAIT = { width: 595.28, height: 841.89 };
const A4_LANDSCAPE = { width: 841.89, height: 595.28 };

// Types de thèmes PDF
type PDFTheme = 'blanc-casse' | 'bleu-nuit' | 'terra' | 'gradient';

// Configuration des thèmes pour PDF
const PDF_THEMES = {
  'blanc-casse': {
    name: 'Blanc Cassé',
    background: COLORS.blancCasse,
    text: COLORS.bleuNuit,
    subtext: COLORS.muted,
    accent: COLORS.terracotta,
    cardBg: COLORS.white,
    sectionBg: COLORS.secondary,
    isDark: false,
  },
  'bleu-nuit': {
    name: 'Bleu Nuit',
    background: COLORS.bleuNuit,
    text: COLORS.white,
    subtext: COLORS.whiteAlpha80,
    accent: COLORS.terracotta,
    cardBg: 'rgba(255,255,255,0.1)',
    sectionBg: 'rgba(0,0,0,0.2)',
    isDark: true,
  },
  'terra': {
    name: 'Terracotta',
    background: COLORS.terracotta,
    text: COLORS.blancCasse,
    subtext: COLORS.blancCasse,
    accent: COLORS.bleuNuit,
    cardBg: 'rgba(255,255,255,0.15)',
    sectionBg: 'rgba(0,0,0,0.15)',
    isDark: true,
  },
  'gradient': {
    name: 'Gradient IArche',
    background: COLORS.bleuNuit, // Base, gradient applied separately
    text: COLORS.white,
    subtext: COLORS.whiteAlpha80,
    accent: COLORS.terracotta,
    cardBg: 'rgba(255,255,255,0.1)',
    sectionBg: 'rgba(0,0,0,0.2)',
    isDark: true,
    isGradient: true,
  },
};

// ============================================
// DECORATIVE ARC COMPONENT - MODE CONTINUITÉ
// Arc déborde du cadre pour créer un effet de profondeur
// ============================================
interface PDFDecorativeArcProps {
  pageWidth: number;
  pageHeight: number;
  position?: 'top-right' | 'bottom-left' | 'bottom-right';
  opacity?: number;
  strokeWidth?: number;
  extended?: boolean; // Mode continuité
}

const PDFDecorativeArc = ({ 
  pageWidth, 
  pageHeight, 
  position = 'bottom-right',
  opacity = 0.06,
  strokeWidth = 2,
  extended = true, // Par défaut en mode continuité
}: PDFDecorativeArcProps) => {
  // Taille de l'arc (plus grand en mode continuité)
  const baseSize = Math.min(pageWidth, pageHeight) * 0.25;
  const arcSize = extended ? baseSize * 1.8 : baseSize;
  
  // Offset négatif pour déborder du cadre
  const overflow = extended ? arcSize * 0.4 : 0;

  const getPositionStyles = () => {
    switch (position) {
      case 'top-right':
        return { 
          top: -overflow, 
          right: -overflow,
        };
      case 'bottom-left':
        return { 
          bottom: -overflow, 
          left: -overflow,
        };
      case 'bottom-right':
      default:
        return { 
          bottom: -overflow, 
          right: -overflow,
        };
    }
  };

  const posStyles = getPositionStyles();

  // Path de l'arc selon la position
  const getArcPath = () => {
    const s = arcSize;
    switch (position) {
      case 'top-right':
        return `M ${s} 0 Q ${s} ${s} 0 ${s}`;
      case 'bottom-left':
        return `M 0 0 Q 0 ${s} ${s} ${s}`;
      case 'bottom-right':
      default:
        return `M 0 0 Q ${s} 0 ${s} ${s}`;
    }
  };

  return (
    <View style={{
      position: 'absolute',
      width: arcSize,
      height: arcSize,
      ...posStyles,
    }}>
      <Svg width={arcSize} height={arcSize} viewBox={`0 0 ${arcSize} ${arcSize}`}>
        <Defs>
          <LinearGradient id={`arc-gradient-${position}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={COLORS.bleuNuit} stopOpacity={0.8} />
            <Stop offset="100%" stopColor={COLORS.terracotta} stopOpacity={0.8} />
          </LinearGradient>
        </Defs>
        <Path
          d={getArcPath()}
          fill="none"
          stroke={`url(#arc-gradient-${position})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity={opacity}
        />
      </Svg>
    </View>
  );
};

// SVG Icons as components for PDF
const CheckIcon = ({ color = COLORS.terracotta, size = 16 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} fill="none" />
    <Path
      d="M9 12l2 2 4-4"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

const QuoteIcon = ({ color = COLORS.terracotta, size = 32 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z"
      fill={color}
    />
    <Path
      d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v4z"
      fill={color}
    />
  </Svg>
);

// Badge component for PDF (styled like HTML version)
const SectionBadge = ({ 
  icon, 
  text, 
  accentColor 
}: { 
  icon: string; 
  text: string; 
  accentColor: string;
}) => (
  <View style={{
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${accentColor}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${accentColor}40`,
    alignSelf: 'center',
    marginBottom: 8,
  }}>
    <Text style={{ fontSize: 10 }}>{icon}</Text>
    <Text style={{ 
      fontSize: 8, 
      color: accentColor, 
      fontFamily: FONTS.pdf.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    }}>
      {text}
    </Text>
  </View>
);

// Logo Component - utilise PNG pour react-pdf
const BrandLogo = ({ size = 'md', isDark = false }: { size?: 'sm' | 'md' | 'lg'; isDark?: boolean }) => {
  const logoHeight = size === 'sm' ? 20 : size === 'md' ? 28 : 36;
  const logoSrc = isDark ? BASE64_ASSETS.logoWhite : BASE64_ASSETS.logoGradient;
  
  return (
    <Image src={logoSrc} style={{ height: logoHeight, objectFit: 'contain' }} />
  );
};

// Type for theme config
type ThemeConfig = {
  name: string;
  background: string;
  text: string;
  subtext: string;
  accent: string;
  cardBg: string;
  sectionBg: string;
  isDark: boolean;
  isGradient?: boolean;
};

const createStyles = (
  orientation: PDFOrientation, 
  theme: ThemeConfig,
  customColors?: { primary?: string | null; accent?: string | null }
) => {
  const isLandscape = orientation === 'landscape';
  
  const primaryColor = theme.text;
  const accentColor = customColors?.accent || theme.accent;
  
  return StyleSheet.create({
    // Page styles
    page: {
      backgroundColor: theme.background,
      padding: isLandscape ? 40 : 50,
      fontFamily: FONTS.pdf.secondary,
      position: 'relative',
    },
    coverPage: {
      backgroundColor: theme.background,
      padding: isLandscape ? 40 : 50,
      fontFamily: FONTS.pdf.secondary,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    // Cover elements
    coverLogo: {
      height: 48,
      marginBottom: 32,
      objectFit: 'contain',
    },
    coverTitle: {
      fontSize: isLandscape ? 56 : 44,
      fontFamily: FONTS.pdf.primary,
      color: primaryColor,
      textAlign: 'center',
      marginBottom: 16,
    },
    coverSubtitle: {
      fontSize: isLandscape ? 20 : 18,
      color: theme.subtext,
      textAlign: 'center',
      maxWidth: isLandscape ? 500 : 380,
      lineHeight: 1.6,
    },
    arcContainer: {
      alignItems: 'center',
      marginBottom: 16,
    },
    // Section elements
    sectionTitle: {
      fontSize: isLandscape ? 28 : 24,
      fontFamily: FONTS.pdf.primary,
      color: primaryColor,
      marginBottom: 8,
    },
    sectionTitleCentered: {
      fontSize: isLandscape ? 28 : 24,
      fontFamily: FONTS.pdf.primary,
      color: primaryColor,
      marginBottom: 8,
      textAlign: 'center',
    },
    paragraph: {
      fontSize: isLandscape ? 12 : 11,
      lineHeight: 1.7,
      color: theme.isDark ? theme.subtext : COLORS.foreground,
      marginBottom: 12,
    },
    // Key points
    keyPointsContainer: {
      backgroundColor: theme.sectionBg,
      margin: isLandscape ? -40 : -50,
      padding: isLandscape ? 40 : 50,
      paddingTop: 40,
    },
    keyPointsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      marginTop: 16,
    },
    keyPointCard: {
      width: isLandscape ? '31%' : '47%',
      backgroundColor: theme.isDark ? theme.cardBg : COLORS.blancCasse,
      padding: 20,
      borderRadius: 8,
      borderWidth: theme.isDark ? 0 : 1,
      borderColor: COLORS.border,
    },
    keyPointHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: 10,
    },
    keyPointTitle: {
      fontSize: isLandscape ? 12 : 13,
      fontFamily: FONTS.pdf.primary,
      color: primaryColor,
      flex: 1,
    },
    keyPointDesc: {
      fontSize: isLandscape ? 9 : 10,
      color: theme.subtext,
      lineHeight: 1.5,
    },
    // Details
    featureList: {
      marginTop: 20,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    featureText: {
      fontSize: isLandscape ? 11 : 10,
      color: theme.isDark ? theme.subtext : COLORS.foreground,
      flex: 1,
    },
    // Pricing
    pricingContainer: {
      backgroundColor: theme.sectionBg,
      margin: isLandscape ? -40 : -50,
      padding: isLandscape ? 40 : 50,
    },
    pricingGrid: {
      flexDirection: 'row',
      gap: 20,
      justifyContent: 'center',
      marginTop: 20,
    },
    pricingCard: {
      width: isLandscape ? 200 : 160,
      backgroundColor: theme.isDark ? theme.cardBg : COLORS.blancCasse,
      padding: 24,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: theme.isDark ? 'rgba(255,255,255,0.2)' : COLORS.border,
    },
    pricingCardHighlighted: {
      borderColor: accentColor,
    },
    pricingName: {
      fontSize: isLandscape ? 16 : 14,
      fontFamily: FONTS.pdf.primary,
      color: primaryColor,
      marginBottom: 8,
    },
    pricingPrice: {
      fontSize: isLandscape ? 28 : 24,
      fontFamily: FONTS.pdf.primary,
      color: accentColor,
    },
    pricingPeriod: {
      fontSize: isLandscape ? 10 : 9,
      color: theme.subtext,
      marginBottom: 16,
    },
    pricingFeature: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    pricingFeatureText: {
      fontSize: isLandscape ? 9 : 8,
      color: theme.isDark ? theme.subtext : COLORS.foreground,
      flex: 1,
    },
    // Testimonial
    testimonialBox: {
      backgroundColor: theme.isDark ? theme.cardBg : COLORS.bleuNuitLight10,
      padding: isLandscape ? 32 : 36,
      borderRadius: 10,
      borderLeftWidth: 4,
      borderLeftColor: accentColor,
    },
    testimonialQuote: {
      fontSize: isLandscape ? 14 : 13,
      fontStyle: 'italic',
      color: theme.isDark ? theme.subtext : COLORS.foreground,
      marginTop: 16,
      marginBottom: 20,
      lineHeight: 1.7,
    },
    testimonialAuthor: {
      fontSize: isLandscape ? 12 : 11,
      fontFamily: FONTS.pdf.primary,
      color: primaryColor,
    },
    testimonialCompany: {
      fontSize: isLandscape ? 10 : 9,
      color: theme.subtext,
      marginTop: 4,
    },
    // Contact
    contactSection: {
      alignItems: 'center',
      paddingTop: isLandscape ? 50 : 60,
    },
    ctaButton: {
      backgroundColor: accentColor,
      paddingHorizontal: isLandscape ? 48 : 40,
      paddingVertical: isLandscape ? 18 : 16,
      borderRadius: 8,
    },
    ctaText: {
      color: COLORS.white,
      fontSize: isLandscape ? 16 : 14,
      fontFamily: FONTS.pdf.primary,
    },
    coordinates: {
      marginTop: 24,
      fontSize: isLandscape ? 11 : 10,
      color: theme.subtext,
    },
    // Footer
    footer: {
      position: 'absolute',
      bottom: 24,
      left: isLandscape ? 40 : 50,
      right: isLandscape ? 40 : 50,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    footerText: {
      fontSize: isLandscape ? 9 : 8,
      color: theme.subtext,
    },
    pageNumber: {
      position: 'absolute',
      bottom: 24,
      right: isLandscape ? 40 : 50,
      fontSize: isLandscape ? 9 : 8,
      color: theme.subtext,
    },
    // Layout helpers
    twoColumnLayout: {
      flexDirection: 'row',
      gap: 32,
    },
    column: {
      flex: 1,
    },
  });
};

interface BrochurePDFProps {
  brochure: Brochure;
  orientation: PDFOrientation;
  pdfTheme: PDFTheme;
  showDecorativeArc?: boolean; // Mode présentation avec arcs
}

const BrochurePDF = ({ brochure, orientation, pdfTheme, showDecorativeArc = true }: BrochurePDFProps) => {
  const { sections, custom_colors } = brochure;
  const theme = PDF_THEMES[pdfTheme];
  const styles = createStyles(orientation, theme, custom_colors);
  const isLandscape = orientation === 'landscape';
  const pageSize = isLandscape ? A4_LANDSCAPE : A4_PORTRAIT;
  const accentColor = custom_colors?.accent || theme.accent;

  // Arc width based on orientation
  const arcWidth = isLandscape ? 100 : 80;
  const arcSmall = isLandscape ? 70 : 60;

  return (
    <Document>
      {/* Cover Page */}
      <Page size={[pageSize.width, pageSize.height]} style={styles.coverPage}>
        {/* Arc décoratif en mode continuité */}
        {showDecorativeArc && (
          <>
            <PDFDecorativeArc 
              pageWidth={pageSize.width} 
              pageHeight={pageSize.height}
              position="top-right"
              opacity={0.04}
              strokeWidth={2}
              extended={true}
            />
            <PDFDecorativeArc 
              pageWidth={pageSize.width} 
              pageHeight={pageSize.height}
              position="bottom-left"
              opacity={0.03}
              strokeWidth={1.5}
              extended={true}
            />
          </>
        )}
        
        <View style={{ alignItems: 'center' }}>
          {/* Logo officiel - PNG pour react-pdf */}
          <Image 
            src={theme.isDark ? BASE64_ASSETS.logoWhite : BASE64_ASSETS.logoMain} 
            style={styles.coverLogo} 
          />
          
          {/* Titre principal - couleur unie (pas de gradient possible en PDF) */}
          <Text style={styles.coverTitle}>{brochure.cover_title}</Text>
          
          {/* Sous-titre */}
          {brochure.cover_subtitle && (
            <Text style={styles.coverSubtitle}>{brochure.cover_subtitle}</Text>
          )}
          
          {/* Image de couverture */}
          {brochure.cover_image_url && (
            <Image 
              src={brochure.cover_image_url} 
              style={{ 
                marginTop: 40, 
                maxWidth: isLandscape ? 350 : 280, 
                maxHeight: isLandscape ? 200 : 180,
                borderRadius: 8,
              }} 
            />
          )}
        </View>
        
        {/* Footer */}
        <View style={styles.footer}>
          <BrandLogo size="sm" isDark={theme.isDark} />
          <Text style={styles.footerText}>iarche.fr</Text>
        </View>
      </Page>

      {/* Introduction Page */}
      {sections.introduction.enabled && sections.introduction.content && (
        <Page size={[pageSize.width, pageSize.height]} style={styles.page}>
          {/* Arc décoratif en mode continuité */}
          {showDecorativeArc && (
            <PDFDecorativeArc 
              pageWidth={pageSize.width} 
              pageHeight={pageSize.height}
              position="bottom-right"
              opacity={0.03}
              strokeWidth={1.5}
              extended={true}
            />
          )}
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={[styles.paragraph, { fontSize: isLandscape ? 14 : 13, textAlign: 'center', maxWidth: isLandscape ? 550 : 420 }]}>
              {sections.introduction.content}
            </Text>
          </View>
          
          <View style={styles.footer}>
            <BrandLogo size="sm" isDark={theme.isDark} />
          </View>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Key Points Page */}
      {sections.keyPoints.enabled && sections.keyPoints.points.length > 0 && (
        <Page size={[pageSize.width, pageSize.height]} style={[styles.page, { padding: 0 }]}>
          {/* Arc décoratif en mode continuité */}
          {showDecorativeArc && (
            <PDFDecorativeArc 
              pageWidth={pageSize.width} 
              pageHeight={pageSize.height}
              position="top-right"
              opacity={0.04}
              strokeWidth={2}
              extended={true}
            />
          )}
          <View style={styles.keyPointsContainer}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <SectionBadge icon="📋" text="Essentiel" accentColor={accentColor} />
              <Text style={styles.sectionTitleCentered}>Points clés</Text>
              <Image src={BASE64_ASSETS.arcMd} style={{ width: arcSmall, height: arcSmall * 0.3, marginTop: 8 }} />
            </View>
            
            <View style={styles.keyPointsGrid}>
              {sections.keyPoints.points.map((point, idx) => (
                <View key={point.id} style={styles.keyPointCard}>
                  <View style={styles.keyPointHeader}>
                    {/* Numéro stylisé comme dans l'aperçu HTML */}
                    <View style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: `${accentColor}20`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Text style={{ 
                        fontSize: 10, 
                        fontFamily: FONTS.pdf.primary, 
                        color: accentColor,
                      }}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.keyPointTitle}>{point.title}</Text>
                  </View>
                  <Text style={styles.keyPointDesc}>{point.description}</Text>
                </View>
              ))}
            </View>
          </View>
          
          <View style={[styles.footer, { left: isLandscape ? 40 : 50, right: isLandscape ? 40 : 50 }]}>
            <BrandLogo size="sm" isDark={theme.isDark} />
          </View>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Details Page */}
      {sections.details.enabled && (sections.details.content || sections.details.features?.length > 0) && (
        <Page size={[pageSize.width, pageSize.height]} style={styles.page}>
          <View>
            <Text style={styles.sectionTitle}>Détails</Text>
            <Image src={BASE64_ASSETS.arcMd} style={{ width: arcSmall, height: arcSmall * 0.3, marginBottom: 20 }} />
            
            {sections.details.content && (
              isLandscape ? (
                <View style={styles.twoColumnLayout}>
                  <View style={styles.column}>
                    {sections.details.content.split('\n').slice(0, Math.ceil(sections.details.content.split('\n').length / 2)).map((para, i) => (
                      <Text key={i} style={styles.paragraph}>{para}</Text>
                    ))}
                  </View>
                  <View style={styles.column}>
                    {sections.details.content.split('\n').slice(Math.ceil(sections.details.content.split('\n').length / 2)).map((para, i) => (
                      <Text key={i} style={styles.paragraph}>{para}</Text>
                    ))}
                  </View>
                </View>
              ) : (
                sections.details.content.split('\n').map((para, i) => (
                  <Text key={i} style={styles.paragraph}>{para}</Text>
                ))
              )
            )}
            
            {sections.details.features && sections.details.features.length > 0 && (
              <View style={styles.featureList}>
                {sections.details.features.map((feature, i) => (
                  <View key={i} style={styles.featureItem}>
                    <CheckIcon color={accentColor} size={14} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          
          <View style={styles.footer}>
            <BrandLogo size="sm" isDark={theme.isDark} />
          </View>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Pricing Page */}
      {sections.pricing.enabled && sections.pricing.plans.length > 0 && (
        <Page size={[pageSize.width, pageSize.height]} style={[styles.page, { padding: 0 }]}>
          <View style={styles.pricingContainer}>
            <View style={{ alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.sectionTitleCentered}>{sections.pricing.title}</Text>
              <Image src={BASE64_ASSETS.arcMd} style={{ width: arcSmall, height: arcSmall * 0.3, marginTop: 8 }} />
            </View>
            
            <View style={styles.pricingGrid}>
              {sections.pricing.plans.map((plan) => (
                <View key={plan.id} style={[styles.pricingCard, plan.highlighted && styles.pricingCardHighlighted]}>
                  <Text style={styles.pricingName}>{plan.name}</Text>
                  <Text style={styles.pricingPrice}>{plan.price}</Text>
                  {plan.period && <Text style={styles.pricingPeriod}>{plan.period}</Text>}
                  {plan.features.map((feature, i) => (
                    <View key={i} style={styles.pricingFeature}>
                      <CheckIcon color={accentColor} size={12} />
                      <Text style={styles.pricingFeatureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </View>
          
          <View style={[styles.footer, { left: isLandscape ? 40 : 50, right: isLandscape ? 40 : 50 }]}>
            <BrandLogo size="sm" isDark={theme.isDark} />
          </View>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Testimonial Page */}
      {sections.testimonial.enabled && sections.testimonial.quote && (
        <Page size={[pageSize.width, pageSize.height]} style={styles.page}>
          {/* Arc décoratif en mode continuité */}
          {showDecorativeArc && (
            <PDFDecorativeArc 
              pageWidth={pageSize.width} 
              pageHeight={pageSize.height}
              position="bottom-left"
              opacity={0.03}
              strokeWidth={1.5}
              extended={true}
            />
          )}
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <SectionBadge icon="💬" text="Témoignage" accentColor={accentColor} />
            <View style={styles.testimonialBox}>
              <QuoteIcon color={accentColor} size={32} />
              <Text style={styles.testimonialQuote}>"{sections.testimonial.quote}"</Text>
              <Text style={styles.testimonialAuthor}>{sections.testimonial.author}</Text>
              {sections.testimonial.company && (
                <Text style={styles.testimonialCompany}>{sections.testimonial.company}</Text>
              )}
            </View>
          </View>
          
          <View style={styles.footer}>
            <BrandLogo size="sm" isDark={theme.isDark} />
          </View>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Contact Page */}
      {sections.contact.enabled && (
        <Page size={[pageSize.width, pageSize.height]} style={styles.page}>
          {/* Arc décoratif en mode continuité */}
          {showDecorativeArc && (
            <>
              <PDFDecorativeArc 
                pageWidth={pageSize.width} 
                pageHeight={pageSize.height}
                position="top-right"
                opacity={0.03}
                strokeWidth={1.5}
                extended={true}
              />
              <PDFDecorativeArc 
                pageWidth={pageSize.width} 
                pageHeight={pageSize.height}
                position="bottom-left"
                opacity={0.025}
                strokeWidth={1.5}
                extended={true}
              />
            </>
          )}
          <View style={styles.contactSection}>
            <Text style={styles.sectionTitleCentered}>Intéressé ?</Text>
            <Image src={BASE64_ASSETS.arcMd} style={{ width: arcSmall, height: arcSmall * 0.3, marginTop: 8, marginBottom: 32 }} />
            
            <View style={styles.ctaButton}>
              <Text style={styles.ctaText}>{sections.contact.cta_text || 'Nous contacter'}</Text>
            </View>
            
            {sections.contact.show_coordinates && (
              <Text style={styles.coordinates}>Bayonne · France · nlq@iarche.fr</Text>
            )}
          </View>
          
          <View style={styles.footer}>
            <BrandLogo size="sm" isDark={theme.isDark} />
            <Text style={styles.footerText}>© {new Date().getFullYear()} IArche</Text>
          </View>
        </Page>
      )}
    </Document>
  );
};

interface BrochurePDFExportProps {
  brochure: Brochure;
  onClose: () => void;
}

const BrochurePDFExport = ({ brochure, onClose }: BrochurePDFExportProps) => {
  const { toast } = useToast();
  const [orientation, setOrientation] = useState<PDFOrientation>(
    brochure.export_settings?.pdf_orientation || 'portrait'
  );
  const [pdfTheme, setPdfTheme] = useState<PDFTheme>('blanc-casse');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDecorativeArc, setShowDecorativeArc] = useState(true); // Mode présentation

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const blob = await pdf(<BrochurePDF brochure={brochure} orientation={orientation} pdfTheme={pdfTheme} showDecorativeArc={showDecorativeArc} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${brochure.slug || 'brochure'}-${pdfTheme}-${orientation}${showDecorativeArc ? '-presentation' : ''}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: 'PDF téléchargé', description: `Brochure "${PDF_THEMES[pdfTheme].name}" exportée` });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({ title: 'Erreur', description: 'Impossible de générer le PDF', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const [showPreview, setShowPreview] = useState(true);

  // Memoize the PDF document to avoid unnecessary re-renders
  const pdfDocument = useMemo(() => (
    <BrochurePDF brochure={brochure} orientation={orientation} pdfTheme={pdfTheme} showDecorativeArc={showDecorativeArc} />
  ), [brochure, orientation, pdfTheme, showDecorativeArc]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div 
        className="rounded-lg overflow-hidden flex flex-col lg:flex-row w-full max-w-6xl max-h-[90vh]"
        style={{ backgroundColor: COLORS.blancCasse }}
      >
        {/* Preview Panel */}
        {showPreview && (
          <div className="flex-1 bg-gray-100 border-r border-gray-200 min-h-[400px] lg:min-h-0">
            <PDFViewer 
              width="100%" 
              height="100%" 
              showToolbar={false}
              style={{ border: 'none', minHeight: '400px' }}
            >
              {pdfDocument}
            </PDFViewer>
          </div>
        )}

        {/* Controls Panel */}
        <div className="w-full lg:w-80 p-6 space-y-5 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5" style={{ color: COLORS.bleuNuit }} />
              <h2 className="text-lg font-semibold" style={{ color: COLORS.bleuNuit }}>
                Export PDF A4
              </h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <p className="text-sm" style={{ color: COLORS.muted }}>
            Téléchargez "<span className="font-medium" style={{ color: COLORS.foreground }}>{brochure.title}</span>" au format PDF.
          </p>

          {/* Toggle Preview */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="w-full"
          >
            {showPreview ? (
              <>
                <EyeOff className="mr-2 h-4 w-4" />
                Masquer l'aperçu
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Afficher l'aperçu
              </>
            )}
          </Button>

          {/* Sélecteur de thème */}
          <div className="space-y-2">
            <Label className="text-sm font-medium" style={{ color: COLORS.foreground }}>
              Thème
            </Label>
            <Select value={pdfTheme} onValueChange={(v) => setPdfTheme(v as PDFTheme)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blanc-casse">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: COLORS.blancCasse, borderColor: COLORS.border }} />
                    Blanc Cassé
                  </div>
                </SelectItem>
                <SelectItem value="bleu-nuit">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLORS.bleuNuit }} />
                    Bleu Nuit
                  </div>
                </SelectItem>
                <SelectItem value="terra">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLORS.terracotta }} />
                    Terracotta
                  </div>
                </SelectItem>
                <SelectItem value="gradient">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ background: `linear-gradient(135deg, ${COLORS.bleuNuit} 0%, ${COLORS.terracotta} 100%)` }} />
                    Gradient IArche
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sélecteur d'orientation */}
          <div className="space-y-3">
            <Label className="text-sm font-medium" style={{ color: COLORS.foreground }}>
              Orientation
            </Label>
            <RadioGroup value={orientation} onValueChange={(v) => setOrientation(v as PDFOrientation)}>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="portrait" id="portrait" />
                  <Label htmlFor="portrait" className="flex items-center gap-2 cursor-pointer">
                    <div 
                      className="w-6 h-8 rounded-sm" 
                      style={{ border: `2px solid ${COLORS.bleuNuit}` }}
                    />
                    Portrait
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="landscape" id="landscape" />
                  <Label htmlFor="landscape" className="flex items-center gap-2 cursor-pointer">
                    <div 
                      className="w-8 h-6 rounded-sm"
                      style={{ border: `2px solid ${COLORS.bleuNuit}` }}
                    />
                    Paysage
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Mode présentation */}
          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="text-sm font-medium" style={{ color: COLORS.foreground }}>
                Mode Présentation
              </Label>
              <p className="text-xs" style={{ color: COLORS.muted }}>
                Arcs décoratifs en continuité
              </p>
            </div>
            <Switch
              checked={showDecorativeArc}
              onCheckedChange={setShowDecorativeArc}
            />
          </div>

          {/* Info box */}
          <div 
            className="rounded-lg p-3 text-sm"
            style={{ 
              backgroundColor: COLORS.secondary,
              color: COLORS.muted,
            }}
          >
            <strong style={{ color: COLORS.foreground }}>Format A4</strong> · {orientation === 'portrait' ? '210 × 297 mm' : '297 × 210 mm'}
            <br />
            Thème : {PDF_THEMES[pdfTheme].name}
            {showDecorativeArc && <><br />✓ Mode présentation</>}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button 
              onClick={handleDownload} 
              disabled={isGenerating}
              className="flex-1"
              style={{ 
                backgroundColor: COLORS.terracotta,
                color: COLORS.white,
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              {isGenerating ? 'Génération...' : 'Télécharger'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrochurePDFExport;
