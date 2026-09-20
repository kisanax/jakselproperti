import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { Session } from "next-auth";
import { isStaff, canManageUsers } from "./permissions";
import { prisma } from "./prisma";
import type { OperationalActor } from "./services/property-listing-access";

// =============================================================================
// GUARD UNTUK API ROUTE — memastikan caller punya permission yang sesuai.
// Pakai pola: const guard = await requireStaff(); if (guard.error) return guard.error;
// =============================================================================

type GuardResult =
  | { session: Session; error?: undefined }
  | { session?: undefined; error: NextResponse };

type OperationalGuardResult =
  | { session: Session; role: OperationalActor["role"]; actor: OperationalActor; error?: undefined }
  | { session?: undefined; role?: undefined; actor?: undefined; error: NextResponse };

export async function getCurrentOperationalActor(): Promise<{
  session: Session;
  actor: OperationalActor;
} | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      platformRole: true,
      isActive: true,
      deletedAt: true,
      brokerProfile: { select: { verificationStatus: true } },
    },
  });

  if (!user?.isActive || user.deletedAt) return null;
  if (user.platformRole === "MEMBER") return null;
  if (
    user.platformRole === "BROKER" &&
    user.brokerProfile?.verificationStatus !== "VERIFIED"
  ) {
    return null;
  }

  return {
    session,
    actor: { userId: session.user.id, role: user.platformRole },
  };
}

export async function requireOperationalUser(): Promise<OperationalGuardResult> {
  const result = await getCurrentOperationalActor();
  if (!result) {
    const session = await auth();
    return {
      error: NextResponse.json(
        { error: session?.user ? "Akun broker belum terverifikasi" : "Tidak terautentikasi" },
        { status: session?.user ? 403 : 401 }
      ),
    };
  }

  return {
    session: result.session,
    role: result.actor.role,
    actor: result.actor,
  };
}

export async function requireStaff(): Promise<GuardResult> {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 }) };
  }
  if (!isStaff(session.user.platformRole)) {
    return { error: NextResponse.json({ error: "Akses ditolak — khusus staf" }, { status: 403 }) };
  }
  return { session };
}

export async function requireSuperAdmin(): Promise<GuardResult> {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 }) };
  }
  if (!canManageUsers(session.user.platformRole)) {
    return { error: NextResponse.json({ error: "Akses ditolak — khusus Super Admin" }, { status: 403 }) };
  }
  return { session };
}
