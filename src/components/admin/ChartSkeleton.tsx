import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const ChartSkeleton = () => {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-64 w-full" />
        </div>
      </CardContent>
    </Card>
  );
};

export const MiniChartSkeleton = () => {
  return (
    <div className="space-y-2">
      <Skeleton className="h-48 w-full" />
    </div>
  );
};
