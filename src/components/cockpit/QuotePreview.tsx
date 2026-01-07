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

    // Calculate validity date
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
                <span>Date d'émission : {format(createdDate, 'dd/MM/yyyy', { locale: fr })}</span>
                <span>Date limite de validité : {format(validityDate, 'dd/MM/yyyy', { locale: fr })}</span>
              </div>
            </div>

            {/* Emitter / Receiver Block */}
            {headerSection && (
              <div 
                className="quote-header-content"
                dangerouslySetInnerHTML={{ 
                  __html: DOMPurify.sanitize(headerSection.content, {
                    ADD_TAGS: ['div', 'h2', 'h3', 'p', 'span'],
                    ADD_ATTR: ['class', 'style'],
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
                <div 
                  className="quote-services-table"
                  dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(servicesSection.content, {
                      ADD_TAGS: ['table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'strong', 'em', 'p'],
                      ADD_ATTR: ['class', 'style', 'colspan', 'rowspan'],
                    })
                  }}
                />
              </div>
            )}

            {/* Totals */}
            {totalsSection && (
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
            )}

            {/* Payment Terms & Signature */}
            {paymentSection && (
              <div className="quote-payment">
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(paymentSection.content, {
                      ADD_TAGS: ['div', 'p', 'h4', 'strong', 'em'],
                      ADD_ATTR: ['class', 'style'],
                    })
                  }}
                />
              </div>
            )}

            {/* Footer */}
            <div className="quote-footer">
              <p>
                {document.quote_number || `Devis n°${document.id.slice(0, 8).toUpperCase()}`} — {metadata.billingEntityName || 'Société'} — Page 1/1
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
