import { useMemo } from 'react';

interface SimpleTranscriptProps {
  text: string;
  /** Map of speaker label → participant name, e.g. { "A": "Jean Dupont" } */
  speakerNameMap?: Record<string, string>;
}

/**
 * Replace speaker labels like "Speaker A:", "Intervenant B:" with real names
 * when a mapping is available.
 */
function replaceSpeakerLabels(text: string, map: Record<string, string>): string {
  if (!text || Object.keys(map).length === 0) return text;

  // Match patterns like "Speaker A:", "Speaker B:", "Intervenant A:", etc.
  return text.replace(
    /\b(Speaker|Intervenant|Locuteur)\s+([A-Z])\s*:/gi,
    (match, _prefix, letter) => {
      const name = map[letter.toUpperCase()];
      return name ? `${name} :` : match;
    }
  );
}

export function SimpleTranscript({ text, speakerNameMap = {} }: SimpleTranscriptProps) {
  if (!text) {
    return <p className="text-sm text-muted-foreground">Aucune transcription disponible</p>;
  }

  const processedText = useMemo(
    () => replaceSpeakerLabels(text, speakerNameMap),
    [text, speakerNameMap]
  );

  return (
    <div className="prose prose-sm max-w-none">
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{processedText}</p>
    </div>
  );
}
