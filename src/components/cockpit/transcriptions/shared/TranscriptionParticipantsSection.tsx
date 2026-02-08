import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Users,
  Plus,
  Link2,
  Trash2,
  Search,
  Loader2,
  History,
  Sparkles,
  UserCheck,
  MessageSquare,
  Eye,
} from 'lucide-react';
import {
  useTranscriptionParticipants,
  PRESENCE_STATUSES,
  MEETING_ROLES,
  ENTITY_TYPE_LABELS,
  type TranscriptionParticipant,
  type LinkedEntityType,
  type PresenceStatus,
  type MeetingRole,
} from '@/hooks/cockpit/useTranscriptionParticipants';
import type { NormalizedSummary } from './normalizeSummary';
import { EntityVocabularyEditor } from './EntityVocabularyEditor';

// ============= PRESENCE ICON =============

function PresenceIcon({ status }: { status: PresenceStatus }) {
  switch (status) {
    case 'present': return <UserCheck className="h-3.5 w-3.5 text-primary" />;
    case 'mentioned': return <MessageSquare className="h-3.5 w-3.5 text-accent-foreground" />;
    case 'observer': return <Eye className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

// ============= ENTITY SEARCH POPOVER =============

function EntitySearchPopover({
  participant,
  onLink,
  searchEntities,
}: {
  participant: TranscriptionParticipant;
  onLink: (type: LinkedEntityType, id: string, name: string) => void;
  searchEntities: (q: string) => Promise<Array<{ type: LinkedEntityType; id: string; name: string; subtitle?: string }>>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ type: LinkedEntityType; id: string; name: string; subtitle?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [allEntities, setAllEntities] = useState<Array<{ type: LinkedEntityType; id: string; name: string; subtitle?: string }>>([]);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      // Show all preloaded entities when query is empty/short
      setResults(allEntities);
      return;
    }
    setLoading(true);
    try {
      const r = await searchEntities(q);
      setResults(r);
    } finally {
      setLoading(false);
    }
  }, [searchEntities, allEntities]);

  // On open: preload recent entities so user sees results immediately
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setLoading(true);
    // Load a broad set of entities (search with single char "%" to get all)
    searchEntities('a').then((r1) => {
      searchEntities('e').then((r2) => {
        // Merge and deduplicate
        const map = new Map<string, typeof r1[0]>();
        [...r1, ...r2].forEach(e => map.set(`${e.type}-${e.id}`, e));
        const merged = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
        setAllEntities(merged);
        setResults(merged);
        setLoading(false);
      });
    }).catch(() => setLoading(false));
  }, [open]); // eslint-disable-line

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Lier à une entité CRM">
          <Link2 className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="end">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">
            Lier « {participant.name} » à :
          </p>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                doSearch(e.target.value);
              }}
              placeholder="Rechercher partenaire, contact, lead..."
              className="h-8 text-sm"
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {loading && <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin" /></div>}
            {!loading && results.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">Aucun résultat</p>
            )}
            {results.map((r) => (
              <button
                key={`${r.type}-${r.id}`}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-accent text-sm transition-colors"
                onClick={() => {
                  onLink(r.type, r.id, r.name);
                  setOpen(false);
                }}
              >
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {ENTITY_TYPE_LABELS[r.type]}
                </Badge>
                <div className="flex-1 min-w-0">
                  <span className="font-medium truncate block">{r.name}</span>
                  {r.subtitle && <span className="text-xs text-muted-foreground truncate block">{r.subtitle}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============= PARTICIPANT ROW =============

function ParticipantRow({
  participant,
  onUpdate,
  onDelete,
  onLink,
  searchEntities,
  historyCount,
  linkedEntityName,
}: {
  participant: TranscriptionParticipant;
  onUpdate: (id: string, updates: Partial<TranscriptionParticipant>) => void;
  onDelete: (id: string) => void;
  onLink: (id: string, type: LinkedEntityType, entityId: string) => void;
  searchEntities: (q: string) => Promise<Array<{ type: LinkedEntityType; id: string; name: string; subtitle?: string }>>;
  historyCount?: number;
  linkedEntityName?: string;
}) {
  const navigate = useNavigate();

  const getEntityUrl = (): string | null => {
    if (!participant.linked_entity_type || !participant.linked_entity_id) return null;
    switch (participant.linked_entity_type) {
      case 'partner': return `/cockpit/partenaires/${participant.linked_entity_id}`;
      case 'lead': return `/cockpit/leads/${participant.linked_entity_id}`;
      case 'lead_contact': return null; // contacts don't have their own page
      case 'project': return `/cockpit/projets/${participant.linked_entity_id}`;
      default: return null;
    }
  };

  const entityUrl = getEntityUrl();

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 p-2 rounded-lg border bg-card hover:bg-accent/30 transition-colors group">
        {/* Presence icon */}
        <PresenceIcon status={participant.presence_status} />

        {/* Name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium truncate">{participant.name}</span>
            {participant.ai_suggested_match && !participant.linked_entity_id && (
              <Sparkles className="h-3 w-3 text-primary shrink-0" />
            )}
            {historyCount !== undefined && historyCount > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <History className="h-2.5 w-2.5" />
                {historyCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {participant.linked_entity_type && participant.linked_entity_id && (
              <Badge 
                variant="secondary" 
                className={`text-[10px] h-4 ${entityUrl ? 'cursor-pointer hover:bg-primary/20 transition-colors' : ''}`}
                onClick={entityUrl ? () => navigate(entityUrl) : undefined}
              >
                {ENTITY_TYPE_LABELS[participant.linked_entity_type]}
                {linkedEntityName && (
                  <span className="ml-1 font-normal">{linkedEntityName}</span>
                )}
              </Badge>
            )}
            {participant.role_in_meeting && (
              <Badge variant="outline" className="text-[10px] h-4">
                {MEETING_ROLES.find(r => r.value === participant.role_in_meeting)?.label}
              </Badge>
            )}
          </div>
        </div>

        {/* Presence selector */}
        <Select
          value={participant.presence_status}
          onValueChange={(v) => onUpdate(participant.id, { presence_status: v as PresenceStatus })}
        >
          <SelectTrigger className="h-7 w-24 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRESENCE_STATUSES.map(s => (
              <SelectItem key={s.value} value={s.value} className="text-xs">
                {s.emoji} {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Role selector */}
        <Select
          value={participant.role_in_meeting ?? 'none'}
          onValueChange={(v) => onUpdate(participant.id, { role_in_meeting: v === 'none' ? null : v as MeetingRole })}
        >
          <SelectTrigger className="h-7 w-28 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
            <SelectValue placeholder="Rôle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none" className="text-xs">Aucun rôle</SelectItem>
            {MEETING_ROLES.map(r => (
              <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Link button */}
        <EntitySearchPopover
          participant={participant}
          onLink={(type, id) => onLink(participant.id, type, id)}
          searchEntities={searchEntities}
        />

        {/* Delete */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onDelete(participant.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Vocabulary editor - shown when linked to a CRM entity */}
      {participant.linked_entity_type && participant.linked_entity_id &&
       ['partner', 'lead', 'lead_contact'].includes(participant.linked_entity_type) && (
        <div className="ml-6 pl-2 border-l-2 border-muted">
          <EntityVocabularyEditor
            entityType={participant.linked_entity_type as 'partner' | 'lead' | 'lead_contact'}
            entityId={participant.linked_entity_id}
            entityName={participant.name}
            compact
          />
        </div>
      )}
    </div>
  );
}

// ============= ADD PARTICIPANT =============

function AddParticipantForm({ onAdd }: { onAdd: (name: string, status: PresenceStatus) => void }) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState<PresenceStatus>('present');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), status);
    setName('');
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nom du participant..."
        className="h-8 text-sm flex-1"
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
      />
      <Select value={status} onValueChange={(v) => setStatus(v as PresenceStatus)}>
        <SelectTrigger className="h-8 w-28 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRESENCE_STATUSES.map(s => (
            <SelectItem key={s.value} value={s.value} className="text-xs">{s.emoji} {s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" className="h-8" onClick={handleSubmit} disabled={!name.trim()}>
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ============= MAIN COMPONENT =============

interface TranscriptionParticipantsSectionProps {
  transcriptionId: string | null;
  normalizedSummary?: NormalizedSummary | null;
  compact?: boolean;
}

export function TranscriptionParticipantsSection({
  transcriptionId,
  normalizedSummary,
  compact = false,
}: TranscriptionParticipantsSectionProps) {
  const {
    participants,
    isLoading,
    upsertParticipant,
    updateParticipant,
    deleteParticipant,
    seedFromSummary,
    searchEntities,
    getParticipantHistory,
  } = useTranscriptionParticipants(transcriptionId);

  const [historyCounts, setHistoryCounts] = useState<Record<string, number>>({});
  const [entityNames, setEntityNames] = useState<Record<string, string>>({});
  const [seeded, setSeeded] = useState(false);

  // Auto-seed from summary if no participants exist yet
  useEffect(() => {
    if (
      !seeded &&
      transcriptionId &&
      participants.length === 0 &&
      !isLoading &&
      normalizedSummary?.participants?.length
    ) {
      setSeeded(true);
      seedFromSummary.mutate(normalizedSummary.participants);
    }
  }, [transcriptionId, participants.length, isLoading, normalizedSummary, seeded]); // eslint-disable-line

  // Load history counts + entity names for linked participants
  useEffect(() => {
    if (participants.length === 0) return;
    const load = async () => {
      const counts: Record<string, number> = {};
      const names: Record<string, string> = {};
      await Promise.all(
        participants.map(async (p) => {
          counts[p.id] = await getParticipantHistory(p.name);
          // Fetch linked entity name
          if (p.linked_entity_type && p.linked_entity_id && !entityNames[p.id]) {
            try {
              const table = p.linked_entity_type === 'partner' ? 'partners'
                : p.linked_entity_type === 'lead_contact' ? 'lead_contacts'
                : p.linked_entity_type === 'lead' ? 'leads'
                : 'projects';
              const nameCol = table === 'projects' ? 'name' : 'name';
              const { data } = await supabase.from(table).select(nameCol).eq('id', p.linked_entity_id).single();
              if (data?.name) names[p.id] = data.name;
            } catch { /* ignore */ }
          }
        })
      );
      setHistoryCounts(counts);
      setEntityNames(prev => ({ ...prev, ...names }));
    };
    load();
  }, [participants]); // eslint-disable-line

  const handleUpdate = (id: string, updates: Partial<TranscriptionParticipant>) => {
    updateParticipant.mutate({ id, ...updates });
  };

  const handleLink = (participantId: string, type: LinkedEntityType, entityId: string) => {
    updateParticipant.mutate({
      id: participantId,
      linked_entity_type: type,
      linked_entity_id: entityId,
    });
  };

  const handleAdd = (name: string, status: PresenceStatus) => {
    upsertParticipant.mutate({ name, presence_status: status });
  };

  const presentCount = participants.filter(p => p.presence_status === 'present').length;
  const mentionedCount = participants.filter(p => p.presence_status === 'mentioned').length;
  const observerCount = participants.filter(p => p.presence_status === 'observer').length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Participants ({participants.length})
          </span>
          {participants.length > 0 && (
            <div className="flex gap-2 text-[10px] font-normal text-muted-foreground">
              {presentCount > 0 && <span>🟢 {presentCount}</span>}
              {mentionedCount > 0 && <span>💬 {mentionedCount}</span>}
              {observerCount > 0 && <span>👁️ {observerCount}</span>}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              {participants.map((p) => (
                <ParticipantRow
                  key={p.id}
                  participant={p}
                  onUpdate={handleUpdate}
                  onDelete={(id) => deleteParticipant.mutate(id)}
                  onLink={handleLink}
                  searchEntities={searchEntities}
                  historyCount={historyCounts[p.id]}
                  linkedEntityName={entityNames[p.id]}
                />
              ))}
            </div>

            {!compact && (
              <AddParticipantForm onAdd={handleAdd} />
            )}

            {/* AI suggestion hint */}
            {participants.some(p => p.ai_suggested_match && !p.linked_entity_id) && (
              <p className="text-[10px] text-primary mt-2 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Des suggestions IA sont disponibles — cliquez sur <Link2 className="h-3 w-3 inline" /> pour lier
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
