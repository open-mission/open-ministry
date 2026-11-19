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
    <Tabs defaultValue="hoje" className="gap-5">
      <TabsList
        variant="line"
        className="w-full justify-start gap-6 rounded-none border-b bg-transparent p-0"
      >
        <TabsTrigger
          value="hoje"
          className="min-h-[44px] rounded-none px-0.5 text-sm text-muted-foreground after:bg-primary data-active:text-primary"
        >
          Hoje
        </TabsTrigger>
        <TabsTrigger
          value="igreja"
          className="min-h-[44px] rounded-none px-0.5 text-sm text-muted-foreground after:bg-primary data-active:text-primary"
        >
          Minha Igreja
        </TabsTrigger>
      </TabsList>

      <TabsContent value="hoje" className="mt-0 flex flex-col gap-8">
        {today}
      </TabsContent>
      <TabsContent value="igreja" className="mt-0 flex flex-col gap-8">
        {church}
      </TabsContent>
    </Tabs>
  );
}
