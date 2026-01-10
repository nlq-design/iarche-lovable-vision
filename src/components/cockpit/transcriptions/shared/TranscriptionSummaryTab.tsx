import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import type { NormalizedSummary, ActionItem } from './normalizeSummary';

interface TranscriptionSummaryTabProps {
  summary: NormalizedSummary;
}

// Safe string converter for rendering
const safeStr = (v: unknown): string => {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return JSON.stringify(v);
};

export function TranscriptionSummaryTab({ summary }: TranscriptionSummaryTabProps) {
  return (
    <div className="space-y-4">
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

      {/* Topics Discussed */}
      {summary.topics && summary.topics.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sujets évoqués</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {summary.topics.map((topic, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {safeStr(topic)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Points */}
      {summary.key_points && summary.key_points.length > 0 && (
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
      {summary.decisions && summary.decisions.length > 0 && (
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

      {/* Risks & Blockers */}
      {summary.risks_blockers && summary.risks_blockers.length > 0 && (
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
      {summary.questions_open && summary.questions_open.length > 0 && (
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

      {/* Action Items Preview */}
      {summary.action_items && summary.action_items.length > 0 && (
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
          <span>Confiance IA: {summary.extraction_quality.confidence}%</span>
          {summary.extraction_quality.uncertainties && summary.extraction_quality.uncertainties.length > 0 && (
            <span>{summary.extraction_quality.uncertainties.length} incertitude(s)</span>
          )}
        </div>
      )}
    </div>
  );
}
