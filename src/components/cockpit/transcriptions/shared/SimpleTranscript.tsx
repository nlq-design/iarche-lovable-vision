interface SimpleTranscriptProps {
  text: string;
}

export function SimpleTranscript({ text }: SimpleTranscriptProps) {
  if (!text) {
    return <p className="text-sm text-muted-foreground">Aucune transcription disponible</p>;
  }

  return (
    <div className="prose prose-sm max-w-none">
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
    </div>
  );
}
