import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthFormSkeleton } from "@/components/auth/auth-form-skeleton";
import { LoginForm } from "@/components/auth/login-form";
import { firstSearchParam, safeRedirectPath } from "@/lib/redirects";

type LoginPageProps = {
  searchParams: Promise<{
    redirect?: string | string[];
    error?: string | string[];
  }>;
};

export const metadata: Metadata = {
  title: "Entrar",
};

function oauthErrorMessage(code: string | undefined): string | undefined {
  if (!code) {
    return undefined;
  }

  if (code === "access_denied") {
    return "O acesso com o Google foi cancelado.";
  }

  return "Não foi possível concluir o login com o Google. Tente novamente ou use email e senha.";
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <Suspense fallback={<AuthFormSkeleton />}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginContent({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo =
    safeRedirectPath(firstSearchParam(params.redirect)) ?? undefined;
  const initialError = oauthErrorMessage(firstSearchParam(params.error));

  return <LoginForm redirectTo={redirectTo} initialError={initialError} />;
}
