import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  Download, 
  Trash2, 
  Clock, 
  FileArchive,
  FileSpreadsheet,
  FileImage,
  File,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  usePartnerPersonalDocuments, 
  useDeletePartnerDocument,
  useDownloadPartnerDocument,
  DOCUMENT_CATEGORIES,
  PartnerPersonalDocument 
} from '@/hooks/partner/usePartnerPersonalDocuments';
import { UploadDocumentDialog } from './UploadDocumentDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const getCategoryLabel = (value: string) => {
  return DOCUMENT_CATEGORIES.find(c => c.value === value)?.label || value;
};

const getFileIcon = (mimeType: string | null) => {
  if (!mimeType) return File;
  if (mimeType.includes('pdf')) return FileText;
  if (mimeType.includes('image')) return FileImage;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FileSpreadsheet;
  if (mimeType.includes('zip') || mimeType.includes('rar')) return FileArchive;
  return File;
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function DocumentCard({ document }: { document: PartnerPersonalDocument }) {
  const deleteMutation = useDeletePartnerDocument();
  const downloadMutation = useDownloadPartnerDocument();
  const FileIcon = getFileIcon(document.mime_type);

  const isExpired = document.valid_until && new Date(document.valid_until) < new Date();

  return (
    <Card className={`hover:shadow-md transition-shadow ${isExpired ? 'border-destructive/50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-muted">
            <FileIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium truncate">{document.title}</h3>
                {document.description && (
                  <p className="text-sm text-muted-foreground line-clamp-1">{document.description}</p>
                )}
              </div>
              
              <div className="flex items-center gap-1 shrink-0">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => downloadMutation.mutate(document)}
                  disabled={downloadMutation.isPending}
                >
                  <Download className="h-4 w-4" />
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est irréversible. Le fichier sera définitivement supprimé.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate(document)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline">{getCategoryLabel(document.category)}</Badge>
              
              {document.file_size_bytes && (
                <span className="text-muted-foreground">{formatFileSize(document.file_size_bytes)}</span>
              )}
              
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(document.created_at), 'dd MMM yyyy', { locale: fr })}
              </span>
              
              {isExpired && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Expiré
                </Badge>
              )}
              
              {document.valid_until && !isExpired && (
                <span className="text-muted-foreground text-xs">
                  Expire le {format(new Date(document.valid_until), 'dd/MM/yyyy', { locale: fr })}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PersonalDocumentsList() {
  const { data: documents, isLoading, error } = usePartnerPersonalDocuments();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">Erreur lors du chargement des documents</p>
        </CardContent>
      </Card>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
            <FileText className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">Aucun document personnel</p>
            <p className="text-sm max-w-md mb-6">
              Ajoutez vos documents (contrats, factures, etc.) pour les conserver en toute sécurité.
            </p>
            <UploadDocumentDialog />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <DocumentCard key={doc.id} document={doc} />
      ))}
    </div>
  );
}
