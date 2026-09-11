import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// =============================================================================
// GET /api/areas/search — Autocomplete search for areas
// =============================================================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q") || "";

  if (!q || q.length < 1) {
    const areas = await prisma.area.findMany({
      where: { isActive: true, level: 1 },
      orderBy: { name: "asc" },
      take: 10,
    });
    return NextResponse.json({ areas });
  }

  const areas = await prisma.area.findMany({
    where: {
      isActive: true,
      name: { contains: q },
    },
    include: {
      parent: { select: { name: true } },
    },
    orderBy: { name: "asc" },
    take: 10,
  });

  return NextResponse.json({ areas });
}
