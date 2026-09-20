import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LeadStage } from "@prisma/client";
import { requireOperationalUser } from "@/lib/api-auth";
import { combineListingFilters } from "@/lib/services/property-listing-access";

// GET /api/leads/[id] — Get detail lead
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireOperationalUser();
  if (guard.error) return guard.error;
  const { id } = await params;

  try {
    const lead = await prisma.lead.findFirst({
      where: { id, listing: combineListingFilters(guard.actor, {}) },
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
  const guard = await requireOperationalUser();
  if (guard.error) return guard.error;
  const { id } = await params;

  try {
    const body = await request.json();

    const existingLead = await prisma.lead.findFirst({
      where: { id, listing: combineListingFilters(guard.actor, {}) },
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
      if (isStageChanged) {
        await tx.leadActivity.create({
          data: {
            leadId: id,
            userId: guard.actor.userId,
            type: "STAGE_CHANGE",
            fromStage: existingLead.currentStage,
            toStage: body.currentStage,
            summary:
              body.activityNote?.trim() ||
              `Perpindahan stage dari ${existingLead.currentStage} ke ${body.currentStage}`,
          },
        });
      } else if (body.newActivity) {
        // Log generic activity like call, whatsapp, note
        await tx.leadActivity.create({
          data: {
            leadId: id,
            userId: guard.actor.userId,
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
