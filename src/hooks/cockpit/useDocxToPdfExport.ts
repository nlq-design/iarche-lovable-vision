import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExportParams {
  title: string;
  sections: Array<{
    id: string;
    title: string;
    content: string;
    order: number;
  }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
  theme?: {
    primaryColor: string;
    accentColor: string;
    useGradient: boolean;
  };
  documentType: 'quote' | 'spec' | 'proposal';
  documentId?: string;
  saveToStorage?: boolean;
}

interface ExportResult {
  pdfBase64: string;
  pdfUrl?: string;
  fileSize: number;
}

/**
 * Hook for exporting documents to high-quality PDF via DOCX → iLovePDF pipeline.
 * 
 * Benefits over html-to-image approach:
 * - Vector text (selectable, searchable, scalable)
 * - Smaller file sizes
 * - Professional print quality
 * 
 * Trade-offs:
 * - Consumes iLovePDF API credits
 * - ~3-5 seconds latency
 * - Requires generate-docx + convert-to-pdf edge functions
 */
export function useDocxToPdfExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const exportPdf = async (params: ExportParams): Promise<ExportResult | null> => {
    setIsExporting(true);
    setProgress(0);

    try {
      // Step 1: Generate DOCX (30%)
      setProgress(10);
      toast.info('Génération du document...', { duration: 2000 });

      const { data: docxData, error: docxError } = await supabase.functions.invoke('generate-docx', {
        body: {
          title: params.title,
          sections: params.sections,
          metadata: params.metadata,
          theme: params.theme,
          documentType: params.documentType,
        },
      });

      if (docxError) {
        console.error('[useDocxToPdfExport] DOCX generation failed:', docxError);
        throw new Error('Échec de la génération DOCX');
      }

      if (!docxData?.docxBase64) {
        throw new Error('Réponse DOCX invalide');
      }

      setProgress(40);

      // Step 2: Convert DOCX to PDF via iLovePDF (70%)
      toast.info('Conversion en PDF HD...', { duration: 2000 });

      const filename = params.title.replace(/[^a-zA-Z0-9]/g, '_');

      const { data: pdfData, error: pdfError } = await supabase.functions.invoke('convert-to-pdf', {
        body: {
          docx_base64: docxData.docxBase64,
          filename,
          document_id: params.documentId,
          save_to_storage: params.saveToStorage ?? false,
        },
      });

      if (pdfError) {
        console.error('[useDocxToPdfExport] PDF conversion failed:', pdfError);
        throw new Error('Échec de la conversion PDF');
      }

      if (!pdfData?.success || !pdfData?.pdf_base64) {
        throw new Error(pdfData?.details || 'Réponse PDF invalide');
      }

      setProgress(90);

      // Step 3: Download PDF (100%)
      const pdfBytes = Uint8Array.from(atob(pdfData.pdf_base64), c => c.charCodeAt(0));
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      setProgress(100);
      toast.success('PDF HD exporté avec succès');

      return {
        pdfBase64: pdfData.pdf_base64,
        pdfUrl: pdfData.pdf_url,
        fileSize: pdfData.file_size,
      };
    } catch (error) {
      console.error('[useDocxToPdfExport] Export failed:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'export PDF');
      return null;
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  return {
    exportPdf,
    isExporting,
    progress,
  };
}
