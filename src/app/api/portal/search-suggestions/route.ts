import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() || "";

  try {
    if (!q) {
      // Default curated suggestions: Featured Kawasan & Jaksel Highlights
      const [kawasanList, jakselAreas] = await Promise.all([
        prisma.kawasan.findMany({
          where: { isActive: true },
          include: {
            area: {
              select: { id: true, name: true },
            },
            _count: {
              select: { properties: true },
            },
          },
          orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
          take: 8,
        }),
        prisma.area.findMany({
          where: {
            level: 3,
            isActive: true,
            parent: { officialCode: "31.74" }, // Jakarta Selatan
          },
          select: { id: true, name: true, slug: true },
          orderBy: { name: "asc" },
          take: 8,
        }),
      ]);

      const suggestions = [
        ...kawasanList.map((k) => ({
          id: k.id,
          type: "kawasan" as const,
          name: k.name,
          subtitle: `${k.area.name}, Jakarta Selatan`,
          areaId: k.areaId,
          kawasanId: k.id,
          propertyCount: k._count.properties,
        })),
        ...jakselAreas.map((a) => ({
          id: a.id,
          type: "kecamatan" as const,
          name: a.name,
          subtitle: "Kecamatan · Jakarta Selatan",
          areaId: a.id,
        })),
      ];

      return NextResponse.json({ suggestions });
    }

    // Dynamic search query across Kawasan and Area (National level 2 & 3)
    const [matchingKawasan, matchingKecamatan, matchingKabKota] = await Promise.all([
      prisma.kawasan.findMany({
        where: {
          isActive: true,
          name: { contains: q },
        },
        include: {
          area: {
            select: { id: true, name: true },
          },
        },
        take: 6,
      }),
      prisma.area.findMany({
        where: {
          level: 3,
          isActive: true,
          name: { contains: q },
        },
        include: {
          parent: {
            select: {
              name: true,
              parent: { select: { name: true } },
            },
          },
        },
        take: 8,
      }),
      prisma.area.findMany({
        where: {
          level: 2,
          isActive: true,
          name: { contains: q },
        },
        include: {
          parent: { select: { name: true } },
        },
        take: 4,
      }),
    ]);

    const suggestions = [
      ...matchingKawasan.map((k) => ({
        id: `k-${k.id}`,
        type: "kawasan" as const,
        name: k.name,
        subtitle: `Kawasan · ${k.area.name}`,
        areaId: k.areaId,
        kawasanId: k.id,
      })),
      ...matchingKecamatan.map((k) => {
        const kabKota = k.parent?.name || "";
        const prov = k.parent?.parent?.name || "";
        const locationPath = [kabKota, prov].filter(Boolean).join(", ");
        return {
          id: `a-${k.id}`,
          type: "kecamatan" as const,
          name: k.name,
          subtitle: locationPath ? `Kecamatan · ${locationPath}` : "Kecamatan",
          areaId: k.id,
        };
      }),
      ...matchingKabKota.map((k) => {
        const prov = k.parent?.name || "";
        return {
          id: `city-${k.id}`,
          type: "kota" as const,
          name: k.name,
          subtitle: prov ? `Kota / Kab · ${prov}` : "Kota / Kab",
          cityId: k.id,
        };
      }),
    ];

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Search suggestions error:", error);
    return NextResponse.json({ suggestions: [] }, { status: 500 });
  }
}
