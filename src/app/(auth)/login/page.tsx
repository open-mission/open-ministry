import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthFormSkeleton } from "@/components/auth/auth-form-skeleton";
import { LoginForm } from "@/components/auth/login-form";
import { firstSearchParam, safeRedirectPath } from "@/lib/redirects";

type LoginPageProps = {
  searchParams: Promise<{ redirect?: string | string[] }>;
};

export const metadata: Metadata = {
  title: "Entrar",
};

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

  return <LoginForm redirectTo={redirectTo} />;
}
