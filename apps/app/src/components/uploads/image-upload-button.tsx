"use client";

import { useRef } from "react";
import { ImagePlusIcon, LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useUploadThing } from "@/lib/uploadthing";

type UploadEndpoint = "profileImage" | "churchLogo";

export function ImageUploadButton({
  endpoint,
  label,
  onUploaded,
}: {
  endpoint: UploadEndpoint;
  label: string;
  onUploaded: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { startUpload, isUploading } = useUploadThing(endpoint, {
    onClientUploadComplete: (files) => {
      const url = files[0]?.ufsUrl;

      if (url) {
        onUploaded(url);
        toast.success("Imagem enviada.");
      }
    },
    onUploadError: (error) => {
      // O UploadThing devolve mensagens cruas em inglês (ex.: "Something went
      // wrong... FetchError") quando a checagem HEAD de deduplicação falha —
      // comum em redes locais, bloqueadores ou instabilidade com o ingest.
      // Mantemos o erro original no console para diagnóstico, mas mostramos
      // ao usuário uma mensagem clara e acionável.
      console.error("[ImageUploadButton] Falha no upload:", error);

      const raw = error.message || "";
      const isNetworkFailure =
        /fetch|network|failed to fetch|something went wrong/i.test(raw);

      toast.error(
        isNetworkFailure
          ? "Não foi possível enviar a imagem. Verifique sua conexão e tente novamente."
          : raw || "Não foi possível enviar a imagem.",
      );
    },
  });

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={async (event) => {
          const file = event.target.files?.[0];

          if (!file) {
            return;
          }

          await startUpload([file]);
          event.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? (
          <LoaderCircleIcon
            className="animate-spin"
            data-icon="inline-start"
          />
        ) : (
          <ImagePlusIcon data-icon="inline-start" />
        )}
        {isUploading ? "Enviando..." : label}
      </Button>
    </>
  );
}
