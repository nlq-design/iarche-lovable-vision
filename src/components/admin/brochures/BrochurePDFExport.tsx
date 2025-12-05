import { Document, Page, Text, View, StyleSheet, pdf, Image, Svg, Path, Rect } from '@react-pdf/renderer';
import { Brochure, PDFOrientation } from '@/types/brochure';
import { COLORS, FONTS, BAR_SIZES } from '@/components/admin/medias/shared/tokens';
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
    <Path
      d="M9 12l2 2 4-4"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Path
      d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
      stroke={color}
      strokeWidth={2}
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

// Mesh Background Pattern Component
const MeshBackground = ({ width, height }: { width: number; height: number }) => {
  const spacing = 20;
  const lines: React.ReactNode[] = [];
  
  // Diagonal lines at 45°
  for (let i = -height; i < width + height; i += spacing) {
    lines.push(
      <Path
        key={`d1-${i}`}
        d={`M ${i} 0 L ${i + height} ${height}`}
        stroke={COLORS.border}
        strokeWidth={0.5}
        opacity={0.15}
      />
    );
  }
  
  // Diagonal lines at -45°
  for (let i = -height; i < width + height; i += spacing) {
    lines.push(
      <Path
        key={`d2-${i}`}
        d={`M ${i + height} 0 L ${i} ${height}`}
        stroke={COLORS.border}
        strokeWidth={0.5}
        opacity={0.1}
      />
    );
  }
  
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
      <Rect width={width} height={height} fill={COLORS.blancCasse} />
      {lines}
    </Svg>
  );
};

// Logo Component with gradient bar
const BrandLogo = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const barSize = size === 'sm' ? BAR_SIZES.sm : size === 'md' ? BAR_SIZES.md : BAR_SIZES.lg;
  const fontSize = size === 'sm' ? 14 : size === 'md' ? 18 : 24;
  
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Image src={BASE64_ASSETS.logoGradient} style={{ width: fontSize * 3.5, height: fontSize * 1.2 }} />
      <Image src={BASE64_ASSETS.barSm} style={{ width: barSize.width / 2, height: barSize.height }} />
    </View>
  );
};

const createStyles = (orientation: PDFOrientation, customColors?: { primary?: string | null; accent?: string | null }) => {
  const isLandscape = orientation === 'landscape';
  const pageSize = isLandscape ? A4_LANDSCAPE : A4_PORTRAIT;
  
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
      lineHeight: 1.6,
    },
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
      backgroundColor: COLORS.white,
      padding: isLandscape ? 14 : 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    keyPointHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    keyPointTitle: {
      fontSize: isLandscape ? 11 : 12,
      fontFamily: FONTS.pdf.primary,
      color: primaryColor,
      flex: 1,
    },
    keyPointDesc: {
      fontSize: isLandscape ? 8 : 9,
      color: COLORS.muted,
      lineHeight: 1.5,
    },
    // Details features list
    featureList: {
      marginTop: 16,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
    },
    featureText: {
      fontSize: isLandscape ? 10 : 9,
      color: COLORS.foreground,
      flex: 1,
    },
    // Pricing
    pricingGrid: {
      flexDirection: 'row',
      gap: 16,
      justifyContent: 'center',
      marginTop: 16,
    },
    pricingCard: {
      width: isLandscape ? 220 : 180,
      backgroundColor: COLORS.white,
      padding: isLandscape ? 20 : 22,
      borderRadius: 10,
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
      marginBottom: 6,
    },
    pricingFeatureText: {
      fontSize: isLandscape ? 9 : 8,
      color: COLORS.foreground,
      flex: 1,
    },
    // Testimonial
    testimonialBox: {
      backgroundColor: COLORS.bleuNuitLight10,
      padding: isLandscape ? 28 : 32,
      borderRadius: 10,
      borderLeftWidth: 4,
      borderLeftColor: accentColor,
    },
    testimonialQuote: {
      fontSize: isLandscape ? 13 : 12,
      fontStyle: 'italic',
      color: COLORS.foreground,
      marginTop: 12,
      marginBottom: 16,
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
      marginTop: 2,
    },
    // Contact
    contactSection: {
      alignItems: 'center',
      paddingTop: isLandscape ? 40 : 50,
    },
    ctaButton: {
      backgroundColor: accentColor,
      paddingHorizontal: isLandscape ? 40 : 32,
      paddingVertical: isLandscape ? 16 : 14,
      borderRadius: 8,
    },
    ctaText: {
      color: COLORS.white,
      fontSize: isLandscape ? 14 : 12,
      fontFamily: FONTS.pdf.primary,
    },
    coordinates: {
      marginTop: 20,
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
    sectionWithBackground: {
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
  const accentColor = custom_colors?.accent || COLORS.terracotta;

  return (
    <Document>
      {/* Cover Page */}
      <Page size={[pageSize.width, pageSize.height]} style={styles.coverPage}>
        <MeshBackground width={pageSize.width} height={pageSize.height} />
        
        <View style={{ zIndex: 1, alignItems: 'center' }}>
          {/* Decorative gradient bar */}
          <Image src={BASE64_ASSETS.barXl} style={styles.gradientBar} />
          
          <Text style={styles.coverTitle}>{brochure.cover_title}</Text>
          {brochure.cover_subtitle && (
            <Text style={styles.coverSubtitle}>{brochure.cover_subtitle}</Text>
          )}
          
          {brochure.cover_image_url && (
            <Image 
              src={brochure.cover_image_url} 
              style={{ 
                marginTop: 32, 
                maxWidth: isLandscape ? 350 : 280, 
                maxHeight: isLandscape ? 200 : 180,
                borderRadius: 8,
              }} 
            />
          )}
        </View>
        
        {/* Footer with logo */}
        <View style={styles.footer}>
          <BrandLogo size="md" />
          <Text style={styles.footerText}>iarche.fr</Text>
        </View>
      </Page>

      {/* Introduction + Key Points */}
      {(sections.introduction.enabled || sections.keyPoints.enabled) && (
        <Page size={[pageSize.width, pageSize.height]} style={styles.page}>
          <MeshBackground width={pageSize.width} height={pageSize.height} />
          
          <View style={{ zIndex: 1 }}>
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
                          <View style={styles.keyPointHeader}>
                            <CheckIcon color={accentColor} size={14} />
                            <Text style={styles.keyPointTitle}>{point.title}</Text>
                          </View>
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
                          <View style={styles.keyPointHeader}>
                            <CheckIcon color={accentColor} size={14} />
                            <Text style={styles.keyPointTitle}>{point.title}</Text>
                          </View>
                          <Text style={styles.keyPointDesc}>{point.description}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
          
          {/* Footer */}
          <View style={styles.footer}>
            <BrandLogo size="sm" />
          </View>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Details */}
      {sections.details.enabled && (sections.details.content || sections.details.features?.length > 0) && (
        <Page size={[pageSize.width, pageSize.height]} style={styles.page}>
          <MeshBackground width={pageSize.width} height={pageSize.height} />
          
          <View style={{ zIndex: 1 }}>
            <Text style={styles.sectionTitle}>Détails</Text>
            <Image src={BASE64_ASSETS.barMd} style={styles.gradientBarSmall} />
            
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
                    <CheckIcon color={accentColor} size={12} />
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

      {/* Pricing */}
      {sections.pricing.enabled && sections.pricing.plans.length > 0 && (
        <Page size={[pageSize.width, pageSize.height]} style={styles.page}>
          <View style={[styles.sectionWithBackground, { position: 'relative' }]}>
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
                    <View key={i} style={styles.pricingFeature}>
                      <CheckIcon color={accentColor} size={10} />
                      <Text style={styles.pricingFeatureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </View>
          
          <View style={styles.footer}>
            <BrandLogo size="sm" />
          </View>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Testimonial + Contact */}
      {(sections.testimonial.enabled || sections.contact.enabled) && (
        <Page size={[pageSize.width, pageSize.height]} style={styles.page}>
          <MeshBackground width={pageSize.width} height={pageSize.height} />
          
          <View style={{ zIndex: 1 }}>
            {isLandscape ? (
              <View style={styles.twoColumnLayout}>
                {sections.testimonial.enabled && sections.testimonial.quote && (
                  <View style={styles.column}>
                    <View style={styles.testimonialBox}>
                      <QuoteIcon color={accentColor} size={28} />
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
                    <Image src={BASE64_ASSETS.barMd} style={[styles.gradientBarSmall, { marginBottom: 28 }]} />
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
                  <View style={[styles.testimonialBox, { marginBottom: 48 }]}>
                    <QuoteIcon color={accentColor} size={28} />
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
                    <Image src={BASE64_ASSETS.barMd} style={[styles.gradientBarSmall, { marginBottom: 28 }]} />
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
          </View>
          
          {/* Footer */}
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
          Export avec mesh background, logo officiel et icônes SVG.
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
