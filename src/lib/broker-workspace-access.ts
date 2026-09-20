import "server-only";

import { cache } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const getAccountAccess = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return { kind: "unauthenticated" as const };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      platformRole: true,
      isActive: true,
      deletedAt: true,
      brokerProfile: { select: { verificationStatus: true } },
    },
  });

  if (!user || !user.isActive || user.deletedAt) {
    return { kind: "unauthenticated" as const };
  }

  if (user.platformRole === "MEMBER") return { kind: "member" as const, user };
  if (user.platformRole === "SUPER_ADMIN" || user.platformRole === "SUPPORT") {
    return { kind: "staff" as const, user };
  }

  const verificationStatus = user.brokerProfile?.verificationStatus ?? "PROFILE_INCOMPLETE";
  const result = { user, verificationStatus };

  switch (verificationStatus) {
    case "PENDING_REVIEW":
      return { kind: "broker-pending" as const, ...result };
    case "REVISION_REQUIRED":
      return { kind: "broker-revision" as const, ...result };
    case "VERIFIED":
      return { kind: "broker-verified" as const, ...result };
    case "REJECTED":
      return { kind: "broker-rejected" as const, ...result };
    case "SUSPENDED":
      return { kind: "broker-suspended" as const, ...result };
    default:
      return { kind: "broker-incomplete" as const, ...result };
  }
});

/** @deprecated Use getAccountAccess for role-aware routing. */
export const getBrokerWorkspaceAccess = getAccountAccess;
