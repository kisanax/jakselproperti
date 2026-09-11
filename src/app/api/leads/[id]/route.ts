import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LeadStage } from "@prisma/client";

// GET /api/leads/[id] — Get detail lead
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        customer: true,
        listing: {
          include: {
            property: {
              include: {
                area: true,
                kawasan: true,
                propertyMedia: {
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
          },
        },
        activities: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        viewingSchedules: {
          orderBy: { scheduledAt: "desc" },
        },
        offers: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    console.error("GET /api/leads/[id] error:", error);
    return NextResponse.json({ error: "Gagal mengambil data lead" }, { status: 500 });
  }
}

// PUT /api/leads/[id] — Update lead (e.g. stage transition, notes, priority)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();

    const existingLead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!existingLead) {
      return NextResponse.json({ error: "Lead tidak ditemukan" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};

    // Check if stage changed
    const isStageChanged =
      body.currentStage &&
      body.currentStage !== existingLead.currentStage &&
      Object.values(LeadStage).includes(body.currentStage as LeadStage);

    if (body.currentStage) data.currentStage = body.currentStage;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.priority !== undefined) data.priority = Number(body.priority);

    // Get admin user for activity logging
    const admin = await prisma.user.findFirst({
      where: { email: "admin@jakselproperti.com" },
    });

    const updatedLead = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.update({
        where: { id },
        data,
        include: {
          customer: true,
          listing: {
            include: {
              property: {
                select: {
                  code: true,
                  area: { select: { name: true } },
                  kawasan: { select: { name: true } },
                },
              },
            },
          },
        },
      });

      // Record stage change in LeadActivity (Section 15.4)
      if (isStageChanged && admin) {
        await tx.leadActivity.create({
          data: {
            leadId: id,
            userId: admin.id,
            type: "STAGE_CHANGE",
            fromStage: existingLead.currentStage,
            toStage: body.currentStage,
            summary:
              body.activityNote?.trim() ||
              `Perpindahan stage dari ${existingLead.currentStage} ke ${body.currentStage}`,
          },
        });
      } else if (body.newActivity && admin) {
        // Log generic activity like call, whatsapp, note
        await tx.leadActivity.create({
          data: {
            leadId: id,
            userId: admin.id,
            type: body.newActivity.type || "NOTE",
            fromStage: existingLead.currentStage,
            toStage: existingLead.currentStage,
            summary: body.newActivity.summary,
          },
        });
      }

      return lead;
    });

    return NextResponse.json({ lead: updatedLead });
  } catch (error) {
    console.error("PUT /api/leads/[id] error:", error);
    return NextResponse.json({ error: "Gagal memperbarui lead" }, { status: 500 });
  }
}
