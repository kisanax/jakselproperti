import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-auth";
import { MODULES, getModuleMatrix } from "@/lib/module-access";
import type { PlatformRole } from "@prisma/client";

// =============================================================================
// GET /api/module-access — matriks role × modul (SUPER_ADMIN)
// =============================================================================

const ROLES: PlatformRole[] = ["SUPER_ADMIN", "SUPPORT", "BROKER"];

export async function GET() {
  const guard = await requireSuperAdmin();
  if (guard.error) return guard.error;

  const modules = await getModuleMatrix(prisma);
  return NextResponse.json({ modules, roles: ROLES });
}

// =============================================================================
// PUT /api/module-access — toggle modul per role (SUPER_ADMIN)
// =============================================================================

const updateSchema = z.object({
  role: z.enum(["SUPER_ADMIN", "SUPPORT", "BROKER"]),
  moduleKey: z.string().min(1).max(50),
  enabled: z.boolean(),
});

export async function PUT(request: NextRequest) {
  const guard = await requireSuperAdmin();
  if (guard.error) return guard.error;

  try {
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
    }

    const { role, moduleKey, enabled } = parsed.data;

    if (!MODULES.some((m) => m.key === moduleKey)) {
      return NextResponse.json({ error: "Modul tidak dikenal." }, { status: 400 });
    }

    // Safety: SUPER_ADMIN tidak bisa mematikan modul users untuk dirinya
    // sendiri (menghindari lockout manajemen akun).
    if (role === "SUPER_ADMIN" && moduleKey === "users" && !enabled) {
      return NextResponse.json(
        { error: "Modul Tim & Akses tidak bisa dimatikan untuk Super Admin." },
        { status: 400 }
      );
    }

    const row = await prisma.roleModuleAccess.upsert({
      where: { role_moduleKey: { role, moduleKey } },
      update: { enabled },
      create: { role, moduleKey, enabled },
    });

    return NextResponse.json({ row });
  } catch (error) {
    console.error("Update module access error:", error);
    return NextResponse.json({ error: "Gagal memperbarui konfigurasi akses." }, { status: 500 });
  }
}
