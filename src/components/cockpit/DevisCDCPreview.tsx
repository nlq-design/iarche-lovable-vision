import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, FileText, Sparkles, Clock, CheckCircle } from "lucide-react";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { COLORS, GRADIENTS } from '@/components/admin/medias/shared/tokens';
import { DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS_CONFIG, type GeneratedDocument } from '@/hooks/cockpit/useCockpitGeneratedDocuments';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DevisCDCPreviewProps {
  document: GeneratedDocument;
  onBack: () => void;
  onEdit: () => void;
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

export function DevisCDCPreview({ document, onBack, onEdit }: DevisCDCPreviewProps) {
  const content = document.content_json as DocumentContent;
  const sections = content?.sections || [];
  const metadata = content?.metadata || {};
  const theme = content?.theme || {
    primaryColor: COLORS.bleuNuit,
    accentColor: COLORS.terracotta,
    useGradient: true,
  };

  const statusConfig = DOCUMENT_STATUS_CONFIG[document.status as keyof typeof DOCUMENT_STATUS_CONFIG];

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

  return (
    <div className="p-5 space-y-4">
      {/* Header */}
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
            Exporter DOCX
          </Button>
          <Button size="sm" onClick={onEdit}>
            <FileText className="h-4 w-4 mr-1.5" />
            Modifier
          </Button>
        </div>
      </div>

      {/* Document Preview */}
      <Card className="max-w-4xl mx-auto shadow-lg">
        {/* Header with gradient */}
        <div 
          className="p-8 text-white"
          style={{ 
            background: theme.useGradient 
              ? GRADIENTS.arc.css 
              : theme.primaryColor 
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm opacity-80 mb-2">
                {DOCUMENT_TYPE_LABELS[document.document_type as keyof typeof DOCUMENT_TYPE_LABELS]}
              </p>
              <h1 className="text-3xl font-bold mb-4">{document.title}</h1>
              {metadata.clientCompany && (
                <p className="text-lg opacity-90">{metadata.clientCompany}</p>
              )}
              {metadata.clientName && (
                <p className="text-sm opacity-80">Attention de {metadata.clientName}</p>
              )}
            </div>
            <div className="text-right">
              {/* Logo placeholder */}
              <div className="w-24 h-24 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl font-bold">IArche</span>
              </div>
            </div>
          </div>
        </div>

        {/* Metadata bar */}
        <div className="flex items-center justify-between px-8 py-3 bg-muted/50 border-b text-sm">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {format(new Date(document.created_at || Date.now()), 'dd MMMM yyyy', { locale: fr })}
            </span>
            {document.version && (
              <span className="text-muted-foreground">Version {document.version}</span>
            )}
          </div>
          {document.document_type === 'quote' && metadata.totalAmount && (
            <span className="font-semibold text-lg" style={{ color: theme.accentColor }}>
              {new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: metadata.currency || 'EUR',
              }).format(metadata.totalAmount)}
            </span>
          )}
        </div>

        {/* Content */}
        <CardContent className="p-8 space-y-8">
          {/* Table of Contents */}
          {sections.length > 3 && (
            <div className="p-4 bg-muted/30 rounded-lg">
              <h2 className="font-semibold mb-3" style={{ color: theme.primaryColor }}>
                Sommaire
              </h2>
              <ol className="space-y-1 list-decimal list-inside text-sm">
                {sections.map((section, i) => (
                  <li key={section.id} className="text-muted-foreground hover:text-foreground cursor-pointer">
                    {section.title}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Sections */}
          {sections.map((section, index) => (
            <div key={section.id} className="space-y-3">
              <div className="flex items-center gap-3">
                <span 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                  style={{ backgroundColor: theme.accentColor }}
                >
                  {index + 1}
                </span>
                <h2 className="text-xl font-semibold" style={{ color: theme.primaryColor }}>
                  {section.title}
                </h2>
              </div>
              <div 
                className="pl-11 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: section.content
                    .replace(/\n/g, '<br>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                }}
              />
              {index < sections.length - 1 && (
                <div className="h-px bg-border mt-6" />
              )}
            </div>
          ))}

          {/* Footer */}
          <div className="pt-8 border-t mt-8">
            <div 
              className="h-1 w-32 rounded mb-4"
              style={{ background: GRADIENTS.arc.css }}
            />
            <p className="text-xs text-muted-foreground">
              Document généré le {format(new Date(document.created_at || Date.now()), 'dd/MM/yyyy à HH:mm', { locale: fr })}
              {document.ai_generated && ' • Assisté par Intelligence Artificielle'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* AI Metadata */}
      {document.ai_generated && document.ai_metadata && (
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
