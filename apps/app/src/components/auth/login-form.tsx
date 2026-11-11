"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { FingerprintIcon, Loader2Icon } from "lucide-react";

import {
  signInAction,
  type AuthFormState,
} from "@/app/actions/auth";
import { FormAlert } from "@/components/auth/form-alert";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { SubmitButton } from "@/components/auth/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { withRedirect } from "@/lib/redirects";

type LoginFormProps = {
  redirectTo?: string;
  initialError?: string;
};

export function LoginForm({ redirectTo, initialError }: LoginFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState<AuthFormState, FormData>(
    signInAction,
    initialError ? { error: initialError } : undefined,
  );
  const [lastMethod, setLastMethod] = useState<string | null>(null);
  const [passkeyPending, setPasskeyPending] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const method = authClient.getLastUsedLoginMethod();
      if (method) {
        queueMicrotask(() => {
          setLastMethod(method);
        });
      }
    } catch {
      // Ignora erro caso o cookie não esteja presente ou inválido
    }
  }, []);

  async function handlePasskeySignIn() {
    setPasskeyPending(true);
    setPasskeyError(null);

    try {
      const res = await authClient.signIn.passkey({
        autoFill: false,
      });

      if (res?.error) {
        setPasskeyPending(false);
        setPasskeyError(
          res.error.message ||
            "Não foi possível entrar com a chave de acesso. Verifique se o dispositivo possui uma passkey cadastrada.",
        );
        return;
      }

      router.push(redirectTo || "/");
      router.refresh();
    } catch (err: unknown) {
      setPasskeyPending(false);
      setPasskeyError(
        err instanceof Error
          ? err.message
          : "Erro ao autenticar com chave de acesso.",
      );
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
          Acesso
        </p>
        <h1 className="font-heading text-4xl leading-none tracking-tight">
          Bem-vindo de volta
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Entre para continuar cuidando da sua igreja e da sua equipe.
        </p>
      </div>

      <div className="space-y-3">
        <GoogleSignInButton
          redirectTo={redirectTo}
          isLastUsed={lastMethod === "google"}
        />

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="relative h-10 w-full"
          onClick={handlePasskeySignIn}
          disabled={passkeyPending}
        >
          {passkeyPending ? (
            <Loader2Icon className="animate-spin" data-icon="inline-start" />
          ) : (
            <FingerprintIcon className="size-4" data-icon="inline-start" />
          )}
          <span className="truncate">
            {passkeyPending
              ? "Autenticando chave..."
              : "Entrar com chave de acesso (Passkey)"}
          </span>
          {lastMethod === "passkey" && !passkeyPending ? (
            <Badge
              variant="secondary"
              className="ml-auto text-[10px] font-medium tracking-wide uppercase"
            >
              Último usado
            </Badge>
          ) : null}
        </Button>

        {passkeyError ? <FormAlert>{passkeyError}</FormAlert> : null}

        <div className="flex items-center gap-3 pt-2">
          <span className="h-px flex-1 bg-border" />
          <span className="text-[0.7rem] tracking-[0.16em] text-muted-foreground uppercase">
            ou com email e senha
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>
      </div>

      <form action={formAction} className="space-y-5">
        <input type="hidden" name="redirectTo" value={redirectTo ?? ""} />

        <FieldGroup>
          <Field data-invalid={Boolean(state?.fieldErrors?.identifier ?? state?.fieldErrors?.email)}>
            <div className="flex items-center justify-between gap-3">
              <FieldLabel htmlFor="identifier">Email ou nome de usuário</FieldLabel>
              {lastMethod === "email" ? (
                <Badge
                  variant="secondary"
                  className="text-[10px] font-medium tracking-wide uppercase"
                >
                  Último usado
                </Badge>
              ) : null}
            </div>
            <Input
              id="identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              placeholder="voce@igreja.com ou @usuario"
              className="h-10"
              aria-invalid={Boolean(state?.fieldErrors?.identifier ?? state?.fieldErrors?.email)}
              required
            />
            <FieldError
              errors={(state?.fieldErrors?.identifier ?? state?.fieldErrors?.email)?.map(
                (message) => ({
                  message,
                }),
              )}
            />
          </Field>

          <Field data-invalid={Boolean(state?.fieldErrors?.password)}>
            <div className="flex items-center justify-between gap-3">
              <FieldLabel htmlFor="password">Senha</FieldLabel>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Sua senha"
              className="h-10"
              aria-invalid={Boolean(state?.fieldErrors?.password)}
              required
            />
            <FieldError
              errors={state?.fieldErrors?.password?.map((message) => ({
                message,
              }))}
            />
          </Field>
        </FieldGroup>

        {state?.error ? <FormAlert>{state.error}</FormAlert> : null}

        <SubmitButton
          className="h-10 w-full"
          pendingLabel="Entrando..."
          size="lg"
        >
          Entrar
        </SubmitButton>
      </form>

      <FieldDescription className="text-center text-sm">
        Ainda não tem uma conta?{" "}
        <Link
          href={withRedirect("/signup", redirectTo)}
          className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
        >
          Criar minha igreja
        </Link>
      </FieldDescription>
    </div>
  );
}
