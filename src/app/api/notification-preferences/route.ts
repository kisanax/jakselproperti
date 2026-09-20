import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { eventsForRole, NOTIFICATION_EVENTS } from "@/lib/notifications";

// =============================================================================
// GET /api/notification-preferences — preferensi user yang sedang login
// =============================================================================

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  }

  const rows = await prisma.notificationPreference.findMany({
    where: { userId: session.user.id },
  });

  const events = eventsForRole(session.user.platformRole).map((event) => ({
    key: event.key,
    label: event.label,
    description: event.description,
    defaultEnabled: event.defaultEnabled,
    channels: {
      IN_APP: preferenceValue(rows, session.user.id, event.key, "IN_APP", event.defaultEnabled),
      EMAIL: preferenceValue(rows, session.user.id, event.key, "EMAIL", event.defaultEnabled),
      WHATSAPP: preferenceValue(rows, session.user.id, event.key, "WHATSAPP", event.defaultEnabled),
    },
  }));

  return NextResponse.json({ events });
}

function preferenceValue(
  rows: { userId: string; eventKey: string; channel: string; enabled: boolean }[],
  userId: string,
  eventKey: string,
  channel: string,
  defaultValue: boolean
): boolean {
  const row = rows.find((r) => r.userId === userId && r.eventKey === eventKey && r.channel === channel);
  return row ? row.enabled : defaultValue;
}

// =============================================================================
// PUT /api/notification-preferences — ubah preferensi sendiri
// =============================================================================

const updateSchema = z.object({
  eventKey: z.string().min(1).max(50),
  channel: z.enum(["IN_APP", "EMAIL", "WHATSAPP"]),
  enabled: z.boolean(),
});

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  }

  try {
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
    }

    const { eventKey, channel, enabled } = parsed.data;

    if (!NOTIFICATION_EVENTS.some((event) => event.key === eventKey)) {
      return NextResponse.json({ error: "Event notifikasi tidak dikenal." }, { status: 400 });
    }

    const row = await prisma.notificationPreference.upsert({
      where: {
        userId_eventKey_channel: { userId: session.user.id, eventKey, channel },
      },
      update: { enabled },
      create: { userId: session.user.id, eventKey, channel, enabled },
    });

    return NextResponse.json({ row });
  } catch (error) {
    console.error("Update notification preference error:", error);
    return NextResponse.json({ error: "Gagal memperbarui preferensi notifikasi." }, { status: 500 });
  }
}
