import { Skeleton } from "@/components/ui/skeleton";

export const EditorSkeleton = () => {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
};
