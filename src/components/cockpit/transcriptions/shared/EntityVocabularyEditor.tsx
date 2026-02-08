import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BookOpen, Plus, X, Loader2 } from 'lucide-react';
import {
  useEntityVocabulary,
  VOCABULARY_CATEGORIES,
} from '@/hooks/cockpit/useEntityVocabulary';

const CATEGORY_COLORS: Record<string, string> = {
  tech: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  product: 'bg-green-500/10 text-green-700 dark:text-green-300',
  acronym: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  jargon: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
  general: '',
};

interface EntityVocabularyEditorProps {
  entityType: 'partner' | 'lead' | 'lead_contact';
  entityId: string;
  entityName: string;
  workspaceId?: string;
  compact?: boolean;
}

export function EntityVocabularyEditor({
  entityType,
  entityId,
  entityName,
  workspaceId,
  compact = false,
}: EntityVocabularyEditorProps) {
  const { terms, isLoading, addTerm, removeTerm } = useEntityVocabulary(entityType, entityId);
  const [newTerm, setNewTerm] = useState('');
  const [category, setCategory] = useState('general');

  const handleAdd = () => {
    const t = newTerm.trim();
    if (!t) return;
    addTerm.mutate({ term: t, category, workspace_id: workspaceId });
    setNewTerm('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Loader2 className="h-3 w-3 animate-spin" /> Chargement vocabulaire...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <BookOpen className="h-3.5 w-3.5" />
        Vocabulaire personnalisé
        {terms.length > 0 && <span>({terms.length})</span>}
      </div>

      {/* Terms list */}
      {terms.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {terms.map((t) => (
            <Badge
              key={t.id}
              variant="outline"
              className={`text-xs pr-1 ${CATEGORY_COLORS[t.category] || ''}`}
            >
              {t.term}
              <button
                onClick={() => removeTerm.mutate(t.id)}
                className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Add form */}
      {!compact && (
        <div className="flex items-center gap-1.5">
          <Input
            value={newTerm}
            onChange={(e) => setNewTerm(e.target.value)}
            placeholder="Ajouter un terme..."
            className="h-7 text-xs flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-7 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VOCABULARY_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value} className="text-xs">
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={handleAdd}
            disabled={!newTerm.trim() || addTerm.isPending}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {terms.length === 0 && !compact && (
        <p className="text-[10px] text-muted-foreground">
          Ajoutez des termes métier propres à {entityName} pour améliorer la transcription.
        </p>
      )}
    </div>
  );
}
