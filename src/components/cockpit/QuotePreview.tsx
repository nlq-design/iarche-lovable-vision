import React, { forwardRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, FileText, Sparkles, Edit } from "lucide-react";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import DOMPurify from 'dompurify';
import './quote-preview.css';

import { DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS_CONFIG, type GeneratedDocument } from '@/hooks/cockpit/useCockpitGeneratedDocuments';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QuotePreviewProps {
  document: GeneratedDocument;
  onBack: () => void;
  onEdit: () => void;
  isEmbedded?: boolean;
  onExportWithCGV?: () => void;
}

interface DocumentSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

interface QuoteMetadata {
  clientName?: string;
  clientCompany?: string;
  clientAddress?: string;
  projectName?: string;
  quoteDate?: string;
  totalHT?: number;
  tvaAmount?: number;
  totalTTC?: number;
  currency?: string;
  billingEntityId?: string;
  billingEntityName?: string;
  tvaRate?: number;
  validityDays?: number;
}

interface DocumentContent {
  sections?: DocumentSection[];
  metadata?: QuoteMetadata;
}

// Parse Markdown table to HTML table
function parseMarkdownTable(content: string): string {
  const lines = content.trim().split('\n');
  const tableLines: string[] = [];
  const otherContent: string[] = [];
  
  let inTable = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true;
      tableLines.push(trimmed);
    } else if (inTable && trimmed === '') {
      inTable = false;
    } else {
      otherContent.push(line);
    }
  }
  
  if (tableLines.length < 2) {
    // No valid table, return original with basic markdown parsing
    return parseBasicMarkdown(content);
  }
  
  // Parse table
  const headerRow = tableLines[0];
  const headerCells = headerRow.split('|').filter(c => c.trim()).map(c => c.trim());
  
  // Skip separator row (line with |---|---|)
  const dataRows = tableLines.slice(2);
  
  let html = '<table class="services-table"><thead><tr>';
  headerCells.forEach(cell => {
    html += `<th>${escapeHtml(cell)}</th>`;
  });
  html += '</tr></thead><tbody>';
  
  dataRows.forEach(row => {
    const cells = row.split('|').filter(c => c.trim() !== '' && !c.match(/^-+$/)).map(c => c.trim());
    if (cells.length > 0) {
      html += '<tr>';
      cells.forEach(cell => {
        html += `<td>${escapeHtml(cell)}</td>`;
      });
      html += '</tr>';
    }
  });
  
  html += '</tbody></table>';
  
  // Add other content after table
  if (otherContent.length > 0) {
    html += '<div class="services-notes">' + parseBasicMarkdown(otherContent.join('\n')) + '</div>';
  }
  
  return html;
}

function parseBasicMarkdown(content: string): string {
  return content
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(.+)$/gm, (match) => {
      if (match.startsWith('<')) return match;
      return `<p>${match}</p>`;
    });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Format currency
function formatCurrency(amount: number | undefined, currency: string = 'EUR'): string {
  if (amount === undefined || isNaN(amount)) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export const QuotePreview = forwardRef<HTMLDivElement, QuotePreviewProps>(
  ({ document, onBack, onEdit, isEmbedded = false, onExportWithCGV }, ref) => {
    const content = document.content_json as DocumentContent;
    const sections = content?.sections || [];
    const metadata = content?.metadata || {};

    const statusConfig = DOCUMENT_STATUS_CONFIG[document.status as keyof typeof DOCUMENT_STATUS_CONFIG];

    // Get specific sections
    const headerSection = sections.find(s => s.id === 'header');
    const objectSection = sections.find(s => s.id === 'object');
    const servicesSection = sections.find(s => s.id === 'services');
    const totalsSection = sections.find(s => s.id === 'totals');
    const paymentSection = sections.find(s => s.id === 'payment');

    // Check for new format
    const hasNewFormat = headerSection || servicesSection;

    // Calculate dates
    const createdDate = new Date(document.created_at || Date.now());
    const validityDays = metadata.validityDays || 30;
    const validityDate = new Date(createdDate);
    validityDate.setDate(validityDate.getDate() + validityDays);

    const handleExportDOCX = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('generate-docx', {
          body: {
            title: document.title,
            sections,
            metadata,
            documentType: 'quote',
          },
        });

        if (error) throw error;

        const blob = new Blob([Uint8Array.from(atob(data.docxBase64), c => c.charCodeAt(0))], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
        const url = URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = `${document.title.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
        link.click();
        URL.revokeObjectURL(url);

        toast.success('Devis exporté en DOCX');
      } catch (error) {
        console.error('Error exporting DOCX:', error);
        toast.error('Erreur lors de l\'export DOCX');
      }
    };

    // Render services content - handle both HTML and Markdown
    const renderServicesContent = () => {
      if (!servicesSection) return null;
      
      const content = servicesSection.content;
      // Check if content is already HTML or Markdown table
      if (content.includes('<table') || content.includes('<div')) {
        return (
          <div 
            className="quote-services-table"
            dangerouslySetInnerHTML={{ 
              __html: DOMPurify.sanitize(content, {
                ADD_TAGS: ['table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'strong', 'em', 'p', 'ul', 'li'],
                ADD_ATTR: ['class', 'style', 'colspan', 'rowspan'],
              })
            }}
          />
        );
      }
      
      // Parse Markdown table
      const htmlContent = parseMarkdownTable(content);
      return (
        <div 
          className="quote-services-table"
          dangerouslySetInnerHTML={{ 
            __html: DOMPurify.sanitize(htmlContent, {
              ADD_TAGS: ['table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'strong', 'em', 'p', 'ul', 'li', 'h3', 'h4', 'br'],
              ADD_ATTR: ['class', 'style', 'colspan', 'rowspan'],
            })
          }}
        />
      );
    };

    // Render payment content - handle Markdown
    const renderPaymentContent = () => {
      if (!paymentSection) return null;
      
      const content = paymentSection.content;
      // Check if content is already HTML
      if (content.includes('<div') || content.includes('<p>')) {
        return (
          <div 
            dangerouslySetInnerHTML={{ 
              __html: DOMPurify.sanitize(content, {
                ADD_TAGS: ['div', 'p', 'h4', 'strong', 'em', 'ul', 'li', 'br'],
                ADD_ATTR: ['class', 'style'],
              })
            }}
          />
        );
      }
      
      // Parse basic Markdown
      const htmlContent = parseBasicMarkdown(content);
      return (
        <div 
          dangerouslySetInnerHTML={{ 
            __html: DOMPurify.sanitize(htmlContent, {
              ADD_TAGS: ['div', 'p', 'h4', 'h3', 'h2', 'strong', 'em', 'ul', 'li', 'br'],
              ADD_ATTR: ['class', 'style'],
            })
          }}
        />
      );
    };

    // If old format, show fallback message
    if (!hasNewFormat) {
      return (
        <div className={isEmbedded ? "" : "p-5 space-y-4"} ref={ref}>
          <Card className="quote-document-card p-8">
            <p className="text-muted-foreground text-center py-8">
              Format de devis non compatible. Veuillez régénérer le document.
            </p>
          </Card>
        </div>
      );
    }

    return (
      <div className={isEmbedded ? "" : "p-5 space-y-4"} ref={ref}>
        {/* Header - only show when not embedded */}
        {!isEmbedded && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Retour
              </Button>
              <h1 className="text-xl font-semibold">{document.title}</h1>
              <Badge variant={statusConfig?.variant || 'secondary'}>
                {statusConfig?.label || document.status}
              </Badge>
              {document.ai_generated && (
                <Badge variant="outline" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  IA
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportDOCX}>
                <Download className="h-4 w-4 mr-1.5" />
                DOCX
              </Button>
              {onExportWithCGV && (
                <Button variant="outline" size="sm" onClick={onExportWithCGV}>
                  <FileText className="h-4 w-4 mr-1.5" />
                  PDF + CGV
                </Button>
              )}
              <Button size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-1.5" />
                Modifier
              </Button>
            </div>
          </div>
        )}

        {/* Quote Document - Professional Invoice Style */}
        <Card 
          className={`quote-document-card ${isEmbedded ? '' : 'max-w-4xl mx-auto'}`}
          ref={isEmbedded ? undefined : ref}
        >
          <CardContent className="p-0">
            {/* Top Bar - Quote Number & Dates */}
            <div className="quote-header-bar">
              <div className="quote-number">
                {document.quote_number || `Devis N° ${document.id.slice(0, 8).toUpperCase()}`}
              </div>
              <div className="quote-dates">
                <span>Date d'émission : {format(createdDate, 'dd MMMM yyyy', { locale: fr })}</span>
                <span>Validité : {format(validityDate, 'dd MMMM yyyy', { locale: fr })}</span>
              </div>
            </div>

            {/* Emitter / Receiver Block */}
            {headerSection && (
              <div 
                className="quote-header-content"
                dangerouslySetInnerHTML={{ 
                  __html: DOMPurify.sanitize(headerSection.content, {
                    ADD_TAGS: ['div', 'h2', 'h3', 'p', 'span', 'strong', 'img'],
                    ADD_ATTR: ['class', 'style', 'src', 'alt'],
                  })
                }}
              />
            )}

            {/* Object */}
            {objectSection && (
              <div className="quote-object">
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(objectSection.content, {
                      ADD_TAGS: ['div', 'h3', 'p', 'strong'],
                      ADD_ATTR: ['class', 'style'],
                    })
                  }}
                />
              </div>
            )}

            {/* Services Table */}
            {servicesSection && (
              <div className="quote-services">
                {renderServicesContent()}
              </div>
            )}

            {/* Totals */}
            {totalsSection ? (
              <div className="quote-totals">
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(totalsSection.content, {
                      ADD_TAGS: ['div', 'span', 'p', 'strong', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
                      ADD_ATTR: ['class', 'style'],
                    })
                  }}
                />
              </div>
            ) : metadata.totalHT !== undefined && (
              <div className="quote-totals">
                <div className="totals-row">
                  <span>Total HT</span>
                  <span>{formatCurrency(metadata.totalHT, metadata.currency)}</span>
                </div>
                <div className="totals-row">
                  <span>TVA {metadata.tvaRate || 20}%</span>
                  <span>{formatCurrency(metadata.tvaAmount, metadata.currency)}</span>
                </div>
                <div className="totals-row total-final">
                  <span>Total TTC</span>
                  <span>{formatCurrency(metadata.totalTTC, metadata.currency)}</span>
                </div>
              </div>
            )}

            {/* Payment Terms */}
            {paymentSection && (
              <div className="quote-payment">
                <h4>Conditions</h4>
                {renderPaymentContent()}
              </div>
            )}

            {/* Footer */}
            <div className="quote-footer">
              <p>
                {document.quote_number || `Devis n°${document.id.slice(0, 8).toUpperCase()}`} — IArche — {format(createdDate, 'yyyy')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* AI Metadata */}
        {!isEmbedded && document.ai_generated && document.ai_metadata && (
          <Card className="max-w-4xl mx-auto">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                <span>Généré par IA</span>
                {(document.ai_metadata as any).model && (
                  <Badge variant="outline" className="text-xs">
                    {(document.ai_metadata as any).model}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }
);

QuotePreview.displayName = 'QuotePreview';
