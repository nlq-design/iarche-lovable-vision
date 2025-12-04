import { Document, Page, Text, View, StyleSheet, pdf, Image } from '@react-pdf/renderer';
import { Brochure, PDFOrientation } from '@/types/brochure';
import { COLORS, FONTS } from '@/components/admin/medias/shared/tokens';
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
  const dims = isLandscape ? A4_LANDSCAPE : A4_PORTRAIT;
  
  const primaryColor = customColors?.primary || COLORS.bleuNuit;
  const accentColor = customColors?.accent || COLORS.terracotta;
  
  return StyleSheet.create({
    page: {
      backgroundColor: COLORS.blancCasse,
      padding: isLandscape ? 30 : 40,
      fontFamily: FONTS.pdf.secondary,
    },
    coverPage: {
      backgroundColor: COLORS.blancCasse,
      padding: isLandscape ? 30 : 40,
      fontFamily: FONTS.pdf.secondary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    gradientBar: {
      width: isLandscape ? 120 : 80,
      height: isLandscape ? 6 : 4,
      marginBottom: 20,
    },
    coverTitle: {
      fontSize: isLandscape ? 56 : 48,
      fontFamily: FONTS.pdf.primary,
      color: primaryColor,
      textAlign: 'center',
      marginBottom: 12,
    },
    coverSubtitle: {
      fontSize: isLandscape ? 20 : 18,
      color: COLORS.muted,
      textAlign: 'center',
      maxWidth: isLandscape ? 600 : 400,
    },
    sectionTitle: {
      fontSize: isLandscape ? 28 : 24,
      fontFamily: FONTS.pdf.primary,
      color: primaryColor,
      marginBottom: 16,
    },
    paragraph: {
      fontSize: isLandscape ? 12 : 11,
      lineHeight: 1.6,
      color: COLORS.foreground,
      marginBottom: 12,
    },
    keyPointsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    keyPointCard: {
      width: isLandscape ? '31%' : '48%',
      backgroundColor: COLORS.white,
      padding: isLandscape ? 12 : 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    keyPointTitle: {
      fontSize: isLandscape ? 11 : 12,
      fontFamily: FONTS.pdf.primary,
      color: primaryColor,
      marginBottom: 6,
    },
    keyPointDesc: {
      fontSize: isLandscape ? 9 : 10,
      color: COLORS.muted,
      lineHeight: 1.4,
    },
    pricingGrid: {
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'center',
    },
    pricingCard: {
      width: isLandscape ? 200 : 160,
      backgroundColor: COLORS.white,
      padding: isLandscape ? 12 : 16,
      borderRadius: 8,
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
      fontSize: isLandscape ? 11 : 10,
      color: COLORS.muted,
      marginBottom: 12,
    },
    pricingFeature: {
      fontSize: isLandscape ? 10 : 9,
      color: COLORS.foreground,
      marginBottom: 4,
    },
    testimonialBox: {
      backgroundColor: COLORS.bleuNuitLight10,
      padding: isLandscape ? 20 : 24,
      borderRadius: 8,
      borderLeftWidth: 4,
      borderLeftColor: accentColor,
    },
    testimonialQuote: {
      fontSize: isLandscape ? 14 : 12,
      fontStyle: 'italic',
      color: COLORS.foreground,
      marginBottom: 12,
      lineHeight: 1.6,
    },
    testimonialAuthor: {
      fontSize: isLandscape ? 12 : 11,
      fontFamily: FONTS.pdf.primary,
      color: primaryColor,
    },
    testimonialCompany: {
      fontSize: isLandscape ? 11 : 10,
      color: COLORS.muted,
    },
    contactSection: {
      alignItems: 'center',
      paddingTop: isLandscape ? 30 : 40,
    },
    ctaButton: {
      backgroundColor: accentColor,
      paddingHorizontal: isLandscape ? 40 : 32,
      paddingVertical: isLandscape ? 14 : 12,
      borderRadius: 8,
    },
    ctaText: {
      color: COLORS.white,
      fontSize: isLandscape ? 16 : 14,
      fontFamily: FONTS.pdf.primary,
    },
    coordinates: {
      marginTop: 16,
      fontSize: isLandscape ? 11 : 10,
      color: COLORS.muted,
    },
    footer: {
      position: 'absolute',
      bottom: 20,
      left: isLandscape ? 30 : 40,
      right: isLandscape ? 30 : 40,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    footerLogo: {
      fontSize: isLandscape ? 16 : 14,
      fontFamily: FONTS.pdf.primary,
      color: primaryColor,
    },
    footerText: {
      fontSize: isLandscape ? 10 : 9,
      color: COLORS.muted,
    },
    pageNumber: {
      position: 'absolute',
      bottom: 20,
      right: isLandscape ? 30 : 40,
      fontSize: isLandscape ? 10 : 9,
      color: COLORS.muted,
    },
    twoColumnLayout: {
      flexDirection: 'row',
      gap: 24,
    },
    column: {
      flex: 1,
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
        <Image src={BASE64_ASSETS.barMd} style={styles.gradientBar} />
        <Text style={styles.coverTitle}>{brochure.cover_title}</Text>
        {brochure.cover_subtitle && (
          <Text style={styles.coverSubtitle}>{brochure.cover_subtitle}</Text>
        )}
        <View style={styles.footer}>
          <Text style={styles.footerLogo}>IArche</Text>
          <Text style={styles.footerText}>iarche.fr</Text>
        </View>
      </Page>

      {/* Introduction + Key Points - Landscape can fit both */}
      {(sections.introduction.enabled || sections.keyPoints.enabled) && (
        <Page size={[pageSize.width, pageSize.height]} style={styles.page}>
          {isLandscape ? (
            <View style={styles.twoColumnLayout}>
              {sections.introduction.enabled && sections.introduction.content && (
                <View style={styles.column}>
                  <Text style={styles.sectionTitle}>Présentation</Text>
                  <Text style={styles.paragraph}>{sections.introduction.content}</Text>
                </View>
              )}
              {sections.keyPoints.enabled && sections.keyPoints.points.length > 0 && (
                <View style={[styles.column, { flex: sections.introduction.enabled ? 1.5 : 1 }]}>
                  <Text style={styles.sectionTitle}>Points clés</Text>
                  <View style={styles.keyPointsGrid}>
                    {sections.keyPoints.points.map((point) => (
                      <View key={point.id} style={styles.keyPointCard}>
                        <Text style={styles.keyPointTitle}>✓ {point.title}</Text>
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
                <View style={{ marginBottom: 32 }}>
                  <Text style={styles.sectionTitle}>Présentation</Text>
                  <Text style={styles.paragraph}>{sections.introduction.content}</Text>
                </View>
              )}
              {sections.keyPoints.enabled && sections.keyPoints.points.length > 0 && (
                <View>
                  <Text style={styles.sectionTitle}>Points clés</Text>
                  <View style={styles.keyPointsGrid}>
                    {sections.keyPoints.points.map((point) => (
                      <View key={point.id} style={styles.keyPointCard}>
                        <Text style={styles.keyPointTitle}>✓ {point.title}</Text>
                        <Text style={styles.keyPointDesc}>{point.description}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Details */}
      {sections.details.enabled && sections.details.content && (
        <Page size={[pageSize.width, pageSize.height]} style={styles.page}>
          <Text style={styles.sectionTitle}>Détails</Text>
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
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Pricing */}
      {sections.pricing.enabled && sections.pricing.plans.length > 0 && (
        <Page size={[pageSize.width, pageSize.height]} style={styles.page}>
          <Text style={[styles.sectionTitle, { textAlign: 'center' }]}>{sections.pricing.title}</Text>
          <View style={styles.pricingGrid}>
            {sections.pricing.plans.map((plan) => (
              <View key={plan.id} style={[styles.pricingCard, plan.highlighted && styles.pricingCardHighlighted]}>
                <Text style={styles.pricingName}>{plan.name}</Text>
                <Text style={styles.pricingPrice}>{plan.price}</Text>
                {plan.period && <Text style={styles.pricingPeriod}>{plan.period}</Text>}
                {plan.features.map((feature, i) => (
                  <Text key={i} style={styles.pricingFeature}>• {feature}</Text>
                ))}
              </View>
            ))}
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
                  <Text style={[styles.sectionTitle, { textAlign: 'center' }]}>Intéressé ?</Text>
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
                <View style={[styles.testimonialBox, { marginBottom: 40 }]}>
                  <Text style={styles.testimonialQuote}>"{sections.testimonial.quote}"</Text>
                  <Text style={styles.testimonialAuthor}>{sections.testimonial.author}</Text>
                  {sections.testimonial.company && (
                    <Text style={styles.testimonialCompany}>{sections.testimonial.company}</Text>
                  )}
                </View>
              )}
              {sections.contact.enabled && (
                <View style={styles.contactSection}>
                  <Text style={[styles.sectionTitle, { textAlign: 'center' }]}>Intéressé ?</Text>
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
          <View style={styles.footer}>
            <Text style={styles.footerLogo}>IArche</Text>
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
      toast({ title: 'PDF téléchargé' });
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de générer le PDF', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Export PDF A4</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <p className="text-muted-foreground">
          Téléchargez la brochure "<span className="font-medium text-foreground">{brochure.title}</span>" au format PDF.
        </p>

        <div className="space-y-3">
          <Label className="text-sm font-medium">Orientation</Label>
          <RadioGroup value={orientation} onValueChange={(v) => setOrientation(v as PDFOrientation)}>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="portrait" id="portrait" />
                <Label htmlFor="portrait" className="flex items-center gap-2 cursor-pointer">
                  <div className="w-6 h-8 border-2 border-current rounded-sm" />
                  Portrait
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="landscape" id="landscape" />
                <Label htmlFor="landscape" className="flex items-center gap-2 cursor-pointer">
                  <div className="w-8 h-6 border-2 border-current rounded-sm" />
                  Paysage
                </Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        <div className="bg-secondary/50 rounded-lg p-3 text-sm text-muted-foreground">
          <strong className="text-foreground">Format A4</strong> · {orientation === 'portrait' ? '210 × 297 mm' : '297 × 210 mm'}
          <br />
          Les sections seront automatiquement paginées et optimisées pour l'impression.
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Annuler
          </Button>
          <Button onClick={handleDownload} className="flex-1" disabled={isGenerating}>
            <Download className="h-4 w-4 mr-2" />
            {isGenerating ? 'Génération...' : 'Télécharger'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BrochurePDFExport;
