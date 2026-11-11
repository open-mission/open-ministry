"use client";

import { useState } from "react";
import { CheckIcon, LinkIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/clipboard";

export function CopyInvitationLink({
  invitationId,
}: {
  invitationId: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const link = `${window.location.origin}/accept-invitation/${invitationId}`;

    try {
      await copyToClipboard(link);
      setCopied(true);
      toast.success("Link do convite copiado.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      aria-label="Copiar link do convite"
    >
      {copied ? <CheckIcon className="text-primary" /> : <LinkIcon />}
      <span className="hidden sm:inline">
        {copied ? "Copiado" : "Copiar link"}
      </span>
    </Button>
  );
}
