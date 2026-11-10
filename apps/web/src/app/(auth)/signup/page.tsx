import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthFormSkeleton } from "@/components/auth/auth-form-skeleton";
import { SignUpForm } from "@/components/auth/signup-form";
import { firstSearchParam, safeRedirectPath } from "@/lib/redirects";

type SignUpPageProps = {
  searchParams: Promise<{ redirect?: string | string[] }>;
};

export const metadata: Metadata = {
  title: "Criar conta",
};

export default function SignUpPage({ searchParams }: SignUpPageProps) {
  return (
    <Suspense fallback={<AuthFormSkeleton />}>
      <SignUpContent searchParams={searchParams} />
    </Suspense>
  );
}

async function SignUpContent({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const redirectTo =
    safeRedirectPath(firstSearchParam(params.redirect)) ?? undefined;

  return <SignUpForm redirectTo={redirectTo} />;
}
