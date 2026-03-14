import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquareText, Sparkles, Loader2, Check, X } from 'lucide-react';

interface TranscriptionContextEditorProps {
  analysisContext: string | null;
  isProcessing: boolean;
  onSave: (context: string | null) => void;
  onSaveAndReanalyze: (context: string | null) => void;
}

export function TranscriptionContextEditor({
  analysisContext,
  isProcessing,
  onSave,
  onSaveAndReanalyze,
}: TranscriptionContextEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(analysisContext || '');

  useEffect(() => {
    setDraft(analysisContext || '');
  }, [analysisContext]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquareText className="h-4 w-4" />
          Contexte d'analyse
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {editing ? (
          <div className="space-y-3">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ajoutez du contexte pour améliorer l'analyse IA (ex: c'est un RDV de découverte avec un prospect du secteur santé...)"
              rows={3}
              className="text-sm"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => { onSaveAndReanalyze(draft.trim() || null); setEditing(false); }} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Sauvegarder et ré-analyser
              </Button>
              <Button size="sm" variant="outline" onClick={() => { onSave(draft.trim() || null); setEditing(false); }}>
                <Check className="h-4 w-4 mr-2" />
                Sauvegarder seulement
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setDraft(analysisContext || ''); setEditing(false); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="cursor-pointer p-2 -m-2 rounded hover:bg-muted/50 transition-colors"
            onClick={() => setEditing(true)}
          >
            {analysisContext ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{analysisContext}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">Cliquer pour ajouter du contexte à l'analyse IA...</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
