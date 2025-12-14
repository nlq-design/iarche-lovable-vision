import React, { useState } from 'react';
import { Save, Trash2, Pencil, Check, X, Loader2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMediaTemplates, EditorType, MediaTemplate } from '@/hooks/useMediaTemplates';
import { convertTemplateColors, detectTemplateCharter } from '@/lib/charterColorConverter';
import { IARCHE_I_COLORS, IARCHE_II_COLORS } from './CharterSelector';

interface SavedTemplatesPanelProps {
  editorType: EditorType;
  getCurrentData: () => Record<string, unknown>;
  onLoadTemplate: (data: Record<string, unknown>) => void;
}

export default function SavedTemplatesPanel({
  editorType,
  getCurrentData,
  onLoadTemplate,
}: SavedTemplatesPanelProps) {
  const { templates, isLoading, saveTemplate, renameTemplate, deleteTemplate, duplicateTemplate, isSaving, isDuplicating } = useMediaTemplates(editorType);
  const [newName, setNewName] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleSave = () => {
    if (!newName.trim()) return;
    saveTemplate({ name: newName.trim(), templateData: getCurrentData() });
    setNewName('');
    setSaveDialogOpen(false);
  };

  const handleStartRename = (template: MediaTemplate) => {
    setEditingId(template.id);
    setEditName(template.name);
  };

  const handleConfirmRename = () => {
    if (editingId && editName.trim()) {
      renameTemplate({ id: editingId, name: editName.trim() });
    }
    setEditingId(null);
  };

  const handleCancelRename = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleDuplicateToOtherCharter = (template: MediaTemplate) => {
    const detectedCharter = detectTemplateCharter(template.template_data);
    const targetCharter = detectedCharter === 'iarche2' ? 'iarche' : 'iarche2';
    const charterLabel = targetCharter === 'iarche2' ? 'IArche II' : 'IArche I';
    
    const convertedData = convertTemplateColors(template.template_data, targetCharter);
    
    duplicateTemplate({
      sourceId: template.id,
      newName: `${template.name} (${charterLabel})`,
      templateData: convertedData,
    });
  };

  const getCharterIndicator = (template: MediaTemplate) => {
    const charter = detectTemplateCharter(template.template_data);
    if (!charter) return null;
    
    const colors = charter === 'iarche2' ? IARCHE_II_COLORS : IARCHE_I_COLORS;
    return (
      <div 
        className="w-3 h-3 rounded-full shrink-0"
        style={{ 
          background: `linear-gradient(135deg, ${colors.bleuNuit} 0%, ${colors.terracotta} 100%)`
        }}
        title={charter === 'iarche2' ? 'IArche II' : 'IArche I'}
      />
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Mes templates</Label>
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Save className="h-4 w-4" />
              Sauvegarder
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sauvegarder le template</DialogTitle>
              <DialogDescription>
                Donnez un nom à votre template pour le retrouver facilement.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Nom du template</Label>
                <Input
                  id="template-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Mon template personnalisé"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={!newName.trim() || isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Sauvegarder
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucun template sauvegardé
        </p>
      ) : (
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {templates.map((template) => (
            <div
              key={template.id}
              className="flex items-center gap-2 p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              {editingId === template.id ? (
                <>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleConfirmRename}>
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCancelRename}>
                    <X className="h-4 w-4 text-red-600" />
                  </Button>
                </>
              ) : (
                <>
                  {getCharterIndicator(template)}
                  <button
                    onClick={() => onLoadTemplate(template.template_data)}
                    className="flex-1 text-left text-sm font-medium truncate hover:text-primary"
                  >
                    {template.name}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => handleStartRename(template)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  
                  {/* Dropdown pour duplication */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        disabled={isDuplicating}
                      >
                        {isDuplicating ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleDuplicateToOtherCharter(template)}
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ 
                              background: detectTemplateCharter(template.template_data) === 'iarche2'
                                ? `linear-gradient(135deg, ${IARCHE_I_COLORS.bleuNuit} 0%, ${IARCHE_I_COLORS.terracotta} 100%)`
                                : `linear-gradient(135deg, ${IARCHE_II_COLORS.terracotta} 0%, ${IARCHE_II_COLORS.bleuNuit} 100%)`
                            }}
                          />
                          Dupliquer vers {detectTemplateCharter(template.template_data) === 'iarche2' ? 'IArche I' : 'IArche II'}
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer le template ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible. Le template "{template.name}" sera définitivement supprimé.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteTemplate(template.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
