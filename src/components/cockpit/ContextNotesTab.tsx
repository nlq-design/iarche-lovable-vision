import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Plus, Save, Trash2, Edit2, X, StickyNote, Sparkles } from "lucide-react";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useEntityContextNotes, type ContextNoteEntityType, type EntityContextNote } from '@/hooks/cockpit/useEntityContextNotes';

interface ContextNotesTabProps {
  entityType: ContextNoteEntityType;
  entityId: string | undefined;
}

export function ContextNotesTab({ entityType, entityId }: ContextNotesTabProps) {
  const { notes, isLoading, createNote, updateNote, deleteNote } = useEntityContextNotes(entityType, entityId);
  
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

  const handleAddNote = async () => {
    if (!entityId || !newNoteContent.trim()) return;
    
    await createNote.mutateAsync({
      entity_type: entityType,
      entity_id: entityId,
      content: newNoteContent.trim(),
    });
    
    setNewNoteContent('');
    setIsAddingNote(false);
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editingContent.trim()) return;
    
    await updateNote.mutateAsync({
      id: noteId,
      content: editingContent.trim(),
    });
    
    setEditingNoteId(null);
    setEditingContent('');
  };

  const handleDeleteNote = async () => {
    if (!deleteNoteId) return;
    await deleteNote.mutateAsync(deleteNoteId);
    setDeleteNoteId(null);
  };

  const startEditing = (note: EntityContextNote) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-3">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Contexte pour la synthèse IA</p>
              <p className="text-muted-foreground">
                Ces notes sont utilisées comme <strong>dernière source</strong> par l'IA pour enrichir la synthèse. 
                Ajoutez ici les informations non capturées ailleurs (rencontres, impressions, historique oral...).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add note button / form */}
      {!isAddingNote ? (
        <Button 
          variant="outline" 
          onClick={() => setIsAddingNote(true)}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une note de contexte
        </Button>
      ) : (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Textarea
              placeholder="Saisissez votre note de contexte... (ex: 'Client rencontré au salon XYZ, très intéressé par l'IA mais a eu une mauvaise expérience avec un concurrent')"
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <div className="flex gap-2 justify-end">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setIsAddingNote(false);
                  setNewNoteContent('');
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Annuler
              </Button>
              <Button 
                size="sm"
                onClick={handleAddNote}
                disabled={!newNoteContent.trim() || createNote.isPending}
              >
                <Save className="h-4 w-4 mr-1" />
                {createNote.isPending ? 'Ajout...' : 'Ajouter'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes list */}
      {notes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <StickyNote className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Aucune note de contexte pour le moment
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Les notes ajoutées ici enrichiront automatiquement la synthèse IA
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-3 pr-4">
            {notes.map((note) => (
              <Card key={note.id} className="group">
                <CardHeader className="py-2 px-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      {format(new Date(note.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                    </Badge>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => startEditing(note)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteNoteId(note.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 px-4 pb-3">
                  {editingNoteId === note.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        rows={4}
                        className="resize-none"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setEditingNoteId(null);
                            setEditingContent('');
                          }}
                        >
                          Annuler
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleUpdateNote(note.id)}
                          disabled={updateNote.isPending}
                        >
                          {updateNote.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteNoteId} onOpenChange={() => setDeleteNoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette note ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La note sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteNote}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
