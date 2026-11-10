"use client";

import { datadogRum } from "@datadog/browser-rum";
import { addNextjsError } from "@datadog/browser-rum-nextjs";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export function RouteError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    if (datadogRum.getInitConfiguration()) {
      addNextjsError(error);
    }
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Algo deu errado
        </h1>
        <p className="text-muted-foreground text-sm">
          Não foi possível carregar esta página. Tente novamente.
        </p>
      </div>
      <Button onClick={retry}>Tentar novamente</Button>
    </div>
  );
}
