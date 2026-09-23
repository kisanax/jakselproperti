import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/api-auth";

// GET /api/owners
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
    ];
  }

  const owners = await prisma.owner.findMany({
    where,
    include: {
      propertyOwners: {
        include: {
          property: { select: { id: true, code: true, type: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ owners });
}

// POST /api/owners
export async function POST(request: NextRequest) {
  const guard = await requireStaff();
  if (guard.error) return guard.error;

  try {
    const body = await request.json();
    const owner = await prisma.owner.create({
      data: {
        name: body.name,
        phone: body.phone || null,
        email: body.email || null,
        idNumber: body.idNumber || null,
        address: body.address || null,
        notes: body.notes || null,
      },
    });
    return NextResponse.json({ owner }, { status: 201 });
  } catch (error) {
    console.error("Create owner error:", error);
    return NextResponse.json({ error: "Gagal membuat owner" }, { status: 500 });
  }
}
