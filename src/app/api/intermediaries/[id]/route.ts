import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/intermediaries/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const intermediary = await prisma.intermediary.findUnique({
    where: { id },
    include: {
      listingIntermediaries: {
        include: {
          listing: {
            select: {
              id: true,
              status: true,
              property: {
                select: {
                  id: true,
                  code: true,
                  area: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!intermediary) {
    return NextResponse.json({ error: "Perantara tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ intermediary });
}

// PUT /api/intermediaries/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const intermediary = await prisma.intermediary.update({
      where: { id },
      data: {
        name: body.name,
        phone: body.phone || null,
        email: body.email || null,
        company: body.company || null,
        trustLevel: body.trustLevel || "NEW",
        notes: body.notes || null,
      },
    });

    return NextResponse.json({ intermediary });
  } catch (error) {
    console.error("Update intermediary error:", error);
    return NextResponse.json({ error: "Gagal update perantara" }, { status: 500 });
  }
}

// DELETE /api/intermediaries/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Check if intermediary has linked listings
    const listingCount = await prisma.listingIntermediary.count({
      where: { intermediaryId: id },
    });

    if (listingCount > 0) {
      return NextResponse.json(
        {
          error: `Perantara tidak dapat dihapus karena masih terhubung dengan ${listingCount} listing. Lepaskan perantara dari listing terkait terlebih dahulu.`,
        },
        { status: 400 }
      );
    }

    await prisma.intermediary.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete intermediary error:", error);
    return NextResponse.json({ error: "Gagal menghapus perantara" }, { status: 500 });
  }
}
