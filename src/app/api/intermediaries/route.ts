import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/api-auth";

// GET /api/intermediaries
export async function GET(request: NextRequest) {
  const guard = await requireStaff();
  if (guard.error) return guard.error;

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { phone: { contains: search } },
      { company: { contains: search } },
    ];
  }

  const intermediaries = await prisma.intermediary.findMany({
    where,
    include: {
      listingIntermediaries: {
        include: {
          listing: {
            select: { id: true, status: true, property: { select: { code: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ intermediaries });
}

// POST /api/intermediaries
export async function POST(request: NextRequest) {
  const guard = await requireStaff();
  if (guard.error) return guard.error;

  try {
    const body = await request.json();
    const intermediary = await prisma.intermediary.create({
      data: {
        name: body.name,
        phone: body.phone || null,
        email: body.email || null,
        company: body.company || null,
        trustLevel: body.trustLevel || "NEW",
        notes: body.notes || null,
      },
    });
    return NextResponse.json({ intermediary }, { status: 201 });
  } catch (error) {
    console.error("Create intermediary error:", error);
    return NextResponse.json({ error: "Gagal membuat perantara" }, { status: 500 });
  }
}
