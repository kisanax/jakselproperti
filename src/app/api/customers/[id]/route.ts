import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/customers/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      leads: {
        include: {
          listing: {
            include: {
              property: true,
            },
          },
        },
      },
    },
  });

  if (!customer) {
    return NextResponse.json({ error: "Customer tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ customer });
}

// PUT /api/customers/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { name, phone, email, notes } = body;

    if (name !== undefined && !name.trim()) {
      return NextResponse.json({ error: "Nama customer tidak boleh kosong" }, { status: 400 });
    }

    if (phone !== undefined) {
      const cleanPhone = phone.trim();
      if (!cleanPhone) {
        return NextResponse.json({ error: "Nomor telepon tidak boleh kosong" }, { status: 400 });
      }

      // Check if phone is already used by another customer
      const existing = await prisma.customer.findFirst({
        where: {
          phone: cleanPhone,
          NOT: { id },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: `Nomor telepon sudah digunakan oleh customer ${existing.name}` },
          { status: 400 }
        );
      }
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        phone: phone !== undefined ? phone.trim() : undefined,
        email: email !== undefined ? (email?.trim() || null) : undefined,
        notes: notes !== undefined ? (notes?.trim() || null) : undefined,
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

    return NextResponse.json({ customer });
  } catch (error) {
    console.error("Update customer error:", error);
    return NextResponse.json({ error: "Gagal update customer" }, { status: 500 });
  }
}

// DELETE /api/customers/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const leadCount = await prisma.lead.count({
      where: { customerId: id },
    });

    if (leadCount > 0) {
      return NextResponse.json(
        {
          error: `Customer tidak dapat dihapus karena memiliki ${leadCount} tiket inquiry (leads).`,
        },
        { status: 400 }
      );
    }

    await prisma.customer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete customer error:", error);
    return NextResponse.json({ error: "Gagal menghapus customer" }, { status: 500 });
  }
}
