import { EyeIcon } from "lucide-react";

import { StopImpersonatingButton } from "@/components/app/stop-impersonating-button";

export function ImpersonationBanner({ userName }: { userName: string }) {
  return (
    <div className="border-b border-destructive/20 bg-destructive/10 text-destructive">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 text-sm sm:px-6">
        <EyeIcon className="size-4 shrink-0" aria-hidden />
        <p className="min-w-0 flex-1 truncate">
          Você está vendo como{" "}
          <span className="font-medium">{userName}</span>.
          <span className="hidden sm:inline">
            {" "}
            As alterações ficam na conta dessa pessoa.
          </span>
        </p>
        <StopImpersonatingButton />
      </div>
    </div>
  );
}
