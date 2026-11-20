"use client";

import type { ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Alterna as duas visões da home. O conteúdo é montado no servidor e recebido
 * como slot, mantendo os widgets como Server Components.
 */
export function HomeTabs({
  today,
  church,
}: {
  today: ReactNode;
  church: ReactNode;
}) {
  return (
    <Tabs defaultValue="hoje" className="gap-6">
      <TabsList
        variant="line"
        className="w-full justify-start gap-7 rounded-none border-b border-border/50 bg-transparent p-0"
      >
        <TabsTrigger
          value="hoje"
          className="min-h-[44px] flex-none rounded-none px-0.5 text-lg font-medium tracking-tight text-muted-foreground group-data-horizontal/tabs:after:bottom-0 after:mx-auto group-data-horizontal/tabs:after:h-[3px] after:w-9 after:rounded-full after:bg-primary data-active:text-foreground data-active:font-semibold sm:text-xl"
        >
          Hoje
        </TabsTrigger>
        <TabsTrigger
          value="igreja"
          className="min-h-[44px] flex-none rounded-none px-0.5 text-lg font-medium tracking-tight text-muted-foreground group-data-horizontal/tabs:after:bottom-0 after:mx-auto group-data-horizontal/tabs:after:h-[3px] after:w-9 after:rounded-full after:bg-primary data-active:text-foreground data-active:font-semibold sm:text-xl"
        >
          Minha Igreja
        </TabsTrigger>
      </TabsList>

      <TabsContent value="hoje" className="mt-0 flex flex-col gap-6">
        {today}
      </TabsContent>
      <TabsContent value="igreja" className="mt-0 flex flex-col gap-6">
        {church}
      </TabsContent>
    </Tabs>
  );
}
