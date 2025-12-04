import { Document, Page, Text, View, StyleSheet, pdf, Image } from '@react-pdf/renderer';
import { Brochure } from '@/types/brochure';
import { COLORS, FONTS } from '@/components/admin/medias/shared/tokens';
import { BASE64_ASSETS } from '@/components/admin/medias/pdf/base64Assets';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const styles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.blancCasse,
    padding: 40,
    fontFamily: FONTS.pdf.secondary,
  },
  coverPage: {
    backgroundColor: COLORS.blancCasse,
    padding: 40,
    fontFamily: FONTS.pdf.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientBar: {
    width: 80,
    height: 4,
    marginBottom: 20,
  },
  coverTitle: {
    fontSize: 48,
    fontFamily: FONTS.pdf.primary,
    color: COLORS.bleuNuit,
    textAlign: 'center',
    marginBottom: 12,
  },
  coverSubtitle: {
    fontSize: 18,
    color: COLORS.muted,
    textAlign: 'center',
    maxWidth: 400,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: FONTS.pdf.primary,
    color: COLORS.bleuNuit,
    marginBottom: 16,
  },
  paragraph: {
    fontSize: 11,
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
    width: '48%',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  keyPointTitle: {
    fontSize: 12,
    fontFamily: FONTS.pdf.primary,
    color: COLORS.bleuNuit,
    marginBottom: 6,
  },
  keyPointDesc: {
    fontSize: 10,
    color: COLORS.muted,
    lineHeight: 1.4,
  },
  pricingGrid: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  pricingCard: {
    width: 160,
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  pricingCardHighlighted: {
    borderColor: COLORS.terracotta,
  },
  pricingName: {
    fontSize: 14,
    fontFamily: FONTS.pdf.primary,
    color: COLORS.bleuNuit,
    marginBottom: 8,
  },
  pricingPrice: {
    fontSize: 24,
    fontFamily: FONTS.pdf.primary,
    color: COLORS.terracotta,
  },
  pricingPeriod: {
    fontSize: 10,
    color: COLORS.muted,
    marginBottom: 12,
  },
  pricingFeature: {
    fontSize: 9,
    color: COLORS.foreground,
    marginBottom: 4,
  },
  testimonialBox: {
    backgroundColor: COLORS.bleuNuitLight10,
    padding: 24,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.terracotta,
  },
  testimonialQuote: {
    fontSize: 12,
    fontStyle: 'italic',
    color: COLORS.foreground,
    marginBottom: 12,
    lineHeight: 1.6,
  },
  testimonialAuthor: {
    fontSize: 11,
    fontFamily: FONTS.pdf.primary,
    color: COLORS.bleuNuit,
  },
  testimonialCompany: {
    fontSize: 10,
    color: COLORS.muted,
  },
  contactSection: {
    alignItems: 'center',
    paddingTop: 40,
  },
  ctaButton: {
    backgroundColor: COLORS.terracotta,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  ctaText: {
    color: COLORS.white,
    fontSize: 14,
    fontFamily: FONTS.pdf.primary,
  },
  coordinates: {
    marginTop: 16,
    fontSize: 10,
    color: COLORS.muted,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLogo: {
    fontSize: 14,
    fontFamily: FONTS.pdf.primary,
    color: COLORS.bleuNuit,
  },
  footerText: {
    fontSize: 9,
    color: COLORS.muted,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 20,
    right: 40,
    fontSize: 9,
    color: COLORS.muted,
  },
});

interface BrochurePDFProps {
  brochure: Brochure;
}

const BrochurePDF = ({ brochure }: BrochurePDFProps) => {
  const { sections } = brochure;

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.coverPage}>
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

      {/* Introduction + Key Points */}
      {(sections.introduction.enabled || sections.keyPoints.enabled) && (
        <Page size="A4" style={styles.page}>
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

          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Details */}
      {sections.details.enabled && sections.details.content && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Détails</Text>
          {sections.details.content.split('\n').map((para, i) => (
            <Text key={i} style={styles.paragraph}>{para}</Text>
          ))}
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Pricing */}
      {sections.pricing.enabled && sections.pricing.plans.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>{sections.pricing.title}</Text>
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
        <Page size="A4" style={styles.page}>
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

  const handleDownload = async () => {
    try {
      const blob = await pdf(<BrochurePDF brochure={brochure} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${brochure.slug || 'brochure'}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: 'PDF téléchargé' });
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de générer le PDF', variant: 'destructive' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Export PDF</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <p className="text-muted-foreground">
          Téléchargez la brochure "{brochure.title}" au format PDF A4.
        </p>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Annuler
          </Button>
          <Button onClick={handleDownload} className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Télécharger
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BrochurePDFExport;
