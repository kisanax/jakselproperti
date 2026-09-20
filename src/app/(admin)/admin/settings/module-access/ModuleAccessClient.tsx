"use client";

import { useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { FormSection, RecordHeader, RecordPage } from "@/components/admin-ui";
import type { ModuleMatrixEntry } from "@/lib/module-access";
import styles from "../settings.module.css";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  SUPPORT: "Support",
  BROKER: "Broker",
};

const ROLE_KEYS = ["SUPER_ADMIN", "SUPPORT", "BROKER"] as const;

export default function ModuleAccessClient({ modules }: { modules: ModuleMatrixEntry[] }) {
  const [matrix, setMatrix] = useState(modules);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function toggle(role: string, moduleKey: string, nextEnabled: boolean) {
    setError(null);
    setSaved(false);

    // Optimistic update
    setMatrix((prev) =>
      prev.map((row) =>
        row.key === moduleKey ? { ...row, byRole: { ...row.byRole, [role]: nextEnabled } } : row
      )
    );

    try {
      const res = await fetch("/api/module-access", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, moduleKey, enabled: nextEnabled }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Rollback
        setMatrix((prev) =>
          prev.map((row) =>
            row.key === moduleKey ? { ...row, byRole: { ...row.byRole, [role]: !nextEnabled } } : row
          )
        );
        setError(data.error || "Gagal menyimpan konfigurasi.");
        return;
      }
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch {
      setMatrix((prev) =>
        prev.map((row) =>
          row.key === moduleKey ? { ...row, byRole: { ...row.byRole, [role]: !nextEnabled } } : row
        )
      );
      setError("Terjadi kesalahan jaringan.");
    }
  }

  return (
    <RecordPage>
      <RecordHeader
        eyebrow="Pengaturan"
        title="Konfigurasi Akses Modul"
        subtitle="Tentukan modul mana yang aktif untuk tiap role. Perubahan langsung berlaku pada menu & halaman."
      />

      <FormSection
        title="Matriks akses"
        description="Toggle aktif = role dapat membuka modul. Modul Tim & Akses terkunci untuk Super Admin agar sistem tidak terkunci."
      >
        <div className={styles.matrixWrap}>
          <table className={styles.matrix}>
            <thead>
              <tr>
                <th>Modul</th>
                {ROLE_KEYS.map((role) => (
                  <th key={role}>{ROLE_LABELS[role]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((module) => (
                <tr key={module.key}>
                  <td>
                    <div className={styles.moduleName}>
                      <strong>{module.label}</strong>
                      <span>{module.description}</span>
                    </div>
                  </td>
                  {ROLE_KEYS.map((role) => {
                    const locked = role === "SUPER_ADMIN" && module.key === "users";
                    return (
                      <td key={role} className={styles.toggleCell}>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={module.byRole[role]}
                          disabled={locked}
                          className={styles.switch}
                          aria-label={`${ROLE_LABELS[role]} — ${module.label}`}
                          onClick={() => toggle(role, module.key, !module.byRole[role])}
                        />
                        {locked && <div className={styles.lockedNote}>terkunci</div>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FormSection>

      {error && (
        <p role="alert" style={{ color: "var(--workspace-danger)", fontSize: 13, marginTop: 12 }}>
          {error}
        </p>
      )}
      {saved && (
        <div className={styles.toast} role="status">
          <Check size={16} /> Konfigurasi tersimpan
        </div>
      )}

      <p style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--workspace-text-muted)", fontSize: 12, marginTop: 16 }}>
        <ShieldCheck size={15} /> Scope data per user (broker hanya melihat listing miliknya) dikonfigurasi
        terpisah saat workspace broker dibuka.
      </p>
    </RecordPage>
  );
}
