import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// =============================================================================
// POST /api/properties/duplicate-check — Check for duplicate properties
// Real-time check as user types address (Section 9)
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const { address, areaId } = await request.json();

    if (!address || address.length < 5) {
      return NextResponse.json({ duplicate: null });
    }

    // Search for similar properties
    // Strategy: search by address substring match in same or nearby area
    const where: Record<string, unknown> = {
      address: { contains: address.substring(0, Math.min(address.length, 20)) },
    };

    if (areaId) {
      // Check same area first, then broader
      where.areaId = areaId;
    }

    const similar = await prisma.property.findFirst({
      where,
      include: {
        area: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (similar) {
      return NextResponse.json({
        duplicate: {
          id: similar.id,
          code: similar.code,
          address: similar.address,
          area: similar.area.name,
          createdAt: similar.createdAt,
        },
      });
    }

    // Broader search without area filter
    if (areaId) {
      const broaderSearch = await prisma.property.findFirst({
        where: {
          address: { contains: address.substring(0, Math.min(address.length, 15)) },
        },
        include: {
          area: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      if (broaderSearch) {
        return NextResponse.json({
          duplicate: {
            id: broaderSearch.id,
            code: broaderSearch.code,
            address: broaderSearch.address,
            area: broaderSearch.area.name,
            createdAt: broaderSearch.createdAt,
          },
        });
      }
    }

    return NextResponse.json({ duplicate: null });
  } catch (error) {
    console.error("Duplicate check error:", error);
    return NextResponse.json({ duplicate: null });
  }
}
