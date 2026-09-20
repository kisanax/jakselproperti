import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/kawasan — List all kawasan
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const areaIdParam = searchParams.get("areaId");
  const isFeatured = searchParams.get("featured");

  const where: Record<string, unknown> = { isActive: true };

  if (areaIdParam) {
    const areaId = Number(areaIdParam);
    if (Number.isInteger(areaId)) where.areaId = areaId;
  }

  if (isFeatured !== null && isFeatured !== undefined) {
    where.isFeatured = isFeatured === "true";
  }

  try {
    const kawasanList = await prisma.kawasan.findMany({
      where,
      include: {
        area: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { properties: true },
        },
      },
      orderBy: [
        { isFeatured: "desc" },
        { sortOrder: "asc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json({ kawasan: kawasanList });
  } catch (error) {
    console.error("GET /api/kawasan error:", error);
    return NextResponse.json({ error: "Gagal mengambil data kawasan" }, { status: 500 });
  }
}

// POST /api/kawasan — Create new kawasan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.areaId) {
      return NextResponse.json(
        { error: "Nama kawasan dan kecamatan wajib diisi" },
        { status: 400 }
      );
    }

    // areaId datang sebagai string dari form — Area.id sekarang Int.
    const areaId = Number(body.areaId);
    if (!Number.isInteger(areaId)) {
      return NextResponse.json({ error: "areaId tidak valid" }, { status: 400 });
    }

    // Kawasan hanya boleh terhubung ke kecamatan (level 3)
    const parentArea = await prisma.area.findUnique({
      where: { id: areaId },
      select: { id: true, level: true },
    });
    if (!parentArea || parentArea.level !== 3) {
      return NextResponse.json(
        { error: "Kecamatan induk tidak valid — kawasan hanya boleh terhubung ke kecamatan." },
        { status: 400 }
      );
    }

    const slug =
      body.slug?.trim() ||
      body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    // Check slug collision
    const existing = await prisma.kawasan.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: `Kawasan dengan slug '${slug}' sudah ada` },
        { status: 409 }
      );
    }

    const kawasan = await prisma.kawasan.create({
      data: {
        name: body.name.trim(),
        slug,
        areaId,
        tagline: body.tagline?.trim() || null,
        bannerImage: body.bannerImage?.trim() || null,
        isFeatured: Boolean(body.isFeatured),
        sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
      },
      include: {
        area: true,
      },
    });

    return NextResponse.json({ kawasan }, { status: 201 });
  } catch (error) {
    console.error("POST /api/kawasan error:", error);
    return NextResponse.json({ error: "Gagal membuat kawasan" }, { status: 500 });
  }
}
