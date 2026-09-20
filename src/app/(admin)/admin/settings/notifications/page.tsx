import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessModule } from "@/lib/module-access";
import { eventsForRole, NOTIFICATION_EVENTS, type NotificationEventKey } from "@/lib/notifications";
import NotificationPrefsClient, { type PrefEvent } from "./NotificationPrefsClient";

export const metadata: Metadata = { title: "Pengaturan Notifikasi | Workspace" };

export default async function NotificationSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const accessible = await canAccessModule(prisma, session.user.platformRole, "notifications");
  if (!accessible) redirect("/admin");

  const rows = await prisma.notificationPreference.findMany({
    where: { userId: session.user.id },
  });

  const value = (eventKey: NotificationEventKey, channel: "IN_APP" | "EMAIL" | "WHATSAPP", defaultValue: boolean) => {
    const row = rows.find((r) => r.eventKey === eventKey && r.channel === channel);
    return row ? row.enabled : defaultValue;
  };

  const events: PrefEvent[] = eventsForRole(session.user.platformRole).map((event) => ({
    key: event.key,
    label: event.label,
    description: event.description,
    channels: {
      IN_APP: value(event.key, "IN_APP", event.defaultEnabled),
      EMAIL: value(event.key, "EMAIL", event.defaultEnabled),
      WHATSAPP: value(event.key, "WHATSAPP", event.defaultEnabled),
    },
  }));

  void NOTIFICATION_EVENTS;

  return <NotificationPrefsClient events={events} />;
}
