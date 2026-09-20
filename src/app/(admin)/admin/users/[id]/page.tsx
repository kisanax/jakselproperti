import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { AccountUser } from "@/modules/users/types";
import UserWorksheet from "../UserWorksheet";

export const metadata: Metadata = { title: "Detail Akun | Tim & Akses" };

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session] = await Promise.all([params, auth()]);

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
          onboardingCompletedAt: true,
        },
      },
    },
  });

  if (!user) notFound();

  const serialized: AccountUser = {
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
  };

  return <UserWorksheet mode="edit" user={serialized} isSelf={session?.user?.id === user.id} />;
}
