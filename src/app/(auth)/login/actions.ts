"use server";

import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { safeReturnTo } from "@/lib/auth-redirect";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
});

export async function signInWithEmail(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect("/login?error=invalid-credentials");

  try {
    const redirectTo = safeReturnTo(formData.get("returnTo")) ?? "/login/redirect";
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) redirect("/login?error=invalid-credentials");
    throw error;
  }
}

export async function signInWithGoogle(formData: FormData) {
  if (!process.env.AUTH_GOOGLE_ID || !process.env.AUTH_GOOGLE_SECRET) {
    redirect("/login?error=google-not-configured");
  }

  const redirectTo = safeReturnTo(formData.get("returnTo")) ?? "/login/redirect";
  await signIn("google", { redirectTo });
}
