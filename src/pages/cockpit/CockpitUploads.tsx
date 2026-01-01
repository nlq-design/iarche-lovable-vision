import { useState, useCallback, useEffect, useRef } from "react";
import { CockpitLayout } from "@/components/cockpit/CockpitLayout";
import { useCockpitUploads, UploadedFile } from "@/hooks/cockpit/useCockpitUploads";
import { useCockpitProjects } from "@/hooks/cockpit/useCockpitProjects";
import { useCockpitLeads } from "@/hooks/cockpit/useCockpitLeads";
import { extractFileContent, ExtractionResult } from "@/lib/fileExtraction";
import { FileDetailSheet } from "@/components/cockpit/FileDetailSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileText, 
  Image, 
  FileSpreadsheet, 
  File, 
  Search,
  Filter,
  RefreshCw,
  Download,
  Share2,
  Trash2,
  Eye,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Clipboard,
  Sparkles
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CATEGORIES = [
  { value: 'commercial', label: 'Commercial' },
  { value: 'technique', label: 'Technique' },
  { value: 'juridique', label: 'Juridique' },
  { value: 'rh', label: 'RH' },
  { value: 'autre', label: 'Autre' },
];

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

function FileCard({ 
  file, 
  onReprocess, 
  onDownload, 
  onShare, 
  onDelete,
  onView
}: { 
  file: UploadedFile;
  onReprocess: () => void;
  onDownload: () => void;
  onShare: () => void;
  onDelete: () => void;
  onView: () => void;
}) {
  const FileIcon = getFileIcon(file.file_type);
  const status = STATUS_CONFIG[file.processing_status] || STATUS_CONFIG.pending;
  const StatusIcon = status.icon;

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-muted rounded-lg">
            <FileIcon className="h-6 w-6 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium truncate">{file.original_filename}</h3>
              {file.version > 1 && (
                <Badge variant="outline" className="text-xs">v{file.version}</Badge>
              )}
              {file.ocr_required && (
                <Badge variant="secondary" className="text-xs">OCR</Badge>
              )}
            </div>
            
            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
              <span>{file.file_type.toUpperCase()}</span>
              <span>•</span>
              <span>{formatFileSize(file.file_size_bytes)}</span>
              <span>•</span>
              <span className={cn("flex items-center gap-1", status.color)}>
                <StatusIcon className={cn("h-3.5 w-3.5", file.processing_status === 'processing' && 'animate-spin')} />
                {status.label}
              </span>
            </div>

            {file.ai_summary && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {file.ai_summary}
              </p>
            )}

            <div className="flex flex-wrap gap-1 mb-2">
              {file.category && (
                <Badge variant="outline" className="text-xs">{file.category}</Badge>
              )}
              {file.tags?.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
              ))}
              {file.tags && file.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">+{file.tags.length - 3}</Badge>
              )}
            </div>

            <div className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(file.created_at), { addSuffix: true, locale: fr })}
              {file.download_count > 0 && ` • ${file.download_count} téléchargement${file.download_count > 1 ? 's' : ''}`}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Button variant="ghost" size="icon" onClick={onView}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDownload}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onShare}>
              <Share2 className="h-4 w-4" />
            </Button>
            {file.processing_status === 'failed' && (
              <Button variant="ghost" size="icon" onClick={onReprocess}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CockpitUploads() {
  const [activeTab, setActiveTab] = useState<'upload' | 'list'>('upload');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // File detail sheet state
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  
  // Upload state
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [pastedText, setPastedText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [tagsInput, setTagsInput] = useState('');

  type UploadJobStatus = 'queued' | 'uploading' | 'completed' | 'failed' | 'cancelling' | 'cancelled';

  type UploadJob = {
    jobId: string;
    file: File;
    extractedText?: string;
    status: UploadJobStatus;
    backendFileId?: string;
    error?: string;
  };

  const cancelJobIdsRef = useRef<Set<string>>(new Set());
  const [uploadJobs, setUploadJobs] = useState<UploadJob[]>([]);
  const [isUploadQueueRunning, setIsUploadQueueRunning] = useState(false);
  
  // Entity linking state
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [selectedSolutionIds, setSelectedSolutionIds] = useState<string[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  
  // Extraction state
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractionResults, setExtractionResults] = useState<Map<string, ExtractionResult>>(new Map());

  // Fetch entities for linking
  const { projects } = useCockpitProjects();
  const { leads } = useCockpitLeads();
  
  // Fetch solutions (articles with resource_type = 'solution')
  const [solutions, setSolutions] = useState<{ id: string; title: string }[]>([]);
  // Fetch documents générés
  const [documents, setDocuments] = useState<{ id: string; title: string; document_type: string }[]>([]);
  
  // Load solutions and documents on mount
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Solutions
      const { data: solutionsData } = await supabase
        .from('articles')
        .select('id, title')
        .eq('resource_type', 'solution')
        .eq('published', true);
      
      if (isMounted && solutionsData) {
        setSolutions(solutionsData);
      }
      
      // Documents générés
      const { data: docsData } = await supabase
        .from('generated_documents')
        .select('id, title, document_type')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (isMounted && docsData) {
        setDocuments(docsData);
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const { 
    uploads, 
    isLoading, 
    uploadFileAsync,
    uploadText,
    isUploading,
    isUploadingText,
    reprocess,
    generateShareLink,
    deleteFile,
    deleteFileAsync,
    downloadFile,
    refetch
  } = useCockpitUploads({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
  });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles(prev => [...prev, ...files]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  // Extract text from files before upload
  const extractFilesContent = async () => {
    setIsExtracting(true);
    setExtractionProgress(0);
    const results = new Map<string, ExtractionResult>();
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      try {
        const result = await extractFileContent(file);
        results.set(file.name, result);
      } catch (error) {
        results.set(file.name, { 
          success: false, 
          text: '', 
          error: 'Extraction échouée' 
        });
      }
      setExtractionProgress(((i + 1) / selectedFiles.length) * 100);
    }
    
    setExtractionResults(results);
    setIsExtracting(false);
    
    const successCount = Array.from(results.values()).filter(r => r.success).length;
    const ocrCount = Array.from(results.values()).filter(r => r.needsOcr).length;
    
    if (successCount > 0) {
      toast.success(`${successCount} fichier(s) analysé(s) localement`);
    }
    if (ocrCount > 0) {
      toast.info(`${ocrCount} fichier(s) nécessitent un OCR serveur`);
    }
  };

  const resetForm = () => {
    setSelectedFiles([]);
    setSelectedCategory('');
    setTagsInput('');
    setExtractionResults(new Map());
    setSelectedProjectIds([]);
    setSelectedLeadIds([]);
    setSelectedSolutionIds([]);
    setSelectedDocumentId('');
  };

  const cancelUploadJob = useCallback((jobId: string) => {
    cancelJobIdsRef.current.add(jobId);
    setUploadJobs(prev => prev.map(job => {
      if (job.jobId !== jobId) return job;
      if (job.status === 'queued') return { ...job, status: 'cancelled' };
      if (job.status === 'uploading') return { ...job, status: 'cancelling' };
      return job;
    }));
  }, []);

  const handleUpload = () => {
    if (selectedFiles.length === 0 || isUploadQueueRunning) return;

    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

    const jobs: UploadJob[] = selectedFiles.map((file, idx) => {
      const extractionResult = extractionResults.get(file.name);
      const extractedText = extractionResult?.success ? extractionResult.text : undefined;
      const jobId = `${Date.now()}_${idx}_${file.name}`;

      return {
        jobId,
        file,
        extractedText,
        status: 'queued',
      };
    });

    // Reset selection UI but keep queue visible
    setSelectedFiles([]);
    setExtractionResults(new Map());
    setUploadJobs(jobs);
    setIsUploadQueueRunning(true);

    void (async () => {
      for (const job of jobs) {
        // Skip cancelled jobs
        if (cancelJobIdsRef.current.has(job.jobId)) {
          setUploadJobs(prev => prev.map(j => j.jobId === job.jobId ? { ...j, status: 'cancelled' } : j));
          continue;
        }

        setUploadJobs(prev => prev.map(j => j.jobId === job.jobId ? { ...j, status: 'uploading' } : j));

        try {
          const result = await uploadFileAsync({
            file: job.file,
            category: selectedCategory || undefined,
            tags,
            extractedText: job.extractedText,
            projectIds: selectedProjectIds,
            leadIds: selectedLeadIds,
            solutionIds: selectedSolutionIds,
            documentId: selectedDocumentId || undefined,
          });

          // Duplicate -> nothing to delete
          if ((result as any)?.duplicate) {
            setUploadJobs(prev => prev.map(j => j.jobId === job.jobId ? { ...j, status: cancelJobIdsRef.current.has(job.jobId) ? 'cancelled' : 'completed' } : j));
            continue;
          }

          const backendId = (result as any)?.file?.id as string | undefined;
          if (backendId) {
            setUploadJobs(prev => prev.map(j => j.jobId === job.jobId ? { ...j, backendFileId: backendId } : j));
          }

          // If user cancelled while upload was running, delete right after creation
          if (backendId && cancelJobIdsRef.current.has(job.jobId)) {
            setUploadJobs(prev => prev.map(j => j.jobId === job.jobId ? { ...j, status: 'cancelling' } : j));
            await deleteFileAsync(backendId);
            setUploadJobs(prev => prev.map(j => j.jobId === job.jobId ? { ...j, status: 'cancelled' } : j));
          } else {
            setUploadJobs(prev => prev.map(j => j.jobId === job.jobId ? { ...j, status: 'completed' } : j));
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Erreur inconnue';
          setUploadJobs(prev => prev.map(j => j.jobId === job.jobId ? { ...j, status: 'failed', error: message } : j));
        }
      }

      setIsUploadQueueRunning(false);
      cancelJobIdsRef.current.clear();
      setUploadJobs([]);
      resetForm();
      setActiveTab('list');
    })();
  };

  const handleTextUpload = async () => {
    if (!pastedText.trim()) return;
    
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    
    uploadText({
      content: pastedText,
      filename: `texte_${Date.now()}.txt`,
      category: selectedCategory || undefined,
      tags,
      projectIds: selectedProjectIds,
      leadIds: selectedLeadIds,
      solutionIds: selectedSolutionIds,
      documentId: selectedDocumentId || undefined,
    });
    
    setPastedText('');
    resetForm();
    setActiveTab('list');
  };

  const filteredUploads = uploads?.filter(file => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        file.original_filename.toLowerCase().includes(query) ||
        file.ai_summary?.toLowerCase().includes(query) ||
        file.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }
    return true;
  });

  return (
    <CockpitLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Documents</h1>
            <p className="text-muted-foreground">Uploadez et analysez vos documents</p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'upload' | 'list')}>
          <TabsList>
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              Uploader
            </TabsTrigger>
            <TabsTrigger value="list">
              <FileText className="h-4 w-4 mr-2" />
              Mes fichiers
              {uploads?.length ? (
                <Badge variant="secondary" className="ml-2">{uploads.length}</Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            {/* Drop zone */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Déposer des fichiers</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                    dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                    "cursor-pointer hover:border-primary/50"
                  )}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <input
                    id="file-input"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md,.csv,.jpg,.jpeg,.png,.webp"
                  />
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-1">
                    Glissez vos fichiers ici ou cliquez pour sélectionner
                  </p>
                  <p className="text-sm text-muted-foreground">
                    PDF, DOCX, XLSX, TXT, Images • Max 50 MB
                  </p>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{selectedFiles.length} fichier(s) sélectionné(s)</p>
                      {extractionResults.size === 0 && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={extractFilesContent}
                          disabled={isExtracting}
                        >
                          {isExtracting ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4 mr-2" />
                          )}
                          Pré-analyser
                        </Button>
                      )}
                    </div>
                    
                    {isExtracting && (
                      <div className="space-y-1">
                        <Progress value={extractionProgress} className="h-2" />
                        <p className="text-xs text-muted-foreground">Extraction en cours...</p>
                      </div>
                    )}
                    
                    {selectedFiles.map((file, i) => {
                      const result = extractionResults.get(file.name);
                      return (
                        <div key={i} className="flex items-center justify-between p-2 bg-muted rounded group">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText className="h-4 w-4 shrink-0" />
                            <span className="text-sm truncate">{file.name}</span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              ({formatFileSize(file.size)})
                            </span>
                            {result && (
                              result.success ? (
                                <Badge variant="secondary" className="text-xs shrink-0">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  {result.text.length.toLocaleString()} car.
                                </Badge>
                              ) : result.needsOcr ? (
                                <Badge variant="outline" className="text-xs shrink-0">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  OCR requis
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="text-xs shrink-0">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Échec
                                </Badge>
                              )
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFiles(prev => prev.filter((_, idx) => idx !== i));
                              setExtractionResults(prev => {
                                const next = new Map(prev);
                                next.delete(file.name);
                                return next;
                              });
                            }}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Paste text zone */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Coller du texte</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Collez votre texte ici..."
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  className="min-h-[150px]"
                />
                {pastedText && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {pastedText.length} caractères
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Entity Linking */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Projet</label>
                    <Select 
                      value={selectedProjectIds[0] || "none"} 
                      onValueChange={(v) => setSelectedProjectIds(v === "none" ? [] : [v])}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Projet..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun</SelectItem>
                        {projects?.map(project => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Lead</label>
                    <Select 
                      value={selectedLeadIds[0] || "none"} 
                      onValueChange={(v) => setSelectedLeadIds(v === "none" ? [] : [v])}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Lead..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun</SelectItem>
                        {leads?.map(lead => (
                          <SelectItem key={lead.id} value={lead.id}>
                            {lead.name} {lead.company && `(${lead.company})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Solution</label>
                    <Select 
                      value={selectedSolutionIds[0] || "none"} 
                      onValueChange={(v) => setSelectedSolutionIds(v === "none" ? [] : [v])}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Solution..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucune</SelectItem>
                        {solutions?.map(solution => (
                          <SelectItem key={solution.id} value={solution.id}>
                            {solution.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Document</label>
                    <Select 
                      value={selectedDocumentId || "none"} 
                      onValueChange={(v) => setSelectedDocumentId(v === "none" ? '' : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Document..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun</SelectItem>
                        {documents?.map(doc => (
                          <SelectItem key={doc.id} value={doc.id}>
                            {doc.title} ({doc.document_type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Catégorie</label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Tags (séparés par virgule)</label>
                    <Input
                      placeholder="urgent, client, projet..."
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleUpload}
                    disabled={selectedFiles.length === 0 || isUploading || isUploadQueueRunning}
                    className="flex-1"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Upload en cours...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Uploader {selectedFiles.length} fichier(s)
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleTextUpload}
                    disabled={!pastedText.trim() || isUploadingText || isUploadQueueRunning}
                    variant="secondary"
                  >
                    {isUploadingText ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Clipboard className="h-4 w-4 mr-2" />
                        Enregistrer le texte
                      </>
                    )}
                  </Button>
                </div>

                {(isUploadQueueRunning || uploadJobs.length > 0) && (
                  <div className="mt-4">
                    <div className="text-sm font-medium mb-2">File d'upload</div>
                    <div className="space-y-2">
                      {uploadJobs.map((job) => {
                        const canCancel = job.status === 'queued' || job.status === 'uploading';

                        const statusLabel: Record<UploadJobStatus, string> = {
                          queued: 'En attente',
                          uploading: 'Upload…',
                          completed: 'Terminé',
                          failed: 'Échec',
                          cancelling: 'Annulation…',
                          cancelled: 'Annulé',
                        };

                        const badgeVariant: Record<UploadJobStatus, 'secondary' | 'outline' | 'destructive'> = {
                          queued: 'outline',
                          uploading: 'secondary',
                          completed: 'secondary',
                          failed: 'destructive',
                          cancelling: 'secondary',
                          cancelled: 'outline',
                        };

                        return (
                          <div
                            key={job.jobId}
                            className="flex items-center justify-between gap-3 rounded-lg border border-border p-2"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm truncate">{job.file.name}</span>
                                <Badge variant={badgeVariant[job.status]} className="text-xs shrink-0">
                                  {job.status === 'uploading' || job.status === 'cancelling' ? (
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  ) : job.status === 'failed' ? (
                                    <XCircle className="h-3 w-3 mr-1" />
                                  ) : job.status === 'completed' ? (
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                  ) : job.status === 'cancelled' ? (
                                    <XCircle className="h-3 w-3 mr-1" />
                                  ) : null}
                                  {statusLabel[job.status]}
                                </Badge>
                              </div>
                              {job.error && (
                                <div className="text-xs text-muted-foreground mt-1 truncate">
                                  {job.error}
                                </div>
                              )}
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              disabled={!canCancel}
                              onClick={() => cancelUploadJob(job.jobId)}
                              aria-label="Annuler l'upload"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="list" className="space-y-4">
            {/* Filters */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="processing">En cours</SelectItem>
                  <SelectItem value="completed">Terminé</SelectItem>
                  <SelectItem value="failed">Échec</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* File list */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUploads?.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucun fichier trouvé</p>
                  <Button
                    variant="link"
                    onClick={() => setActiveTab('upload')}
                    className="mt-2"
                  >
                    Uploader un fichier
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredUploads?.map(file => (
                  <FileCard
                    key={file.id}
                    file={file}
                    onReprocess={() => reprocess({ fileId: file.id })}
                    onDownload={() => downloadFile(file)}
                    onShare={() => generateShareLink({ fileId: file.id })}
                    onDelete={() => deleteFile(file.id)}
                    onView={() => {
                      setSelectedFile(file);
                      setDetailSheetOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* File Detail Sheet */}
        <FileDetailSheet
          file={selectedFile}
          open={detailSheetOpen}
          onOpenChange={setDetailSheetOpen}
        />
      </div>
    </CockpitLayout>
  );
}
