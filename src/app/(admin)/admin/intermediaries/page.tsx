import { prisma } from "@/lib/prisma";
import IntermediaryList, { IntermediaryItem } from "./IntermediaryList";

export const dynamic = "force-dynamic";

export default async function IntermediariesPage() {
  const rawIntermediaries = await prisma.intermediary.findMany({
    include: {
      listingIntermediaries: {
        include: {
          listing: {
            select: {
              id: true,
              status: true,
              property: {
                select: {
                  id: true,
                  code: true,
                  area: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const intermediaries: IntermediaryItem[] = rawIntermediaries.map((it) => ({
    id: it.id,
    name: it.name,
    phone: it.phone,
    email: it.email,
    company: it.company,
    trustLevel: it.trustLevel,
    notes: it.notes,
    createdAt: it.createdAt.toISOString(),
    listingIntermediaries: it.listingIntermediaries.map((li) => ({
      id: li.id,
      listing: {
        id: li.listing.id,
        status: li.listing.status,
        property: {
          id: li.listing.property.id,
          code: li.listing.property.code,
          area: {
            name: li.listing.property.area.name,
          },
        },
      },
    })),
  }));

  return (
    <div className="animate-fade-in">
      <IntermediaryList initialIntermediaries={intermediaries} />
    </div>
  );
}
