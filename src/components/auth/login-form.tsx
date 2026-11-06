"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  signInAction,
  type AuthFormState,
} from "@/app/actions/auth";
import { FormAlert } from "@/components/auth/form-alert";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { SubmitButton } from "@/components/auth/submit-button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { withRedirect } from "@/lib/redirects";

type LoginFormProps = {
  redirectTo?: string;
  initialError?: string;
};

export function LoginForm({ redirectTo, initialError }: LoginFormProps) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(
    signInAction,
    initialError ? { error: initialError } : undefined,
  );

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

      <div className="space-y-5">
        <GoogleSignInButton redirectTo={redirectTo} />
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-[0.7rem] tracking-[0.16em] text-muted-foreground uppercase">
            ou
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>
      </div>

      <form action={formAction} className="space-y-5">
        <input type="hidden" name="redirectTo" value={redirectTo ?? ""} />

        <FieldGroup>
          <Field data-invalid={Boolean(state?.fieldErrors?.email)}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="voce@igreja.com"
              className="h-10"
              aria-invalid={Boolean(state?.fieldErrors?.email)}
              required
            />
            <FieldError
              errors={state?.fieldErrors?.email?.map((message) => ({
                message,
              }))}
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
