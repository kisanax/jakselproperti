import { redirect } from "next/navigation";
import { getAccountAccess } from "@/lib/broker-workspace-access";

export default async function LoginRedirectPage() {
  const access = await getAccountAccess();

  if (access.kind === "unauthenticated") redirect("/login");
  if (access.kind === "member") redirect("/akun");
  if (access.kind === "staff") redirect("/admin");
  if (access.kind === "broker-verified") redirect("/admin");
  if (access.kind === "broker-incomplete" || access.kind === "broker-revision") redirect("/onboarding");
  if (access.kind === "broker-pending" || access.kind === "broker-rejected" || access.kind === "broker-suspended") {
    redirect("/onboarding/status");
  }

  redirect("/login");
}
