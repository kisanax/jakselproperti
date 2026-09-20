import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { requireStaff, requireSuperAdmin } from "@/lib/api-auth";

// =============================================================================
// GET /api/users/[id] — detail akun (staff)
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireStaff();
  if (guard.error) return guard.error;

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      brokerProfile: {
        select: {
          brokerType: true,
          verificationStatus: true,
          phone: true,
          city: true,
          province: true,
          licenseNumber: true,
          bio: true,
          onboardingCompletedAt: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

// =============================================================================
// PUT /api/users/[id] — ubah akun (khusus SUPER_ADMIN)
// Termasuk: ubah profil, toggle aktif, soft-delete & restore.
// =============================================================================

const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  platformRole: z.enum(["MEMBER", "SUPER_ADMIN", "SUPPORT", "BROKER"]).optional(),
  password: z.string().min(8).max(128).optional(),
  isActive: z.boolean().optional(),
  deletedAt: z.boolean().optional(), // true = soft delete, false = restore
  verificationStatus: z.enum([
    "PROFILE_INCOMPLETE",
    "PENDING_REVIEW",
    "REVISION_REQUIRED",
    "VERIFIED",
    "REJECTED",
    "SUSPENDED",
  ]).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireSuperAdmin();
  if (guard.error) return guard.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    if (
      parsed.data.verificationStatus !== undefined &&
      (target.platformRole !== "BROKER" ||
        (parsed.data.platformRole !== undefined && parsed.data.platformRole !== "BROKER"))
    ) {
      return NextResponse.json(
        { error: "Status verifikasi hanya dapat diubah untuk akun Broker." },
        { status: 400 }
      );
    }

    // Proteksi diri sendiri: jangan sampai admin mengunci/mendemote akunnya sendiri.
    const isSelf = target.id === guard.session.user.id;
    const demotesOrDisables =
      parsed.data.deletedAt === true ||
      parsed.data.isActive === false ||
      (parsed.data.platformRole !== undefined && parsed.data.platformRole !== "SUPER_ADMIN");
    if (isSelf && demotesOrDisables) {
      return NextResponse.json(
        { error: "Tidak dapat menonaktifkan, menghapus, atau mendemote akun sendiri." },
        { status: 400 }
      );
    }

    if (parsed.data.email && parsed.data.email !== target.email) {
      const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
      if (existing) {
        return NextResponse.json({ error: "Email sudah dipakai akun lain." }, { status: 409 });
      }
    }

    const password = parsed.data.password ? await hashPassword(parsed.data.password) : undefined;
    const user = await prisma.$transaction(async (tx) => {
      if (parsed.data.verificationStatus !== undefined) {
        await tx.brokerProfile.upsert({
          where: { userId: id },
          update: { verificationStatus: parsed.data.verificationStatus },
          create: { userId: id, verificationStatus: parsed.data.verificationStatus },
        });
      }

      return tx.user.update({
        where: { id },
        data: {
          ...(parsed.data.name !== undefined && { name: parsed.data.name }),
          ...(parsed.data.email !== undefined && { email: parsed.data.email }),
          ...(parsed.data.platformRole !== undefined && { platformRole: parsed.data.platformRole }),
          ...(password && { password }),
          ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive }),
          ...(parsed.data.deletedAt !== undefined && {
            deletedAt: parsed.data.deletedAt ? new Date() : null,
          }),
        },
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
      });
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Gagal memperbarui user" }, { status: 500 });
  }
}

// =============================================================================
// DELETE /api/users/[id] — hapus permanen (khusus SUPER_ADMIN)
// User yang masih terikat data historis ditolak — gunakan soft delete.
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireSuperAdmin();
  if (guard.error) return guard.error;

  const { id } = await params;
  if (id === guard.session.user.id) {
    return NextResponse.json({ error: "Tidak dapat menghapus akun sendiri." }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "User masih terikat data historis (audit log, aktivitas). Gunakan hapus-logis / nonaktifkan." },
      { status: 409 }
    );
  }
}
