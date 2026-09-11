"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, Phone, Mail, FileText, MapPin, Plus, Edit2, Trash2, X, Save, Search, Home } from "lucide-react";
import { toast, Toaster } from "sonner";

export interface OwnerItem {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  idNumber: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string | Date;
  propertyOwners: {
    id: string;
    isPrimary: boolean;
    property: {
      id: string;
      code: string;
      type: string;
      area: {
        name: string;
      };
    };
  }[];
}

interface OwnerListProps {
  initialOwners: OwnerItem[];
}

export default function OwnerList({ initialOwners }: OwnerListProps) {
  const [owners, setOwners] = useState<OwnerItem[]>(initialOwners);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<OwnerItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const filteredOwners = owners.filter((o) => {
    const q = search.toLowerCase();
    return (
      o.name.toLowerCase().includes(q) ||
      (o.phone && o.phone.toLowerCase().includes(q)) ||
      (o.email && o.email.toLowerCase().includes(q)) ||
      (o.notes && o.notes.toLowerCase().includes(q))
    );
  });

  const openCreateModal = () => {
    setEditingOwner(null);
    setName("");
    setPhone("");
    setEmail("");
    setIdNumber("");
    setAddress("");
    setNotes("");
    setModalOpen(true);
  };

  const openEditModal = (owner: OwnerItem) => {
    setEditingOwner(owner);
    setName(owner.name);
    setPhone(owner.phone || "");
    setEmail(owner.email || "");
    setIdNumber(owner.idNumber || "");
    setAddress(owner.address || "");
    setNotes(owner.notes || "");
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nama owner wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        idNumber: idNumber.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      };

      if (editingOwner) {
        const res = await fetch(`/api/owners/${editingOwner.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal update owner");

        setOwners((prev) =>
          prev.map((item) =>
            item.id === editingOwner.id
              ? { ...item, ...data.owner }
              : item
          )
        );
        toast.success("Data owner berhasil diperbarui");
      } else {
        const res = await fetch("/api/owners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal membuat owner");

        const newOwner: OwnerItem = {
          ...data.owner,
          propertyOwners: [],
        };
        setOwners((prev) => [newOwner, ...prev]);
        toast.success("Owner baru berhasil ditambahkan");
      }

      setModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (owner: OwnerItem) => {
    if (owner.propertyOwners.length > 0) {
      toast.error(
        `Owner "${owner.name}" tidak dapat dihapus karena terhubung dengan ${owner.propertyOwners.length} properti.`
      );
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus owner "${owner.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/owners/${owner.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus owner");

      setOwners((prev) => prev.filter((item) => item.id !== owner.id));
      toast.success(`Owner "${owner.name}" berhasil dihapus`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus owner";
      toast.error(msg);
    }
  };

  return (
    <div>
      <Toaster position="top-right" richColors />

      {/* Header with Title and Add Button */}
      <div className="admin-page-header">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Owner Properti</h1>
          <p style={{ fontSize: 14, color: "var(--color-admin-text-secondary)", marginTop: 4 }}>
            Kelola data pemilik properti, nomor kontak, dokumen kepemilikan, dan catatan internal.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="admin-btn admin-btn-primary"
          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <Plus size={18} /> Tambah Owner
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        <Search
          size={16}
          style={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--color-admin-text-muted)",
          }}
        />
        <input
          type="text"
          className="admin-input"
          placeholder="Cari owner berdasarkan nama, telepon, email, atau catatan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: 40, maxWidth: 460 }}
        />
      </div>

      {/* Grid or Empty */}
      {filteredOwners.length === 0 ? (
        <div className="admin-card">
          <div className="admin-empty">
            <Users size={48} className="admin-empty-icon" />
            <div className="admin-empty-title">
              {search ? "Owner tidak ditemukan" : "Belum ada owner terdaftar"}
            </div>
            <div className="admin-empty-text">
              {search
                ? `Tidak ada owner yang cocok dengan pencarian "${search}".`
                : "Klik tombol Tambah Owner untuk mendaftarkan pemilik properti baru."}
            </div>
            {!search && (
              <button
                onClick={openCreateModal}
                className="admin-btn admin-btn-primary"
                style={{ marginTop: 16 }}
              >
                <Plus size={16} /> Tambah Owner Pertama
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="admin-card-grid">
          {filteredOwners.map((owner) => (
            <div
              key={owner.id}
              className="admin-card"
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                {/* Header card with name and action buttons */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                      {owner.name}
                    </h3>
                    {owner.idNumber && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--color-admin-text-muted)",
                          marginTop: 2,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <FileText size={12} /> KTP: {owner.idNumber}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => openEditModal(owner)}
                      className="admin-btn admin-btn-secondary"
                      title="Edit Owner"
                      style={{ padding: "6px 8px" }}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(owner)}
                      className="admin-btn admin-btn-secondary"
                      title={
                        owner.propertyOwners.length > 0
                          ? "Tidak bisa dihapus (terikat properti)"
                          : "Hapus Owner"
                      }
                      style={{
                        padding: "6px 8px",
                        color:
                          owner.propertyOwners.length > 0
                            ? "var(--color-admin-text-muted)"
                            : "#ef4444",
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Contact info */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                  {owner.phone && (
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
                        href={`tel:${owner.phone}`}
                        style={{
                          color: "inherit",
                          textDecoration: "none",
                        }}
                      >
                        {owner.phone}
                      </a>
                    </div>
                  )}
                  {owner.email && (
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
                        href={`mailto:${owner.email}`}
                        style={{
                          color: "inherit",
                          textDecoration: "none",
                        }}
                      >
                        {owner.email}
                      </a>
                    </div>
                  )}
                  {owner.address && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        color: "var(--color-admin-text-secondary)",
                      }}
                    >
                      <MapPin
                        size={14}
                        style={{
                          color: "var(--color-admin-text-muted)",
                          marginTop: 2,
                          flexShrink: 0,
                        }}
                      />
                      <span>{owner.address}</span>
                    </div>
                  )}
                  {owner.notes && (
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
                      {owner.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Associated Properties */}
              {owner.propertyOwners.length > 0 && (
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
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Home size={12} /> Properti Terdaftar ({owner.propertyOwners.length})
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {owner.propertyOwners.map((po) => (
                      <Link
                        key={po.id}
                        href={`/admin/properties/${po.property.id}`}
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
                        <span>{po.property.code}</span>
                        <span style={{ color: "var(--color-admin-text-muted)" }}>•</span>
                        <span style={{ color: "var(--color-admin-text-secondary)" }}>
                          {po.property.area.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Add / Edit */}
      {modalOpen && (
        <div className="admin-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="admin-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{editingOwner ? "Edit Data Owner" : "Tambah Owner Baru"}</h2>
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
                    Nama Lengkap Owner <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="Contoh: Bpk. H. Rahmat Hidayat"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="admin-label">Nomor Telepon / WA</label>
                    <input
                      type="text"
                      className="admin-input"
                      placeholder="0812xxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="admin-label">Email</label>
                    <input
                      type="email"
                      className="admin-input"
                      placeholder="owner@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="admin-label">Nomor KTP / NIK</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="3174xxxx (Opsional)"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                  />
                </div>

                <div>
                  <label className="admin-label">Alamat Domisili</label>
                  <textarea
                    className="admin-input"
                    rows={2}
                    placeholder="Alamat tempat tinggal owner..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                <div>
                  <label className="admin-label">Catatan Internal</label>
                  <textarea
                    className="admin-input"
                    rows={3}
                    placeholder="Preferensi komunikasi, waktu respon, atau info penting lainnya..."
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
                  {isSubmitting ? "Menyimpan..." : editingOwner ? "Simpan Perubahan" : "Tambah Owner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
