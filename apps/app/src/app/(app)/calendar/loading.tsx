import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando agenda"
      className="w-full space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-40 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-44 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="hidden space-y-3 lg:col-span-3 lg:block">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
        <div className="space-y-3 lg:col-span-9">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-120 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
