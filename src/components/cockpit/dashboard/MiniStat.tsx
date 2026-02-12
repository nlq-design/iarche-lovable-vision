import { Skeleton } from '@/components/ui/skeleton';

interface MiniStatProps {
  icon: any;
  label: string;
  value: string | number;
  subtitle?: string;
  loading: boolean;
  onClick?: () => void;
}

export function MiniStat({ icon: Icon, label, value, subtitle, loading, onClick }: MiniStatProps) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-center justify-center p-2.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-center"
      disabled={!onClick}>
      {loading ? <Skeleton className="h-8 w-full" /> : (
        <>
          <Icon className="h-3.5 w-3.5 text-muted-foreground mb-0.5" />
          <p className="text-lg font-bold leading-tight">{value}</p>
          <p className="text-[10px] text-muted-foreground">{label}{subtitle ? ` ${subtitle}` : ''}</p>
        </>
      )}
    </button>
  );
}
