import { FileQuestion } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  message: string;
  description?: string;
  inline?: boolean;
  children?: React.ReactNode;
}

export function EmptyState({
  icon: Icon = FileQuestion,
  message,
  description,
  inline = false,
  children,
}: EmptyStateProps) {
  const content = (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <Icon className="h-8 w-8 text-muted-foreground/30 mb-2" />
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
      {description && <p className="text-xs text-muted-foreground/70 mt-1">{description}</p>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );

  if (inline) return content;

  return (
    <Card>
      <CardContent className="pt-4 pb-4">{content}</CardContent>
    </Card>
  );
}
