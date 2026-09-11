import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ListingDetailClient from "./ListingDetailClient";

export const dynamic = "force-dynamic";

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["PENDING_VERIFICATION"],
  PENDING_VERIFICATION: ["READY_TO_PUBLISH", "DRAFT"],
  READY_TO_PUBLISH: ["ACTIVE", "DRAFT"],
  ACTIVE: ["IN_NEGOTIATION", "SUSPENDED", "WITHDRAWN", "EXPIRED"],
  IN_NEGOTIATION: ["SOLD", "ACTIVE", "SUSPENDED"],
  SOLD: ["ARCHIVED"],
  SUSPENDED: ["ACTIVE", "WITHDRAWN", "ARCHIVED"],
  WITHDRAWN: ["ARCHIVED", "DRAFT"],
  EXPIRED: ["ARCHIVED", "DRAFT"],
  ARCHIVED: [],
};

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const rawListing = await prisma.listing.findUnique({
    where: { id },
    include: {
      property: {
        include: {
          area: true,
          propertyMedia: { orderBy: { sortOrder: "asc" } },
        },
      },
      statusHistory: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true } } },
      },
      priceHistory: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true } } },
      },
      listingIntermediaries: {
        include: { intermediary: true },
        orderBy: { chainPosition: "asc" },
      },
    },
  });

  if (!rawListing) {
    notFound();
  }

  // Serialize BigInt / Decimal / Dates
  const listing = {
    id: rawListing.id,
    propertyId: rawListing.propertyId,
    title: rawListing.title,
    description: rawListing.description,
    status: rawListing.status,
    askingPrice: Number(rawListing.askingPrice),
    minimumPrice: rawListing.minimumPrice ? Number(rawListing.minimumPrice) : null,
    priceOnRequest: rawListing.priceOnRequest,
    showFullAddress: rawListing.showFullAddress,
    publishedAt: rawListing.publishedAt ? rawListing.publishedAt.toISOString() : null,
    archivedAt: rawListing.archivedAt ? rawListing.archivedAt.toISOString() : null,
    internalNotes: rawListing.internalNotes,
    createdAt: rawListing.createdAt.toISOString(),
    updatedAt: rawListing.updatedAt.toISOString(),
    property: {
      id: rawListing.property.id,
      code: rawListing.property.code,
      type: rawListing.property.type,
      address: rawListing.property.address,
      landArea: rawListing.property.landArea,
      buildingArea: rawListing.property.buildingArea,
      bedrooms: rawListing.property.bedrooms,
      bathrooms: rawListing.property.bathrooms,
      certificateType: rawListing.property.certificateType,
      area: {
        name: rawListing.property.area.name,
      },
      propertyMedia: rawListing.property.propertyMedia.map((m) => ({
        id: m.id,
        url: m.filePath.startsWith("http") ? m.filePath : `/uploads/${m.filePath}`,
        isPrimary: m.isPrimary,
      })),
    },
    statusHistory: rawListing.statusHistory.map((s) => ({
      id: s.id,
      fromStatus: s.fromStatus,
      toStatus: s.toStatus,
      reason: s.reason,
      createdAt: s.createdAt.toISOString(),
      user: s.user ? { name: s.user.name } : null,
    })),
    priceHistory: rawListing.priceHistory.map((p) => ({
      id: p.id,
      oldPrice: Number(p.oldPrice),
      newPrice: Number(p.newPrice),
      reason: p.reason,
      createdAt: p.createdAt.toISOString(),
      user: p.user ? { name: p.user.name } : null,
    })),
    listingIntermediaries: rawListing.listingIntermediaries.map((li) => ({
      id: li.id,
      chainPosition: li.chainPosition,
      intermediary: {
        id: li.intermediary.id,
        name: li.intermediary.name,
        phone: li.intermediary.phone,
        company: li.intermediary.company,
        trustLevel: li.intermediary.trustLevel,
      },
    })),
  };

  const validTransitions = VALID_TRANSITIONS[rawListing.status] || [];

  return <ListingDetailClient listing={listing} validTransitions={validTransitions} />;
}
