import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LeadStage } from "@prisma/client";

// GET /api/leads
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const stage = searchParams.get("stage") as LeadStage | null;
  const search = searchParams.get("search") || "";

  const where: Record<string, unknown> = {};
  if (stage && Object.values(LeadStage).includes(stage)) {
    where.currentStage = stage;
  }

  if (search) {
    where.OR = [
      { customer: { name: { contains: search } } },
      { customer: { phone: { contains: search } } },
      { message: { contains: search } },
    ];
  }

  const leads = await prisma.lead.findMany({
    where,
    include: {
      customer: true,
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
      activities: { orderBy: { createdAt: "desc" }, take: 3 },
      _count: { select: { viewingSchedules: true, offers: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ leads });
}

// POST /api/leads
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.listingId || !body.name || !body.phone) {
      return NextResponse.json(
        { error: "listingId, name, dan phone wajib diisi" },
        { status: 400 }
      );
    }

    // 1. Find or create Customer by unique phone (Section 15.4)
    const customer = await prisma.customer.upsert({
      where: { phone: body.phone },
      update: {
        name: body.name,
        ...(body.email ? { email: body.email } : {}),
      },
      create: {
        name: body.name,
        phone: body.phone,
        email: body.email || null,
      },
    });

    // 2. Create Lead for this listing
    const lead = await prisma.lead.create({
      data: {
        customerId: customer.id,
        listingId: body.listingId,
        currentStage: "NEW",
        source: body.source || "WEBSITE",
        message: body.message || null,
      },
      include: {
        customer: true,
      },
    });

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    console.error("Create lead error:", error);
    return NextResponse.json({ error: "Gagal membuat lead" }, { status: 500 });
  }
}
