"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { actionErrorMessage } from "@/lib/auth-errors";
import { auth } from "@/lib/auth";
import { redirectTarget, safeRedirectPath } from "@/lib/redirects";

export type AuthFormState =
  | {
      error?: string;
      fieldErrors?: {
        name?: string[];
        email?: string[];
        password?: string[];
      };
    }
  | undefined;

const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe seu nome completo.")
    .max(80, "O nome pode ter no máximo 80 caracteres."),
  email: z.email("Informe um email válido.").trim().toLowerCase(),
  password: z
    .string()
    .min(8, "A senha precisa ter pelo menos 8 caracteres.")
    .max(128, "A senha pode ter no máximo 128 caracteres."),
  redirectTo: z.string().optional(),
});

const signInSchema = z.object({
  email: z.email("Informe um email válido.").trim().toLowerCase(),
  password: z.string().min(1, "Informe sua senha."),
  redirectTo: z.string().optional(),
});

export async function signUpAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    redirectTo: formData.get("redirectTo") ?? undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await auth.api.signUpEmail({
      body: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
      },
      headers: await headers(),
    });
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }

  redirect(redirectTarget(parsed.data.redirectTo, "/onboarding"));
}

export async function signInAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    redirectTo: formData.get("redirectTo") ?? undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const requestHeaders = await headers();

  try {
    await auth.api.signInEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
      },
      headers: requestHeaders,
    });
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }

  const destination = safeRedirectPath(parsed.data.redirectTo);

  redirect(destination ?? "/dashboard");
}

export async function signOutAction(formData: FormData): Promise<void> {
  const destination = redirectTarget(formData.get("redirectTo"), "/");

  try {
    await auth.api.signOut({ headers: await headers() });
  } catch {
    // The local session may already be gone; clearing cookies is enough.
  }

  redirect(destination);
}
