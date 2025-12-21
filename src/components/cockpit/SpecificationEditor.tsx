import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { 
  Plus, 
  FileText, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  History,
  User,
  Loader2,
  Upload,
  Download,
  File,
  FileIcon,
  X,
  Eye,
  Tag,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useCockpitSpecifications, SPECIFICATION_STATUSES } from "@/hooks/cockpit/useCockpitSpecifications";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Specification = Database["public"]["Tables"]["specifications"]["Row"];

interface SpecificationEditorProps {
  projectId: string;
  specifications: Specification[];
}

const STATUS_CONFIG = {
  draft: { label: "Brouillon", variant: "outline" as const, icon: Edit3 },
  in_review: { label: "En révision", variant: "secondary" as const, icon: Clock },
  approved: { label: "Approuvé", variant: "default" as const, icon: CheckCircle2 },
  archived: { label: "Archivé", variant: "outline" as const, icon: History },
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const getFileIcon = (fileType: string | null) => {
  if (!fileType) return FileIcon;
  if (fileType.includes('pdf')) return FileText;
  if (fileType.includes('word') || fileType.includes('document')) return FileText;
  return File;
};

export const SpecificationEditor = ({ projectId, specifications }: SpecificationEditorProps) => {
  const { createSpecification, updateSpecification, approveSpecification, deleteSpecification } = useCockpitSpecifications();

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedSpec, setSelectedSpec] = useState<Specification | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  
  // Form states - Create
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  
  // Form states - Edit
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editStatus, setEditStatus] = useState<string>("draft");
  const [editVersion, setEditVersion] = useState("1.0");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState("");

  const uploadFile = async (file: File, specId: string): Promise<{ url: string; name: string; size: number; type: string }> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${specId}/${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from("specifications")
      .upload(fileName, file, { upsert: true });
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from("specifications")
      .getPublicUrl(fileName);
    
    return {
      url: publicUrl,
      name: file.name,
      size: file.size,
      type: file.type,
    };
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setIsUploading(true);
    
    try {
      // First create the spec to get an ID
      const specData: any = {
        title: newTitle,
        project_id: projectId,
        content: newContent ? { text: newContent } : {},
        status: "draft",
        version: "1.0",
        workspace_id: "00000000-0000-0000-0000-000000000001",
        tags: newTags.length > 0 ? newTags : null,
        solution_id: newSolutionId || null,
      };

      const { data: createdSpec, error: createError } = await supabase
        .from("specifications")
        .insert(specData)
        .select()
        .single();
      
      if (createError) throw createError;

      // If file provided, upload it
      if (newFile && createdSpec) {
        const fileInfo = await uploadFile(newFile, createdSpec.id);
        
        await supabase
          .from("specifications")
          .update({
            file_url: fileInfo.url,
            file_name: fileInfo.name,
            file_size_bytes: fileInfo.size,
            file_type: fileInfo.type,
          })
          .eq("id", createdSpec.id);
      }
      
      toast.success("Cahier des charges créé");
      resetCreateForm();
      setShowAddDialog(false);
      
      // Invalidate queries
      createSpecification.reset();
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la création");
    } finally {
      setIsUploading(false);
    }
  };

  const resetCreateForm = () => {
    setNewTitle("");
    setNewContent("");
    setNewFile(null);
    setNewTags([]);
    setNewTagInput("");
    setNewSolutionId("");
  };

  const handleEdit = (spec: Specification) => {
    setSelectedSpec(spec);
    setEditTitle(spec.title);
    setEditContent(typeof spec.content === 'object' && spec.content !== null 
      ? (spec.content as any).text || "" 
      : "");
    setEditStatus(spec.status);
    setEditVersion(spec.version || "1.0");
    setEditFile(null);
    setEditTags((spec as any).tags || []);
    setEditTagInput("");
    setEditSolutionId((spec as any).solution_id || "");
    setShowEditSheet(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedSpec || !editTitle.trim()) return;
    setIsUploading(true);
    
    try {
      const updates: any = {
        id: selectedSpec.id,
        title: editTitle,
        content: editContent ? { text: editContent } : {},
        status: editStatus,
        version: editVersion,
        tags: editTags.length > 0 ? editTags : null,
        solution_id: editSolutionId || null,
      };

      // Upload new file if provided
      if (editFile) {
        const fileInfo = await uploadFile(editFile, selectedSpec.id);
        updates.file_url = fileInfo.url;
        updates.file_name = fileInfo.name;
        updates.file_size_bytes = fileInfo.size;
        updates.file_type = fileInfo.type;
      }
      
      updateSpecification.mutate(updates, {
        onSuccess: () => {
          setShowEditSheet(false);
          setSelectedSpec(null);
        }
      });
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setIsUploading(false);
    }
  };

  const handleApprove = (spec: Specification) => {
    approveSpecification.mutate({
      id: spec.id,
      approvedBy: "Admin", // TODO: use actual user
    });
  };

  const handleDelete = () => {
    if (!selectedSpec) return;
    
    deleteSpecification.mutate(selectedSpec.id, {
      onSuccess: () => {
        setShowDeleteDialog(false);
        setShowEditSheet(false);
        setSelectedSpec(null);
      }
    });
  };

  const incrementVersion = (version: string): string => {
    const parts = version.split(".");
    if (parts.length === 2) {
      const minor = parseInt(parts[1], 10);
      return `${parts[0]}.${minor + 1}`;
    }
    return "1.1";
  };

  const addTag = (isEdit: boolean) => {
    const input = isEdit ? editTagInput : newTagInput;
    const tags = isEdit ? editTags : newTags;
    const setTags = isEdit ? setEditTags : setNewTags;
    const setInput = isEdit ? setEditTagInput : setNewTagInput;
    
    const tag = input.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setInput("");
  };

  const removeTag = (tag: string, isEdit: boolean) => {
    const setTags = isEdit ? setEditTags : setNewTags;
    const tags = isEdit ? editTags : newTags;
    setTags(tags.filter(t => t !== tag));
  };

  const handleKeyPress = (e: React.KeyboardEvent, isEdit: boolean) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(isEdit);
    }
  };

  const openFilePreview = (url: string) => {
    window.open(url, "_blank");
  };

  const downloadFile = (url: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Tags input component
  const TagsInput = ({ 
    tags, 
    tagInput, 
    setTagInput, 
    isEdit 
  }: { 
    tags: string[]; 
    tagInput: string; 
    setTagInput: (v: string) => void;
    isEdit: boolean;
  }) => (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Tag className="h-3.5 w-3.5" />
        Tags
      </Label>
      <div className="flex flex-wrap gap-1.5 p-2 border rounded-md min-h-[40px] bg-background">
        {tags.map(tag => (
          <Badge key={tag} variant="secondary" className="gap-1 text-xs">
            {tag}
            <X 
              className="h-3 w-3 cursor-pointer hover:text-destructive" 
              onClick={() => removeTag(tag, isEdit)}
            />
          </Badge>
        ))}
        <Input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => handleKeyPress(e, isEdit)}
          onBlur={() => addTag(isEdit)}
          placeholder={tags.length === 0 ? "Ajouter des tags..." : ""}
          className="border-0 p-0 h-6 text-sm flex-1 min-w-[100px] focus-visible:ring-0 shadow-none"
        />
      </div>
      <p className="text-xs text-muted-foreground">Appuyez sur Entrée pour ajouter</p>
    </div>
  );

  // File upload component
  const FileUploadArea = ({ 
    file, 
    existingFileUrl,
    existingFileName,
    existingFileSize,
    onFileChange, 
    inputRef,
    onClear 
  }: { 
    file: File | null;
    existingFileUrl?: string | null;
    existingFileName?: string | null;
    existingFileSize?: number | null;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    inputRef: React.RefObject<HTMLInputElement>;
    onClear: () => void;
  }) => (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Upload className="h-3.5 w-3.5" />
        Document
      </Label>
      
      {(file || existingFileUrl) ? (
        <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
          <FileText className="h-8 w-8 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              {file ? file.name : existingFileName}
            </p>
            <p className="text-xs text-muted-foreground">
              {file ? formatFileSize(file.size) : (existingFileSize ? formatFileSize(existingFileSize) : "")}
            </p>
          </div>
          <div className="flex gap-1 shrink-0">
            {existingFileUrl && !file && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openFilePreview(existingFileUrl)}
                  title="Prévisualiser"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => downloadFile(existingFileUrl, existingFileName || "document")}
                  title="Télécharger"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onClear}
              title="Supprimer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div 
          className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">Glissez un fichier ou cliquez pour uploader</p>
          <p className="text-xs text-muted-foreground mt-1">PDF, Word, Excel... (max 50 MB)</p>
        </div>
      )}
      
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md"
        onChange={onFileChange}
      />
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Cahiers des charges</CardTitle>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Nouveau CDC
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouveau cahier des charges</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 pt-4">
              <div className="space-y-2">
                <Label>Titre *</Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: CDC Refonte Site Web v1"
                />
              </div>

              {/* File Upload */}
              <FileUploadArea
                file={newFile}
                onFileChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setNewFile(file);
                }}
                inputRef={fileInputRef as React.RefObject<HTMLInputElement>}
                onClear={() => setNewFile(null)}
              />

              {/* Tags */}
              <TagsInput
                tags={newTags}
                tagInput={newTagInput}
                setTagInput={setNewTagInput}
                isEdit={false}
              />

              {/* Solution Link */}
              <div className="space-y-2">
                <Label>Solution IArche associée</Label>
                <Select value={newSolutionId || "none"} onValueChange={(v) => setNewSolutionId(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Aucune solution liée" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune</SelectItem>
                    {solutions.map(sol => (
                      <SelectItem key={sol.id} value={sol.id}>
                        {sol.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Description / Notes</Label>
                <Textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Notes complémentaires, contexte du projet..."
                  rows={4}
                  className="resize-y"
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => { setShowAddDialog(false); resetCreateForm(); }}>
                Annuler
              </Button>
              <Button 
                onClick={handleCreate} 
                disabled={!newTitle.trim() || isUploading}
              >
                {isUploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <CardContent>
        {specifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="h-10 w-10 mb-3 opacity-50" />
            <p className="font-medium">Aucun cahier des charges</p>
            <p className="text-sm">Créez votre premier CDC pour ce projet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {specifications.map(spec => {
              const statusConfig = STATUS_CONFIG[spec.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft;
              const StatusIcon = statusConfig.icon;
              const hasFile = !!(spec as any).file_url;
              const FileTypeIcon = getFileIcon((spec as any).file_type);
              const specTags = (spec as any).tags || [];
              
              return (
                <div 
                  key={spec.id} 
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                  onClick={() => handleEdit(spec)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {hasFile && <FileTypeIcon className="h-4 w-4 text-primary shrink-0" />}
                        <h4 className="font-medium truncate">{spec.title}</h4>
                        <Badge variant="outline" className="text-xs shrink-0">v{spec.version}</Badge>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Badge variant={statusConfig.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </Badge>
                        {hasFile && (
                          <span className="text-primary">
                            {(spec as any).file_name} ({formatFileSize((spec as any).file_size_bytes || 0)})
                          </span>
                        )}
                        {spec.updated_at && (
                          <span>Modifié le {format(new Date(spec.updated_at), "dd MMM yyyy", { locale: fr })}</span>
                        )}
                      </div>
                      
                      {/* Tags display */}
                      {specTags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {specTags.slice(0, 5).map((tag: string) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {specTags.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{specTags.length - 5}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {spec.approved_at && spec.approved_by && (
                        <span className="flex items-center gap-1 text-xs text-green-600 mt-1">
                          <User className="h-3 w-3" />
                          Approuvé par {spec.approved_by}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0">
                      {hasFile && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            openFilePreview((spec as any).file_url);
                          }}
                          title="Voir le document"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {spec.status !== "approved" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(spec);
                          }}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Approuver
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(spec);
                        }}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Edit Sheet */}
      <Sheet open={showEditSheet} onOpenChange={setShowEditSheet}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Modifier le cahier des charges</SheetTitle>
          </SheetHeader>
          
          {selectedSpec && (
            <div className="space-y-6 py-6">
              <div className="space-y-2">
                <Label>Titre *</Label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Titre du CDC"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SPECIFICATION_STATUSES.map(status => (
                        <SelectItem key={status} value={status}>
                          {STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.label || status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Version</Label>
                  <div className="flex gap-2">
                    <Input
                      value={editVersion}
                      onChange={(e) => setEditVersion(e.target.value)}
                      placeholder="1.0"
                      className="flex-1"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setEditVersion(incrementVersion(editVersion))}
                      title="Incrémenter la version"
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>

              {/* File Upload in Edit */}
              <FileUploadArea
                file={editFile}
                existingFileUrl={(selectedSpec as any).file_url}
                existingFileName={(selectedSpec as any).file_name}
                existingFileSize={(selectedSpec as any).file_size_bytes}
                onFileChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setEditFile(file);
                }}
                inputRef={editFileInputRef as React.RefObject<HTMLInputElement>}
                onClear={() => setEditFile(null)}
              />

              {/* Tags in Edit */}
              <TagsInput
                tags={editTags}
                tagInput={editTagInput}
                setTagInput={setEditTagInput}
                isEdit={true}
              />

              {/* Solution Link in Edit */}
              <div className="space-y-2">
                <Label>Solution IArche associée</Label>
                <Select value={editSolutionId || "none"} onValueChange={(v) => setEditSolutionId(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Aucune solution liée" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune</SelectItem>
                    {solutions.map(sol => (
                      <SelectItem key={sol.id} value={sol.id}>
                        {sol.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Description / Notes</Label>
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Notes complémentaires..."
                  rows={8}
                  className="resize-y"
                />
              </div>

              {/* Metadata */}
              <div className="pt-4 border-t space-y-2 text-xs text-muted-foreground">
                <p>Créé le {selectedSpec.created_at && format(new Date(selectedSpec.created_at), "dd MMMM yyyy à HH:mm", { locale: fr })}</p>
                {selectedSpec.approved_at && (
                  <p className="text-green-600">
                    Approuvé le {format(new Date(selectedSpec.approved_at), "dd MMMM yyyy", { locale: fr })} par {selectedSpec.approved_by}
                  </p>
                )}
                {selectedSpec.ai_generated && (
                  <Badge variant="secondary" className="text-xs">Généré par IA</Badge>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Supprimer
                </Button>
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowEditSheet(false)}>
                    Annuler
                  </Button>
                  <Button 
                    onClick={handleSaveEdit}
                    disabled={!editTitle.trim() || updateSpecification.isPending || isUploading}
                  >
                    {(updateSpecification.isPending || isUploading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Enregistrer
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce cahier des charges ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le CDC "{selectedSpec?.title}" sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
