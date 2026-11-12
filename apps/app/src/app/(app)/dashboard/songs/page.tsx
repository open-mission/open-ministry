import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ShieldAlertIcon } from "lucide-react";

import { SongsListView } from "@/components/songs/songs-list-view";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOrganizationContext } from "@/lib/organizations";
import { can } from "@/lib/permissions/service";
import { listSongCollections, listSongs } from "@/lib/songs";

export const metadata: Metadata = {
  title: "Músicas & Repertório",
  description: "Gerencie o repertório musical da igreja, letras, cifras e links.",
};

export default function SongsPage() {
  return (
    <Suspense fallback={<SongsSkeleton />}>
      <SongsContent />
    </Suspense>
  );
}

async function SongsContent() {
  await connection();

  const { organization } = await requireOrganizationContext();
  const [hasAccess, canCreate, canReorder] = await Promise.all([
    can("music", "read"),
    can("music", "createSong"),
    can("music", "updateSong"),
  ]);

  if (!hasAccess) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center gap-4 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <ShieldAlertIcon className="size-7" />
        </span>
        <div className="space-y-1.5">
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Módulo de Música não ativado
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            O módulo de Repertório Musical não está liberado para sua igreja ou
            departamento.
          </p>
        </div>
      </div>
    );
  }

  const [songs, collections] = await Promise.all([
    listSongs(organization.id),
    listSongCollections(organization.id),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 min-w-0">
      <SongsListView
        songs={songs}
        existingCollections={collections}
        canManage={canCreate}
        canAddToNextService={hasAccess}
        canReorder={canReorder}
      />
    </div>
  );
}

function SongsSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6" aria-hidden>
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-9 w-32" />
      </div>
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
