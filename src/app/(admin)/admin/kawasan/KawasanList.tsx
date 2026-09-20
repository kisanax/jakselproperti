"use client";

import { useState } from "react";
import {
  MapPin,
  Star,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  X,
  Save,
  ImageIcon,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { AreaPicker } from "@/components/admin-ui";

interface KawasanItem {
  id: string;
  name: string;
  slug: string;
  areaId: number;
  tagline: string | null;
  bannerImage: string | null;
  isFeatured: boolean;
  sortOrder: number;
  isActive: boolean;
  area: {
    id: number;
    name: string;
    slug: string;
  };
  _count: {
    properties: number;
  };
}

interface KawasanListProps {
  initialKawasan: KawasanItem[];
}

export default function KawasanList({ initialKawasan }: KawasanListProps) {
  const [kawasanList, setKawasanList] = useState<KawasanItem[]>(initialKawasan);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingKawasan, setEditingKawasan] = useState<KawasanItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [areaId, setAreaId] = useState("");
  const [tagline, setTagline] = useState("");
  const [bannerImage, setBannerImage] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);

  const openAddModal = () => {
    setEditingKawasan(null);
    setName("");
    setSlug("");
    setAreaId("");
    setTagline("");
    setBannerImage("");
    setIsFeatured(false);
    setSortOrder(kawasanList.length + 1);
    setModalOpen(true);
  };

  const openEditModal = (k: KawasanItem) => {
    setEditingKawasan(k);
    setName(k.name);
    setSlug(k.slug);
    setAreaId(String(k.areaId));
    setTagline(k.tagline || "");
    setBannerImage(k.bannerImage || "");
    setIsFeatured(k.isFeatured);
    setSortOrder(k.sortOrder);
    setModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingKawasan) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
      );
    }
  };

  const handleToggleFeatured = async (k: KawasanItem) => {
    const nextVal = !k.isFeatured;
    try {
      const res = await fetch(`/api/kawasan/${k.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: nextVal }),
      });

      if (!res.ok) throw new Error("Gagal mengubah status banner");

      setKawasanList((prev) =>
        prev.map((item) => (item.id === k.id ? { ...item, isFeatured: nextVal } : item))
      );

      toast.success(
        nextVal
          ? `"${k.name}" sekarang ditampilkan di banner homepage`
          : `"${k.name}" dicopot dari banner homepage`
      );
    } catch {
      toast.error("Terjadi kesalahan saat mengubah status banner");
    }
  };

  const handleDelete = async (k: KawasanItem) => {
    if (k._count.properties > 0) {
      toast.error(`Kawasan ini memiliki ${k._count.properties} properti aktif. Hapus relasi terlebih dahulu.`);
      return;
    }

    if (!confirm(`Hapus kawasan "${k.name}"?`)) return;

    try {
      const res = await fetch(`/api/kawasan/${k.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus kawasan");

      setKawasanList((prev) => prev.filter((item) => item.id !== k.id));
      toast.success(`Kawasan "${k.name}" berhasil dihapus`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus kawasan");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !areaId) {
      toast.error("Nama dan Kecamatan wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingKawasan) {
        // Edit existing
        const res = await fetch(`/api/kawasan/${editingKawasan.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            slug,
            areaId,
            tagline,
            bannerImage,
            isFeatured,
            sortOrder,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal update kawasan");

        setKawasanList((prev) =>
          prev.map((item) => (item.id === editingKawasan.id ? { ...item, ...data.kawasan } : item))
        );
        toast.success(`Kawasan "${name}" berhasil diperbarui`);
      } else {
        // Create new
        const res = await fetch("/api/kawasan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            slug,
            areaId,
            tagline,
            bannerImage,
            isFeatured,
            sortOrder,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal membuat kawasan");

        setKawasanList((prev) => [data.kawasan, ...prev]);
        toast.success(`Kawasan "${name}" berhasil dibuat`);
      }
      setModalOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const featuredCount = kawasanList.filter((k) => k.isFeatured).length;

  return (
    <div>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "var(--color-admin-surface)",
            border: "1px solid var(--color-admin-border)",
            color: "var(--color-admin-text)",
          },
        }}
      />

      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Kawasan Populer / Branded</h1>
          <p style={{ fontSize: 14, color: "var(--color-admin-text-secondary)", marginTop: 4 }}>
            Kelola nama kawasan populer untuk SEO & banner &quot;Kawasan Pilihan&quot; di homepage
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="admin-btn admin-btn-primary"
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <Plus size={18} /> Tambah Kawasan
        </button>
      </div>

      {/* Banner summary info */}
      <div
        className="admin-card"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          padding: "14px 20px",
          background: "linear-gradient(90deg, var(--color-admin-surface), var(--color-admin-surface-hover))",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              backgroundColor: "var(--color-admin-accent-light)",
              color: "var(--color-admin-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sparkles size={20} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {featuredCount} Kawasan Aktif di Banner Homepage
            </div>
            <div style={{ fontSize: 12, color: "var(--color-admin-text-secondary)" }}>
              Klik ikon bintang (★) pada kartu kawasan untuk toggle tampil di homepage
            </div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: "var(--color-admin-text-muted)" }}>
          Total: {kawasanList.length} Kawasan
        </div>
      </div>

      {/* Grid Kawasan */}
      <div className="admin-card-grid">
        {kawasanList.map((k) => (
          <div
            key={k.id}
            className="admin-card"
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              border: k.isFeatured
                ? "1px solid var(--color-admin-accent)"
                : "1px solid var(--color-admin-border)",
            }}
          >
            <div>
              {/* Header card */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                    {k.name}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      color: "var(--color-admin-text-secondary)",
                      marginTop: 2,
                    }}
                  >
                    <MapPin size={13} style={{ color: "var(--color-admin-accent)" }} />
                    <span>Kec. {k.area.name}</span>
                    <span>•</span>
                    <span style={{ color: "var(--color-admin-text-muted)" }}>/{k.slug}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleFeatured(k)}
                  title={k.isFeatured ? "Hapus dari banner homepage" : "Tampilkan di banner homepage"}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 4,
                    color: k.isFeatured ? "var(--color-admin-accent)" : "var(--color-admin-text-muted)",
                    display: "flex",
                    alignItems: "center",
                    transition: "color 0.2s",
                  }}
                >
                  <Star size={20} fill={k.isFeatured ? "currentColor" : "none"} />
                </button>
              </div>

              {/* Tagline */}
              {k.tagline ? (
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--color-admin-text)",
                    backgroundColor: "var(--color-admin-bg)",
                    padding: "8px 12px",
                    borderRadius: 6,
                    marginTop: 8,
                    marginBottom: 10,
                    fontStyle: "italic",
                  }}
                >
                  &ldquo;{k.tagline}&rdquo;
                </div>
              ) : (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--color-admin-text-muted)",
                    marginTop: 8,
                    marginBottom: 10,
                  }}
                >
                  (Belum ada tagline promo)
                </div>
              )}

              {/* Banner image preview */}
              {k.bannerImage && (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--color-admin-text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 10,
                  }}
                >
                  <ImageIcon size={14} />
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: 220,
                    }}
                  >
                    {k.bannerImage}
                  </span>
                </div>
              )}
            </div>

            {/* Footer card */}
            <div
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: "1px solid var(--color-admin-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ fontSize: 13, color: "var(--color-admin-text-secondary)" }}>
                <strong style={{ color: "var(--color-admin-text)" }}>{k._count.properties}</strong> properti
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => openEditModal(k)}
                  className="admin-btn admin-btn-ghost"
                  style={{ padding: "6px 10px", fontSize: 12 }}
                  title="Edit kawasan"
                >
                  <Edit2 size={14} /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(k)}
                  className="admin-btn admin-btn-ghost"
                  style={{
                    padding: "6px 10px",
                    fontSize: 12,
                    color: "var(--color-status-suspended)",
                  }}
                  title="Hapus kawasan"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Add/Edit */}
      {modalOpen && (
        <div className="admin-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="admin-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{editingKawasan ? "Edit Kawasan" : "Tambah Kawasan Populer"}</h2>
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
                {/* Nama Kawasan */}
                <div className="admin-input-group">
                  <label className="admin-label">Nama Kawasan *</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="e.g. Kemang, Senopati, Pondok Indah"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                  />
                </div>

                <div className="admin-input-group">
                  <label className="admin-label">Slug URL *</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="kemang"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                  />
                </div>

                <div className="admin-input-group">
                  <AreaPicker
                    value={areaId}
                    maxLevel={3}
                    required
                    idPrefix="kawasan-area"
                    onChange={({ kecamatanId }) => setAreaId(kecamatanId ? String(kecamatanId) : "")}
                  />
                </div>

                {/* Tagline Promo Homepage */}
                <div className="admin-input-group">
                  <label className="admin-label">Tagline Promosi (Banner Homepage)</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="e.g. Pusat hunian ekspat & gaya hidup dinamis di Jakarta Selatan"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                  />
                  <div className="admin-input-hint" style={{ fontSize: 11 }}>
                    Ditampilkan di bawah nama kawasan pada banner homepage & meta description SEO
                  </div>
                </div>

                {/* Banner Image URL/Path */}
                <div className="admin-input-group">
                  <label className="admin-label">Path Foto Banner</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="/images/kawasan/kemang.webp"
                    value={bannerImage}
                    onChange={(e) => setBannerImage(e.target.value)}
                  />
                </div>

                {/* Toggles */}
                <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      fontSize: 14,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                      style={{ width: 18, height: 18 }}
                    />
                    <span>Tampilkan di banner Homepage</span>
                  </label>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label className="admin-label" style={{ marginBottom: 0, fontSize: 13 }}>
                      Urutan:
                    </label>
                    <input
                      type="number"
                      className="admin-input"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                      style={{ width: 70, padding: "6px 10px" }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="admin-modal-footer">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="admin-btn admin-btn-ghost"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="admin-btn admin-btn-primary"
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Save size={16} />
                  {isSubmitting ? "Menyimpan..." : "Simpan Kawasan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
