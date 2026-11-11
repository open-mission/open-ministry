"use client";

import { useState } from "react";
import {
  YouVersionProvider,
  BibleReader,
  VerseOfTheDay,
} from "@youversion/platform-react-ui";
import "@youversion/platform-react-ui/styles.css";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpenIcon, SparklesIcon } from "lucide-react";
import type { VerseOfTheDayData } from "@/lib/youversion";

export function BibleView({
  apiKey,
  initialPassage,
  votd,
}: {
  apiKey: string;
  initialPassage?: string;
  votd?: VerseOfTheDayData;
}) {
  // Parse passage if provided, e.g. "HEB.4.16" -> book: "HEB", chapter: "4"
  let initialBook = "JHN";
  let initialChapter = "1";

  if (initialPassage) {
    const parts = initialPassage.split(".");
    if (parts[0]) initialBook = parts[0];
    if (parts[1]) initialChapter = parts[1];
  }

  const [activeTab, setActiveTab] = useState<"reader" | "votd">("reader");

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl tracking-tight text-foreground">
            Bíblia Sagrada
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Explore as Escrituras, alterne traduções e capítulos através da
            plataforma YouVersion.
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "reader" | "votd")}
          className="w-fit"
        >
          <TabsList className="h-10">
            <TabsTrigger value="reader" className="gap-2 text-xs sm:text-sm px-3">
              <BookOpenIcon className="size-4" />
              <span>Leitor Bíblico</span>
            </TabsTrigger>
            <TabsTrigger value="votd" className="gap-2 text-xs sm:text-sm px-3">
              <SparklesIcon className="size-4" />
              <span>Versículo do Dia</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <YouVersionProvider appKey={apiKey} locale="pt-BR">
        {activeTab === "reader" ? (
          <Card className="overflow-hidden border-border/80 shadow-xs">
            <BibleReader.Root
              defaultVersionId={129} // NVI Português
              defaultLanguageId="por"
              defaultBook={initialBook}
              defaultChapter={initialChapter}
              verseActions="popover"
            >
              <div className="border-b bg-muted/20 px-2 sm:px-4 py-2">
                <BibleReader.Toolbar border="bottom" />
              </div>

              <CardContent className="p-4 sm:p-8 min-h-[500px]">
                <BibleReader.Content />
              </CardContent>
            </BibleReader.Root>
          </Card>
        ) : (
          <div className="max-w-xl mx-auto space-y-6">
            <Card className="overflow-hidden border-border/80 p-4 sm:p-6 shadow-xs">
              <VerseOfTheDay
                versionId={129}
                size="default"
                showSunIcon={true}
                showBibleAppAttribution={true}
                showShareButton={true}
              />
            </Card>

            {votd ? (
              <p className="text-center text-xs text-muted-foreground">
                Destaque de hoje:{" "}
                <span className="font-semibold text-foreground">
                  {votd.reference} ({votd.versionName})
                </span>
              </p>
            ) : null}
          </div>
        )}
      </YouVersionProvider>
    </div>
  );
}
