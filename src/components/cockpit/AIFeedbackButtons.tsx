import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAIFeedback } from '@/hooks/cockpit/useAIFeedback';
import { useState } from 'react';

interface AIFeedbackButtonsProps {
  workspaceId?: string;
  entityType: string;
  entityId?: string;
  sourceFunction: string;
  mode?: string;
  aiMetadata?: Record<string, unknown>;
  size?: 'sm' | 'default';
}

export function AIFeedbackButtons({
  workspaceId, entityType, entityId, sourceFunction, mode, aiMetadata, size = 'sm',
}: AIFeedbackButtonsProps) {
  const { submitFeedback } = useAIFeedback(workspaceId);
  const [submitted, setSubmitted] = useState<-1 | 1 | null>(null);

  if (submitted !== null) {
    return (
      <span className="text-xs text-muted-foreground italic">
        {submitted === 1 ? '👍 Merci !' : '👎 Noté'}
      </span>
    );
  }

  const handleClick = (rating: -1 | 1) => {
    setSubmitted(rating);
    submitFeedback.mutate({ entityType, entityId, sourceFunction, mode, rating, aiMetadata });
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size={size === 'sm' ? 'icon' : 'default'}
        className="h-6 w-6 text-muted-foreground hover:text-primary"
        onClick={(e) => { e.stopPropagation(); handleClick(1); }}
        disabled={submitFeedback.isPending}
      >
        <ThumbsUp className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size={size === 'sm' ? 'icon' : 'default'}
        className="h-6 w-6 text-muted-foreground hover:text-destructive"
        onClick={(e) => { e.stopPropagation(); handleClick(-1); }}
        disabled={submitFeedback.isPending}
      >
        <ThumbsDown className="h-3 w-3" />
      </Button>
    </div>
  );
}
