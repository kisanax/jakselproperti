"use server";

import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn } from "@/auth";
import { safeReturnTo } from "@/lib/auth-redirect";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { consumeRegistrationAttempt } from "@/lib/registration-rate-limit";

const registrationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(191),
  password: z.string().min(8).max(128),
  passwordConfirmation: z.string().min(8).max(128),
}).refine((data) => data.password === data.passwordConfirmation, {
  path: ["passwordConfirmation"],
  message: "password-mismatch",
});

export async function registerMember(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo")) ?? "/akun";
  const parsed = registrationSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });

  if (!parsed.success) {
    const mismatch = parsed.error.issues.some((issue) => issue.message === "password-mismatch");
    redirect(`/daftar?error=${mismatch ? "password-mismatch" : "invalid-data"}&returnTo=${encodeURIComponent(returnTo)}`);
  }

  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientKey = forwardedFor || requestHeaders.get("x-real-ip") || "unknown";
  const limitKey = `${clientKey}:${parsed.data.email}`;
  if (!consumeRegistrationAttempt(limitKey)) {
    redirect(`/daftar?error=rate-limited&returnTo=${encodeURIComponent(returnTo)}`);
  }

  try {
    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: await hashPassword(parsed.data.password),
        platformRole: "MEMBER",
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect(`/daftar?error=email-used&returnTo=${encodeURIComponent(returnTo)}`);
    }
    throw error;
  }

  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirectTo: returnTo,
  });
}
