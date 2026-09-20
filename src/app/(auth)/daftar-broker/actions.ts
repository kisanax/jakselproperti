"use server";

import { signIn } from "@/auth";
import { getAccountAccess } from "@/lib/broker-workspace-access";
import { startBrokerApplication } from "@/lib/services/broker-application";
import { redirect } from "next/navigation";

export async function continueWithGoogle() {
  if (!process.env.AUTH_GOOGLE_ID || !process.env.AUTH_GOOGLE_SECRET) {
    redirect("/daftar-broker?error=google-not-configured");
  }

  await signIn("google", { redirectTo: "/daftar-broker" });
}

export async function beginBrokerApplication() {
  const access = await getAccountAccess();
  if (access.kind === "unauthenticated") redirect("/login");
  if (access.kind === "staff") redirect("/admin");
  if (access.kind !== "member") redirect("/login/redirect");

  await startBrokerApplication(access.user.id);
  redirect("/onboarding");
}
