import { prisma } from "@/lib/prisma";
import CustomerList, { CustomerItem } from "./CustomerList";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const rawCustomers = await prisma.customer.findMany({
    include: {
      leads: {
        include: {
          listing: {
            include: {
              property: {
                select: {
                  code: true,
                  type: true,
                  area: { select: { name: true } },
                  kawasan: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const serializedCustomers: CustomerItem[] = rawCustomers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    notes: c.notes,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    leads: c.leads.map((l) => ({
      id: l.id,
      currentStage: l.currentStage,
      listing: {
        property: {
          code: l.listing.property.code,
          type: l.listing.property.type,
          area: { name: l.listing.property.area.name },
          kawasan: l.listing.property.kawasan ? { name: l.listing.property.kawasan.name } : null,
        },
      },
    })),
  }));

  return <CustomerList initialCustomers={serializedCustomers} />;
}

