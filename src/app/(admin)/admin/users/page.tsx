import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import type { AccountUser } from "@/modules/users/types";
import UserDirectory from "./UserDirectory";

export const metadata: Metadata = { title: "Tim & Akses | Workspace" };

export default async function UsersPage() {
  const rows = await prisma.user.findMany({
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

  const users: AccountUser[] = rows.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    platformRole: user.platformRole,
    isActive: user.isActive,
    deletedAt: user.deletedAt ? user.deletedAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
    brokerProfile: user.brokerProfile
      ? {
          brokerType: user.brokerProfile.brokerType,
          verificationStatus: user.brokerProfile.verificationStatus,
          phone: user.brokerProfile.phone,
          city: user.brokerProfile.city,
          province: user.brokerProfile.province,
          onboardingCompletedAt: user.brokerProfile.onboardingCompletedAt
            ? user.brokerProfile.onboardingCompletedAt.toISOString()
            : null,
        }
      : null,
  }));

  return <UserDirectory users={users} />;
}
