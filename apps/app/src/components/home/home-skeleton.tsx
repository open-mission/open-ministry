import { Skeleton } from "@/components/ui/skeleton";

function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-5 w-20" />
      </div>
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-col gap-8 pb-4"
      aria-hidden="true"
    >
      <Skeleton className="h-52 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <SectionSkeleton rows={2} />
          <SectionSkeleton rows={3} />
        </div>
        <div className="flex flex-col gap-6 lg:col-span-5">
          <SectionSkeleton rows={3} />
          <SectionSkeleton rows={2} />
        </div>
      </div>
    </div>
  );
}

export function VerseCardSkeleton() {
  return (
    <div
      className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5"
      aria-hidden="true"
    >
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-6 w-28" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-9 w-64" />
    </div>
  );
}
