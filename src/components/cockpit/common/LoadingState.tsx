import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface LoadingStateProps {
  message?: string;
  inline?: boolean;
}

export function LoadingState({ message = 'Chargement...', inline = false }: LoadingStateProps) {
  const content = (
    <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{message}</span>
    </div>
  );

  if (inline) return content;

  return (
    <Card>
      <CardContent className="pt-4 pb-4">{content}</CardContent>
    </Card>
  );
}
