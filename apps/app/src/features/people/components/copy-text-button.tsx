"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/clipboard";
import { cn } from "@/lib/utils";

type CopyTextButtonProps = {
  value: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
};

export function CopyTextButton({
  value,
  label = "Copiar",
  copiedLabel = "Copiado",
  className,
  variant = "outline",
  size = "sm",
}: CopyTextButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await copyToClipboard(value);
      setCopied(true);
      toast.success("Link copiado para a área de transferência.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={handleCopy}
    >
      {copied ? (
        <CheckIcon className="text-primary" />
      ) : (
        <CopyIcon />
      )}
      <span className={size === "icon-sm" || size === "icon" ? "sr-only" : ""}>
        {copied ? copiedLabel : label}
      </span>
    </Button>
  );
}
