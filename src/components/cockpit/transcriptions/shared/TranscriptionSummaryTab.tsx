import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Users,
  Banknote,
  CalendarDays,
  TrendingUp,
  SmilePlus,
  Frown,
  Meh,
} from 'lucide-react';
import type { NormalizedSummary, ActionItem } from './normalizeSummary';

interface PersistedParticipant {
  name: string;
  linked_entity_type?: string | null;
  linked_entity_id?: string | null;
  role_in_meeting?: string | null;
}

interface TranscriptionSummaryTabProps {
  summary: NormalizedSummary;
  persistedParticipants?: PersistedParticipant[];
}

// Safe string converter for rendering
const safeStr = (v: unknown): string => {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return JSON.stringify(v);
};

const SentimentIcon = ({ sentiment }: { sentiment?: string }) => {
  if (sentiment === 'positive') return <SmilePlus className="h-4 w-4 text-green-600" />;
  if (sentiment === 'negative') return <Frown className="h-4 w-4 text-destructive" />;
  return <Meh className="h-4 w-4 text-muted-foreground" />;
};

const sentimentLabel: Record<string, string> = {
  positive: 'Positif',
  negative: 'Négatif',
  neutral: 'Neutre',
};

export function TranscriptionSummaryTab({ summary }: TranscriptionSummaryTabProps) {
  return (
    <div className="space-y-4">
      {/* Sentiment + Quality Score bar */}
      {(summary.sentiment || summary.quality_score != null) && (
        <div className="flex items-center gap-4 text-sm">
          {summary.sentiment && (
            <div className="flex items-center gap-1.5">
              <SentimentIcon sentiment={summary.sentiment} />
              <span className="text-muted-foreground">Tonalité : <strong>{sentimentLabel[summary.sentiment] ?? summary.sentiment}</strong></span>
            </div>
          )}
          {summary.quality_score != null && (
            <div className="flex items-center gap-1.5 ml-auto">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Qualité : <strong>{summary.quality_score}%</strong></span>
            </div>
          )}
        </div>
      )}

      {/* Executive Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Résumé exécutif
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{safeStr(summary.executive_summary)}</p>
        </CardContent>
      </Card>

      {/* Topics */}
      {summary.topics?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sujets évoqués</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {summary.topics.map((topic, i) => (
                <Badge key={i} variant="secondary" className="text-xs">{safeStr(topic)}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Participants */}
      {summary.participants?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Participants ({summary.participants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.participants.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{p.name}</span>
                  {p.role && <Badge variant="outline" className="text-xs">{p.role}</Badge>}
                  {p.company && <span className="text-muted-foreground">— {p.company}</span>}
                  {p.crm_match?.id && (
                    <Badge variant="secondary" className="text-[10px]">CRM ✓</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Points */}
      {summary.key_points?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Points clés</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {summary.key_points.map((point, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  {safeStr(point)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Decisions */}
      {summary.decisions?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Décisions prises</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {summary.decisions.map((decision, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  {safeStr(decision)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Financial Data */}
      {summary.financial_data?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Banknote className="h-4 w-4 text-green-600" />
              Données financières
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {summary.financial_data.map((f, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{f.context}</span>
                  <span className="font-semibold">
                    {(() => {
                      const currencyMap: Record<string, string> = { '€': 'EUR', '$': 'USD', '£': 'GBP', '%': '' };
                      const mapped = currencyMap[f.currency] ?? f.currency;
                      const isValidCurrency = mapped && /^[A-Z]{3}$/.test(mapped);
                      if (isValidCurrency) {
                        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: mapped }).format(f.amount);
                      }
                      // Fallback: plain number + symbol
                      const suffix = f.currency === '%' ? ' %' : f.currency ? ` ${f.currency}` : ' €';
                      return new Intl.NumberFormat('fr-FR').format(f.amount) + suffix;
                    })()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dates Mentioned */}
      {summary.dates_mentioned?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-blue-600" />
              Dates mentionnées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {summary.dates_mentioned.map((d, i) => (
                <div key={i} className="text-sm flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-mono">{d.normalized || d.original}</Badge>
                  <span className="text-muted-foreground">{d.context}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risks & Blockers */}
      {summary.risks_blockers?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              Risques / Blocages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {summary.risks_blockers.map((risk, i) => (
                <li key={i} className="text-sm">{safeStr(risk)}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Questions Open */}
      {summary.questions_open?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Questions en suspens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {summary.questions_open.map((q, i) => (
                <li key={i} className="text-sm">{safeStr(q)}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      {summary.next_steps?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Prochaines étapes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {summary.next_steps.map((s, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <span>{s.action}</span>
                  {s.owner && <Badge variant="outline" className="text-xs ml-1">{s.owner}</Badge>}
                  {s.deadline && <Badge variant="secondary" className="text-[10px] ml-1">{s.deadline}</Badge>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Action Items Preview */}
      {summary.action_items?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Actions à suivre</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {summary.action_items.slice(0, 3).map((item: ActionItem, i: number) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <span>{item.task}</span>
                  {item.owner && <Badge variant="outline" className="text-xs ml-1">{item.owner}</Badge>}
                </li>
              ))}
              {summary.action_items.length > 3 && (
                <li className="text-xs text-muted-foreground">+ {summary.action_items.length - 3} autres actions</li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Quality indicator */}
      {summary.extraction_quality && (
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
          <span>Confiance IA: {summary.extraction_quality.confidence != null
            ? (summary.extraction_quality.confidence <= 1 
              ? Math.round(summary.extraction_quality.confidence * 100) 
              : Math.round(summary.extraction_quality.confidence)) + '%'
            : '—'}</span>
          {summary.extraction_quality.uncertainties && summary.extraction_quality.uncertainties.length > 0 && (
            <span>{summary.extraction_quality.uncertainties.length} incertitude(s)</span>
          )}
        </div>
      )}
    </div>
  );
}
