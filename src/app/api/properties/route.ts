import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalUser } from "@/lib/api-auth";
import { getKecamatanArea, getVillageArea } from "@/lib/areas";
import { getNextPropertyCode } from "@/lib/property-code";
import {
  getNextPropertyNumber,
  getNextListingNumber,
} from "@/lib/sequence-number";
import {
  combinePropertyFilters,
  isOperationalStaff,
  listingAccessFilter,
} from "@/lib/services/property-listing-access";

// =============================================================================
// GET /api/properties — List properties
// =============================================================================

export async function GET(request: NextRequest) {
  const guard = await requireOperationalUser();
  if (guard.error) return guard.error;

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const perPage = parseInt(searchParams.get("perPage") || "20");
  const search = searchParams.get("search") || "";
  const type = searchParams.get("type") || "";
  const areaSlug = searchParams.get("area") || "";
  const kawasanSlug = searchParams.get("kawasan") || "";

  const filters: Prisma.PropertyWhereInput = {};

  if (search) {
    filters.OR = [
      { code: { contains: search } },
      { address: { contains: search } },
    ];
  }

  if (type) {
    filters.type = type as Prisma.EnumPropertyTypeFilter["equals"];
  }

  if (areaSlug) {
    filters.area = { slug: areaSlug };
  }

  if (kawasanSlug) {
    filters.kawasan = { slug: kawasanSlug };
  }

  const where = combinePropertyFilters(guard.actor, filters);

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      include: {
        area: true,
        kawasan: true,
        listings: {
          where: listingAccessFilter(guard.actor),
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: {
          select: {
            propertyMedia: true,
            listings: { where: listingAccessFilter(guard.actor) },
          },
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
  const guard = await requireOperationalUser();
  if (guard.error) return guard.error;

  try {
    const body = await request.json();

    // areaId datang sebagai string dari form — Area.id sekarang Int.
    const areaId = Number(body.areaId);
    if (!Number.isInteger(areaId)) {
      return NextResponse.json({ error: "areaId tidak valid" }, { status: 400 });
    }

    const area = await getKecamatanArea(prisma, areaId);
    if (!area) {
      return NextResponse.json({ error: "areaId harus merujuk ke kecamatan" }, { status: 400 });
    }

    const villageId = body.villageId ? Number(body.villageId) : null;
    if (
      villageId !== null &&
      (!Number.isInteger(villageId) || !(await getVillageArea(prisma, villageId, areaId)))
    ) {
      return NextResponse.json(
        { error: "villageId harus merujuk ke kelurahan/desa di kecamatan terpilih" },
        { status: 400 }
      );
    }

    // Generate property code (format: {kode Kemendagri kecamatan}-{running},
    // cth. "317407-0001")
    let code = body.code?.trim();
    if (!code) {
      code =
        (await getNextPropertyCode(prisma, {
          kecamatanOfficialCode: area.officialCode,
        })) || `GEN-${Date.now().toString(36).toUpperCase()}`;
    }

    // Create property
    const propertyNumber = await getNextPropertyNumber(prisma);

    const property = await prisma.property.create({
      data: {
        code,
        propertyNumber,
        type: body.type,
        areaId,
        villageId,
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

    // Broker-created properties always receive an owned draft so they remain
    // reachable through the ownership scope.
    let listing = null;
    if (body.askingPrice || body.priceOnRequest || !isOperationalStaff(guard.actor)) {
      listing = await prisma.listing.create({
        data: {
          propertyId: property.id,
          listingNumber: await getNextListingNumber(prisma),
          managedById: guard.actor.userId,
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
      await prisma.listingStatusHistory.create({
        data: {
          listingId: listing.id,
          fromStatus: null,
          toStatus: "DRAFT",
          changedBy: guard.actor.userId,
          reason: "Listing dibuat",
        },
      });

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
