import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// =============================================================================
// GET /api/listings — List listings
// =============================================================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const perPage = parseInt(searchParams.get("perPage") || "20");
  const status = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";

  const where: Record<string, unknown> = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { property: { code: { contains: search } } },
      { property: { address: { contains: search } } },
    ];
  }

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
  try {
    const body = await request.json();

    const property = await prisma.property.findUnique({
      where: { id: body.propertyId },
    });

    if (!property) {
      return NextResponse.json({ error: "Properti tidak ditemukan" }, { status: 404 });
    }

    const admin = await prisma.user.findFirst({
      where: { email: "admin@jakselproperti.com" },
    });

    const listing = await prisma.listing.create({
      data: {
        propertyId: body.propertyId,
        status: "DRAFT",
        askingPrice: body.askingPrice || 0,
        minimumPrice: body.minimumPrice || null,
        priceOnRequest: body.priceOnRequest || false,
        title: body.title || null,
        description: body.description || null,
        showFullAddress: body.showFullAddress || false,
      },
    });

    if (admin) {
      await prisma.listingStatusHistory.create({
        data: {
          listingId: listing.id,
          fromStatus: null,
          toStatus: "DRAFT",
          changedBy: admin.id,
          reason: "Listing dibuat",
        },
      });
    }

    return NextResponse.json({ listing }, { status: 201 });
  } catch (error) {
    console.error("Create listing error:", error);
    return NextResponse.json({ error: "Gagal membuat listing" }, { status: 500 });
  }
}
