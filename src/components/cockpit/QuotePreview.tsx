import React, { forwardRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, FileText, Sparkles, Edit } from "lucide-react";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import DOMPurify from 'dompurify';
import './quote-preview.css';

import { DOCUMENT_STATUS_CONFIG, type GeneratedDocument } from '@/hooks/cockpit/useCockpitGeneratedDocuments';
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

// Parse Markdown table to proper HTML table with phase support
function parseMarkdownTable(content: string): string {
  const lines = content.trim().split('\n');
  const tableLines: string[] = [];
  const otherLines: string[] = [];
  
  let inTable = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true;
      tableLines.push(trimmed);
    } else if (inTable && (trimmed === '' || !trimmed.startsWith('|'))) {
      inTable = false;
      if (trimmed) otherLines.push(line);
    } else if (!inTable) {
      otherLines.push(line);
    }
  }
  
  if (tableLines.length < 2) {
    return parseBasicMarkdown(content);
  }
  
  // Parse header row
  const headerRow = tableLines[0];
  const headerCells = headerRow.split('|').slice(1, -1).map(c => c.trim());
  
  // Skip separator row, get data rows
  const dataRows = tableLines.slice(2);
  
  let html = '<table class="services-table"><thead><tr>';
  headerCells.forEach(cell => {
    html += `<th>${escapeHtml(cell)}</th>`;
  });
  html += '</tr></thead><tbody>';
  
  dataRows.forEach(row => {
    const cells = row.split('|').slice(1, -1).map(c => c.trim());
    if (cells.length === 0 || cells.every(c => !c || c.match(/^-+$/))) {
      return; // Skip empty/separator rows
    }
    
    const firstCell = cells[0] || '';
    const isPhaseRow = firstCell.startsWith('**PHASE') || 
                       firstCell.startsWith('PHASE') ||
                       firstCell.startsWith('**Phase') ||
                       firstCell.match(/^\*\*\d+\.\s/) ||
                       (firstCell.startsWith('**') && cells.slice(1).every(c => !c || c === '-' || c === '—'));
    
    const isSubtotalRow = firstCell.toLowerCase().includes('sous-total') || 
                          firstCell.toLowerCase().includes('subtotal');
    
    if (isPhaseRow) {
      html += '<tr class="phase-header">';
      html += `<td colspan="${headerCells.length}">${parseInlineMarkdown(firstCell)}</td>`;
      html += '</tr>';
    } else if (isSubtotalRow) {
      html += '<tr class="subtotal-row">';
      cells.forEach((cell, idx) => {
        html += `<td>${parseInlineMarkdown(cell)}</td>`;
      });
      html += '</tr>';
    } else {
      html += '<tr>';
      cells.forEach((cell, idx) => {
        // First column: handle multi-line descriptions with <br> or (...)
        if (idx === 0) {
          const formattedDesc = formatDescriptionCell(cell);
          html += `<td>${formattedDesc}</td>`;
        } else {
          html += `<td>${parseInlineMarkdown(cell)}</td>`;
        }
      });
      html += '</tr>';
    }
  });
  
  html += '</tbody></table>';
  
  // Add notes after table
  if (otherLines.length > 0) {
    const notes = otherLines.join('\n').trim();
    if (notes) {
      html += '<div class="services-notes">' + parseBasicMarkdown(notes) + '</div>';
    }
  }
  
  return html;
}

// Format description cell with sub-details
function formatDescriptionCell(cell: string): string {
  // Check for parenthetical details
  const match = cell.match(/^(.+?)\s*\((.+?)\)$/);
  if (match) {
    return `<strong>${escapeHtml(match[1].trim())}</strong><small>${escapeHtml(match[2])}</small>`;
  }
  
  // Check for ":" separator (title: description)
  const colonMatch = cell.match(/^(.+?):\s*(.+)$/);
  if (colonMatch && colonMatch[1].length < 40) {
    return `<strong>${escapeHtml(colonMatch[1].trim())}</strong><small>${escapeHtml(colonMatch[2].trim())}</small>`;
  }
  
  return parseInlineMarkdown(cell);
}

// Parse inline markdown (bold, italic)
function parseInlineMarkdown(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/—/g, '—')
    .replace(/-/g, '–');
}

function parseBasicMarkdown(content: string): string {
  return content
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n+/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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

    // Get sections
    const headerSection = sections.find(s => s.id === 'header');
    const objectSection = sections.find(s => s.id === 'object');
    const contextSection = sections.find(s => s.id === 'context');
    const servicesSection = sections.find(s => s.id === 'services');
    const totalsSection = sections.find(s => s.id === 'totals');
    const planningSection = sections.find(s => s.id === 'planning');
    const paymentSection = sections.find(s => s.id === 'payment');

    const hasNewFormat = headerSection || servicesSection;

    // Dates
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

    // Render services - handle Markdown tables
    const renderServicesContent = () => {
      if (!servicesSection) return null;
      
      const raw = servicesSection.content;
      
      // Already HTML?
      if (raw.includes('<table') || raw.includes('<div')) {
        return (
          <div 
            className="quote-services-table"
            dangerouslySetInnerHTML={{ 
              __html: DOMPurify.sanitize(raw, {
                ADD_TAGS: ['table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'strong', 'em', 'p', 'ul', 'li', 'br'],
                ADD_ATTR: ['class', 'style', 'colspan', 'rowspan'],
              })
            }}
          />
        );
      }
      
      // Parse Markdown
      const htmlContent = parseMarkdownTable(raw);
      return (
        <div 
          className="quote-services-table"
          dangerouslySetInnerHTML={{ 
            __html: DOMPurify.sanitize(htmlContent, {
              ADD_TAGS: ['table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'strong', 'em', 'p', 'ul', 'li', 'h3', 'h4', 'br'],
              ADD_ATTR: ['class', 'style'],
            })
          }}
        />
      );
    };

    // Render payment - handle Markdown
    const renderPaymentContent = () => {
      if (!paymentSection) return null;
      
      const raw = paymentSection.content;
      
      if (raw.includes('<div') || raw.includes('<p>')) {
        return (
          <div 
            dangerouslySetInnerHTML={{ 
              __html: DOMPurify.sanitize(raw, {
                ADD_TAGS: ['div', 'p', 'h4', 'strong', 'em', 'ul', 'li', 'br'],
                ADD_ATTR: ['class', 'style'],
              })
            }}
          />
        );
      }
      
      const htmlContent = parseBasicMarkdown(raw);
      return (
        <div 
          dangerouslySetInnerHTML={{ 
            __html: DOMPurify.sanitize(htmlContent, {
              ADD_TAGS: ['div', 'p', 'h4', 'h3', 'strong', 'em', 'ul', 'li', 'br'],
              ADD_ATTR: ['class', 'style'],
            })
          }}
        />
      );
    };

    // Fallback for old format
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
        {/* Actions Header */}
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

        {/* Quote Document */}
        <Card 
          className={`quote-document-card ${isEmbedded ? '' : 'max-w-4xl mx-auto'}`}
          ref={isEmbedded ? undefined : ref}
        >
          <CardContent className="p-0">
            {/* Header Bar */}
            <div className="quote-header-bar">
              <div className="quote-number">
                {document.quote_number || `Devis N° ${document.id.slice(0, 8).toUpperCase()}`}
              </div>
              <div className="quote-dates">
                <span className="quote-date">Date d'émission : {format(createdDate, 'dd/MM/yyyy', { locale: fr })}</span>
                <span className="quote-date">Date limite de validité : {format(validityDate, 'dd/MM/yyyy', { locale: fr })}</span>
              </div>
            </div>

            {/* Emitter / Receiver */}
            {headerSection && (
              <div 
                className="quote-header-content"
                dangerouslySetInnerHTML={{ 
                  __html: DOMPurify.sanitize(headerSection.content, {
                    ADD_TAGS: ['div', 'h2', 'h3', 'p', 'span', 'strong', 'img', 'br'],
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
                      ADD_TAGS: ['div', 'h3', 'p', 'strong', 'br'],
                      ADD_ATTR: ['class', 'style'],
                    })
                  }}
                />
              </div>
            )}

            {/* Context Section (v10) */}
            {contextSection && (
              <div className="quote-context">
                <h4>Contexte du projet</h4>
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(parseBasicMarkdown(contextSection.content), {
                      ADD_TAGS: ['div', 'h3', 'h4', 'p', 'strong', 'em', 'ul', 'li', 'br'],
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
                      ADD_TAGS: ['div', 'span', 'p', 'strong', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'br'],
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

            {/* Planning Section (v10) */}
            {planningSection && (
              <div className="quote-planning">
                <h4>Planning prévisionnel</h4>
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(parseMarkdownTable(planningSection.content), {
                      ADD_TAGS: ['table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'h3', 'h4', 'p', 'strong', 'em', 'ul', 'li', 'br'],
                      ADD_ATTR: ['class', 'style', 'colspan'],
                    })
                  }}
                />
              </div>
            )}

            {/* Payment Terms */}
            {paymentSection && (
              <div className="quote-payment">
                <h4>Conditions de paiement</h4>
                {renderPaymentContent()}
              </div>
            )}

            {/* Footer */}
            <div className="quote-footer">
              <p>
                {document.quote_number || `Devis n°${document.id.slice(0, 8).toUpperCase()}`} — IArche — Page 1/1
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
