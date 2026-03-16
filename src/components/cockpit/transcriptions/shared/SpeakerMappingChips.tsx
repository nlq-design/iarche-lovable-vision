import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Mic, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpeakerMappingChipsProps {
  /** Currently assigned speaker labels, e.g. "A,B" → ["A","B"] */
  assignedSpeakers: string[];
  /** All speakers detected in the transcription */
  availableSpeakers: string[];
  /** Map of speaker → participant name (already assigned by other participants) */
  speakerToParticipant: Record<string, string>;
  /** Current participant name */
  participantName: string;
  onToggleSpeaker: (speaker: string) => void;
}

/** Per-speaker color palette for visual distinction */
const SPEAKER_COLORS: Record<string, string> = {
  A: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  B: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  C: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  D: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  E: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  F: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
};

function getSpeakerColor(speaker: string): string {
  return SPEAKER_COLORS[speaker] || 'bg-muted text-muted-foreground border-border';
}

export function SpeakerMappingChips({
  assignedSpeakers,
  availableSpeakers,
  speakerToParticipant,
  participantName,
  onToggleSpeaker,
}: SpeakerMappingChipsProps) {
  if (availableSpeakers.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-6 gap-1 text-[10px] px-1.5',
            assignedSpeakers.length > 0 ? 'text-primary' : 'text-muted-foreground'
          )}
          title="Associer aux intervenants détectés par l'IA"
        >
          <Mic className="h-3 w-3" />
          {assignedSpeakers.length > 0 ? (
            <span className="flex gap-0.5">
              {assignedSpeakers.map(s => (
                <span key={s} className={cn('inline-flex items-center px-1 rounded text-[10px] font-medium border', getSpeakerColor(s))}>
                  {s}
                </span>
              ))}
            </span>
          ) : (
            <span>Speakers</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Associer « {participantName} » aux intervenants :
        </p>
        <div className="space-y-1">
          {availableSpeakers.map(speaker => {
            const isAssigned = assignedSpeakers.includes(speaker);
            const otherOwner = speakerToParticipant[speaker];
            const ownedByOther = otherOwner && otherOwner !== participantName;

            return (
              <button
                key={speaker}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors',
                  isAssigned
                    ? 'bg-primary/10 text-primary'
                    : ownedByOther
                      ? 'opacity-50 hover:opacity-75 hover:bg-accent'
                      : 'hover:bg-accent'
                )}
                onClick={() => onToggleSpeaker(speaker)}
              >
                <span className={cn('inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold border', getSpeakerColor(speaker))}>
                  {speaker}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-xs">Intervenant {speaker}</span>
                  {ownedByOther && (
                    <span className="block text-[10px] text-muted-foreground truncate">
                      → {otherOwner}
                    </span>
                  )}
                </div>
                {isAssigned && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          Un participant peut être lié à plusieurs intervenants si l'IA a confondu des voix.
        </p>
      </PopoverContent>
    </Popover>
  );
}

// ============= UTILITY =============

/** Parse comma-separated speaker_label into array */
export function parseSpeakerLabels(speakerLabel: string | null): string[] {
  if (!speakerLabel) return [];
  return speakerLabel.split(',').map(s => s.trim()).filter(Boolean);
}

/** Build a map of speaker → participant name from participants list */
export function buildSpeakerMap(
  participants: Array<{ name: string; speaker_label: string | null }>
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const p of participants) {
    for (const speaker of parseSpeakerLabels(p.speaker_label)) {
      // Last assignment wins, but we show all in the UI
      if (!map[speaker]) {
        map[speaker] = p.name;
      }
    }
  }
  return map;
}

/** Extract unique speakers from enriched segments utterances */
export function extractUniqueSpeakers(segments: Record<string, unknown> | null): string[] {
  if (!segments) return [];
  const utterances = (segments as any)?.utterances as Array<{ speaker: string }> | undefined;
  if (!utterances?.length) return [];
  const unique = new Set(utterances.map(u => u.speaker));
  return Array.from(unique).sort();
}
