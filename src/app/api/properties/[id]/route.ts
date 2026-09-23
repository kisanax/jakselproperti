import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOperationalUser, requireSuperAdmin } from "@/lib/api-auth";
import { getKecamatanArea, getVillageArea } from "@/lib/areas";
import { getStorage } from "@/lib/storage";
import {
  combinePropertyFilters,
  listingAccessFilter,
} from "@/lib/services/property-listing-access";

// =============================================================================
// GET /api/properties/[id] — Get property detail
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireOperationalUser();
  if (guard.error) return guard.error;

  const { id } = await params;

  const property = await prisma.property.findFirst({
    where: {
      ...combinePropertyFilters(guard.actor, { OR: [{ id }, { code: id }] }),
    },
    include: {
      area: { include: { parent: true } },
      village: true,
      kawasan: true,
      listings: {
        where: listingAccessFilter(guard.actor),
        orderBy: { createdAt: "desc" },
        include: {
          statusHistory: { orderBy: { createdAt: "desc" } },
          priceHistory: { orderBy: { createdAt: "desc" } },
          listingIntermediaries: {
            include: { intermediary: true },
          },
          leads: { orderBy: { createdAt: "desc" }, take: 5 },
        },
      },
      propertyOwners: {
        include: { owner: true },
      },
      propertyMedia: {
        orderBy: { sortOrder: "asc" },
      },
      documents: true,
      amenities: {
        include: { amenity: true },
      },
    },
  });

  if (!property) {
    return NextResponse.json({ error: "Properti tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ property });
}

// =============================================================================
// PUT /api/properties/[id] — Update property
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

    const existing = await prisma.property.findFirst({
      where: combinePropertyFilters(guard.actor, { OR: [{ id }, { code: id }] }),
      include: {
        propertyOwners: { select: { ownerId: true, isPrimary: true } },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Properti tidak ditemukan" }, { status: 404 });
    }

    const nextAreaId =
      body.areaId !== undefined && body.areaId !== null && body.areaId !== ""
        ? Number(body.areaId)
        : existing.areaId;
    if (body.areaId !== undefined && body.areaId !== null && body.areaId !== "") {
      const areaId = nextAreaId;
      if (!Number.isInteger(areaId) || !(await getKecamatanArea(prisma, areaId))) {
        return NextResponse.json({ error: "areaId harus merujuk ke kecamatan" }, { status: 400 });
      }
    }

    const nextVillageId =
      body.villageId === null || body.villageId === ""
        ? null
        : body.villageId !== undefined
          ? Number(body.villageId)
          : existing.villageId;
    if (
      nextVillageId !== null &&
      (!Number.isInteger(nextVillageId) ||
        !(await getVillageArea(prisma, nextVillageId, nextAreaId)))
    ) {
      return NextResponse.json(
        { error: "villageId harus merujuk ke kelurahan/desa di kecamatan terpilih" },
        { status: 400 }
      );
    }

    const ownerInput = body.owner !== undefined
      ? {
          id: typeof body.owner?.id === "string" ? body.owner.id : null,
          name: typeof body.owner?.name === "string" ? body.owner.name.trim() : "",
          phone: typeof body.owner?.phone === "string" ? body.owner.phone.trim() : null,
        }
      : null;

    if (ownerInput && !ownerInput.name) {
      return NextResponse.json({ error: "Nama owner wajib diisi jika data owner ditambahkan" }, { status: 400 });
    }

    const property = await prisma.$transaction(async (tx) => {
      const updatedProperty = await tx.property.update({
        where: { id: existing.id },
        data: {
        type: body.type || undefined,
        areaId:
          body.areaId !== undefined && body.areaId !== null && body.areaId !== ""
            ? Number(body.areaId)
            : undefined,
        villageId: body.villageId !== undefined ? nextVillageId : undefined,
        kawasanId: body.kawasanId !== undefined ? (body.kawasanId || null) : undefined,
        address: body.address !== undefined ? body.address : undefined,
        landArea: body.landArea !== undefined ? (body.landArea ? parseInt(body.landArea) : null) : undefined,
        buildingArea: body.buildingArea !== undefined ? (body.buildingArea ? parseInt(body.buildingArea) : null) : undefined,
        bedrooms: body.bedrooms !== undefined ? (body.bedrooms ? parseInt(body.bedrooms) : null) : undefined,
        bathrooms: body.bathrooms !== undefined ? (body.bathrooms ? parseInt(body.bathrooms) : null) : undefined,
        floors: body.floors !== undefined ? (body.floors ? parseInt(body.floors) : 1) : undefined,
        certificateType: body.certificateType !== undefined ? (body.certificateType || null) : undefined,
        yearBuilt: body.yearBuilt !== undefined ? (body.yearBuilt ? parseInt(body.yearBuilt) : null) : undefined,
        facing: body.facing !== undefined ? (body.facing || null) : undefined,
        electricity: body.electricity !== undefined ? (body.electricity ? parseInt(body.electricity) : null) : undefined,
        waterSource: body.waterSource !== undefined ? (body.waterSource || null) : undefined,
        internalNotes: body.internalNotes !== undefined ? (body.internalNotes || null) : undefined,
        },
      });

      if (ownerInput) {
        let ownerId = ownerInput.id;
        if (ownerId) {
          const isLinked = existing.propertyOwners.some((item) => item.ownerId === ownerId);
          if (!isLinked) throw new Error("Owner tidak terhubung dengan properti ini");
          await tx.owner.update({
            where: { id: ownerId },
            data: { name: ownerInput.name, phone: ownerInput.phone || null },
          });
        } else {
          const createdOwner = await tx.owner.create({
            data: { name: ownerInput.name, phone: ownerInput.phone || null },
          });
          ownerId = createdOwner.id;
          await tx.propertyOwner.create({
            data: { propertyId: existing.id, ownerId, isPrimary: true },
          });
        }

        await tx.propertyOwner.updateMany({
          where: { propertyId: existing.id },
          data: { isPrimary: false },
        });
        await tx.propertyOwner.update({
          where: { propertyId_ownerId: { propertyId: existing.id, ownerId } },
          data: { isPrimary: true },
        });
      }

      return updatedProperty;
    });

    return NextResponse.json({ property });
  } catch (error) {
    console.error("Update property error:", error);
    return NextResponse.json({ error: "Gagal update properti" }, { status: 500 });
  }
}

// =============================================================================
// DELETE /api/properties/[id] — Delete property with full cascade cleanup
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireSuperAdmin();
  if (guard.error) return guard.error;

  const { id } = await params;

  try {
    const existing = await prisma.property.findFirst({
      where: { OR: [{ id }, { code: id }] },
      include: {
        listings: { select: { id: true } },
        propertyMedia: { select: { id: true, filePath: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Properti tidak ditemukan" }, { status: 404 });
    }

    const propId = existing.id;
    const listingIds = existing.listings.map((l) => l.id);

    // Object storage berada di luar transaksi database. Hapus seluruh objek
    // terlebih dahulu; bila R2 gagal, hentikan proses agar tidak menyisakan
    // objek yatim yang sudah kehilangan referensi dari database.
    if (existing.propertyMedia.length > 0) {
      const storage = getStorage();
      await Promise.all(
        existing.propertyMedia.map((media) => storage.delete(media.filePath))
      );
    }

    await prisma.$transaction(async (tx) => {
      if (listingIds.length > 0) {
        // Delete lead activities and leads
        const leads = await tx.lead.findMany({
          where: { listingId: { in: listingIds } },
          select: { id: true },
        });
        const leadIds = leads.map((l) => l.id);
        if (leadIds.length > 0) {
          await tx.leadActivity.deleteMany({ where: { leadId: { in: leadIds } } });
          await tx.lead.deleteMany({ where: { id: { in: leadIds } } });
        }

        await tx.viewingSchedule.deleteMany({ where: { listingId: { in: listingIds } } });
        await tx.offer.deleteMany({ where: { listingId: { in: listingIds } } });
        await tx.priceHistory.deleteMany({ where: { listingId: { in: listingIds } } });
        await tx.listingStatusHistory.deleteMany({ where: { listingId: { in: listingIds } } });
        await tx.listingIntermediary.deleteMany({ where: { listingId: { in: listingIds } } });
        await tx.listingSource.deleteMany({ where: { listingId: { in: listingIds } } });
        await tx.listing.deleteMany({ where: { propertyId: propId } });
      }

      await tx.propertyOwner.deleteMany({ where: { propertyId: propId } });
      await tx.propertyMedia.deleteMany({ where: { propertyId: propId } });
      await tx.document.deleteMany({ where: { propertyId: propId } });
      await tx.propertyAmenity.deleteMany({ where: { propertyId: propId } });
      await tx.property.delete({ where: { id: propId } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete property error:", error);
    return NextResponse.json({ error: "Gagal menghapus properti" }, { status: 500 });
  }
}
