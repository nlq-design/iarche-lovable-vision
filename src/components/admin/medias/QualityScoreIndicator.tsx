/**
 * IArche Quality Score Indicator
 * Affichage temps réel du score qualité avec barre de progression,
 * détail par critère, et recommandations contextuelles.
 */

import React from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Info,
  Eye,
  Ruler,
  Type,
  Palette,
  Layers,
  ChevronDown,
  ChevronUp,
  Lock,
  Unlock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { QualityResult, CriteriaScore } from '@/hooks/useQualityScore';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface QualityScoreIndicatorProps {
  result: QualityResult | null;
  onExport?: () => void;
  isExporting?: boolean;
  className?: string;
  compact?: boolean;
}

const CRITERIA_ICONS: Record<string, React.ReactNode> = {
  Contraste: <Eye className="h-4 w-4" />,
  'Safe Zones': <Ruler className="h-4 w-4" />,
  Densité: <Layers className="h-4 w-4" />,
  Hiérarchie: <Type className="h-4 w-4" />,
  Palette: <Palette className="h-4 w-4" />,
};

const STATUS_CONFIG = {
  excellent: {
    label: 'Excellent',
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-200 dark:border-green-800',
    progressColor: 'bg-green-500',
    icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
  },
  good: {
    label: 'Bon',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    progressColor: 'bg-emerald-500',
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
  },
  insufficient: {
    label: 'Insuffisant',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    progressColor: 'bg-amber-500',
    icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
  },
  critical: {
    label: 'Critique',
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800',
    progressColor: 'bg-red-500',
    icon: <XCircle className="h-5 w-5 text-red-600" />,
  },
};

const CriteriaStatusBadge: React.FC<{ status: CriteriaScore['status'] }> = ({ status }) => {
  if (status === 'pass') {
    return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">OK</Badge>;
  }
  if (status === 'warning') {
    return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">⚠️</Badge>;
  }
  return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">✗</Badge>;
};

const CriteriaRow: React.FC<{ criteria: CriteriaScore; icon: React.ReactNode }> = ({ criteria, icon }) => {
  const [isOpen, setIsOpen] = React.useState(criteria.status !== 'pass');
  const percentage = (criteria.score / criteria.maxScore) * 100;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg transition-colors">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{icon}</span>
            <span className="text-sm font-medium">{criteria.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all",
                  criteria.status === 'pass' ? 'bg-green-500' :
                  criteria.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-xs font-mono w-12 text-right">
              {criteria.score}/{criteria.maxScore}
            </span>
            <CriteriaStatusBadge status={criteria.status} />
            {(criteria.issues.length > 0 || criteria.recommendations.length > 0) && (
              isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>
      </CollapsibleTrigger>
      {(criteria.issues.length > 0 || criteria.recommendations.length > 0) && (
        <CollapsibleContent>
          <div className="pl-8 pr-2 pb-2 space-y-1">
            {criteria.issues.map((issue, i) => (
              <div key={`issue-${i}`} className="flex items-start gap-2 text-xs text-red-600">
                <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>{issue}</span>
              </div>
            ))}
            {criteria.recommendations.map((rec, i) => (
              <div key={`rec-${i}`} className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
};

export const QualityScoreIndicator: React.FC<QualityScoreIndicatorProps> = ({
  result,
  onExport,
  isExporting,
  className,
  compact = false,
}) => {
  const [showDetails, setShowDetails] = React.useState(false);

  if (!result) {
    return (
      <div className={cn("p-4 rounded-lg border border-dashed border-muted-foreground/30", className)}>
        <p className="text-sm text-muted-foreground text-center">
          Ajoutez du contenu pour voir le score qualité
        </p>
      </div>
    );
  }

  const config = STATUS_CONFIG[result.status];
  const percentage = (result.totalScore / result.maxScore) * 100;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer",
              config.bgColor,
              config.borderColor,
              className
            )}>
              {config.icon}
              <span className={cn("font-bold", config.color)}>{result.totalScore}</span>
              <span className="text-xs text-muted-foreground">/100</span>
              {result.canExport ? (
                <Unlock className="h-4 w-4 text-green-600" />
              ) : (
                <Lock className="h-4 w-4 text-red-600" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="font-medium">{config.label}</p>
            {result.blockingIssues.length > 0 && (
              <ul className="mt-1 text-xs text-red-500">
                {result.blockingIssues.map((issue, i) => (
                  <li key={i}>• {issue}</li>
                ))}
              </ul>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn("rounded-lg border", config.borderColor, config.bgColor, className)}>
      {/* Header */}
      <div className="p-4 border-b border-inherit">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {config.icon}
            <div>
              <h3 className="font-semibold">Score Qualité</h3>
              <p className={cn("text-sm", config.color)}>{config.label}</p>
            </div>
          </div>
          <div className="text-right">
            <span className={cn("text-3xl font-bold", config.color)}>{result.totalScore}</span>
            <span className="text-lg text-muted-foreground">/100</span>
            {result.perceptualBonus > 0 && (
              <Badge variant="outline" className="ml-2 text-xs">+{result.perceptualBonus} bonus</Badge>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <Progress value={percentage} className="h-2" />
        </div>

        {/* Blocking issues */}
        {result.blockingIssues.length > 0 && (
          <div className="mt-3 p-3 bg-red-100 dark:bg-red-950/50 rounded-md border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-medium text-sm">
              <Lock className="h-4 w-4" />
              <span>Export bloqué — {result.blockingIssues.length} problème(s) critique(s)</span>
            </div>
            <ul className="mt-2 space-y-1">
              {result.blockingIssues.map((issue, i) => (
                <li key={i} className="text-xs text-red-600 dark:text-red-400 flex items-start gap-1">
                  <span>•</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Criteria details */}
      <Collapsible open={showDetails} onOpenChange={setShowDetails}>
        <CollapsibleTrigger asChild>
          <button className="w-full p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
            <span className="text-sm font-medium">Détail par critère</span>
            {showDetails ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-1">
            <CriteriaRow 
              criteria={result.criteria.contrast} 
              icon={CRITERIA_ICONS.Contraste} 
            />
            <CriteriaRow 
              criteria={result.criteria.safeZones} 
              icon={CRITERIA_ICONS['Safe Zones']} 
            />
            <CriteriaRow 
              criteria={result.criteria.density} 
              icon={CRITERIA_ICONS.Densité} 
            />
            <CriteriaRow 
              criteria={result.criteria.hierarchy} 
              icon={CRITERIA_ICONS.Hiérarchie} 
            />
            <CriteriaRow 
              criteria={result.criteria.palette} 
              icon={CRITERIA_ICONS.Palette} 
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Export button */}
      {onExport && (
        <div className="p-4 border-t border-inherit">
          <Button
            onClick={onExport}
            disabled={!result.canExport || isExporting}
            className="w-full"
            variant={result.canExport ? "default" : "secondary"}
          >
            {isExporting ? (
              <>Exportation...</>
            ) : result.canExport ? (
              <>
                <Unlock className="h-4 w-4 mr-2" />
                Exporter PNG
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Export bloqué (score &lt; 80)
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

// Compact inline version for headers
export const QualityScoreBadge: React.FC<{ 
  result: QualityResult | null;
  onClick?: () => void;
}> = ({ result, onClick }) => {
  if (!result) return null;

  const config = STATUS_CONFIG[result.status];

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors hover:opacity-80",
        config.bgColor,
        config.borderColor,
        config.color
      )}
    >
      {result.canExport ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <AlertTriangle className="h-4 w-4" />
      )}
      <span>{result.totalScore}/100</span>
    </button>
  );
};

export default QualityScoreIndicator;
