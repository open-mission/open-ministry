"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { actionErrorMessage } from "@/lib/auth-errors";
import { auth } from "@/lib/auth";
import { birthdayFieldSchema } from "@/lib/profile";
import { redirectTarget, safeRedirectPath } from "@/lib/redirects";

export type AuthFormState =
  | {
      error?: string;
      fieldErrors?: {
        name?: string[];
        username?: string[];
        email?: string[];
        identifier?: string[];
        password?: string[];
        birthday?: string[];
      };
    }
  | undefined;

const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe seu nome completo.")
    .max(80, "O nome pode ter no máximo 80 caracteres."),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "O nome de usuário precisa ter pelo menos 3 caracteres.")
    .max(30, "O nome de usuário pode ter no máximo 30 caracteres.")
    .regex(
      /^@?[a-z0-9_.-]+$/,
      "Use apenas letras minúsculas, números, pontos, hífens ou sublinhados.",
    )
    .optional()
    .or(z.literal("")),
  email: z.email("Informe um email válido.").trim().toLowerCase(),
  password: z
    .string()
    .min(8, "A senha precisa ter pelo menos 8 caracteres.")
    .max(128, "A senha pode ter no máximo 128 caracteres."),
  birthday: birthdayFieldSchema,
  redirectTo: z.string().optional(),
});

const signInSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Informe seu email ou nome de usuário."),
  password: z.string().min(1, "Informe sua senha."),
  redirectTo: z.string().optional(),
});

export async function signUpAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
    birthday: formData.get("birthday"),
    redirectTo: formData.get("redirectTo") ?? undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const cleanUsername = parsed.data.username
      ? parsed.data.username.replace(/^@/, "").trim()
      : undefined;

    await auth.api.signUpEmail({
      body: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
        birthday: parsed.data.birthday,
        ...(cleanUsername ? { username: cleanUsername } : {}),
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
  const rawIdentifier = (
    formData.get("identifier") ??
    formData.get("login") ??
    formData.get("email") ??
    ""
  ).toString();

  const parsed = signInSchema.safeParse({
    identifier: rawIdentifier,
    password: formData.get("password"),
    redirectTo: formData.get("redirectTo") ?? undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const requestHeaders = await headers();

  try {
    const isEmail = parsed.data.identifier.includes("@");
    if (isEmail) {
      await auth.api.signInEmail({
        body: {
          email: parsed.data.identifier.toLowerCase(),
          password: parsed.data.password,
        },
        headers: requestHeaders,
      });
    } else {
      await auth.api.signInUsername({
        body: {
          username: parsed.data.identifier.toLowerCase().replace(/^@/, ""),
          password: parsed.data.password,
        },
        headers: requestHeaders,
      });
    }
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
