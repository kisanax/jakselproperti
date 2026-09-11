import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// =============================================================================
// GET /api/properties — List properties
// =============================================================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const perPage = parseInt(searchParams.get("perPage") || "20");
  const search = searchParams.get("search") || "";
  const type = searchParams.get("type") || "";
  const areaSlug = searchParams.get("area") || "";
  const kawasanSlug = searchParams.get("kawasan") || "";

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { code: { contains: search } },
      { address: { contains: search } },
    ];
  }

  if (type) {
    where.type = type;
  }

  if (areaSlug) {
    where.area = { slug: areaSlug };
  }

  if (kawasanSlug) {
    where.kawasan = { slug: kawasanSlug };
  }

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      include: {
        area: true,
        kawasan: true,
        listings: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: {
          select: { propertyMedia: true, listings: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.property.count({ where }),
  ]);

  return NextResponse.json({ properties, total, page, perPage });
}

// =============================================================================
// POST /api/properties — Create property (+ optional listing, owner, intermediary)
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Generate property code
    let code = body.code?.trim();
    if (!code) {
      const area = body.areaId
        ? await prisma.area.findUnique({ where: { id: body.areaId }, select: { slug: true } })
        : null;
      const { generatePropertyCode } = await import("@/lib/area-codes");
      code = await generatePropertyCode(prisma, area?.slug);
    }

    // Create property
    const property = await prisma.property.create({
      data: {
        code,
        type: body.type,
        areaId: body.areaId,
        kawasanId: body.kawasanId || null,
        address: body.address,
        landArea: body.landArea || null,
        buildingArea: body.buildingArea || null,
        bedrooms: body.bedrooms || null,
        bathrooms: body.bathrooms || null,
        floors: body.floors || null,
        certificateType: body.certificateType || null,
        yearBuilt: body.yearBuilt || null,
        facing: body.facing || null,
        electricity: body.electricity || null,
        waterSource: body.waterSource || null,
        internalNotes: body.internalNotes || null,
      },
    });

    // Link amenities
    if (body.amenityIds && body.amenityIds.length > 0) {
      await prisma.propertyAmenity.createMany({
        data: body.amenityIds.map((amenityId: string) => ({
          propertyId: property.id,
          amenityId,
        })),
      });
    }

    // Create owner if provided
    if (body.ownerName) {
      const owner = await prisma.owner.create({
        data: {
          name: body.ownerName,
          phone: body.ownerPhone || null,
        },
      });

      await prisma.propertyOwner.create({
        data: {
          propertyId: property.id,
          ownerId: owner.id,
          isPrimary: true,
        },
      });
    }

    // Create intermediary if provided
    let intermediary = null;
    if (body.intermediaryName) {
      intermediary = await prisma.intermediary.create({
        data: {
          name: body.intermediaryName,
          phone: body.intermediaryPhone || null,
        },
      });
    }

    // Create listing if price is provided
    let listing = null;
    if (body.askingPrice || body.priceOnRequest) {
      // Get default admin user
      const admin = await prisma.user.findFirst({
        where: { email: "admin@jakselproperti.com" },
      });

      listing = await prisma.listing.create({
        data: {
          propertyId: property.id,
          status: "DRAFT",
          askingPrice: body.askingPrice || 0,
          minimumPrice: body.minimumPrice || null,
          priceOnRequest: body.priceOnRequest || false,
          title: body.title || null,
          description: body.description || null,
          showFullAddress: body.showFullAddress || false,
          videoUrl: body.videoUrl || null,
          videoPlatform: body.videoPlatform || null,
          internalNotes: body.commissionNotes || null,
        },
      });

      // Status history
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

      // Link intermediary to listing
      if (intermediary) {
        await prisma.listingIntermediary.create({
          data: {
            listingId: listing.id,
            intermediaryId: intermediary.id,
            role: "PRIMARY_SOURCE",
            chainPosition: 1,
          },
        });
      }
    }

    return NextResponse.json({ property, listing }, { status: 201 });
  } catch (error) {
    console.error("Create property error:", error);
    return NextResponse.json(
      { error: "Gagal membuat properti" },
      { status: 500 }
    );
  }
}
