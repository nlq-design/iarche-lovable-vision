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

// Alert block colors
const ALERT_COLORS = {
  info: { bg: 'E0F2FE', border: '0EA5E9', text: '0C4A6E' },
  warning: { bg: 'FEF3C7', border: 'F59E0B', text: '78350F' },
  success: { bg: 'DCFCE7', border: '22C55E', text: '14532D' },
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

// ============ HTML CONTENT PARSER ============
// Parses TipTap HTML output and converts to DOCX elements

function parseHtmlContent(html: string, primaryColor: string, accentColor: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  
  // If content is empty or just whitespace
  if (!html || !html.trim()) {
    return paragraphs;
  }
  
  // Simple HTML tag regex patterns
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  const alertRegex = /<div class="alert-block alert-(\w+)"[^>]*>([\s\S]*?)<\/div>/gi;
  const columnsRegex = /<div class="columns-(\d)"[^>]*>([\s\S]*?)<\/div>/gi;
  const ulRegex = /<ul[^>]*>([\s\S]*?)<\/ul>/gi;
  const olRegex = /<ol[^>]*>([\s\S]*?)<\/ol>/gi;
  const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  const h3Regex = /<h3[^>]*>([\s\S]*?)<\/h3>/gi;
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  
  // Strip tags helper
  const stripTags = (text: string): string => {
    return text
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  };
  
  // Parse inline formatting (bold, italic)
  const parseInlineFormatting = (text: string): TextRun[] => {
    const runs: TextRun[] = [];
    const cleanText = text
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/&nbsp;/g, ' ');
    
    // Pattern to match <strong>...</strong> and <em>...</em>
    let remaining = cleanText;
    const strongRegex = /<strong[^>]*>([\s\S]*?)<\/strong>/gi;
    const emRegex = /<em[^>]*>([\s\S]*?)<\/em>/gi;
    
    // Simple parsing - find strong tags first
    let lastIndex = 0;
    let match;
    
    while ((match = strongRegex.exec(cleanText)) !== null) {
      // Add text before this match
      if (match.index > lastIndex) {
        const beforeText = stripTags(cleanText.substring(lastIndex, match.index));
        if (beforeText) {
          runs.push(new TextRun({
            text: beforeText,
            size: TYPOGRAPHY.body.size,
            color: COLORS.grisTexte,
          }));
        }
      }
      // Add bold text
      runs.push(new TextRun({
        text: stripTags(match[1]),
        bold: true,
        size: TYPOGRAPHY.body.size,
        color: primaryColor,
      }));
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < cleanText.length) {
      const afterText = stripTags(cleanText.substring(lastIndex));
      if (afterText) {
        runs.push(new TextRun({
          text: afterText,
          size: TYPOGRAPHY.body.size,
          color: COLORS.grisTexte,
        }));
      }
    }
    
    // If no formatting found, just return plain text
    if (runs.length === 0) {
      const plainText = stripTags(text);
      if (plainText) {
        runs.push(new TextRun({
          text: plainText,
          size: TYPOGRAPHY.body.size,
          color: COLORS.grisTexte,
        }));
      }
    }
    
    return runs;
  };
  
  // Process content sequentially
  let workingHtml = html;
  
  // Process tables
  let tableMatch;
  while ((tableMatch = tableRegex.exec(html)) !== null) {
    const tableHtml = tableMatch[0];
    const tableContent = tableMatch[1];
    
    // Extract rows
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const rows: TableRow[] = [];
    let rowMatch;
    let isFirstRow = true;
    
    while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
      const rowContent = rowMatch[1];
      const cellRegex = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
      const cells: TableCell[] = [];
      let cellMatch;
      
      while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
        const cellText = stripTags(cellMatch[1]);
        cells.push(
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: cellText,
                    size: TYPOGRAPHY.body.size,
                    color: isFirstRow ? COLORS.white : COLORS.grisTexte,
                    bold: isFirstRow,
                  }),
                ],
              }),
            ],
            shading: isFirstRow ? { fill: primaryColor } : undefined,
          })
        );
      }
      
      if (cells.length > 0) {
        rows.push(new TableRow({ children: cells }));
      }
      isFirstRow = false;
    }
    
    if (rows.length > 0) {
      paragraphs.push(new Paragraph({ children: [], spacing: { before: 200 } }));
      // @ts-ignore - Table is imported but types may mismatch
      paragraphs.push(new Table({
        rows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      }) as unknown as Paragraph);
      paragraphs.push(new Paragraph({ children: [], spacing: { after: 200 } }));
    }
    
    workingHtml = workingHtml.replace(tableHtml, '{{TABLE_PLACEHOLDER}}');
  }
  
  // Process alert blocks
  let alertMatch;
  while ((alertMatch = alertRegex.exec(html)) !== null) {
    const alertType = alertMatch[1] as keyof typeof ALERT_COLORS;
    const alertContent = stripTags(alertMatch[2]);
    const colors = ALERT_COLORS[alertType] || ALERT_COLORS.info;
    
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: alertContent,
            size: TYPOGRAPHY.body.size,
            color: colors.text,
          }),
        ],
        shading: { fill: colors.bg },
        border: {
          left: {
            color: colors.border,
            size: 24,
            style: BorderStyle.SINGLE,
            space: 8,
          },
        },
        spacing: { before: 200, after: 200 },
        indent: { left: 200, right: 200 },
      })
    );
    
    workingHtml = workingHtml.replace(alertMatch[0], '{{ALERT_PLACEHOLDER}}');
  }
  
  // Process headings
  let h2Match;
  while ((h2Match = h2Regex.exec(html)) !== null) {
    const headingText = stripTags(h2Match[1]);
    if (headingText) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: headingText,
              bold: true,
              size: TYPOGRAPHY.heading2.size,
              color: primaryColor,
            }),
          ],
          spacing: { before: 300, after: 150 },
        })
      );
    }
    workingHtml = workingHtml.replace(h2Match[0], '{{H2_PLACEHOLDER}}');
  }
  
  let h3Match;
  while ((h3Match = h3Regex.exec(html)) !== null) {
    const headingText = stripTags(h3Match[1]);
    if (headingText) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: headingText,
              bold: true,
              size: 26, // Between body and heading2
              color: primaryColor,
            }),
          ],
          spacing: { before: 250, after: 100 },
        })
      );
    }
    workingHtml = workingHtml.replace(h3Match[0], '{{H3_PLACEHOLDER}}');
  }
  
  // Process unordered lists
  let ulMatch;
  while ((ulMatch = ulRegex.exec(html)) !== null) {
    const listContent = ulMatch[1];
    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let liMatch;
    
    while ((liMatch = liRegex.exec(listContent)) !== null) {
      const itemText = stripTags(liMatch[1]);
      if (itemText) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: itemText,
                size: TYPOGRAPHY.body.size,
                color: COLORS.grisTexte,
              }),
            ],
            bullet: { level: 0 },
            spacing: { after: 80 },
          })
        );
      }
    }
    workingHtml = workingHtml.replace(ulMatch[0], '{{UL_PLACEHOLDER}}');
  }
  
  // Process ordered lists
  let olMatch;
  let olIndex = 1;
  while ((olMatch = olRegex.exec(html)) !== null) {
    const listContent = olMatch[1];
    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let liMatch;
    olIndex = 1;
    
    while ((liMatch = liRegex.exec(listContent)) !== null) {
      const itemText = stripTags(liMatch[1]);
      if (itemText) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${olIndex}. ${itemText}`,
                size: TYPOGRAPHY.body.size,
                color: COLORS.grisTexte,
              }),
            ],
            spacing: { after: 80 },
            indent: { left: 400 },
          })
        );
        olIndex++;
      }
    }
    workingHtml = workingHtml.replace(olMatch[0], '{{OL_PLACEHOLDER}}');
  }
  
  // Process remaining paragraphs
  let pMatch;
  while ((pMatch = pRegex.exec(html)) !== null) {
    // Skip if already processed as part of other structures
    if (workingHtml.includes(pMatch[0])) {
      const runs = parseInlineFormatting(pMatch[1]);
      if (runs.length > 0) {
        paragraphs.push(
          new Paragraph({
            children: runs,
            spacing: { after: 120, line: 276 },
          })
        );
      }
    }
  }
  
  // If no structured content found, treat as plain text with line breaks
  if (paragraphs.length === 0) {
    const plainText = stripTags(html);
    const lines = plainText.split('\n');
    
    lines.forEach(line => {
      if (line.trim()) {
        // Check for markdown-style bullets (backwards compatibility)
        if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: line.trim().substring(2),
                  size: TYPOGRAPHY.body.size,
                  color: COLORS.grisTexte,
                }),
              ],
              bullet: { level: 0 },
              spacing: { after: 80 },
            })
          );
        } else {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: line.trim(),
                  size: TYPOGRAPHY.body.size,
                  color: COLORS.grisTexte,
                }),
              ],
              spacing: { after: 120, line: 276 },
            })
          );
        }
      }
    });
  }
  
  return paragraphs;
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

      // Parse HTML content from TipTap editor
      const contentElements = parseHtmlContent(section.content, primaryColor, accentColor);
      documentSections.push(...contentElements);

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
