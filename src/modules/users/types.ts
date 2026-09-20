import type { PlatformRole, BrokerType, BrokerVerificationStatus } from "@prisma/client";

// =============================================================================
// AKUN USER — bentuk data nyata dari tabel `users` + `broker_profiles`.
// Dipakai halaman Tim & Akses (/admin/users).
// =============================================================================

/** Status akun turunan: DELETED (soft delete) > SUSPENDED (nonaktif) > ACTIVE. */
export type UserAccountStatus = "ACTIVE" | "SUSPENDED" | "DELETED";

export type BrokerProfileSummary = {
  brokerType: BrokerType | null;
  verificationStatus: BrokerVerificationStatus;
  phone: string | null;
  city: string | null;
  province: string | null;
  onboardingCompletedAt: string | null;
};

export type AccountUser = {
  id: string;
  name: string | null;
  email: string | null;
  platformRole: PlatformRole;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  brokerProfile: BrokerProfileSummary | null;
};

export function accountStatus(user: Pick<AccountUser, "deletedAt" | "isActive">): UserAccountStatus {
  if (user.deletedAt) return "DELETED";
  return user.isActive ? "ACTIVE" : "SUSPENDED";
}
