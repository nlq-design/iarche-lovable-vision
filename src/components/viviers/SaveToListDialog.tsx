import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, ListPlus, Zap, Database } from 'lucide-react';
import { useVivierLists } from '@/hooks/viviers/useVivierLists';

export interface FilterCriteria {
  search?: string;
  status?: string;
  minScore?: number;
  maxScore?: number;
  city?: string;
  postalCode?: string;
  department?: string;
  industry?: string;
  companySize?: string;
  hasEmail?: boolean;
  hasPhone?: boolean;
}

interface SaveToListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterCriteria;
  totalCount: number;
  selectedIds?: string[];
}

export function SaveToListDialog({
  open,
  onOpenChange,
  filters,
  totalCount,
  selectedIds = [],
}: SaveToListDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [listType, setListType] = useState<'dynamic' | 'static'>('dynamic');
  const [isSaving, setIsSaving] = useState(false);
  const { createList } = useVivierLists();

  const hasFilters = Object.values(filters).some(v => v !== undefined && v !== '' && v !== 'all');
  const hasSelection = selectedIds.length > 0;
  const leadCount = hasSelection ? selectedIds.length : totalCount;

  // Generate auto description from filters
  const generateDescription = () => {
    const parts: string[] = [];
    if (filters.search) parts.push(`Recherche: "${filters.search}"`);
    if (filters.status && filters.status !== 'all') parts.push(`Statut: ${filters.status}`);
    if (filters.minScore !== undefined || filters.maxScore !== undefined) {
      parts.push(`Score: ${filters.minScore || 0}-${filters.maxScore || 100}`);
    }
    if (filters.city) parts.push(`Ville: ${filters.city}`);
    if (filters.postalCode) parts.push(`CP: ${filters.postalCode}`);
    if (filters.industry) parts.push(`Secteur: ${filters.industry}`);
    return parts.join(' • ') || 'Tous les leads';
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      await createList.mutateAsync({
        name: name.trim(),
        description: description.trim() || generateDescription(),
        list_type: listType,
        criteria_json: listType === 'dynamic' ? (filters as unknown as Record<string, unknown>) : undefined,
        static_vivier_ids: listType === 'static' ? selectedIds : undefined,
        lead_count: leadCount,
      });

      onOpenChange(false);
      setName('');
      setDescription('');
      setListType('dynamic');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListPlus className="w-5 h-5 text-primary" />
            Sauvegarder en liste
          </DialogTitle>
          <DialogDescription>
            Créez une liste de {leadCount.toLocaleString('fr-FR')} lead{leadCount > 1 ? 's' : ''} pour vos campagnes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* List Name */}
          <div className="space-y-2">
            <Label htmlFor="list-name">Nom de la liste *</Label>
            <Input
              id="list-name"
              placeholder="Ex: PME Île-de-France Tech"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="list-desc">Description (optionnel)</Label>
            <Textarea
              id="list-desc"
              placeholder={generateDescription()}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* List Type */}
          <div className="space-y-3">
            <Label>Type de liste</Label>
            <RadioGroup
              value={listType}
              onValueChange={(v) => setListType(v as 'dynamic' | 'static')}
              className="grid grid-cols-2 gap-3"
            >
              <div className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${listType === 'dynamic' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                <RadioGroupItem value="dynamic" id="type-dynamic" className="mt-0.5" />
                <label htmlFor="type-dynamic" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="font-medium">Dynamique</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Se met à jour automatiquement selon les critères
                  </p>
                </label>
              </div>

              <div className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${listType === 'static' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                <RadioGroupItem value="static" id="type-static" className="mt-0.5" />
                <label htmlFor="type-static" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    <span className="font-medium">Statique</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fige les leads actuels (snapshot)
                  </p>
                </label>
              </div>
            </RadioGroup>
          </div>

          {/* Criteria Summary */}
          {hasFilters && (
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <p className="font-medium text-muted-foreground mb-1">Critères appliqués :</p>
              <p className="text-foreground">{generateDescription()}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Créer la liste
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
