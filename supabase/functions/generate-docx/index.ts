import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  Document, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  Packer,
  Header,
  Footer,
  PageNumber,
  ImageRun,
  convertInchesToTwip,
} from "https://esm.sh/docx@8.5.0";
import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// IArche Design System Colors - v4.0
const COLORS = {
  bleuNuit: '1A2B4A',
  terracotta: 'B04A32',
  blancCasse: 'FAF9F7',
  white: 'FFFFFF',
  muted: '6B7280',
  grisTexte: '4A5568',
};

// Typography settings matching charte graphique
const TYPOGRAPHY = {
  display: { size: 56, bold: true, letterSpacing: -20 }, // 28pt
  heading1: { size: 44, bold: true }, // 22pt
  heading2: { size: 32, bold: true }, // 16pt
  body: { size: 22 }, // 11pt
  small: { size: 18 }, // 9pt
  caption: { size: 16 }, // 8pt
};

interface DocumentSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

interface DocumentMetadata {
  clientName?: string;
  clientCompany?: string;
  projectName?: string;
  validityDate?: string;
  totalAmount?: number;
  currency?: string;
}

interface DocumentTheme {
  primaryColor: string;
  accentColor: string;
  useGradient: boolean;
}

interface ExportSettings {
  header?: {
    companyName?: string;
    tagline?: string;
    showLogo?: boolean;
  };
  footer?: {
    line1?: string;
    line2?: string;
    showPageNumbers?: boolean;
  };
}

interface RequestBody {
  title: string;
  sections: DocumentSection[];
  metadata: DocumentMetadata;
  theme: DocumentTheme;
  documentType: 'quote' | 'spec' | 'proposal';
  exportSettings?: ExportSettings;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { title, sections: rawSections, metadata, theme, documentType, exportSettings } = body;

    // Ensure sections is always an array
    const sections: DocumentSection[] = Array.isArray(rawSections) ? rawSections : [];
    
    console.log('Generating DOCX for:', title, '- Sections:', sections.length);

    if (!title) {
      throw new Error('Title is required');
    }

    // Export settings with defaults
    const headerSettings = {
      companyName: exportSettings?.header?.companyName ?? 'IArche',
      tagline: exportSettings?.header?.tagline ?? 'Architecture de Solutions IA',
      showLogo: exportSettings?.header?.showLogo ?? true,
    };
    const footerSettings = {
      line1: exportSettings?.footer?.line1 ?? 'IArche - Conseil en Architecture IA & Transformation Digitale',
      line2: exportSettings?.footer?.line2 ?? 'contact@iarche.fr  •  www.iarche.fr',
      showPageNumbers: exportSettings?.footer?.showPageNumbers ?? true,
    };

    // Convert hex color to DOCX format (remove #)
    const primaryColor = theme?.primaryColor?.replace('#', '') || COLORS.bleuNuit;
    const accentColor = theme?.accentColor?.replace('#', '') || COLORS.terracotta;

    // Build document sections
    const documentSections: Paragraph[] = [];

    // ============ COVER PAGE ============
    
    // Document type badge
    const typeLabels: Record<string, string> = {
      quote: 'DEVIS COMMERCIAL',
      spec: 'CAHIER DES CHARGES',
      proposal: 'PROPOSITION COMMERCIALE',
    };

    documentSections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: typeLabels[documentType] || 'DOCUMENT',
            bold: true,
            size: TYPOGRAPHY.small.size,
            color: accentColor,
            allCaps: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 1200, after: 400 },
      })
    );

    // Main title - Display typography
    documentSections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: TYPOGRAPHY.display.size,
            color: primaryColor,
            font: 'Calibri',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );

    // Gradient bar separator (visual representation)
    documentSections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '━━━━━━━━━━━━━━━━━━━━',
            color: accentColor,
            size: 16,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
      })
    );

    // Client info block
    if (metadata?.clientCompany || metadata?.clientName) {
      documentSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Préparé pour',
              size: TYPOGRAPHY.small.size,
              color: COLORS.muted,
              italics: true,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 400 },
        })
      );

      if (metadata.clientCompany) {
        documentSections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: metadata.clientCompany,
                bold: true,
                size: TYPOGRAPHY.heading1.size,
                color: COLORS.grisTexte,
              }),
            ],
            alignment: AlignmentType.CENTER,
          })
        );
      }
      
      if (metadata.clientName) {
        documentSections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `À l'attention de ${metadata.clientName}`,
                size: TYPOGRAPHY.body.size,
                color: COLORS.muted,
                italics: true,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 800 },
          })
        );
      }
    }

    // Date
    documentSections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: new Date().toLocaleDateString('fr-FR', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            }),
            size: TYPOGRAPHY.body.size,
            color: COLORS.muted,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 1200 },
      })
    );

    // Page break after cover
    documentSections.push(
      new Paragraph({
        children: [],
        pageBreakBefore: true,
      })
    );

    // ============ TABLE OF CONTENTS ============
    if (sections.length > 3) {
      documentSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'SOMMAIRE',
              bold: true,
              size: TYPOGRAPHY.heading1.size,
              color: primaryColor,
            }),
          ],
          spacing: { after: 400 },
        })
      );

      // Gradient bar under title
      documentSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '━━━━━━━━',
              color: accentColor,
              size: 12,
            }),
          ],
          spacing: { after: 400 },
        })
      );

      sections.forEach((section, index) => {
        documentSections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${(index + 1).toString().padStart(2, '0')}`,
                bold: true,
                size: TYPOGRAPHY.body.size,
                color: accentColor,
              }),
              new TextRun({
                text: `   ${section.title}`,
                size: TYPOGRAPHY.body.size,
                color: COLORS.grisTexte,
              }),
            ],
            spacing: { after: 150 },
          })
        );
      });

      // Page break after TOC
      documentSections.push(
        new Paragraph({
          children: [],
          pageBreakBefore: true,
        })
      );
    }

    // ============ CONTENT SECTIONS ============
    sections.forEach((section, index) => {
      // Section header with number badge
      documentSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: ` ${(index + 1).toString().padStart(2, '0')} `,
              bold: true,
              size: TYPOGRAPHY.body.size,
              color: COLORS.white,
              shading: { fill: accentColor },
            }),
            new TextRun({
              text: `   ${section.title}`,
              bold: true,
              size: TYPOGRAPHY.heading2.size,
              color: primaryColor,
            }),
          ],
          spacing: { before: 600, after: 200 },
          heading: HeadingLevel.HEADING_2,
        })
      );

      // Gradient bar under section title
      documentSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '━━━━',
              color: accentColor,
              size: 10,
            }),
          ],
          spacing: { after: 300 },
        })
      );

      // Section content - parse markdown-like formatting
      const contentLines = section.content.split('\n');
      contentLines.forEach(line => {
        if (line.trim() === '') {
          documentSections.push(new Paragraph({ children: [], spacing: { after: 100 } }));
          return;
        }

        // Handle bullet points
        if (line.startsWith('- ') || line.startsWith('• ')) {
          documentSections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: line.substring(2),
                  size: TYPOGRAPHY.body.size,
                  color: COLORS.grisTexte,
                }),
              ],
              bullet: { level: 0 },
              spacing: { after: 80 },
            })
          );
          return;
        }

        // Handle sub-bullets
        if (line.startsWith('  - ') || line.startsWith('  • ')) {
          documentSections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: line.substring(4),
                  size: TYPOGRAPHY.body.size,
                  color: COLORS.grisTexte,
                }),
              ],
              bullet: { level: 1 },
              spacing: { after: 60 },
            })
          );
          return;
        }

        // Regular paragraph with bold handling
        const textRuns: TextRun[] = [];
        let currentText = line;
        
        // Bold handling (**text**)
        const boldRegex = /\*\*(.*?)\*\*/g;
        let lastIndex = 0;
        let match;
        
        while ((match = boldRegex.exec(currentText)) !== null) {
          if (match.index > lastIndex) {
            textRuns.push(new TextRun({
              text: currentText.substring(lastIndex, match.index),
              size: TYPOGRAPHY.body.size,
              color: COLORS.grisTexte,
            }));
          }
          textRuns.push(new TextRun({
            text: match[1],
            bold: true,
            size: TYPOGRAPHY.body.size,
            color: primaryColor,
          }));
          lastIndex = match.index + match[0].length;
        }
        
        if (lastIndex < currentText.length) {
          textRuns.push(new TextRun({
            text: currentText.substring(lastIndex),
            size: TYPOGRAPHY.body.size,
            color: COLORS.grisTexte,
          }));
        }
        
        if (textRuns.length === 0) {
          textRuns.push(new TextRun({
            text: line,
            size: TYPOGRAPHY.body.size,
            color: COLORS.grisTexte,
          }));
        }

        documentSections.push(
          new Paragraph({
            children: textRuns,
            spacing: { after: 120, line: 276 }, // 1.15 line spacing
          })
        );
      });

      // Section separator (except last)
      if (index < sections.length - 1) {
        documentSections.push(
          new Paragraph({
            border: {
              bottom: {
                color: 'E8E4DD',
                space: 1,
                style: BorderStyle.SINGLE,
                size: 6,
              },
            },
            spacing: { before: 400, after: 400 },
          })
        );
      }
    });

    // ============ AMOUNT FOR QUOTES ============
    if (documentType === 'quote' && metadata?.totalAmount) {
      documentSections.push(
        new Paragraph({
          children: [],
          spacing: { before: 800 },
        })
      );

      documentSections.push(
        new Paragraph({
          border: {
            top: {
              color: accentColor,
              space: 1,
              style: BorderStyle.SINGLE,
              size: 18,
            },
          },
          spacing: { after: 200 },
        })
      );

      documentSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'MONTANT TOTAL HT : ',
              bold: true,
              size: TYPOGRAPHY.heading2.size,
              color: primaryColor,
            }),
            new TextRun({
              text: new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: metadata.currency || 'EUR',
              }).format(metadata.totalAmount),
              bold: true,
              size: TYPOGRAPHY.heading1.size,
              color: accentColor,
            }),
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { before: 200 },
        })
      );

      if (metadata.validityDate) {
        documentSections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Devis valable jusqu'au ${new Date(metadata.validityDate).toLocaleDateString('fr-FR')}`,
                size: TYPOGRAPHY.small.size,
                color: COLORS.muted,
                italics: true,
              }),
            ],
            alignment: AlignmentType.RIGHT,
          })
        );
      }
    }

    // ============ CREATE DOCUMENT ============
    const doc = new Document({
      creator: 'IArche Cockpit',
      title: title,
      description: `${typeLabels[documentType]} - ${metadata?.clientCompany || 'Client'}`,
      styles: {
        default: {
          document: {
            run: {
              font: 'Calibri',
              size: TYPOGRAPHY.body.size,
            },
          },
        },
        paragraphStyles: [
          {
            id: "Normal",
            name: "Normal",
            run: {
              font: "Calibri",
              size: TYPOGRAPHY.body.size,
              color: COLORS.grisTexte,
            },
            paragraph: {
              spacing: { line: 276 },
            },
          },
        ],
      },
      sections: [{
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: headerSettings.companyName,
                    bold: true,
                    size: TYPOGRAPHY.small.size,
                    color: primaryColor,
                  }),
                  new TextRun({
                    text: `  •  ${headerSettings.tagline}`,
                    size: TYPOGRAPHY.caption.size,
                    color: COLORS.muted,
                  }),
                ],
                alignment: AlignmentType.LEFT,
                border: {
                  bottom: {
                    color: 'E8E4DD',
                    space: 4,
                    style: BorderStyle.SINGLE,
                    size: 4,
                  },
                },
                spacing: { after: 200 },
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: '━━━━',
                    color: accentColor,
                    size: 8,
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 200 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: footerSettings.line1,
                    size: TYPOGRAPHY.caption.size,
                    color: COLORS.muted,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: footerSettings.line2,
                    size: TYPOGRAPHY.caption.size,
                    color: COLORS.muted,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
              ...(footerSettings.showPageNumbers ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Page ',
                      size: TYPOGRAPHY.caption.size,
                      color: COLORS.muted,
                    }),
                    new TextRun({
                      children: [PageNumber.CURRENT],
                      size: TYPOGRAPHY.caption.size,
                      color: COLORS.muted,
                    }),
                    new TextRun({
                      text: ' / ',
                      size: TYPOGRAPHY.caption.size,
                      color: COLORS.muted,
                    }),
                    new TextRun({
                      children: [PageNumber.TOTAL_PAGES],
                      size: TYPOGRAPHY.caption.size,
                      color: COLORS.muted,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 100 },
                }),
              ] : []),
            ],
          }),
        },
        children: documentSections,
      }],
    });

    // Generate the DOCX file
    const buffer = await Packer.toBuffer(doc);
    const base64 = encode(buffer);

    console.log('DOCX generated successfully, size:', buffer.length, 'bytes');

    return new Response(
      JSON.stringify({ 
        docxBase64: base64,
        filename: `${title.replace(/[^a-zA-Z0-9]/g, '_')}.docx`,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (err) {
    console.error('Error generating DOCX:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
