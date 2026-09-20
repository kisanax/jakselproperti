import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-auth";

// PUT /api/kawasan/[id] — Update kawasan
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name.trim();
    if (body.slug !== undefined) data.slug = body.slug.trim();
    if (body.areaId !== undefined) {
      // areaId datang sebagai string dari form — Area.id sekarang Int.
      const areaId = Number(body.areaId);
      if (!Number.isInteger(areaId)) {
        return NextResponse.json({ error: "areaId tidak valid" }, { status: 400 });
      }
      // Kawasan hanya boleh terhubung ke kecamatan (level 3)
      const parentArea = await prisma.area.findUnique({
        where: { id: areaId },
        select: { level: true },
      });
      if (!parentArea || parentArea.level !== 3) {
        return NextResponse.json(
          { error: "Kecamatan induk tidak valid — kawasan hanya boleh terhubung ke kecamatan." },
          { status: 400 }
        );
      }
      data.areaId = areaId;
    }
    if (body.tagline !== undefined) data.tagline = body.tagline ? body.tagline.trim() : null;
    if (body.bannerImage !== undefined) data.bannerImage = body.bannerImage ? body.bannerImage.trim() : null;
    if (body.isFeatured !== undefined) data.isFeatured = Boolean(body.isFeatured);
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder);
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

    const kawasan = await prisma.kawasan.update({
      where: { id },
      data,
      include: {
        area: true,
      },
    });

    return NextResponse.json({ kawasan });
  } catch (error) {
    console.error("PUT /api/kawasan/[id] error:", error);
    return NextResponse.json({ error: "Gagal memperbarui kawasan" }, { status: 500 });
  }
}

// DELETE /api/kawasan/[id] — Delete kawasan
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireSuperAdmin();
  if (guard.error) return guard.error;

  const { id } = await params;

  try {
    // Check if properties are attached
    const propertyCount = await prisma.property.count({
      where: { kawasanId: id },
    });

    if (propertyCount > 0) {
      return NextResponse.json(
        {
          error: `Tidak dapat menghapus kawasan karena masih digunakan oleh ${propertyCount} properti`,
        },
        { status: 400 }
      );
    }

    await prisma.kawasan.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/kawasan/[id] error:", error);
    return NextResponse.json({ error: "Gagal menghapus kawasan" }, { status: 500 });
  }
}
