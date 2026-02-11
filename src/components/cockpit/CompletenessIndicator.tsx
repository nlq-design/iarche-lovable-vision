import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CompletenessResult } from '@/hooks/cockpit/useEntityCompleteness';

interface CompletenessIndicatorProps {
  completeness: CompletenessResult;
  onEnrich?: () => void;
  compact?: boolean;
}

const SEVERITY_COLORS = {
  critical: 'text-destructive',
  warning: 'text-amber-600 dark:text-amber-400',
  good: 'text-primary',
} as const;

const PROGRESS_COLORS = {
  critical: '[&>div]:bg-destructive',
  warning: '[&>div]:bg-amber-500',
  good: '[&>div]:bg-primary',
} as const;

export function CompletenessIndicator({ completeness, onEnrich, compact = false }: CompletenessIndicatorProps) {
  const { score, severity, missingFields } = completeness;

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'cursor-pointer gap-1 text-xs',
              severity === 'critical' && 'border-destructive/50 text-destructive',
              severity === 'warning' && 'border-amber-500/50 text-amber-600 dark:text-amber-400',
              severity === 'good' && 'border-primary/50 text-primary',
            )}
            onClick={onEnrich}
          >
            {score}%
            {severity !== 'good' && <Sparkles className="h-3 w-3" />}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px]">
          <p className="font-medium mb-1">Complétude: {score}%</p>
          {missingFields.length > 0 && (
            <ul className="text-xs space-y-0.5">
              {missingFields.slice(0, 5).map(f => (
                <li key={f.key} className="text-muted-foreground">• {f.label}</li>
              ))}
            </ul>
          )}
          {onEnrich && severity !== 'good' && (
            <p className="text-xs text-primary mt-1">Cliquer pour enrichir</p>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className={cn('text-xs font-medium', SEVERITY_COLORS[severity])}>
          Complétude: {score}%
        </span>
        {missingFields.length > 0 && (
          <span className="text-[10px] text-muted-foreground">
            {missingFields.length} champ{missingFields.length > 1 ? 's' : ''} manquant{missingFields.length > 1 ? 's' : ''}
          </span>
        )}
      </div>
      <Progress value={score} className={cn('h-1.5', PROGRESS_COLORS[severity])} />
    </div>
  );
}
