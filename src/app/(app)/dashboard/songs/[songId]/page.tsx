import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { SongDetailView } from "@/components/songs/song-detail-view";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOrganizationContext } from "@/lib/organizations";
import { can } from "@/lib/permissions/service";
import { getSong } from "@/lib/songs";

export const metadata: Metadata = {
  title: "Detalhes da Música",
};

export default function SongDetailPage({
  params,
}: {
  params: Promise<{ songId: string }>;
}) {
  return (
    <Suspense fallback={<SongDetailSkeleton />}>
      <SongDetailContent params={params} />
    </Suspense>
  );
}

async function SongDetailContent({
  params,
}: {
  params: Promise<{ songId: string }>;
}) {
  await connection();

  const { songId } = await params;
  const { organization } = await requireOrganizationContext();

  const [hasAccess, canUpdate, canDelete] = await Promise.all([
    can("music", "read"),
    can("music", "updateSong"),
    can("music", "deleteSong"),
  ]);
  if (!hasAccess) {
    notFound();
  }

  const song = await getSong(organization.id, songId);
  if (!song) {
    notFound();
  }

  return (
    <SongDetailView
      initialSong={song}
      songId={songId}
      canUpdate={canUpdate}
      canDelete={canDelete}
    />
  );
}

function SongDetailSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 min-w-0" aria-hidden>
      <div className="space-y-2 border-b border-border/60 pb-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-60" />
      </div>
      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  );
}
