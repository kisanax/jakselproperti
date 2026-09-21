import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import BrokerDirectory from "./BrokerDirectory";

export const metadata: Metadata = { title: "Broker | Workspace" };

export default async function BrokersPage() {
  const users = await prisma.user.findMany({
    where: { platformRole: "BROKER", deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      isActive: true,
      createdAt: true,
      brokerProfile: {
        select: {
          brokerType: true,
          verificationStatus: true,
          phone: true,
          city: true,
          province: true,
        },
      },
      _count: { select: { managedListings: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const brokers = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    brokerType: user.brokerProfile?.brokerType ?? null,
    verificationStatus: user.brokerProfile?.verificationStatus ?? "PROFILE_INCOMPLETE" as const,
    phone: user.brokerProfile?.phone ?? null,
    city: user.brokerProfile?.city ?? null,
    province: user.brokerProfile?.province ?? null,
    listingCount: user._count.managedListings,
  }));

  return <BrokerDirectory brokers={brokers} />;
}
