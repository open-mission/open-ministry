"use client";

import { datadogRum } from "@datadog/browser-rum";
import { addNextjsError } from "@datadog/browser-rum-nextjs";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    if (datadogRum.getInitConfiguration()) {
      addNextjsError(error);
    }
  }, [error]);

  return (
    <html lang="pt-BR">
      <head>
        <title>Erro | OpenMinistry</title>
      </head>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f8faf9",
          color: "#1f2933",
        }}
      >
        <main role="alert" style={{ padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Algo deu errado</h1>
          <p style={{ marginBottom: 16, color: "#52606d" }}>
            Não foi possível carregar o OpenMinistry. Tente novamente.
          </p>
          <button
            onClick={retry}
            style={{
              borderRadius: 8,
              border: "1px solid #264a3a",
              background: "#264a3a",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              padding: "10px 16px",
            }}
          >
            Tentar novamente
          </button>
        </main>
      </body>
    </html>
  );
}
