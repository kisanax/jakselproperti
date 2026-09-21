import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { requireStaff, requireSuperAdmin } from "@/lib/api-auth";

// =============================================================================
// GET /api/users — daftar akun user (staff)
// =============================================================================

export async function GET(request: NextRequest) {
  const guard = await requireStaff();
  if (guard.error) return guard.error;

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const role = searchParams.get("role") || "";
  const status = searchParams.get("status") || "";

  const where: Record<string, unknown> = {};
  if (role) where.platformRole = role;
  if (status === "ACTIVE") {
    where.isActive = true;
    where.deletedAt = null;
  } else if (status === "SUSPENDED") {
    where.isActive = false;
    where.deletedAt = null;
  } else if (status === "DELETED") {
    where.deletedAt = { not: null };
  } else if (status === "PENDING") {
    where.deletedAt = null;
    where.brokerProfile = { verificationStatus: "PENDING_REVIEW" };
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    include: {
      brokerProfile: {
        select: {
          brokerType: true,
          verificationStatus: true,
          phone: true,
          city: true,
          province: true,
          onboardingCompletedAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}

// =============================================================================
// POST /api/users — buat akun user baru (khusus SUPER_ADMIN)
// =============================================================================

const createUserSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email(),
  platformRole: z.enum(["MEMBER", "SUPER_ADMIN", "SUPPORT", "BROKER"]),
  password: z.string().min(8).max(128).optional(),
});

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin();
  if (guard.error) return guard.error;

  try {
    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Data tidak valid — periksa nama, email, role, dan password (min 8 karakter)." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) {
      return NextResponse.json({ error: "Email sudah terdaftar." }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        platformRole: parsed.data.platformRole,
        password: parsed.data.password ? await hashPassword(parsed.data.password) : null,
        brokerProfile: parsed.data.platformRole === "BROKER"
          ? { create: { verificationStatus: "PROFILE_INCOMPLETE" } }
          : undefined,
      },
      include: { brokerProfile: { select: { brokerType: true, verificationStatus: true, phone: true, city: true, province: true, onboardingCompletedAt: true } } },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Gagal membuat user" }, { status: 500 });
  }
}
