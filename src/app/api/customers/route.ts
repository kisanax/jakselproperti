import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/customers — List unique customers with lead counts
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { phone: { contains: search } },
      { email: { contains: search } },
    ];
  }

  try {
    const customers = await prisma.customer.findMany({
      where,
      include: {
        leads: {
          include: {
            listing: {
              include: {
                property: {
                  select: {
                    code: true,
                    type: true,
                    area: { select: { name: true } },
                    kawasan: { select: { name: true } },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ customers });
  } catch (error) {
    console.error("GET /api/customers error:", error);
    return NextResponse.json({ error: "Gagal mengambil data customer" }, { status: 500 });
  }
}

// POST /api/customers — Create new customer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, email, notes } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nama customer wajib diisi" }, { status: 400 });
    }
    if (!phone || !phone.trim()) {
      return NextResponse.json({ error: "Nomor telepon/WhatsApp wajib diisi" }, { status: 400 });
    }

    const cleanPhone = phone.trim();

    // Check unique phone dedupe
    const existing = await prisma.customer.findUnique({
      where: { phone: cleanPhone },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Nomor telepon sudah terdaftar untuk customer: ${existing.name}` },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        phone: cleanPhone,
        email: email?.trim() || null,
        notes: notes?.trim() || null,
      },
      include: {
        leads: {
          include: {
            listing: {
              include: {
                property: {
                  select: {
                    code: true,
                    type: true,
                    area: { select: { name: true } },
                    kawasan: { select: { name: true } },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    console.error("POST /api/customers error:", error);
    return NextResponse.json({ error: "Gagal menambahkan customer" }, { status: 500 });
  }
}

