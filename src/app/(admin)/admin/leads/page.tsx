import { prisma } from "@/lib/prisma";
import KanbanBoard, { KanbanLead } from "./KanbanBoard";
import { getCurrentOperationalActor } from "@/lib/api-auth";
import { listingAccessFilter } from "@/lib/services/property-listing-access";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const operational = await getCurrentOperationalActor();
  if (!operational) notFound();
  const listingScope = listingAccessFilter(operational.actor);

  const [rawLeads, listings] = await Promise.all([
    prisma.lead.findMany({
      where: { listing: listingScope },
      include: {
        customer: true,
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
        activities: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        _count: {
          select: { viewingSchedules: true, offers: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.listing.findMany({
      where: listingScope,
      select: {
        id: true,
        title: true,
        property: {
          select: { code: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Serialize Prisma Decimal and Date objects for client component
  const leads: KanbanLead[] = rawLeads.map((lead) => ({
    id: lead.id,
    customerId: lead.customerId,
    listingId: lead.listingId,
    currentStage: lead.currentStage,
    source: lead.source,
    message: lead.message,
    notes: lead.notes,
    priority: lead.priority,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
    customer: {
      id: lead.customer.id,
      name: lead.customer.name,
      phone: lead.customer.phone,
      email: lead.customer.email,
    },
    listing: {
      id: lead.listing.id,
      askingPrice: Number(lead.listing.askingPrice),
      priceOnRequest: lead.listing.priceOnRequest,
      property: {
        code: lead.listing.property.code,
        type: lead.listing.property.type,
        area: { name: lead.listing.property.area.name },
        kawasan: lead.listing.property.kawasan ? { name: lead.listing.property.kawasan.name } : null,
      },
    },
    activities: lead.activities.map((a) => ({
      id: a.id,
      type: a.type,
      fromStage: a.fromStage,
      toStage: a.toStage,
      summary: a.summary,
      createdAt: a.createdAt.toISOString(),
    })),
    _count: lead._count,
  }));

  const listingOptions = listings.map((l) => ({
    id: l.id,
    code: l.property.code,
    title: l.title,
  }));

  return (
    <div className="animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>CRM Leads (Kanban Board)</h1>
          <p style={{ fontSize: 14, color: "var(--color-admin-text-secondary)", marginTop: 4 }}>
            Tracking interaktif perjalanan calon pembeli: Baru &rarr; Kualifikasi &rarr; Survei &rarr; Negosiasi &rarr; Closing
          </p>
        </div>
      </div>

      <KanbanBoard initialLeads={leads} listings={listingOptions} />
    </div>
  );
}
