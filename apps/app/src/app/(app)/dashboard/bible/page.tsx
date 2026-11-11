import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { BibleView } from "@/components/bible/bible-view";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOrganizationContext } from "@/lib/organizations";
import {
  getCachedVerseOfTheDay,
  getYouVersionApiKey,
} from "@/lib/youversion";

export const metadata: Metadata = {
  title: "Bíblia Sagrada",
};

export default function BiblePage({
  searchParams,
}: {
  searchParams: Promise<{ passage?: string }>;
}) {
  return (
    <Suspense fallback={<BibleSkeleton />}>
      <BibleContent searchParams={searchParams} />
    </Suspense>
  );
}

async function BibleContent({
  searchParams,
}: {
  searchParams: Promise<{ passage?: string }>;
}) {
  await connection();
  await requireOrganizationContext();

  const { passage } = await searchParams;
  const apiKey = getYouVersionApiKey();
  const votd = await getCachedVerseOfTheDay();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-8">
      <BibleView apiKey={apiKey} initialPassage={passage} votd={votd} />
    </div>
  );
}

function BibleSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-8" aria-hidden>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  );
}
