import { Skeleton } from "@/components/ui/skeleton";

export default function TasksLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando tarefas"
      className="mx-auto w-full max-w-6xl space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32 rounded-lg" />
          <Skeleton className="h-4 w-56 rounded-md" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-9 w-56 rounded-lg" />
        <Skeleton className="h-9 w-40 rounded-lg" />
      </div>

      <Skeleton className="h-11 w-full rounded-xl" />

      <div className="space-y-2.5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-18 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
