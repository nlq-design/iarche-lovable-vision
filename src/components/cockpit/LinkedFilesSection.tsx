import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCockpitUploads, UploadedFile } from "@/hooks/cockpit/useCockpitUploads";
import { FileDetailSheet } from './FileDetailSheet';
import {
  FileText,
  FileSpreadsheet,
  Image,
  File,
  Clipboard,
  Download,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  FileUp,
} from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { useNavigate } from 'react-router-dom';

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  pending: { icon: Clock, color: 'text-muted-foreground' },
  processing: { icon: Loader2, color: 'text-blue-500' },
  completed: { icon: CheckCircle2, color: 'text-green-500' },
  failed: { icon: XCircle, color: 'text-destructive' },
  needs_ocr: { icon: Clock, color: 'text-amber-500' },
};

function getFileIcon(fileType: string) {
  switch (fileType) {
    case 'pdf': return FileText;
    case 'docx': return FileText;
    case 'xlsx': return FileSpreadsheet;
    case 'image': return Image;
    case 'pasted_text': return Clipboard;
    default: return File;
  }
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface LinkedFilesSectionProps {
  entityType: 'project' | 'lead' | 'solution' | 'partner';
  entityId: string;
  title?: string;
}

export function LinkedFilesSection({ entityType, entityId, title = 'Documents' }: LinkedFilesSectionProps) {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Partner not yet supported in uploaded_files schema (no partner_ids column)
  const filters = entityType === 'project' 
    ? { projectId: entityId } 
    : entityType === 'lead' 
    ? { leadId: entityId }
    : entityType === 'solution'
    ? { solutionId: entityId }
    : undefined; // partner - will return empty

  const { uploads, isLoading, downloadFile } = useCockpitUploads(filters);

  const handleViewFile = (file: UploadedFile) => {
    setSelectedFile(file);
    setDetailOpen(true);
  };

  const handleGoToUploads = () => {
    navigate('/cockpit/upload');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileUp className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileUp className="h-4 w-4" />
              {title}
              {uploads && uploads.length > 0 && (
                <Badge variant="secondary" className="text-xs">{uploads.length}</Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleGoToUploads}>
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!uploads || uploads.length === 0 ? (
            <div className="text-center py-4">
              <FileUp className="h-8 w-8 mx-auto text-muted-foreground opacity-50 mb-2" />
              <p className="text-xs text-muted-foreground">Aucun document lié</p>
              <Button variant="link" size="sm" onClick={handleGoToUploads}>
                Ajouter un document
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {uploads.map(file => {
                const FileIcon = getFileIcon(file.file_type);
                const status = STATUS_CONFIG[file.processing_status] || STATUS_CONFIG.pending;
                const StatusIcon = status.icon;

                return (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleViewFile(file)}
                  >
                    <div className="p-1.5 bg-muted rounded">
                      <FileIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.original_filename}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(file.file_size_bytes)}</span>
                        <span>•</span>
                        <span className={cn("flex items-center gap-1", status.color)}>
                          <StatusIcon className={cn("h-3 w-3", file.processing_status === 'processing' && 'animate-spin')} />
                        </span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(file.created_at), { addSuffix: true, locale: fr })}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewFile(file);
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadFile(file);
                        }}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <FileDetailSheet
        file={selectedFile}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
}
