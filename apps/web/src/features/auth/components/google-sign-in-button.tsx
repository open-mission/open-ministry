"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";

import { FormAlert } from "@/components/auth/form-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { withRedirect } from "@/lib/redirects";

type GoogleSignInButtonProps = {
  redirectTo?: string;
  label?: string;
  isLastUsed?: boolean;
};

export function GoogleSignInButton({
  redirectTo,
  label = "Continuar com Google",
  isLastUsed = false,
}: GoogleSignInButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callbackURL = redirectTo ?? "/onboarding";

  async function handleSignIn() {
    setPending(true);
    setError(null);

    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL,
        newUserCallbackURL: callbackURL,
        errorCallbackURL: withRedirect("/login", redirectTo),
      });

      if (result.error) {
        setPending(false);
        setError("Não foi possível entrar com o Google. Tente novamente.");
      }
    } catch {
      setPending(false);
      setError("Não foi possível entrar com o Google. Tente novamente.");
    }
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="relative h-10 w-full"
        onClick={handleSignIn}
        disabled={pending}
      >
        {pending ? (
          <Loader2Icon className="animate-spin" data-icon="inline-start" />
        ) : (
          <GoogleIcon />
        )}
        <span className="truncate">{pending ? "Conectando..." : label}</span>
        {isLastUsed && !pending ? (
          <Badge
            variant="secondary"
            className="ml-auto text-[10px] font-medium tracking-wide uppercase"
          >
            Último usado
          </Badge>
        ) : null}
      </Button>
      {error ? <FormAlert>{error}</FormAlert> : null}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.54-5.17 3.54-8.87Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.94-2.91l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.29a12 12 0 0 0 0 10.74l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.29 6.63l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}
