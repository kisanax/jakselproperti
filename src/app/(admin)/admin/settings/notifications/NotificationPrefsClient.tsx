"use client";

import { useState } from "react";
import { Bell, Check } from "lucide-react";
import { FormSection, RecordHeader, RecordPage } from "@/components/admin-ui";
import styles from "../settings.module.css";

export type PrefChannels = {
  IN_APP: boolean;
  EMAIL: boolean;
  WHATSAPP: boolean;
};

export type PrefEvent = {
  key: string;
  label: string;
  description: string;
  channels: PrefChannels;
};

const CHANNELS = [
  { key: "IN_APP" as const, label: "In-app", soon: false },
  { key: "EMAIL" as const, label: "Email", soon: true },
  { key: "WHATSAPP" as const, label: "WhatsApp", soon: true },
];

export default function NotificationPrefsClient({ events }: { events: PrefEvent[] }) {
  const [prefs, setPrefs] = useState(events);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function toggle(eventKey: string, channel: keyof PrefChannels, nextEnabled: boolean) {
    setError(null);
    setSaved(false);

    setPrefs((prev) =>
      prev.map((event) =>
        event.key === eventKey ? { ...event, channels: { ...event.channels, [channel]: nextEnabled } } : event
      )
    );

    try {
      const res = await fetch("/api/notification-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventKey, channel, enabled: nextEnabled }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPrefs((prev) =>
          prev.map((event) =>
            event.key === eventKey ? { ...event, channels: { ...event.channels, [channel]: !nextEnabled } } : event
          )
        );
        setError(data.error || "Gagal menyimpan preferensi.");
        return;
      }
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch {
      setPrefs((prev) =>
        prev.map((event) =>
          event.key === eventKey ? { ...event, channels: { ...event.channels, [channel]: !nextEnabled } } : event
        )
      );
      setError("Terjadi kesalahan jaringan.");
    }
  }

  return (
    <RecordPage>
      <RecordHeader
        eyebrow="Pengaturan"
        title="Pengaturan Notifikasi"
        subtitle="Pilih event apa yang ingin kamu diberi tahu, per kanal."
      />

      <FormSection title="Event notifikasi" description="Preferensi berlaku untuk akunmu sendiri.">
        <div className={styles.eventList}>
          {prefs.map((event) => (
            <div key={event.key} className={styles.eventRow}>
              <div className={styles.eventInfo}>
                <strong>{event.label}</strong>
                <span>{event.description}</span>
              </div>
              <div className={styles.channelGroup}>
                {CHANNELS.map((channel) => (
                  <div key={channel.key} className={styles.channelToggle} data-soon={channel.soon}>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={event.channels[channel.key]}
                      className={styles.switch}
                      aria-label={`${event.label} — ${channel.label}`}
                      onClick={() => toggle(event.key, channel.key, !event.channels[channel.key])}
                    />
                    <small>
                      {channel.label}
                      {channel.soon ? " · segera" : ""}
                    </small>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </FormSection>

      {error && (
        <p role="alert" style={{ color: "var(--workspace-danger)", fontSize: 13, marginTop: 12 }}>
          {error}
        </p>
      )}
      {saved && (
        <div className={styles.toast} role="status">
          <Check size={16} /> Preferensi tersimpan
        </div>
      )}

      <p style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--workspace-text-muted)", fontSize: 12, marginTop: 16 }}>
        <Bell size={15} /> Kanal Email & WhatsApp sudah disimpan preferensinya dan aktif otomatis begitu
        provider pengiriman dihubungkan.
      </p>
    </RecordPage>
  );
}
