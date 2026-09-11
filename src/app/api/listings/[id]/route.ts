import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// =============================================================================
// Valid status transitions (Section 8)
// =============================================================================

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

// =============================================================================
// GET /api/listings/[id] — Get listing detail
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      property: {
        include: {
          area: true,
          propertyOwners: { include: { owner: true } },
          propertyMedia: { orderBy: { sortOrder: "asc" } },
          amenities: { include: { amenity: true } },
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
      listingSources: { orderBy: { receivedAt: "desc" } },
      leads: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!listing) {
    return NextResponse.json({ error: "Listing tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ listing, validTransitions: VALID_TRANSITIONS[listing.status] || [] });
}

// =============================================================================
// PUT /api/listings/[id] — Update listing
// =============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();

    const existing = await prisma.listing.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Listing tidak ditemukan" }, { status: 404 });
    }

    const admin = await prisma.user.findFirst({
      where: { email: "admin@jakselproperti.com" },
    });

    // Handle status change
    if (body.status && body.status !== existing.status) {
      const allowed = VALID_TRANSITIONS[existing.status] || [];
      if (!allowed.includes(body.status)) {
        return NextResponse.json(
          {
            error: `Tidak bisa mengubah status dari ${existing.status} ke ${body.status}`,
          },
          { status: 400 }
        );
      }

      // Log status change
      if (admin) {
        await prisma.listingStatusHistory.create({
          data: {
            listingId: id,
            fromStatus: existing.status,
            toStatus: body.status,
            changedBy: admin.id,
            reason: body.statusReason || null,
          },
        });
      }

      // Set publishedAt when going active
      if (body.status === "ACTIVE" && !existing.publishedAt) {
        body.publishedAt = new Date();
      }
      if (body.status === "ARCHIVED") {
        body.archivedAt = new Date();
      }
    }

    // Handle price change
    if (body.askingPrice && Number(body.askingPrice) !== Number(existing.askingPrice)) {
      if (admin) {
        await prisma.priceHistory.create({
          data: {
            listingId: id,
            oldPrice: existing.askingPrice,
            newPrice: body.askingPrice,
            changedBy: admin.id,
            reason: body.priceChangeReason || null,
          },
        });
      }
    }

    const listing = await prisma.listing.update({
      where: { id },
      data: {
        status: body.status || undefined,
        askingPrice: body.askingPrice || undefined,
        minimumPrice: body.minimumPrice,
        priceOnRequest: body.priceOnRequest,
        title: body.title,
        description: body.description,
        showFullAddress: body.showFullAddress,
        publishedAt: body.publishedAt || undefined,
        archivedAt: body.archivedAt || undefined,
        internalNotes: body.internalNotes,
      },
    });

    return NextResponse.json({ listing });
  } catch (error) {
    console.error("Update listing error:", error);
    return NextResponse.json({ error: "Gagal update listing" }, { status: 500 });
  }
}
