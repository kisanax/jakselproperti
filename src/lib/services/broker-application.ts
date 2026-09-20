import "server-only";

import { prisma } from "@/lib/prisma";

export async function startBrokerApplication(userId: string) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, platformRole: true, isActive: true, deletedAt: true },
    });

    if (!user || !user.isActive || user.deletedAt) throw new Error("ACCOUNT_NOT_AVAILABLE");
    if (user.platformRole === "SUPER_ADMIN" || user.platformRole === "SUPPORT") {
      throw new Error("STAFF_CANNOT_APPLY_AS_BROKER");
    }

    const profile = await tx.brokerProfile.upsert({
      where: { userId },
      update: {},
      create: { userId, verificationStatus: "PROFILE_INCOMPLETE" },
    });

    if (user.platformRole === "MEMBER") {
      await tx.user.update({ where: { id: userId }, data: { platformRole: "BROKER" } });
    }

    return profile;
  });
}
