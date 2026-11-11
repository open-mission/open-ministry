"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  signUpAction,
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

type SignUpFormProps = {
  redirectTo?: string;
};

export function SignUpForm({ redirectTo }: SignUpFormProps) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(
    signUpAction,
    undefined,
  );

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
          Primeiro passo
        </p>
        <h1 className="font-heading text-4xl leading-none tracking-tight">
          Crie sua conta
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Em poucos minutos sua igreja terá um espaço para organizar pessoas e
          convites.
        </p>
      </div>

      <div className="space-y-5">
        <GoogleSignInButton
          redirectTo={redirectTo}
          label="Cadastrar com Google"
        />
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
          <Field data-invalid={Boolean(state?.fieldErrors?.name)}>
            <FieldLabel htmlFor="name">Nome completo</FieldLabel>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Como podemos chamar você?"
              className="h-10"
              aria-invalid={Boolean(state?.fieldErrors?.name)}
              required
            />
            <FieldError
              errors={state?.fieldErrors?.name?.map((message) => ({
                message,
              }))}
            />
          </Field>

          <Field data-invalid={Boolean(state?.fieldErrors?.username)}>
            <FieldLabel htmlFor="username">Nome de usuário (opcional)</FieldLabel>
            <Input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="ex: pastorjoao"
              className="h-10"
              aria-invalid={Boolean(state?.fieldErrors?.username)}
            />
            <FieldDescription>
              Identificador único para entrar no sistema.
            </FieldDescription>
            <FieldError
              errors={state?.fieldErrors?.username?.map((message) => ({
                message,
              }))}
            />
          </Field>

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

          <Field data-invalid={Boolean(state?.fieldErrors?.birthday)}>
            <FieldLabel htmlFor="birthday">Data de aniversário</FieldLabel>
            <Input
              id="birthday"
              name="birthday"
              type="date"
              autoComplete="bday"
              className="h-10"
              aria-invalid={Boolean(state?.fieldErrors?.birthday)}
            />
            <FieldDescription>
              Opcional. Usamos para lembrar aniversários da equipe.
            </FieldDescription>
            <FieldError
              errors={state?.fieldErrors?.birthday?.map((message) => ({
                message,
              }))}
            />
          </Field>

          <Field data-invalid={Boolean(state?.fieldErrors?.password)}>
            <FieldLabel htmlFor="password">Senha</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Crie uma senha"
              className="h-10"
              aria-invalid={Boolean(state?.fieldErrors?.password)}
              required
            />
            <FieldDescription>
              Use pelo menos 8 caracteres.
            </FieldDescription>
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
          pendingLabel="Criando conta..."
          size="lg"
        >
          Criar conta
        </SubmitButton>
      </form>

      <FieldDescription className="text-center text-sm">
        Já tem uma conta?{" "}
        <Link
          href={withRedirect("/login", redirectTo)}
          className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
        >
          Entrar
        </Link>
      </FieldDescription>
    </div>
  );
}
