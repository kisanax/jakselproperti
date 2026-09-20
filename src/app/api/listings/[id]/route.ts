import { NextRequest, NextResponse } from "next/server";
import type { ListingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalUser } from "@/lib/api-auth";
import {
  allowedListingTransitions,
  canTransitionListing,
  combineListingFilters,
  requiresPublishCompleteness,
  validatePublishCompleteness,
  VALID_LISTING_TRANSITIONS,
} from "@/lib/services/property-listing-access";

// =============================================================================
// GET /api/listings/[id] — Get listing detail
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireOperationalUser();
  if (guard.error) return guard.error;

  const { id } = await params;

  const listing = await prisma.listing.findFirst({
    where: combineListingFilters(guard.actor, { id }),
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

  return NextResponse.json({
    listing,
    validTransitions: allowedListingTransitions(guard.actor, listing.status),
  });
}

// =============================================================================
// PUT /api/listings/[id] — Update listing
// =============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireOperationalUser();
  if (guard.error) return guard.error;

  const { id } = await params;

  try {
    const body = await request.json();

    const existing = await prisma.listing.findFirst({
      where: combineListingFilters(guard.actor, { id }),
      include: {
        property: {
          select: {
            _count: { select: { propertyOwners: true } },
            propertyMedia: {
              where: { type: "PHOTO", isPrimary: true },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Listing tidak ditemukan" }, { status: 404 });
    }

    // Handle status change
    let nextStatus: ListingStatus | undefined;
    let publishedAt: Date | undefined;
    let archivedAt: Date | undefined;
    if (body.status !== undefined) {
      if (typeof body.status !== "string" || !(body.status in VALID_LISTING_TRANSITIONS)) {
        return NextResponse.json({ error: "Status listing tidak valid" }, { status: 400 });
      }
      nextStatus = body.status as ListingStatus;
    }

    if (nextStatus && nextStatus !== existing.status) {
      if (!canTransitionListing(guard.actor, existing.status, nextStatus)) {
        return NextResponse.json(
          {
            error: `Tidak bisa mengubah status dari ${existing.status} ke ${nextStatus}`,
          },
          { status: 400 }
        );
      }

      if (requiresPublishCompleteness(nextStatus)) {
        const completenessErrors = validatePublishCompleteness({
          ownerCount: existing.property._count.propertyOwners,
          hasPrimaryPhoto: existing.property.propertyMedia.length > 0,
          title: body.title !== undefined ? body.title : existing.title,
          description:
            body.description !== undefined ? body.description : existing.description,
          askingPrice:
            body.askingPrice !== undefined
              ? Number(body.askingPrice)
              : Number(existing.askingPrice),
          priceOnRequest:
            body.priceOnRequest !== undefined
              ? Boolean(body.priceOnRequest)
              : existing.priceOnRequest,
        });
        if (completenessErrors.length > 0) {
          return NextResponse.json(
            { error: "Listing belum lengkap untuk dipublikasikan", details: completenessErrors },
            { status: 400 }
          );
        }
      }

      // Set publishedAt when going active
      if (nextStatus === "ACTIVE" && !existing.publishedAt) {
        publishedAt = new Date();
      }
      if (nextStatus === "ARCHIVED") {
        archivedAt = new Date();
      }
    }

    // Handle price change
    const priceChanged =
      body.askingPrice !== undefined &&
      Number(body.askingPrice) !== Number(existing.askingPrice);

    const listing = await prisma.$transaction(async (tx) => {
      if (nextStatus && nextStatus !== existing.status) {
        await tx.listingStatusHistory.create({
          data: {
            listingId: id,
            fromStatus: existing.status,
            toStatus: nextStatus,
            changedBy: guard.actor.userId,
            reason: body.statusReason || null,
          },
        });
      }

      if (priceChanged) {
        await tx.priceHistory.create({
          data: {
            listingId: id,
            oldPrice: existing.askingPrice,
            newPrice: body.askingPrice,
            changedBy: guard.actor.userId,
            reason: body.priceChangeReason || null,
          },
        });
      }

      return tx.listing.update({
        where: { id },
        data: {
          status: nextStatus,
          askingPrice: body.askingPrice !== undefined ? body.askingPrice : undefined,
          minimumPrice: body.minimumPrice,
          priceOnRequest: body.priceOnRequest,
          title: body.title,
          description: body.description,
          showFullAddress: body.showFullAddress,
          publishedAt,
          archivedAt,
          internalNotes: body.internalNotes,
        },
      });
    });

    return NextResponse.json({ listing });
  } catch (error) {
    console.error("Update listing error:", error);
    return NextResponse.json({ error: "Gagal update listing" }, { status: 500 });
  }
}
