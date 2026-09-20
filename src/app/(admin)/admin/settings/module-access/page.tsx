import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getModuleMatrix } from "@/lib/module-access";
import ModuleAccessClient from "./ModuleAccessClient";

export const metadata: Metadata = { title: "Konfigurasi Akses | Workspace" };

export default async function ModuleAccessPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.platformRole !== "SUPER_ADMIN") redirect("/admin");

  const modules = await getModuleMatrix(prisma);

  return <ModuleAccessClient modules={modules} />;
}
