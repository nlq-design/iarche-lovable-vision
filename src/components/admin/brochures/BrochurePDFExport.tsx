import { Document, Page, Text, View, StyleSheet, pdf, Image } from '@react-pdf/renderer';
import { Brochure, PDFOrientation } from '@/types/brochure';
import { COLORS, FONTS, GRADIENTS, BAR_SIZES } from '@/components/admin/medias/shared/tokens';
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

const createStyles = (orientation: PDFOrientation, customColors?: { primary?: string | null; accent?: string | null }) => {
  const isLandscape = orientation === 'landscape';
  
  const primaryColor = customColors?.primary || COLORS.bleuNuit;
  const accentColor = customColors?.accent || COLORS.terracotta;
  
  return StyleSheet.create({
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
    // Mesh background pattern
    meshContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'hidden',
    },
    meshLine: {
      position: 'absolute',
      width: '200%',
      height: 1,
      backgroundColor: COLORS.border,
      opacity: 0.15,
    },
    // Decorative gradient bar
    gradientBar: {
      width: isLandscape ? BAR_SIZES.xl.width : BAR_SIZES.lg.width,
      height: isLandscape ? BAR_SIZES.xl.height : BAR_SIZES.lg.height,
      marginBottom: 24,
    },
    gradientBarSmall: {
      width: BAR_SIZES.md.width,
      height: BAR_SIZES.md.height,
      marginBottom: 20,
    },
    // Cover elements
    coverTitle: {
      fontSize: isLandscape ? 52 : 44,
      fontFamily: FONTS.pdf.primary,
      color: primaryColor,
      textAlign: 'center',
      marginBottom: 16,
    },
    coverSubtitle: {
      fontSize: isLandscape ? 18 : 16,
      color: COLORS.muted,
      textAlign: 'center',
      maxWidth: isLandscape ? 500 : 380,
    },
    // Section elements
    sectionTitle: {
      fontSize: isLandscape ? 26 : 22,
      fontFamily: FONTS.pdf.primary,
      color: primaryColor,
      marginBottom: 8,
    },
    sectionTitleCentered: {
      fontSize: isLandscape ? 26 : 22,
      fontFamily: FONTS.pdf.primary,
      color: primaryColor,
      marginBottom: 8,
      textAlign: 'center',
    },
    paragraph: {
      fontSize: isLandscape ? 11 : 10,
      lineHeight: 1.7,
      color: COLORS.foreground,
      marginBottom: 10,
    },
    // Key points grid
    keyPointsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
      marginTop: 8,
    },
    keyPointCard: {
      width: isLandscape ? '31%' : '47%',
      backgroundColor: COLORS.blancCasse,
      padding: isLandscape ? 14 : 16,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    keyPointTitle: {
      fontSize: isLandscape ? 10 : 11,
      fontFamily: FONTS.pdf.primary,
      color: primaryColor,
      marginBottom: 6,
    },
    keyPointCheck: {
      color: accentColor,
      fontFamily: FONTS.pdf.primary,
      marginRight: 4,
    },
    keyPointDesc: {
      fontSize: isLandscape ? 8 : 9,
      color: COLORS.muted,
      lineHeight: 1.5,
    },
    // Pricing
    pricingGrid: {
      flexDirection: 'row',
      gap: 16,
      justifyContent: 'center',
      marginTop: 16,
    },
    pricingCard: {
      width: isLandscape ? 220 : 170,
      backgroundColor: COLORS.blancCasse,
      padding: isLandscape ? 16 : 18,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: COLORS.border,
    },
    pricingCardHighlighted: {
      borderColor: accentColor,
    },
    pricingName: {
      fontSize: isLandscape ? 14 : 13,
      fontFamily: FONTS.pdf.primary,
      color: primaryColor,
      marginBottom: 10,
    },
    pricingPrice: {
      fontSize: isLandscape ? 26 : 22,
      fontFamily: FONTS.pdf.primary,
      color: accentColor,
    },
    pricingPeriod: {
      fontSize: isLandscape ? 10 : 9,
      color: COLORS.muted,
      marginBottom: 14,
    },
    pricingFeature: {
      fontSize: isLandscape ? 9 : 8,
      color: COLORS.foreground,
      marginBottom: 5,
    },
    pricingFeatureCheck: {
      color: accentColor,
    },
    // Testimonial
    testimonialBox: {
      backgroundColor: COLORS.bleuNuitLight10,
      padding: isLandscape ? 24 : 28,
      borderRadius: 6,
      borderLeftWidth: 4,
      borderLeftColor: accentColor,
    },
    testimonialQuote: {
      fontSize: isLandscape ? 13 : 11,
      fontStyle: 'italic',
      color: COLORS.foreground,
      marginBottom: 14,
      lineHeight: 1.7,
    },
    testimonialAuthor: {
      fontSize: isLandscape ? 11 : 10,
      fontFamily: FONTS.pdf.primary,
      color: primaryColor,
    },
    testimonialCompany: {
      fontSize: isLandscape ? 10 : 9,
      color: COLORS.muted,
    },
    // Contact
    contactSection: {
      alignItems: 'center',
      paddingTop: isLandscape ? 40 : 50,
    },
    ctaButton: {
      backgroundColor: accentColor,
      paddingHorizontal: isLandscape ? 36 : 28,
      paddingVertical: isLandscape ? 14 : 12,
      borderRadius: 6,
    },
    ctaText: {
      color: COLORS.white,
      fontSize: isLandscape ? 14 : 12,
      fontFamily: FONTS.pdf.primary,
    },
    coordinates: {
      marginTop: 18,
      fontSize: isLandscape ? 10 : 9,
      color: COLORS.subtle,
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
    footerLogo: {
      fontSize: isLandscape ? 14 : 12,
      fontFamily: FONTS.pdf.primary,
      color: primaryColor,
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
      gap: 28,
    },
    column: {
      flex: 1,
    },
    centeredContent: {
      alignItems: 'center',
    },
    sectionBackground: {
      backgroundColor: COLORS.secondary,
      margin: isLandscape ? -40 : -50,
      padding: isLandscape ? 40 : 50,
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

  return (
    <Document>
      {/* Cover Page */}
      <Page size={[pageSize.width, pageSize.height]} style={styles.coverPage}>
        {/* Decorative gradient bar */}
        <Image src={BASE64_ASSETS.barLg} style={styles.gradientBar} />
        
        <Text style={styles.coverTitle}>{brochure.cover_title}</Text>
        {brochure.cover_subtitle && (
          <Text style={styles.coverSubtitle}>{brochure.cover_subtitle}</Text>
        )}
        
        {/* Footer with logo */}
        <View style={styles.footer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.footerLogo}>IArche</Text>
            <Image src={BASE64_ASSETS.barSm} style={{ width: 32, height: 2 }} />
          </View>
          <Text style={styles.footerText}>iarche.fr</Text>
        </View>
      </Page>

      {/* Introduction + Key Points */}
      {(sections.introduction.enabled || sections.keyPoints.enabled) && (
        <Page size={[pageSize.width, pageSize.height]} style={styles.page}>
          {isLandscape ? (
            <View style={styles.twoColumnLayout}>
              {sections.introduction.enabled && sections.introduction.content && (
                <View style={styles.column}>
                  <Text style={styles.sectionTitle}>Présentation</Text>
                  <Image src={BASE64_ASSETS.barMd} style={styles.gradientBarSmall} />
                  <Text style={styles.paragraph}>{sections.introduction.content}</Text>
                </View>
              )}
              {sections.keyPoints.enabled && sections.keyPoints.points.length > 0 && (
                <View style={[styles.column, { flex: sections.introduction.enabled ? 1.3 : 1 }]}>
                  <Text style={styles.sectionTitle}>Points clés</Text>
                  <Image src={BASE64_ASSETS.barMd} style={styles.gradientBarSmall} />
                  <View style={styles.keyPointsGrid}>
                    {sections.keyPoints.points.map((point) => (
                      <View key={point.id} style={styles.keyPointCard}>
                        <Text style={styles.keyPointTitle}>
                          <Text style={styles.keyPointCheck}>✓ </Text>
                          {point.title}
                        </Text>
                        <Text style={styles.keyPointDesc}>{point.description}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          ) : (
            <>
              {sections.introduction.enabled && sections.introduction.content && (
                <View style={{ marginBottom: 36 }}>
                  <Text style={styles.sectionTitle}>Présentation</Text>
                  <Image src={BASE64_ASSETS.barMd} style={styles.gradientBarSmall} />
                  <Text style={styles.paragraph}>{sections.introduction.content}</Text>
                </View>
              )}
              {sections.keyPoints.enabled && sections.keyPoints.points.length > 0 && (
                <View>
                  <Text style={styles.sectionTitle}>Points clés</Text>
                  <Image src={BASE64_ASSETS.barMd} style={styles.gradientBarSmall} />
                  <View style={styles.keyPointsGrid}>
                    {sections.keyPoints.points.map((point) => (
                      <View key={point.id} style={styles.keyPointCard}>
                        <Text style={styles.keyPointTitle}>
                          <Text style={styles.keyPointCheck}>✓ </Text>
                          {point.title}
                        </Text>
                        <Text style={styles.keyPointDesc}>{point.description}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
          
          {/* Footer */}
          <View style={styles.footer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.footerLogo}>IArche</Text>
              <Image src={BASE64_ASSETS.barSm} style={{ width: 32, height: 2 }} />
            </View>
          </View>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Details */}
      {sections.details.enabled && sections.details.content && (
        <Page size={[pageSize.width, pageSize.height]} style={styles.page}>
          <Text style={styles.sectionTitle}>Détails</Text>
          <Image src={BASE64_ASSETS.barMd} style={styles.gradientBarSmall} />
          
          {isLandscape ? (
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
          )}
          
          <View style={styles.footer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.footerLogo}>IArche</Text>
              <Image src={BASE64_ASSETS.barSm} style={{ width: 32, height: 2 }} />
            </View>
          </View>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Pricing */}
      {sections.pricing.enabled && sections.pricing.plans.length > 0 && (
        <Page size={[pageSize.width, pageSize.height]} style={styles.page}>
          <View style={styles.centeredContent}>
            <Text style={styles.sectionTitleCentered}>{sections.pricing.title}</Text>
            <Image src={BASE64_ASSETS.barMd} style={styles.gradientBarSmall} />
          </View>
          
          <View style={styles.pricingGrid}>
            {sections.pricing.plans.map((plan) => (
              <View key={plan.id} style={[styles.pricingCard, plan.highlighted && styles.pricingCardHighlighted]}>
                <Text style={styles.pricingName}>{plan.name}</Text>
                <Text style={styles.pricingPrice}>{plan.price}</Text>
                {plan.period && <Text style={styles.pricingPeriod}>{plan.period}</Text>}
                {plan.features.map((feature, i) => (
                  <Text key={i} style={styles.pricingFeature}>
                    <Text style={styles.pricingFeatureCheck}>• </Text>
                    {feature}
                  </Text>
                ))}
              </View>
            ))}
          </View>
          
          <View style={styles.footer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.footerLogo}>IArche</Text>
              <Image src={BASE64_ASSETS.barSm} style={{ width: 32, height: 2 }} />
            </View>
          </View>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Testimonial + Contact */}
      {(sections.testimonial.enabled || sections.contact.enabled) && (
        <Page size={[pageSize.width, pageSize.height]} style={styles.page}>
          {isLandscape ? (
            <View style={styles.twoColumnLayout}>
              {sections.testimonial.enabled && sections.testimonial.quote && (
                <View style={styles.column}>
                  <View style={styles.testimonialBox}>
                    <Text style={styles.testimonialQuote}>"{sections.testimonial.quote}"</Text>
                    <Text style={styles.testimonialAuthor}>{sections.testimonial.author}</Text>
                    {sections.testimonial.company && (
                      <Text style={styles.testimonialCompany}>{sections.testimonial.company}</Text>
                    )}
                  </View>
                </View>
              )}
              {sections.contact.enabled && (
                <View style={[styles.column, styles.contactSection]}>
                  <Text style={styles.sectionTitleCentered}>Intéressé ?</Text>
                  <Image src={BASE64_ASSETS.barMd} style={[styles.gradientBarSmall, { marginBottom: 24 }]} />
                  <View style={styles.ctaButton}>
                    <Text style={styles.ctaText}>{sections.contact.cta_text}</Text>
                  </View>
                  {sections.contact.show_coordinates && (
                    <Text style={styles.coordinates}>Bayonne · France · nlq@iarche.fr</Text>
                  )}
                </View>
              )}
            </View>
          ) : (
            <>
              {sections.testimonial.enabled && sections.testimonial.quote && (
                <View style={[styles.testimonialBox, { marginBottom: 44 }]}>
                  <Text style={styles.testimonialQuote}>"{sections.testimonial.quote}"</Text>
                  <Text style={styles.testimonialAuthor}>{sections.testimonial.author}</Text>
                  {sections.testimonial.company && (
                    <Text style={styles.testimonialCompany}>{sections.testimonial.company}</Text>
                  )}
                </View>
              )}
              {sections.contact.enabled && (
                <View style={styles.contactSection}>
                  <Text style={styles.sectionTitleCentered}>Intéressé ?</Text>
                  <Image src={BASE64_ASSETS.barMd} style={[styles.gradientBarSmall, { marginBottom: 24 }]} />
                  <View style={styles.ctaButton}>
                    <Text style={styles.ctaText}>{sections.contact.cta_text}</Text>
                  </View>
                  {sections.contact.show_coordinates && (
                    <Text style={styles.coordinates}>Bayonne · France · nlq@iarche.fr</Text>
                  )}
                </View>
              )}
            </>
          )}
          
          {/* Footer */}
          <View style={styles.footer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.footerLogo}>IArche</Text>
              <Image src={BASE64_ASSETS.barSm} style={{ width: 32, height: 2 }} />
            </View>
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
          Export optimisé avec la charte graphique IArche.
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
