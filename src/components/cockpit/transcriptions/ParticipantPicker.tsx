import { useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Users, Plus, X, Search, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOwnerProfile } from '@/hooks/cockpit/useOwnerProfile';
import type { ExpectedParticipant } from '@/hooks/cockpit/useCockpitVoiceTranscriptions';

const ENTITY_TYPE_LABELS: Record<string, string> = {
  partner: 'Partenaire',
  lead_contact: 'Contact',
  lead: 'Lead',
  project: 'Projet',
  manual: 'Manuel',
};

interface ParticipantPickerProps {
  value: ExpectedParticipant[];
  onChange: (participants: ExpectedParticipant[]) => void;
}

interface SearchResult {
  type: 'partner' | 'lead_contact';
  id: string;
  name: string;
  company?: string;
}

export function ParticipantPicker({ value, onChange }: ParticipantPickerProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [manualName, setManualName] = useState('');

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const pattern = `%${q}%`;
      const [partners, contacts] = await Promise.all([
        supabase.from('partners').select('id, name, company').ilike('name', pattern).is('deleted_at', null).limit(5),
        supabase.from('lead_contacts').select('id, name, email').ilike('name', pattern).limit(5),
      ]);

      const r: SearchResult[] = [];
      partners.data?.forEach(p => r.push({ type: 'partner', id: p.id, name: p.name, company: p.company ?? undefined }));
      contacts.data?.forEach(c => r.push({ type: 'lead_contact', id: c.id, name: c.name }));
      setResults(r);
    } finally {
      setLoading(false);
    }
  }, []);

  const addFromSearch = (result: SearchResult) => {
    if (value.some(p => p.entity_id === result.id && p.type === result.type)) return;
    onChange([...value, {
      name: result.name,
      type: result.type,
      entity_id: result.id,
      company: result.company,
    }]);
  };

  const addManual = () => {
    const name = manualName.trim();
    if (!name || value.some(p => p.name.toLowerCase() === name.toLowerCase())) return;
    onChange([...value, { name, type: 'manual' }]);
    setManualName('');
  };

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Users className="h-4 w-4" />
        Participants attendus (optionnel)
      </Label>

      {/* Selected participants */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((p, i) => (
            <Badge key={i} variant="secondary" className="flex items-center gap-1 pr-1">
              <span className="text-xs">{p.name}</span>
              {p.type !== 'manual' && (
                <span className="text-[10px] text-muted-foreground">({ENTITY_TYPE_LABELS[p.type]})</span>
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                className="ml-0.5 rounded-full hover:bg-destructive/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Add buttons */}
      <div className="flex gap-2">
        {/* Search CRM */}
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="text-xs">
              <Search className="h-3.5 w-3.5 mr-1" />
              Rechercher CRM
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="start">
            <div className="space-y-2">
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  doSearch(e.target.value);
                }}
                placeholder="Nom du participant..."
                className="h-8 text-sm"
                autoFocus
              />
              <div className="max-h-40 overflow-y-auto space-y-1">
                {loading && <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin" /></div>}
                {!loading && results.length === 0 && query.length >= 2 && (
                  <p className="text-xs text-muted-foreground text-center py-2">Aucun résultat</p>
                )}
                {results.map((r) => {
                  const alreadyAdded = value.some(p => p.entity_id === r.id && p.type === r.type);
                  return (
                    <button
                      key={`${r.type}-${r.id}`}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-accent text-sm transition-colors disabled:opacity-50"
                      onClick={() => { addFromSearch(r); setSearchOpen(false); setQuery(''); setResults([]); }}
                      disabled={alreadyAdded}
                    >
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {ENTITY_TYPE_LABELS[r.type]}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <span className="truncate block">{r.name}</span>
                        {r.company && <span className="text-xs text-muted-foreground truncate block">{r.company}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Manual add */}
        <div className="flex items-center gap-1 flex-1">
          <Input
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            placeholder="Ajouter manuellement..."
            className="h-8 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addManual())}
          />
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={addManual} disabled={!manualName.trim()}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Identifiez les personnes présentes à la réunion (partenaires, contacts) pour améliorer la reconnaissance vocale.
      </p>
    </div>
  );
}
