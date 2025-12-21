import { useMemo } from 'react';
import { format, differenceInDays, isAfter, isBefore, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Flag, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ProjectTimelineProps {
  startDate?: string | null;
  targetEndDate?: string | null;
  actualEndDate?: string | null;
  status: string;
  healthStatus: string;
  className?: string;
}

export function ProjectTimeline({
  startDate,
  targetEndDate,
  actualEndDate,
  status,
  healthStatus,
  className,
}: ProjectTimelineProps) {
  const timeline = useMemo(() => {
    const now = new Date();
    const start = startDate ? parseISO(startDate) : null;
    const target = targetEndDate ? parseISO(targetEndDate) : null;
    const actual = actualEndDate ? parseISO(actualEndDate) : null;
    
    // Calculate total duration and progress
    if (!start || !target) {
      return { progress: 0, totalDays: 0, elapsedDays: 0, remainingDays: 0, isOverdue: false };
    }

    const totalDays = differenceInDays(target, start);
    const elapsedDays = differenceInDays(now, start);
    const remainingDays = differenceInDays(target, now);
    const isOverdue = isAfter(now, target) && status !== 'completed';
    const isCompleted = status === 'completed';
    
    let progress = 0;
    if (isCompleted && actual) {
      progress = 100;
    } else if (totalDays > 0) {
      progress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
    }

    return {
      progress,
      totalDays,
      elapsedDays,
      remainingDays,
      isOverdue,
      isCompleted,
      start,
      target,
      actual,
    };
  }, [startDate, targetEndDate, actualEndDate, status]);

  const getHealthColor = () => {
    switch (healthStatus) {
      case 'healthy': return 'bg-green-500';
      case 'at_risk': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  const getProgressColor = () => {
    if (timeline.isCompleted) return 'bg-green-500';
    if (timeline.isOverdue) return 'bg-red-500';
    if (healthStatus === 'at_risk') return 'bg-yellow-500';
    if (healthStatus === 'critical') return 'bg-red-500';
    return 'bg-primary';
  };

  if (!startDate || !targetEndDate) {
    return (
      <div className={cn("text-sm text-muted-foreground italic", className)}>
        Dates non définies
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Timeline bar */}
      <div className="relative">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full transition-all duration-500 rounded-full", getProgressColor())}
            style={{ width: `${timeline.progress}%` }}
          />
        </div>
        
        {/* Markers */}
        <div className="absolute -top-1 left-0 w-3 h-3 rounded-full bg-primary border-2 border-background" title="Début" />
        <div className="absolute -top-1 right-0 w-3 h-3 rounded-full bg-muted border-2 border-background" title="Objectif" />
        
        {/* Current position marker */}
        {!timeline.isCompleted && timeline.progress > 0 && timeline.progress < 100 && (
          <div 
            className="absolute -top-1.5 w-4 h-4 rounded-full bg-background border-2 border-primary shadow-sm flex items-center justify-center"
            style={{ left: `calc(${timeline.progress}% - 8px)` }}
          >
            <div className={cn("w-2 h-2 rounded-full", getHealthColor())} />
          </div>
        )}
      </div>

      {/* Dates */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <span>{format(timeline.start!, 'dd MMM yyyy', { locale: fr })}</span>
        </div>
        <div className="flex items-center gap-1">
          {timeline.isCompleted ? (
            <>
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              <span className="text-green-600">
                Terminé le {format(timeline.actual!, 'dd MMM yyyy', { locale: fr })}
              </span>
            </>
          ) : timeline.isOverdue ? (
            <>
              <AlertTriangle className="h-3 w-3 text-red-500" />
              <span className="text-red-600">
                En retard de {Math.abs(timeline.remainingDays)}j
              </span>
            </>
          ) : (
            <>
              <Flag className="h-3 w-3" />
              <span>{format(timeline.target!, 'dd MMM yyyy', { locale: fr })}</span>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">Durée:</span>
          <span className="font-medium">{timeline.totalDays}j</span>
        </div>
        {!timeline.isCompleted && (
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Restant:</span>
            <Badge 
              variant={timeline.isOverdue ? 'destructive' : timeline.remainingDays <= 7 ? 'secondary' : 'outline'}
              className="text-xs py-0"
            >
              {timeline.isOverdue ? `+${Math.abs(timeline.remainingDays)}j` : `${timeline.remainingDays}j`}
            </Badge>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Avancement:</span>
          <span className="font-medium">{Math.round(timeline.progress)}%</span>
        </div>
      </div>
    </div>
  );
}
