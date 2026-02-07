import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  SmilePlus, 
  Frown, 
  Meh, 
  Building2, 
  User, 
  MapPin, 
  Phone, 
  Hash,
  BookOpen,
  ShieldAlert,
  Globe,
} from 'lucide-react';

// ============= TYPES =============

interface SentimentResult {
  text: string;
  start: number;
  end: number;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  confidence: number;
  speaker?: string;
}

interface DetectedEntity {
  entity_type: string;
  text: string;
  start: number;
  end: number;
}

interface Chapter {
  summary: string;
  gist: string;
  headline: string;
  start: number;
  end: number;
}

interface ContentSafetyLabel {
  label: string;
  confidence: number;
  severity: number;
}

interface ContentSafetyResult {
  text: string;
  labels: ContentSafetyLabel[];
  timestamp: { start: number; end: number };
}

interface ContentSafety {
  status: string;
  results: ContentSafetyResult[];
  summary: Record<string, number>;
  severity_score_summary?: Record<string, { low: number; medium: number; high: number }>;
}

interface EnrichedSegments {
  utterances?: Array<{ speaker: string; text: string; start_ms: number; end_ms: number; confidence: number }>;
  words?: Array<{ text: string; start_ms: number; end_ms: number; confidence: number; speaker?: string }>;
  sentiment_analysis?: SentimentResult[];
  entities?: DetectedEntity[];
  chapters?: Chapter[];
  content_safety?: ContentSafety | null;
}

// ============= HELPERS =============

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const sentimentConfig = {
  POSITIVE: { icon: SmilePlus, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30', label: 'Positif' },
  NEGATIVE: { icon: Frown, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30', label: 'Négatif' },
  NEUTRAL: { icon: Meh, color: 'text-muted-foreground', bg: 'bg-muted/30', label: 'Neutre' },
};

const entityIconMap: Record<string, typeof Building2> = {
  person_name: User,
  organization: Building2,
  location: MapPin,
  phone_number: Phone,
  number: Hash,
};

// ============= COMPONENTS =============

interface TranscriptionEnrichedTabProps {
  segments: EnrichedSegments | null;
  languageDetected?: string | null;
  onSeekTo?: (timeMs: number) => void;
}

export function TranscriptionEnrichedTab({ segments, languageDetected, onSeekTo }: TranscriptionEnrichedTabProps) {
  if (!segments) {
    return <p className="text-sm text-muted-foreground p-4">Aucune donnée enrichie disponible</p>;
  }

  const sentiments = segments.sentiment_analysis ?? [];
  const entities = segments.entities ?? [];
  const chapters = segments.chapters ?? [];
  const contentSafety = segments.content_safety;

  const hasSentiment = sentiments.length > 0;
  const hasEntities = entities.length > 0;
  const hasChapters = chapters.length > 0;
  const hasContentSafety = contentSafety && contentSafety.results?.length > 0;

  if (!hasSentiment && !hasEntities && !hasChapters && !hasContentSafety) {
    return <p className="text-sm text-muted-foreground p-4">Aucune donnée enrichie pour cette transcription</p>;
  }

  return (
    <div className="space-y-4">
      {/* Language Detected */}
      {languageDetected && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Globe className="h-4 w-4" />
          <span>Langue détectée : <strong>{languageDetected.toUpperCase()}</strong></span>
        </div>
      )}

      {/* Auto Chapters */}
      {hasChapters && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Chapitres automatiques ({chapters.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {chapters.map((chapter, i) => (
                <div key={i} className="border-l-2 border-primary/30 pl-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">{chapter.headline}</h4>
                    <button
                      onClick={() => onSeekTo?.(chapter.start)}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                    >
                      {formatTime(chapter.start)}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{chapter.summary}</p>
                  <Badge variant="outline" className="text-[10px] mt-1">{chapter.gist}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sentiment Analysis */}
      {hasSentiment && <SentimentCard sentiments={sentiments} onSeekTo={onSeekTo} />}

      {/* Entity Detection */}
      {hasEntities && <EntityCard entities={entities} onSeekTo={onSeekTo} />}

      {/* Content Safety */}
      {hasContentSafety && <ContentSafetyCard contentSafety={contentSafety!} />}
    </div>
  );
}

// ============= SENTIMENT CARD =============

function SentimentCard({ sentiments, onSeekTo }: { sentiments: SentimentResult[]; onSeekTo?: (ms: number) => void }) {
  const positive = sentiments.filter(s => s.sentiment === 'POSITIVE').length;
  const negative = sentiments.filter(s => s.sentiment === 'NEGATIVE').length;
  const neutral = sentiments.filter(s => s.sentiment === 'NEUTRAL').length;
  const total = sentiments.length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <SmilePlus className="h-4 w-4 text-green-600" />
          Analyse de sentiment ({total} segments)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary bar */}
        <div className="flex h-2 rounded-full overflow-hidden mb-3">
          {positive > 0 && <div className="bg-green-500" style={{ width: `${(positive / total) * 100}%` }} />}
          {neutral > 0 && <div className="bg-gray-300 dark:bg-gray-600" style={{ width: `${(neutral / total) * 100}%` }} />}
          {negative > 0 && <div className="bg-red-500" style={{ width: `${(negative / total) * 100}%` }} />}
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Positif {positive}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400" /> Neutre {neutral}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Négatif {negative}</span>
        </div>

        {/* Notable sentiments (show non-neutral, up to 10) */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {sentiments
            .filter(s => s.sentiment !== 'NEUTRAL')
            .slice(0, 10)
            .map((s, i) => {
              const config = sentimentConfig[s.sentiment];
              const Icon = config.icon;
              return (
                <div key={i} className={`flex items-start gap-2 p-1.5 rounded text-xs ${config.bg}`}>
                  <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${config.color}`} />
                  <span className="flex-1 line-clamp-2">{s.text}</span>
                  <button
                    onClick={() => onSeekTo?.(s.start)}
                    className="text-[10px] text-muted-foreground hover:text-primary shrink-0"
                  >
                    {formatTime(s.start)}
                  </button>
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============= ENTITY CARD =============

function EntityCard({ entities, onSeekTo }: { entities: DetectedEntity[]; onSeekTo?: (ms: number) => void }) {
  // Group by type
  const grouped = entities.reduce<Record<string, DetectedEntity[]>>((acc, e) => {
    const type = e.entity_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(e);
    return acc;
  }, {});

  // Deduplicate entities by text within each type
  const uniqueGrouped = Object.entries(grouped).map(([type, items]) => {
    const unique = [...new Map(items.map(i => [i.text.toLowerCase(), i])).values()];
    return { type, items: unique };
  });

  const typeLabels: Record<string, string> = {
    person_name: 'Personnes',
    organization: 'Organisations',
    location: 'Lieux',
    phone_number: 'Téléphones',
    email_address: 'Emails',
    date: 'Dates',
    money_amount: 'Montants',
    percentage: 'Pourcentages',
    url: 'URLs',
    number: 'Nombres',
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <User className="h-4 w-4 text-blue-600" />
          Entités détectées ({entities.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {uniqueGrouped.map(({ type, items }) => {
            const Icon = entityIconMap[type] ?? Hash;
            return (
              <div key={type}>
                <h4 className="text-xs font-medium text-muted-foreground mb-1.5">
                  {typeLabels[type] ?? type.replace(/_/g, ' ')} ({items.length})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((entity, i) => (
                    <button
                      key={i}
                      onClick={() => onSeekTo?.(entity.start)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-xs hover:bg-primary/10 transition-colors cursor-pointer"
                    >
                      <Icon className="h-3 w-3" />
                      {entity.text}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============= CONTENT SAFETY CARD =============

function ContentSafetyCard({ contentSafety }: { contentSafety: ContentSafety }) {
  const flaggedCategories = Object.entries(contentSafety.summary ?? {})
    .filter(([, confidence]) => confidence > 0.5)
    .sort((a, b) => b[1] - a[1]);

  if (flaggedCategories.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-green-600">
            <ShieldAlert className="h-4 w-4" />
            Modération de contenu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Aucun contenu sensible détecté ✓</p>
        </CardContent>
      </Card>
    );
  }

  const categoryLabels: Record<string, string> = {
    profanity: 'Langage inapproprié',
    hate_speech: 'Discours haineux',
    sexual_content: 'Contenu sexuel',
    violence: 'Violence',
    drugs: 'Drogues',
    gambling: 'Jeux d\'argent',
    alcohol: 'Alcool',
    tobacco: 'Tabac',
    weapons: 'Armes',
    accidents: 'Accidents',
    disasters: 'Catastrophes',
    crime_violence: 'Crime/Violence',
    health_issues: 'Santé',
    negative_news: 'Actualités négatives',
  };

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-amber-600">
          <ShieldAlert className="h-4 w-4" />
          Modération de contenu ({flaggedCategories.length} catégorie{flaggedCategories.length > 1 ? 's' : ''})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {flaggedCategories.map(([category, confidence]) => (
            <div key={category} className="flex items-center justify-between text-xs">
              <span>{categoryLabels[category] ?? category.replace(/_/g, ' ')}</span>
              <Badge variant={confidence > 0.8 ? 'destructive' : 'secondary'} className="text-[10px]">
                {Math.round(confidence * 100)}%
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
