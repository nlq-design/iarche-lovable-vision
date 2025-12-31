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
  NumberFormat,
} from "https://esm.sh/docx@8.5.0";
import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// IArche Design System Colors
const COLORS = {
  bleuNuit: '1A2B4A',
  terracotta: 'B04A32',
  blancCasse: 'FAF9F7',
  white: 'FFFFFF',
  muted: '6B7280',
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

interface RequestBody {
  title: string;
  sections: DocumentSection[];
  metadata: DocumentMetadata;
  theme: DocumentTheme;
  documentType: 'quote' | 'spec' | 'proposal';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { title, sections, metadata, theme, documentType } = body;

    console.log('Generating DOCX for:', title);

    // Convert hex color to DOCX format (remove #)
    const primaryColor = theme?.primaryColor?.replace('#', '') || COLORS.bleuNuit;
    const accentColor = theme?.accentColor?.replace('#', '') || COLORS.terracotta;

    // Build document sections
    const documentSections: Paragraph[] = [];

    // Title
    documentSections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: 56, // 28pt
            color: primaryColor,
            font: 'Calibri',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    // Subtitle with document type
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
            size: 24, // 12pt
            color: accentColor,
            allCaps: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
      })
    );

    // Client info
    if (metadata?.clientCompany || metadata?.clientName) {
      documentSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: metadata.clientCompany || '',
              bold: true,
              size: 28, // 14pt
              color: COLORS.muted,
            }),
          ],
          alignment: AlignmentType.CENTER,
        })
      );
      
      if (metadata.clientName) {
        documentSections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `À l'attention de ${metadata.clientName}`,
                size: 22, // 11pt
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

    // Gradient bar (visual separator)
    documentSections.push(
      new Paragraph({
        border: {
          bottom: {
            color: accentColor,
            space: 1,
            style: BorderStyle.SINGLE,
            size: 24, // 3pt
          },
        },
        spacing: { after: 600 },
      })
    );

    // Table of contents for longer documents
    if (sections.length > 3) {
      documentSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'SOMMAIRE',
              bold: true,
              size: 28,
              color: primaryColor,
            }),
          ],
          spacing: { after: 200 },
        })
      );

      sections.forEach((section, index) => {
        documentSections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${index + 1}. ${section.title}`,
                size: 22,
                color: COLORS.muted,
              }),
            ],
            spacing: { after: 100 },
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

    // Content sections
    sections.forEach((section, index) => {
      // Section number badge
      documentSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${index + 1}`,
              bold: true,
              size: 24,
              color: COLORS.white,
              shading: {
                fill: accentColor,
              },
            }),
            new TextRun({
              text: `  ${section.title}`,
              bold: true,
              size: 32, // 16pt
              color: primaryColor,
            }),
          ],
          spacing: { before: 400, after: 200 },
          heading: HeadingLevel.HEADING_2,
        })
      );

      // Section content - parse markdown-like formatting
      const contentLines = section.content.split('\n');
      contentLines.forEach(line => {
        if (line.trim() === '') {
          documentSections.push(new Paragraph({ children: [] }));
          return;
        }

        // Handle bullet points
        if (line.startsWith('- ') || line.startsWith('• ')) {
          documentSections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: line.substring(2),
                  size: 22,
                }),
              ],
              bullet: { level: 0 },
              spacing: { after: 100 },
            })
          );
          return;
        }

        // Regular paragraph
        const textRuns: TextRun[] = [];
        let currentText = line;
        
        // Simple bold handling (**text**)
        const boldRegex = /\*\*(.*?)\*\*/g;
        let lastIndex = 0;
        let match;
        
        while ((match = boldRegex.exec(currentText)) !== null) {
          if (match.index > lastIndex) {
            textRuns.push(new TextRun({
              text: currentText.substring(lastIndex, match.index),
              size: 22,
            }));
          }
          textRuns.push(new TextRun({
            text: match[1],
            bold: true,
            size: 22,
          }));
          lastIndex = match.index + match[0].length;
        }
        
        if (lastIndex < currentText.length) {
          textRuns.push(new TextRun({
            text: currentText.substring(lastIndex),
            size: 22,
          }));
        }
        
        if (textRuns.length === 0) {
          textRuns.push(new TextRun({
            text: line,
            size: 22,
          }));
        }

        documentSections.push(
          new Paragraph({
            children: textRuns,
            spacing: { after: 120 },
          })
        );
      });

      // Section separator
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
            spacing: { before: 300, after: 300 },
          })
        );
      }
    });

    // Amount for quotes
    if (documentType === 'quote' && metadata?.totalAmount) {
      documentSections.push(
        new Paragraph({
          children: [],
          spacing: { before: 600 },
        })
      );

      documentSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'MONTANT TOTAL : ',
              bold: true,
              size: 28,
              color: primaryColor,
            }),
            new TextRun({
              text: new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: metadata.currency || 'EUR',
              }).format(metadata.totalAmount),
              bold: true,
              size: 36,
              color: accentColor,
            }),
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { before: 400 },
          border: {
            top: {
              color: accentColor,
              space: 1,
              style: BorderStyle.SINGLE,
              size: 12,
            },
          },
        })
      );

      if (metadata.validityDate) {
        documentSections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Validité : ${metadata.validityDate}`,
                size: 20,
                color: COLORS.muted,
                italics: true,
              }),
            ],
            alignment: AlignmentType.RIGHT,
          })
        );
      }
    }

    // Create the document
    const doc = new Document({
      creator: 'IArche Cockpit',
      title: title,
      description: `${typeLabels[documentType]} - ${metadata?.clientCompany || 'Client'}`,
      styles: {
        default: {
          document: {
            run: {
              font: 'Calibri',
              size: 22,
            },
          },
        },
      },
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'IArche',
                    bold: true,
                    size: 20,
                    color: primaryColor,
                  }),
                  new TextRun({
                    text: '  |  ' + title,
                    size: 18,
                    color: COLORS.muted,
                  }),
                ],
                alignment: AlignmentType.RIGHT,
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
                    text: 'IArche - Architecture de Solutions IA',
                    size: 16,
                    color: COLORS.muted,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Page ',
                    size: 16,
                    color: COLORS.muted,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: COLORS.muted,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
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
