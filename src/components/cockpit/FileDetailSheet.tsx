import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Download,
  Share2,
  RefreshCw,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Sparkles,
  Link2,
  FolderOpen,
  User,
  Lightbulb,
  File,
  Image,
  FileSpreadsheet,
  Clipboard,
  Calendar,
  Tag,
  Save,
} from "lucide-react";
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { useCockpitUploads, UploadedFile } from "@/hooks/cockpit/useCockpitUploads";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-muted-foreground', label: 'En attente' },
  processing: { icon: Loader2, color: 'text-blue-500', label: 'En cours' },
  completed: { icon: CheckCircle2, color: 'text-green-500', label: 'Terminé' },
  failed: { icon: XCircle, color: 'text-destructive', label: 'Échec' },
  needs_ocr: { icon: AlertCircle, color: 'text-amber-500', label: 'OCR requis' },
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

interface FileDetailSheetProps {
  file: UploadedFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FileDetailSheet({ file, open, onOpenChange }: FileDetailSheetProps) {
  const { updateLinks, reprocess, generateShareLink, deleteFile, downloadFile } = useCockpitUploads();
  
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [selectedSolutionIds, setSelectedSolutionIds] = useState<string[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch entities
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-linking'],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, name')
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads-for-linking'],
    queryFn: async () => {
      const { data } = await supabase
        .from('leads')
        .select('id, name, company')
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const { data: solutions = [] } = useQuery({
    queryKey: ['solutions-for-linking'],
    queryFn: async () => {
      const { data } = await supabase
        .from('articles')
        .select('id, title')
        .eq('resource_type', 'solution')
        .eq('published', true)
        .order('title');
      return data ?? [];
    },
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents-for-linking'],
    queryFn: async () => {
      const { data } = await supabase
        .from('generated_documents')
        .select('id, title, document_type')
        .order('created_at', { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  // Initialize state from file
  useEffect(() => {
    if (file) {
      setSelectedProjectIds(file.project_ids || []);
      setSelectedLeadIds(file.lead_ids || []);
      setSelectedSolutionIds(file.solution_ids || []);
      setSelectedDocumentId(file.generated_document_id || '');
      setHasChanges(false);
    }
  }, [file]);

  const handleLinkChange = (
    type: 'project' | 'lead' | 'solution' | 'document',
    value: string
  ) => {
    switch (type) {
      case 'project':
        setSelectedProjectIds(value === 'none' ? [] : [value]);
        break;
      case 'lead':
        setSelectedLeadIds(value === 'none' ? [] : [value]);
        break;
      case 'solution':
        setSelectedSolutionIds(value === 'none' ? [] : [value]);
        break;
      case 'document':
        setSelectedDocumentId(value === 'none' ? '' : value);
        break;
    }
    setHasChanges(true);
  };

  const handleSaveLinks = async () => {
    if (!file) return;
    setIsSaving(true);
    try {
      await updateLinks({
        fileId: file.id,
        projectIds: selectedProjectIds,
        solutionIds: selectedSolutionIds,
        leadIds: selectedLeadIds,
      });
      
      // Update document link separately if needed
      if (selectedDocumentId !== (file.generated_document_id || '')) {
        await supabase
          .from('uploaded_files')
          .update({ generated_document_id: selectedDocumentId || null })
          .eq('id', file.id);
      }
      
      setHasChanges(false);
      toast.success('Liaisons mises à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!file) return;
    deleteFile(file.id);
    onOpenChange(false);
  };

  if (!file) return null;

  const FileIcon = getFileIcon(file.file_type);
  const status = STATUS_CONFIG[file.processing_status] || STATUS_CONFIG.pending;
  const StatusIcon = status.icon;

  // Parse AI metadata
  const aiMetadata = file.ai_metadata as {
    key_points?: string[];
    detected_entities?: { projects?: string[]; leads?: string[]; solutions?: string[] };
    suggested_tags?: string[];
  } | null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <FileIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="truncate text-left">{file.original_filename}</SheetTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <span>{file.file_type.toUpperCase()}</span>
                <span>•</span>
                <span>{formatFileSize(file.file_size_bytes)}</span>
                <span>•</span>
                <span className={cn("flex items-center gap-1", status.color)}>
                  <StatusIcon className={cn("h-3 w-3", file.processing_status === 'processing' && 'animate-spin')} />
                  {status.label}
                </span>
              </div>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 mt-4">
          <div className="space-y-4 pr-4">
            {/* Actions */}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => downloadFile(file)}>
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
              <Button size="sm" variant="outline" onClick={() => generateShareLink({ fileId: file.id })}>
                <Share2 className="h-4 w-4 mr-2" />
                Partager
              </Button>
              {file.processing_status === 'failed' && (
                <Button size="sm" variant="outline" onClick={() => reprocess({ fileId: file.id })}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Relancer
                </Button>
              )}
            </div>

            {/* AI Summary */}
            {file.ai_summary && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Résumé IA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{file.ai_summary}</p>
                </CardContent>
              </Card>
            )}

            {/* AI Key Points */}
            {aiMetadata?.key_points && aiMetadata.key_points.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Points clés</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {aiMetadata.key_points.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-primary mt-1">•</span>
                        <span className="text-muted-foreground">{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Separator />

            {/* Entity Linking */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Liaisons
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Project */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <FolderOpen className="h-3 w-3" />
                    Projet
                  </Label>
                  <Select 
                    value={selectedProjectIds[0] || "none"} 
                    onValueChange={(v) => handleLinkChange('project', v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Aucun projet" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Lead */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Lead
                  </Label>
                  <Select 
                    value={selectedLeadIds[0] || "none"} 
                    onValueChange={(v) => handleLinkChange('lead', v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Aucun lead" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {leads.map(l => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name} {l.company && `(${l.company})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Solution */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <Lightbulb className="h-3 w-3" />
                    Solution
                  </Label>
                  <Select 
                    value={selectedSolutionIds[0] || "none"} 
                    onValueChange={(v) => handleLinkChange('solution', v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Aucune solution" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune</SelectItem>
                      {solutions.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Document */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Document généré
                  </Label>
                  <Select 
                    value={selectedDocumentId || "none"} 
                    onValueChange={(v) => handleLinkChange('document', v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Aucun document" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {documents.map(d => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.title} ({d.document_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {hasChanges && (
                  <Button 
                    size="sm" 
                    className="w-full mt-2" 
                    onClick={handleSaveLinks}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Enregistrer les liaisons
                  </Button>
                )}
              </CardContent>
            </Card>

            <Separator />

            {/* Metadata */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Métadonnées</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Créé le</span>
                  <span>{format(new Date(file.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Téléchargements</span>
                  <span>{file.download_count}</span>
                </div>
                {file.category && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Catégorie</span>
                    <Badge variant="outline">{file.category}</Badge>
                  </div>
                )}
                {file.tags && file.tags.length > 0 && (
                  <div className="flex justify-between text-sm items-start">
                    <span className="text-muted-foreground">Tags</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {file.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {file.version > 1 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Version</span>
                    <Badge variant="outline">v{file.version}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Extracted Content Preview */}
            {file.extracted_content && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Contenu extrait</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    readOnly
                    value={file.extracted_content.substring(0, 2000) + (file.extracted_content.length > 2000 ? '...' : '')}
                    className="min-h-[150px] text-xs font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {file.extracted_content.length.toLocaleString()} caractères
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Delete */}
            <Button 
              variant="destructive" 
              size="sm" 
              className="w-full" 
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer le fichier
            </Button>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
