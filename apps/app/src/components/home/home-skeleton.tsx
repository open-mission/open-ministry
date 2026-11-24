import { Skeleton } from "@/components/ui/skeleton";

function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col divide-y divide-border/70" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 py-3">
          <Skeleton className="size-11 shrink-0 rounded-lg" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Espelha a geometria exata da MobileHomeView (< lg) e da DesktopHomeView
 * (lg+), evitando salto de layout quando o conteúdo real assume.
 */
export function HomeSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-6xl pb-4"
      aria-hidden="true"
    >
      <div className="@container flex flex-col gap-6 lg:hidden">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-7 w-56" />
        </div>

        <div className="grid gap-4 @xl:grid-cols-2 @xl:items-start">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-44 w-full rounded-2xl" />
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-11 w-full rounded-xl" />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3">
            <Skeleton className="size-12 shrink-0 rounded-lg" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>

        <div className="grid gap-4 @xl:grid-cols-2 @xl:items-start">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>

      <div className="hidden flex-col gap-7 lg:flex">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-9 w-64" />
          </div>
          <Skeleton className="h-6 w-44 rounded-full" />
        </div>

        <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[minmax(0,1fr)_316px] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-8">
          <div className="flex flex-col gap-7">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-40" />
              <ListSkeleton rows={2} />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-52" />
              <ListSkeleton rows={3} />
            </div>
          </div>

          <div className="flex flex-col divide-y divide-border/70 rounded-[18px] border border-border/80 bg-muted/65 p-5 dark:bg-card">
            <div className="py-4 first:pt-0">
              <div className="flex items-center gap-3">
                <Skeleton className="size-[52px] shrink-0 rounded-lg" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
            <div className="py-4">
              <Skeleton className="mb-3 h-5 w-36" />
              <ListSkeleton rows={2} />
            </div>
            <div className="py-4">
              <Skeleton className="mb-3 h-5 w-28" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function VerseCardSkeleton({
  variant = "full",
}: {
  variant?: "full" | "compact";
} = {}) {
  if (variant === "compact") {
    return (
      <div
        className="flex min-h-11 items-center gap-3 rounded-xl border border-border/70 bg-card p-3"
        aria-hidden="true"
      >
        <Skeleton className="size-12 shrink-0 rounded-lg" />
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3"
      aria-hidden="true"
    >
      <Skeleton className="size-[52px] shrink-0 rounded-lg" />
      <div className="flex flex-1 flex-col gap-1.5">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
  );
}
