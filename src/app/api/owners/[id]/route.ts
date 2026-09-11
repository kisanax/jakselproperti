import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/owners/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const owner = await prisma.owner.findUnique({
    where: { id },
    include: {
      propertyOwners: {
        include: {
          property: {
            select: {
              id: true,
              code: true,
              type: true,
              area: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!owner) {
    return NextResponse.json({ error: "Owner tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ owner });
}

// PUT /api/owners/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const owner = await prisma.owner.update({
      where: { id },
      data: {
        name: body.name,
        phone: body.phone || null,
        email: body.email || null,
        idNumber: body.idNumber || null,
        address: body.address || null,
        notes: body.notes || null,
      },
    });

    return NextResponse.json({ owner });
  } catch (error) {
    console.error("Update owner error:", error);
    return NextResponse.json({ error: "Gagal update owner" }, { status: 500 });
  }
}

// DELETE /api/owners/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Check if owner has associated properties
    const propertyCount = await prisma.propertyOwner.count({
      where: { ownerId: id },
    });

    if (propertyCount > 0) {
      return NextResponse.json(
        {
          error: `Owner tidak dapat dihapus karena masih terhubung dengan ${propertyCount} properti. Lepaskan relasi properti terlebih dahulu.`,
        },
        { status: 400 }
      );
    }

    await prisma.owner.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete owner error:", error);
    return NextResponse.json({ error: "Gagal menghapus owner" }, { status: 500 });
  }
}
