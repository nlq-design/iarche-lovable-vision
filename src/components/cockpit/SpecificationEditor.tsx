import { useState } from "react";
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
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useCockpitSpecifications, SPECIFICATION_STATUSES } from "@/hooks/cockpit/useCockpitSpecifications";
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

export const SpecificationEditor = ({ projectId, specifications }: SpecificationEditorProps) => {
  const { createSpecification, updateSpecification, approveSpecification, deleteSpecification } = useCockpitSpecifications();
  
  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedSpec, setSelectedSpec] = useState<Specification | null>(null);
  
  // Form states
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editStatus, setEditStatus] = useState<string>("draft");
  const [editVersion, setEditVersion] = useState("1.0");

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    
    createSpecification.mutate({
      title: newTitle,
      project_id: projectId,
      content: newContent ? { text: newContent } : {},
      status: "draft",
      version: "1.0",
      workspace_id: "00000000-0000-0000-0000-000000000001",
    }, {
      onSuccess: () => {
        setNewTitle("");
        setNewContent("");
        setShowAddDialog(false);
      }
    });
  };

  const handleEdit = (spec: Specification) => {
    setSelectedSpec(spec);
    setEditTitle(spec.title);
    setEditContent(typeof spec.content === 'object' && spec.content !== null 
      ? (spec.content as any).text || "" 
      : "");
    setEditStatus(spec.status);
    setEditVersion(spec.version || "1.0");
    setShowEditSheet(true);
  };

  const handleSaveEdit = () => {
    if (!selectedSpec || !editTitle.trim()) return;
    
    updateSpecification.mutate({
      id: selectedSpec.id,
      title: editTitle,
      content: editContent ? { text: editContent } : {},
      status: editStatus as any,
      version: editVersion,
    }, {
      onSuccess: () => {
        setShowEditSheet(false);
        setSelectedSpec(null);
      }
    });
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
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Nouveau cahier des charges</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Titre *</Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: CDC Refonte Site Web v1"
                />
              </div>
              <div className="space-y-2">
                <Label>Contenu</Label>
                <Textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Décrivez les spécifications, objectifs, livrables..."
                  rows={8}
                  className="resize-y"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Annuler
              </Button>
              <Button 
                onClick={handleCreate} 
                disabled={!newTitle.trim() || createSpecification.isPending}
              >
                {createSpecification.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
              
              return (
                <div 
                  key={spec.id} 
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                  onClick={() => handleEdit(spec)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{spec.title}</h4>
                        <Badge variant="outline" className="text-xs shrink-0">v{spec.version}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <Badge variant={statusConfig.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </Badge>
                        {spec.updated_at && (
                          <span>Modifié le {format(new Date(spec.updated_at), "dd MMM yyyy", { locale: fr })}</span>
                        )}
                        {spec.approved_at && spec.approved_by && (
                          <span className="flex items-center gap-1 text-green-600">
                            <User className="h-3 w-3" />
                            Approuvé par {spec.approved_by}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0">
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
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
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
              
              <div className="space-y-2">
                <Label>Contenu</Label>
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Spécifications, objectifs, livrables..."
                  rows={12}
                  className="resize-y font-mono text-sm"
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
                    disabled={!editTitle.trim() || updateSpecification.isPending}
                  >
                    {updateSpecification.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
