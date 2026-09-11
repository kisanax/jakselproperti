import { prisma } from "@/lib/prisma";
import OwnerList, { OwnerItem } from "./OwnerList";

export const dynamic = "force-dynamic";

export default async function OwnersPage() {
  const rawOwners = await prisma.owner.findMany({
    include: {
      propertyOwners: {
        include: {
          property: {
            select: {
              id: true,
              code: true,
              type: true,
              area: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Serialize dates
  const owners: OwnerItem[] = rawOwners.map((o) => ({
    id: o.id,
    name: o.name,
    phone: o.phone,
    email: o.email,
    idNumber: o.idNumber,
    address: o.address,
    notes: o.notes,
    createdAt: o.createdAt.toISOString(),
    propertyOwners: o.propertyOwners.map((po) => ({
      id: po.id,
      isPrimary: po.isPrimary,
      property: {
        id: po.property.id,
        code: po.property.code,
        type: po.property.type,
        area: {
          name: po.property.area.name,
        },
      },
    })),
  }));

  return (
    <div className="animate-fade-in">
      <OwnerList initialOwners={owners} />
    </div>
  );
}
