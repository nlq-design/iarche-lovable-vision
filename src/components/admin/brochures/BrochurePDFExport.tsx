import { Document, Page, Text, View, StyleSheet, pdf, Image, Svg, Path, Circle, Link } from '@react-pdf/renderer';
import { Brochure, PDFOrientation } from '@/types/brochure';
import { COLORS, FONTS, GRADIENTS } from '@/components/admin/medias/shared/tokens';
import { BASE64_ASSETS } from '@/components/admin/medias/pdf/base64Assets';
import { Button } from '@/components/ui/button';
import { Download, X, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useState } from 'react';

// A4 dimensions in points (72 points = 1 inch)
const A4_PORTRAIT = { width: 595.28, height: 841.89 };
const A4_LANDSCAPE = { width: 841.89, height: 595.28 };

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

// Arc décoratif SVG inline (comme dans l'aperçu web)
const ArcDecorative = ({ width = 80, color1 = COLORS.bleuNuit, color2 = COLORS.terracotta }: { width?: number; color1?: string; color2?: string }) => {
  const height = width * 0.25;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path
        d={`M 0 ${height} Q ${width / 2} 0 ${width} ${height}`}
        stroke={color1}
        strokeWidth={2}
        fill="none"
      />
    </Svg>
  );
};

// Logo Component - utilise PNG pour react-pdf
const BrandLogo = ({ size = 'md', isDark = false }: { size?: 'sm' | 'md' | 'lg'; isDark?: boolean }) => {
  const logoHeight = size === 'sm' ? 20 : size === 'md' ? 28 : 36;
  const logoSrc = isDark ? BASE64_ASSETS.logoWhite : BASE64_ASSETS.logoGradient;
  
  return (
    <Image src={logoSrc} style={{ height: logoHeight, objectFit: 'contain' }} />
  );
};

const createStyles = (orientation: PDFOrientation, customColors?: { primary?: string | null; accent?: string | null }) => {
  const isLandscape = orientation === 'landscape';
  const pageSize = isLandscape ? A4_LANDSCAPE : A4_PORTRAIT;
  
  const primaryColor = customColors?.primary || COLORS.bleuNuit;
  const accentColor = customColors?.accent || COLORS.terracotta;
  
  return StyleSheet.create({
    // Page styles - alignés avec l'aperçu web
    page: {
      backgroundColor: COLORS.blancCasse,
      padding: isLandscape ? 40 : 50,
      fontFamily: FONTS.pdf.secondary,
      position: 'relative',
    },
    coverPage: {
      backgroundColor: COLORS.blancCasse,
      padding: isLandscape ? 40 : 50,
      fontFamily: FONTS.pdf.secondary,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    // Cover elements - alignés avec le style web
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
      color: COLORS.muted,
      textAlign: 'center',
      maxWidth: isLandscape ? 500 : 380,
      lineHeight: 1.6,
    },
    arcContainer: {
      alignItems: 'center',
      marginBottom: 16,
    },
    // Section elements - alignés avec l'aperçu web
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
      color: COLORS.foreground,
      marginBottom: 12,
    },
    // Key points grid - alignés avec le style cards du web
    keyPointsContainer: {
      backgroundColor: COLORS.secondary,
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
      backgroundColor: COLORS.blancCasse,
      padding: 20,
      borderRadius: 8,
      borderWidth: 1,
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
      color: COLORS.muted,
      lineHeight: 1.5,
    },
    // Details features list
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
      color: COLORS.foreground,
      flex: 1,
    },
    // Pricing - aligné avec le style web
    pricingContainer: {
      backgroundColor: COLORS.secondary,
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
      backgroundColor: COLORS.blancCasse,
      padding: 24,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: COLORS.border,
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
      color: COLORS.muted,
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
      color: COLORS.foreground,
      flex: 1,
    },
    // Testimonial - aligné avec le style web
    testimonialBox: {
      backgroundColor: COLORS.bleuNuitLight10,
      padding: isLandscape ? 32 : 36,
      borderRadius: 10,
      borderLeftWidth: 4,
      borderLeftColor: accentColor,
    },
    testimonialQuote: {
      fontSize: isLandscape ? 14 : 13,
      fontStyle: 'italic',
      color: COLORS.foreground,
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
      color: COLORS.muted,
      marginTop: 4,
    },
    // Contact - aligné avec l'aperçu web
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
    ctaButtonOutline: {
      borderWidth: 2,
      borderColor: accentColor,
      paddingHorizontal: isLandscape ? 48 : 40,
      paddingVertical: isLandscape ? 18 : 16,
      borderRadius: 8,
      backgroundColor: 'transparent',
    },
    ctaText: {
      color: COLORS.white,
      fontSize: isLandscape ? 16 : 14,
      fontFamily: FONTS.pdf.primary,
    },
    ctaTextOutline: {
      color: accentColor,
      fontSize: isLandscape ? 16 : 14,
      fontFamily: FONTS.pdf.primary,
    },
    coordinates: {
      marginTop: 24,
      fontSize: isLandscape ? 11 : 10,
      color: COLORS.subtle,
    },
    // Footer - aligné avec le web
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
      color: COLORS.muted,
    },
    pageNumber: {
      position: 'absolute',
      bottom: 24,
      right: isLandscape ? 40 : 50,
      fontSize: isLandscape ? 9 : 8,
      color: COLORS.muted,
    },
    // Layout helpers
    twoColumnLayout: {
      flexDirection: 'row',
      gap: 32,
    },
    column: {
      flex: 1,
    },
    centeredContent: {
      alignItems: 'center',
    },
    // Introduction content
    introContent: {
      maxWidth: isLandscape ? 600 : 450,
      marginHorizontal: 'auto',
    },
  });
};

interface BrochurePDFProps {
  brochure: Brochure;
  orientation: PDFOrientation;
}

const BrochurePDF = ({ brochure, orientation }: BrochurePDFProps) => {
  const { sections, custom_colors } = brochure;
  const styles = createStyles(orientation, custom_colors);
  const isLandscape = orientation === 'landscape';
  const pageSize = isLandscape ? A4_LANDSCAPE : A4_PORTRAIT;
  const accentColor = custom_colors?.accent || COLORS.terracotta;
  const primaryColor = custom_colors?.primary || COLORS.bleuNuit;

  // Arc width based on orientation
  const arcWidth = isLandscape ? 100 : 80;
  const arcSmall = isLandscape ? 70 : 60;

  return (
    <Document>
      {/* Cover Page - aligné avec l'aperçu web */}
      <Page size={[pageSize.width, pageSize.height]} style={styles.coverPage}>
        <View style={{ alignItems: 'center' }}>
          {/* Logo officiel en haut */}
          <Image src={BASE64_ASSETS.logoGradient} style={styles.coverLogo} />
          
          {/* Titre principal */}
          <Text style={styles.coverTitle}>{brochure.cover_title}</Text>
          
          {/* Arc décoratif sous le titre */}
          <View style={styles.arcContainer}>
            <Image src={BASE64_ASSETS.arcLg} style={{ width: arcWidth, height: arcWidth * 0.25, objectFit: 'contain' }} />
          </View>
          
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
          <BrandLogo size="sm" />
          <Text style={styles.footerText}>iarche.fr</Text>
        </View>
      </Page>

      {/* Introduction Page */}
      {sections.introduction.enabled && sections.introduction.content && (
        <Page size={[pageSize.width, pageSize.height]} style={styles.page}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={[styles.paragraph, { fontSize: isLandscape ? 14 : 13, textAlign: 'center', maxWidth: isLandscape ? 550 : 420 }]}>
              {sections.introduction.content}
            </Text>
          </View>
          
          <View style={styles.footer}>
            <BrandLogo size="sm" />
          </View>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Key Points Page */}
      {sections.keyPoints.enabled && sections.keyPoints.points.length > 0 && (
        <Page size={[pageSize.width, pageSize.height]} style={[styles.page, { padding: 0 }]}>
          <View style={styles.keyPointsContainer}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <Text style={styles.sectionTitleCentered}>Points clés</Text>
              <Image src={BASE64_ASSETS.arcMd} style={{ width: arcSmall, height: arcSmall * 0.25, marginTop: 8 }} />
            </View>
            
            <View style={styles.keyPointsGrid}>
              {sections.keyPoints.points.map((point) => (
                <View key={point.id} style={styles.keyPointCard}>
                  <View style={styles.keyPointHeader}>
                    <CheckIcon color={accentColor} size={20} />
                    <Text style={styles.keyPointTitle}>{point.title}</Text>
                  </View>
                  <Text style={styles.keyPointDesc}>{point.description}</Text>
                </View>
              ))}
            </View>
          </View>
          
          <View style={[styles.footer, { left: isLandscape ? 40 : 50, right: isLandscape ? 40 : 50 }]}>
            <BrandLogo size="sm" />
          </View>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Details Page */}
      {sections.details.enabled && (sections.details.content || sections.details.features?.length > 0) && (
        <Page size={[pageSize.width, pageSize.height]} style={styles.page}>
          <View>
            <Text style={styles.sectionTitle}>Détails</Text>
            <Image src={BASE64_ASSETS.arcMd} style={{ width: arcSmall, height: arcSmall * 0.25, marginBottom: 20 }} />
            
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
            <BrandLogo size="sm" />
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
              <Image src={BASE64_ASSETS.arcMd} style={{ width: arcSmall, height: arcSmall * 0.25, marginTop: 8 }} />
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
            <BrandLogo size="sm" />
          </View>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Testimonial Page */}
      {sections.testimonial.enabled && sections.testimonial.quote && (
        <Page size={[pageSize.width, pageSize.height]} style={styles.page}>
          <View style={{ flex: 1, justifyContent: 'center' }}>
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
            <BrandLogo size="sm" />
          </View>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Contact Page - aligné avec l'aperçu web */}
      {sections.contact.enabled && (
        <Page size={[pageSize.width, pageSize.height]} style={styles.page}>
          <View style={styles.contactSection}>
            <Text style={styles.sectionTitleCentered}>Intéressé ?</Text>
            <Image src={BASE64_ASSETS.arcMd} style={{ width: arcSmall, height: arcSmall * 0.25, marginTop: 8, marginBottom: 32 }} />
            
            <View style={styles.ctaButton}>
              <Text style={styles.ctaText}>{sections.contact.cta_text || 'Nous contacter'}</Text>
            </View>
            
            {sections.contact.show_coordinates && (
              <Text style={styles.coordinates}>Bayonne · France · nlq@iarche.fr</Text>
            )}
          </View>
          
          <View style={styles.footer}>
            <BrandLogo size="sm" />
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
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const blob = await pdf(<BrochurePDF brochure={brochure} orientation={orientation} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${brochure.slug || 'brochure'}-${orientation}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: 'PDF téléchargé', description: 'Brochure exportée avec succès' });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({ title: 'Erreur', description: 'Impossible de générer le PDF', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div 
        className="rounded-lg p-6 max-w-md w-full mx-4 space-y-6"
        style={{ backgroundColor: COLORS.blancCasse }}
      >
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
        
        <p style={{ color: COLORS.muted }}>
          Téléchargez "<span className="font-medium" style={{ color: COLORS.foreground }}>{brochure.title}</span>" au format PDF.
        </p>

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

        <div 
          className="rounded-lg p-3 text-sm"
          style={{ 
            backgroundColor: COLORS.secondary,
            color: COLORS.muted,
          }}
        >
          <strong style={{ color: COLORS.foreground }}>Format A4</strong> · {orientation === 'portrait' ? '210 × 297 mm' : '297 × 210 mm'}
          <br />
          Export avec logo officiel et arcs décoratifs.
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
  );
};

export default BrochurePDFExport;
