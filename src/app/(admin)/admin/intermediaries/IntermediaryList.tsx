"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Handshake,
  Phone,
  Building,
  Mail,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Shield,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  Search,
  ExternalLink,
} from "lucide-react";
import { toast, Toaster } from "sonner";

export interface IntermediaryItem {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  trustLevel: "NEW" | "VERIFIED" | "TRUSTED" | "BLACKLISTED" | string;
  notes: string | null;
  createdAt: string | Date;
  listingIntermediaries: {
    id: string;
    listing: {
      id: string;
      status: string;
      property: {
        id: string;
        code: string;
        area: {
          name: string;
        };
      };
    };
  }[];
}

interface IntermediaryListProps {
  initialIntermediaries: IntermediaryItem[];
}

export function getTrustBadge(level: string) {
  switch (level) {
    case "TRUSTED":
      return {
        label: "Trusted",
        cls: "admin-badge-active",
        icon: ShieldCheck,
        desc: "Jalur langsung / rekanan tepercaya",
      };
    case "VERIFIED":
      return {
        label: "Verified",
        cls: "admin-badge-ready",
        icon: Shield,
        desc: "Identitas dan kontak terkonfirmasi",
      };
    case "BLACKLISTED":
      return {
        label: "Blacklisted",
        cls: "admin-badge-suspended",
        icon: ShieldX,
        desc: "Bermasalah / dilarang bertransaksi",
      };
    default:
      return {
        label: "Baru",
        cls: "admin-badge-draft",
        icon: ShieldAlert,
        desc: "Perantara baru, belum diverifikasi",
      };
  }
}

export default function IntermediaryList({ initialIntermediaries }: IntermediaryListProps) {
  const [intermediaries, setIntermediaries] = useState<IntermediaryItem[]>(initialIntermediaries);
  const [search, setSearch] = useState("");
  const [selectedTrustFilter, setSelectedTrustFilter] = useState<string>("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IntermediaryItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [trustLevel, setTrustLevel] = useState<string>("NEW");
  const [notes, setNotes] = useState("");

  const filteredItems = intermediaries.filter((item) => {
    const q = search.toLowerCase();
    const matchSearch =
      item.name.toLowerCase().includes(q) ||
      (item.phone && item.phone.toLowerCase().includes(q)) ||
      (item.company && item.company.toLowerCase().includes(q)) ||
      (item.notes && item.notes.toLowerCase().includes(q));

    const matchFilter =
      selectedTrustFilter === "ALL" ? true : item.trustLevel === selectedTrustFilter;

    return matchSearch && matchFilter;
  });

  const openCreateModal = () => {
    setEditingItem(null);
    setName("");
    setPhone("");
    setEmail("");
    setCompany("");
    setTrustLevel("NEW");
    setNotes("");
    setModalOpen(true);
  };

  const openEditModal = (item: IntermediaryItem) => {
    setEditingItem(item);
    setName(item.name);
    setPhone(item.phone || "");
    setEmail(item.email || "");
    setCompany(item.company || "");
    setTrustLevel(item.trustLevel || "NEW");
    setNotes(item.notes || "");
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nama perantara wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        company: company.trim() || null,
        trustLevel,
        notes: notes.trim() || null,
      };

      if (editingItem) {
        const res = await fetch(`/api/intermediaries/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal update perantara");

        setIntermediaries((prev) =>
          prev.map((it) =>
            it.id === editingItem.id ? { ...it, ...data.intermediary } : it
          )
        );
        toast.success("Data perantara berhasil diperbarui");
      } else {
        const res = await fetch("/api/intermediaries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal menambahkan perantara");

        const newItem: IntermediaryItem = {
          ...data.intermediary,
          listingIntermediaries: [],
        };
        setIntermediaries((prev) => [newItem, ...prev]);
        toast.success("Perantara baru berhasil ditambahkan");
      }

      setModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (item: IntermediaryItem) => {
    if (item.listingIntermediaries.length > 0) {
      toast.error(
        `Perantara "${item.name}" tidak dapat dihapus karena masih terhubung ke ${item.listingIntermediaries.length} listing.`
      );
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus perantara "${item.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/intermediaries/${item.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus perantara");

      setIntermediaries((prev) => prev.filter((it) => it.id !== item.id));
      toast.success(`Perantara "${item.name}" berhasil dihapus`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus perantara";
      toast.error(msg);
    }
  };

  return (
    <div>
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Perantara / Broker</h1>
          <p style={{ fontSize: 14, color: "var(--color-admin-text-secondary)", marginTop: 4 }}>
            Kelola agen eksternal, mediator properti, kantor agensi, dan evaluasi reputasi (Trust Level).
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="admin-btn admin-btn-primary"
          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <Plus size={18} /> Tambah Perantara
        </button>
      </div>

      {/* Filters & Search */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {/* Pills */}
        <div className="admin-pill-group">
          {[
            { key: "ALL", label: "Semua" },
            { key: "TRUSTED", label: "Trusted" },
            { key: "VERIFIED", label: "Verified" },
            { key: "NEW", label: "Baru" },
            { key: "BLACKLISTED", label: "Blacklisted" },
          ].map((pill) => (
            <button
              key={pill.key}
              onClick={() => setSelectedTrustFilter(pill.key)}
              className={`admin-pill admin-pill-sm ${selectedTrustFilter === pill.key ? "active" : ""}`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: "relative", minWidth: 280 }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--color-admin-text-muted)",
            }}
          />
          <input
            type="text"
            className="admin-input"
            placeholder="Cari perantara / agensi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
      </div>

      {/* Grid */}
      {filteredItems.length === 0 ? (
        <div className="admin-card">
          <div className="admin-empty">
            <Handshake size={48} className="admin-empty-icon" />
            <div className="admin-empty-title">
              {search || selectedTrustFilter !== "ALL"
                ? "Perantara tidak ditemukan"
                : "Belum ada perantara terdaftar"}
            </div>
            <div className="admin-empty-text">
              {search || selectedTrustFilter !== "ALL"
                ? "Coba sesuaikan kata kunci pencarian atau filter Trust Level."
                : "Klik tombol Tambah Perantara untuk mencatat mediator properti baru."}
            </div>
            {!search && selectedTrustFilter === "ALL" && (
              <button
                onClick={openCreateModal}
                className="admin-btn admin-btn-primary"
                style={{ marginTop: 16 }}
              >
                <Plus size={16} /> Tambah Perantara Pertama
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="admin-card-grid">
          {filteredItems.map((int) => {
            const trust = getTrustBadge(int.trustLevel);
            const TrustIcon = trust.icon;

            return (
              <div
                key={int.id}
                className="admin-card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  {/* Card top */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 10,
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                        {int.name}
                      </h3>
                      {int.company && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 13,
                            color: "var(--color-admin-text-secondary)",
                            marginTop: 4,
                          }}
                        >
                          <Building size={14} style={{ color: "var(--color-admin-text-muted)" }} />
                          <span>{int.company}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        className={`admin-badge ${trust.cls}`}
                        style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                      >
                        <TrustIcon size={12} /> {trust.label}
                      </span>
                    </div>
                  </div>

                  {/* Actions & Contact */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      fontSize: 13,
                      marginTop: 8,
                    }}
                  >
                    {int.phone && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          color: "var(--color-admin-text-secondary)",
                        }}
                      >
                        <Phone size={14} style={{ color: "var(--color-admin-accent)" }} />
                        <a
                          href={`tel:${int.phone}`}
                          style={{ color: "inherit", textDecoration: "none" }}
                        >
                          {int.phone}
                        </a>
                        <a
                          href={`https://wa.me/${int.phone.replace(/[^0-9]/g, "").replace(/^0/, "62")}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: 11,
                            color: "#16a34a",
                            fontWeight: 600,
                            textDecoration: "none",
                            marginLeft: 4,
                          }}
                        >
                          WA ↗
                        </a>
                      </div>
                    )}
                    {int.email && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          color: "var(--color-admin-text-secondary)",
                        }}
                      >
                        <Mail size={14} style={{ color: "var(--color-admin-accent)" }} />
                        <a
                          href={`mailto:${int.email}`}
                          style={{ color: "inherit", textDecoration: "none" }}
                        >
                          {int.email}
                        </a>
                      </div>
                    )}
                    {int.notes && (
                      <div
                        style={{
                          marginTop: 6,
                          padding: "8px 10px",
                          borderRadius: 6,
                          background: "var(--color-admin-bg)",
                          fontSize: 12,
                          color: "var(--color-admin-text-secondary)",
                          borderLeft: "3px solid var(--color-admin-accent)",
                        }}
                      >
                        {int.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer of card */}
                <div>
                  {int.listingIntermediaries.length > 0 && (
                    <div
                      style={{
                        marginTop: 14,
                        paddingTop: 12,
                        borderTop: "1px solid var(--color-admin-border)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "var(--color-admin-text-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          marginBottom: 8,
                        }}
                      >
                        Listing Terhubung ({int.listingIntermediaries.length})
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {int.listingIntermediaries.map((li) => (
                          <Link
                            key={li.id}
                            href={`/admin/properties/${li.listing.property.id}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 12,
                              padding: "4px 8px",
                              borderRadius: 4,
                              background: "var(--color-admin-bg)",
                              border: "1px solid var(--color-admin-border)",
                              color: "var(--color-admin-accent)",
                              textDecoration: "none",
                              fontWeight: 500,
                            }}
                          >
                            <span>{li.listing.property.code}</span>
                            <ExternalLink size={10} />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 8,
                      marginTop: 14,
                      paddingTop: 10,
                      borderTop: "1px solid var(--color-admin-border)",
                    }}
                  >
                    <button
                      onClick={() => openEditModal(int)}
                      className="admin-btn admin-btn-secondary"
                      style={{ padding: "6px 12px", fontSize: 13, gap: 6 }}
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(int)}
                      className="admin-btn admin-btn-secondary"
                      style={{
                        padding: "6px 10px",
                        fontSize: 13,
                        color:
                          int.listingIntermediaries.length > 0
                            ? "var(--color-admin-text-muted)"
                            : "#ef4444",
                      }}
                      title={
                        int.listingIntermediaries.length > 0
                          ? "Tidak bisa dihapus (terhubung listing)"
                          : "Hapus Perantara"
                      }
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add / Edit */}
      {modalOpen && (
        <div className="admin-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="admin-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{editingItem ? "Edit Data Perantara" : "Tambah Perantara Baru"}</h2>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <div className="admin-modal-body">
                <div>
                  <label className="admin-label">
                    Nama Perantara / Kontak <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="Contoh: Pak Anton / Bu Rina ERA"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="admin-label">Nomor WhatsApp / HP</label>
                    <input
                      type="text"
                      className="admin-input"
                      placeholder="0812xxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="admin-label">Perusahaan / Kantor Agensi</label>
                    <input
                      type="text"
                      className="admin-input"
                      placeholder="ERA, Ray White, Independent..."
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="admin-label">Email</label>
                  <input
                    type="email"
                    className="admin-input"
                    placeholder="broker@agensi.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {/* Trust Level Selector */}
                <div>
                  <label className="admin-label">Tingkat Kepercayaan (Trust Level)</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
                    {[
                      {
                        key: "NEW",
                        label: "Baru",
                        desc: "Belum diverifikasi",
                        color: "var(--color-admin-text-secondary)",
                      },
                      {
                        key: "VERIFIED",
                        label: "Verified",
                        desc: "Kontak & identitas teruji",
                        color: "#3b82f6",
                      },
                      {
                        key: "TRUSTED",
                        label: "Trusted",
                        desc: "Jalur A1 / rekanan solid",
                        color: "#10b981",
                      },
                      {
                        key: "BLACKLISTED",
                        label: "Blacklisted",
                        desc: "Bermasalah / bypass",
                        color: "#ef4444",
                      },
                    ].map((level) => (
                      <label
                        key={level.key}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                          padding: "10px 12px",
                          borderRadius: 8,
                          border:
                            trustLevel === level.key
                              ? `2px solid ${level.color}`
                              : "1px solid var(--color-admin-border)",
                          background:
                            trustLevel === level.key
                              ? "var(--color-admin-bg)"
                              : "transparent",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="radio"
                          name="trustLevel"
                          value={level.key}
                          checked={trustLevel === level.key}
                          onChange={() => setTrustLevel(level.key)}
                          style={{ marginTop: 2 }}
                        />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: level.color }}>
                            {level.label}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--color-admin-text-muted)" }}>
                            {level.desc}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="admin-label">Catatan Reputasi & Track Record</label>
                  <textarea
                    className="admin-input"
                    rows={3}
                    placeholder="Catatan mengenai perantara ini, riwayat komisi, atau kedekatan dengan owner..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={isSubmitting}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                >
                  <Save size={16} />
                  {isSubmitting ? "Menyimpan..." : editingItem ? "Simpan Perubahan" : "Tambah Perantara"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
