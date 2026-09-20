import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalUser } from "@/lib/api-auth";
import { getNextListingNumber } from "@/lib/sequence-number";
import {
  combineListingFilters,
  combinePropertyFilters,
} from "@/lib/services/property-listing-access";

// =============================================================================
// GET /api/listings — List listings
// =============================================================================

export async function GET(request: NextRequest) {
  const guard = await requireOperationalUser();
  if (guard.error) return guard.error;

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const perPage = parseInt(searchParams.get("perPage") || "20");
  const status = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";

  const filters: Prisma.ListingWhereInput = {};

  if (status) {
    filters.status = status as Prisma.EnumListingStatusFilter["equals"];
  }

  if (search) {
    filters.OR = [
      { title: { contains: search } },
      { property: { code: { contains: search } } },
      { property: { address: { contains: search } } },
    ];
  }

  const where = combineListingFilters(guard.actor, filters);

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      include: {
        property: {
          include: { area: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.listing.count({ where }),
  ]);

  return NextResponse.json({ listings, total, page, perPage });
}

// =============================================================================
// POST /api/listings — Create listing for existing property
// =============================================================================

export async function POST(request: NextRequest) {
  const guard = await requireOperationalUser();
  if (guard.error) return guard.error;

  try {
    const body = await request.json();

    const property = await prisma.property.findFirst({
      where: combinePropertyFilters(guard.actor, { id: body.propertyId }),
    });

    if (!property) {
      return NextResponse.json({ error: "Properti tidak ditemukan" }, { status: 404 });
    }

    const listingNumber = await getNextListingNumber(prisma);

    const listing = await prisma.listing.create({
      data: {
        propertyId: body.propertyId,
        listingNumber,
        managedById: guard.actor.userId,
        status: "DRAFT",
        askingPrice: body.askingPrice || 0,
        minimumPrice: body.minimumPrice || null,
        priceOnRequest: body.priceOnRequest || false,
        title: body.title || null,
        description: body.description || null,
        showFullAddress: body.showFullAddress || false,
      },
    });

    await prisma.listingStatusHistory.create({
      data: {
        listingId: listing.id,
        fromStatus: null,
        toStatus: "DRAFT",
        changedBy: guard.actor.userId,
        reason: "Listing dibuat",
      },
    });

    return NextResponse.json({ listing }, { status: 201 });
  } catch (error) {
    console.error("Create listing error:", error);
    return NextResponse.json({ error: "Gagal membuat listing" }, { status: 500 });
  }
}
