import React, { forwardRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, FileText, Sparkles, Clock, CheckCircle, Edit, FileDown, ChevronDown } from "lucide-react";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { COLORS, GRADIENTS } from '@/components/admin/medias/shared/tokens';
import DOMPurify from 'dompurify';
import './preview-rich-content.css';
import { useDocxToPdfExport } from '@/hooks/cockpit/useDocxToPdfExport';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// IArche colors for inline styles
const IARCHE_COLORS = {
  bleuNuit: '#1A2B4A',
  terracotta: '#B04A32',
  blancCasse: '#FAF9F7',
};
import { DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS_CONFIG, type GeneratedDocument } from '@/hooks/cockpit/useCockpitGeneratedDocuments';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DevisCDCPreviewProps {
  document: GeneratedDocument;
  onBack: () => void;
  onEdit: () => void;
  isEmbedded?: boolean;
}

interface DocumentSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

interface DocumentContent {
  sections?: DocumentSection[];
  metadata?: {
    clientName?: string;
    clientCompany?: string;
    projectName?: string;
    validityDate?: string;
    totalAmount?: number;
    currency?: string;
  };
  theme?: {
    primaryColor: string;
    accentColor: string;
    useGradient: boolean;
  };
}

// Reusable header gradient component
const HeaderGradient: React.FC<{
  children: React.ReactNode;
  useGradient: boolean;
  primaryColor: string;
}> = ({ children, useGradient, primaryColor }) => (
  <div 
    className="p-8 text-white relative overflow-hidden"
    style={{ 
      background: useGradient 
        ? `linear-gradient(135deg, ${IARCHE_COLORS.bleuNuit} 0%, ${IARCHE_COLORS.terracotta} 100%)`
        : primaryColor,
      fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
    }}
  >
    {/* Decorative arc in corner */}
    <svg 
      className="absolute -bottom-8 -right-8 opacity-10"
      width="200" 
      height="200" 
      viewBox="0 0 200 200"
    >
      <path 
        d="M0 0 Q0 200 200 200" 
        fill="none" 
        stroke="white" 
        strokeWidth="3"
      />
    </svg>
    {children}
  </div>
);

// Footer component with IArche branding
const DocumentFooter: React.FC<{
  createdAt: string;
  aiGenerated: boolean;
}> = ({ createdAt, aiGenerated }) => (
  <div className="pt-8 border-t mt-8">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* IArche Logo */}
        <img 
          src="/logos/iarche-main.svg" 
          alt="IArche" 
          className="h-8 opacity-60"
          crossOrigin="anonymous"
        />
        <div 
          className="h-1 w-24 rounded"
          style={{ background: GRADIENTS.arc.css }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Document généré le {format(new Date(createdAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
        {aiGenerated && ' • Assisté par Intelligence Artificielle'}
      </p>
    </div>
  </div>
);

export const DevisCDCPreview = forwardRef<HTMLDivElement, DevisCDCPreviewProps>(
  ({ document, onBack, onEdit, isEmbedded = false }, ref) => {
    const content = document.content_json as DocumentContent;
    const sections = content?.sections || [];
    const metadata = content?.metadata || {};
    const theme = content?.theme || {
      primaryColor: COLORS.bleuNuit,
      accentColor: COLORS.terracotta,
      useGradient: true,
    };

    const statusConfig = DOCUMENT_STATUS_CONFIG[document.status as keyof typeof DOCUMENT_STATUS_CONFIG];
    const { exportPdf, isExporting: isExportingPdf } = useDocxToPdfExport();

    const handleExportDOCX = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('generate-docx', {
          body: {
            title: document.title,
            sections,
            metadata,
            theme,
            documentType: document.document_type,
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

        toast.success('Document exporté en DOCX');
      } catch (error) {
        console.error('Error exporting DOCX:', error);
        toast.error('Erreur lors de l\'export DOCX');
      }
    };

    const handleExportPdfHD = async () => {
      await exportPdf({
        title: document.title,
        sections,
        metadata,
        theme,
        documentType: document.document_type as 'quote' | 'spec' | 'proposal',
        documentId: document.id,
      });
    };

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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Download className="h-4 w-4" />
                    Exporter
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportPdfHD} disabled={isExportingPdf}>
                    <FileDown className="h-4 w-4 mr-2" />
                    {isExportingPdf ? 'Export en cours...' : 'Export PDF HD'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportDOCX}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export DOCX
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-1.5" />
                Modifier
              </Button>
            </div>
          </div>
        )}

        {/* Document Preview */}
        <Card 
          className={`${isEmbedded ? '' : 'w-full max-w-5xl mx-auto'} shadow-lg overflow-hidden document-preview-card`}
          style={{
            minWidth: isEmbedded ? 'auto' : '794px', // A4 width for PDF consistency
            backgroundColor: IARCHE_COLORS.blancCasse,
            fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
          }}
        >
          {/* Header with gradient */}
          <HeaderGradient 
            useGradient={theme.useGradient} 
            primaryColor={theme.primaryColor}
          >
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p 
                  className="text-sm opacity-80 mb-2 uppercase tracking-wider font-medium"
                  style={{ letterSpacing: '0.1em' }}
                >
                  {DOCUMENT_TYPE_LABELS[document.document_type as keyof typeof DOCUMENT_TYPE_LABELS]}
                </p>
                <h1 
                  className="text-3xl font-bold mb-4"
                  style={{ 
                    color: IARCHE_COLORS.blancCasse,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2,
                  }}
                >
                  {document.title}
                </h1>
                {metadata.clientCompany && (
                  <p className="text-lg opacity-90 font-medium">{metadata.clientCompany}</p>
                )}
                {metadata.clientName && (
                  <p className="text-sm opacity-80">À l'attention de {metadata.clientName}</p>
                )}
              </div>
              <div className="text-right">
                {/* Logo IArche */}
                <div 
                  className="w-28 h-28 rounded-xl flex items-center justify-center backdrop-blur-sm"
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
                >
                  <img 
                    src="/logos/iarche-white.svg" 
                    alt="IArche" 
                    className="h-12"
                    crossOrigin="anonymous"
                  />
                </div>
              </div>
            </div>
          </HeaderGradient>

          {/* Metadata bar */}
          <div 
            className="flex items-center justify-between px-8 py-3 border-b text-sm"
            style={{ backgroundColor: 'rgba(26, 43, 74, 0.03)' }}
          >
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-4 w-4" />
                {format(new Date(document.created_at || Date.now()), 'dd MMMM yyyy', { locale: fr })}
              </span>
              {document.version && (
                <span className="text-muted-foreground">Version {document.version}</span>
              )}
            </div>
            {document.document_type === 'quote' && metadata.totalAmount && (
              <span 
                className="font-bold text-lg"
                style={{ color: theme.accentColor }}
              >
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: metadata.currency || 'EUR',
                }).format(metadata.totalAmount)}
              </span>
            )}
          </div>

          {/* Content */}
          <CardContent className="p-8 md:p-10 space-y-8">
            {/* Table of Contents - marked as PDF section */}
            {sections.length > 3 && (
              <div 
                className="p-5 rounded-xl"
                style={{ backgroundColor: 'rgba(26, 43, 74, 0.04)' }}
              >
                <h2 
                  className="font-bold mb-4 text-lg"
                  style={{ color: theme.primaryColor }}
                >
                  Sommaire
                </h2>
                <ul className="space-y-2 list-none">
                  {sections.map((section) => (
                    <li 
                      key={section.id} 
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      <span 
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: theme.accentColor }}
                      />
                      {section.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sections - Each marked for PDF page break */}
            {sections.map((section, index) => (
              <div 
                key={section.id} 
                className="space-y-4 pdf-document-section"
                data-pdf-section={`section-${index}`}
              >
                <h2 
                  className="text-xl md:text-2xl font-bold"
                  style={{ 
                    color: theme.primaryColor,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {section.title}
                </h2>
                {/* Gradient bar under title */}
                <div 
                  className="h-0.5 w-16 rounded-full"
                  style={{ background: GRADIENTS.arc.css }}
                />
                <div 
                  className="prose prose-sm md:prose-base max-w-none preview-rich-content"
                  style={{ 
                    color: '#4A5568',
                    lineHeight: 1.75,
                  }}
                  dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(section.content || (section as any).contenu || '', {
                      ADD_TAGS: ['div'],
                      ADD_ATTR: ['class', 'style'],
                    })
                  }}
                />
                {index < sections.length - 1 && (
                  <div 
                    className="h-px mt-8"
                    style={{ backgroundColor: 'rgba(26, 43, 74, 0.1)' }}
                  />
                )}
              </div>
            ))}

            {/* Footer */}
            <DocumentFooter 
              createdAt={document.created_at || new Date().toISOString()}
              aiGenerated={document.ai_generated || false}
            />
          </CardContent>
        </Card>

        {/* AI Metadata - only show when not embedded */}
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
                {(document.ai_metadata as any).confidence_score && (
                  <span>
                    • Confiance: {Math.round((document.ai_metadata as any).confidence_score * 100)}%
                  </span>
                )}
                {document.approved_at && (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    Validé
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }
);

DevisCDCPreview.displayName = 'DevisCDCPreview';
