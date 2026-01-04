import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const QUERY_KEY = "telegram-imports";

export interface TelegramImport {
  id: string;
  type: "transcription" | "upload";
  title: string;
  status: string;
  statusLabel: string;
  statusVariant: "default" | "secondary" | "destructive" | "outline";
  error?: string;
  createdAt: string;
  source: string;
  storagePath: string;
  metadata: Record<string, unknown>;
  // Linked entities
  leadId?: string;
  leadName?: string;
  projectId?: string;
  projectName?: string;
  // Processing info
  processingStep: "upload" | "transcription" | "ocr" | "analysis" | "done" | "error";
}

function getTranscriptionStatusInfo(status: string): { label: string; variant: "default" | "secondary" | "destructive" | "outline"; step: TelegramImport["processingStep"] } {
  switch (status) {
    case "queued":
      return { label: "En attente", variant: "secondary", step: "upload" };
    case "transcribing":
      return { label: "Transcription en cours...", variant: "default", step: "transcription" };
    case "analyzing":
      return { label: "Analyse IA en cours...", variant: "default", step: "analysis" };
    case "done":
      return { label: "Terminé", variant: "outline", step: "done" };
    case "error":
      return { label: "Erreur", variant: "destructive", step: "error" };
    default:
      return { label: status, variant: "secondary", step: "upload" };
  }
}

function getUploadStatusInfo(status: string): { label: string; variant: "default" | "secondary" | "destructive" | "outline"; step: TelegramImport["processingStep"] } {
  switch (status) {
    case "uploaded":
      return { label: "Uploadé", variant: "secondary", step: "upload" };
    case "processing":
      return { label: "Traitement OCR...", variant: "default", step: "ocr" };
    case "completed":
      return { label: "Terminé", variant: "outline", step: "done" };
    case "error":
      return { label: "Erreur", variant: "destructive", step: "error" };
    default:
      return { label: status, variant: "secondary", step: "upload" };
  }
}

export function useTelegramImports(limit = 50) {
  return useQuery({
    queryKey: [QUERY_KEY, limit],
    queryFn: async () => {
      // Fetch transcriptions imported via Telegram
      const { data: transcriptions, error: transcriptionsError } = await supabase
        .from("voice_transcriptions")
        .select(`
          id,
          title,
          status,
          storage_path,
          ai_metadata,
          created_at,
          source,
          lead_id,
          project_id
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (transcriptionsError) {
        console.error("Error fetching Telegram transcriptions:", transcriptionsError);
      }

      // Fetch files uploaded via Telegram
      const { data: uploads, error: uploadsError } = await supabase
        .from("uploaded_files")
        .select(`
          id,
          original_filename,
          processing_status,
          processing_error,
          storage_path,
          ai_metadata,
          created_at,
          file_type,
          lead_ids,
          project_ids
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (uploadsError) {
        console.error("Error fetching Telegram uploads:", uploadsError);
      }

      // Combine and transform into unified format
      const imports: TelegramImport[] = [];

      // Process transcriptions - filter for Telegram imports
      if (transcriptions) {
        for (const t of transcriptions) {
          const metadata = (t.ai_metadata as Record<string, unknown>) || {};
          
          // Only include Telegram imports
          if (metadata.imported_via !== "telegram_bot") continue;
          
          const statusInfo = getTranscriptionStatusInfo(t.status);
          
          imports.push({
            id: t.id,
            type: "transcription",
            title: t.title || `Transcription audio`,
            status: t.status,
            statusLabel: statusInfo.label,
            statusVariant: statusInfo.variant,
            createdAt: t.created_at,
            source: t.source || "telegram",
            storagePath: t.storage_path || "",
            metadata,
            leadId: t.lead_id || undefined,
            projectId: t.project_id || undefined,
            processingStep: statusInfo.step,
          });
        }
      }

      // Process uploads - filter for Telegram imports
      if (uploads) {
        for (const u of uploads) {
          const metadata = (u.ai_metadata as Record<string, unknown>) || {};
          
          // Only include Telegram imports
          if (metadata.imported_via !== "telegram_bot") continue;
          
          const statusInfo = getUploadStatusInfo(u.processing_status || "uploaded");
          
          imports.push({
            id: u.id,
            type: "upload",
            title: u.original_filename || `Fichier ${u.file_type}`,
            status: u.processing_status || "uploaded",
            statusLabel: statusInfo.label,
            statusVariant: statusInfo.variant,
            error: u.processing_error || undefined,
            createdAt: u.created_at,
            source: "telegram",
            storagePath: u.storage_path || "",
            metadata,
            processingStep: statusInfo.step,
          });
        }
      }

      // Sort by date descending
      imports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return imports.slice(0, limit);
    },
    refetchInterval: 10000, // Refresh every 10 seconds for live updates
  });
}

export function useTelegramImportStats() {
  const { data: imports = [] } = useTelegramImports(100);

  const stats = {
    total: imports.length,
    transcriptions: imports.filter(i => i.type === "transcription").length,
    uploads: imports.filter(i => i.type === "upload").length,
    pending: imports.filter(i => ["queued", "transcribing", "analyzing", "processing"].includes(i.status)).length,
    done: imports.filter(i => i.processingStep === "done").length,
    errors: imports.filter(i => i.processingStep === "error").length,
  };

  return stats;
}
