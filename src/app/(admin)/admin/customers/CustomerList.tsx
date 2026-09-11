"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, Phone, Mail, Clock, Search, MessageSquare, Plus, Edit2, Trash2, X, Save, AlertCircle } from "lucide-react";
import { toast, Toaster } from "sonner";

export interface CustomerLeadItem {
  id: string;
  currentStage: string;
  listing: {
    property: {
      code: string;
      type: string;
      area: { name: string };
      kawasan: { name: string } | null;
    };
  };
}

export interface CustomerItem {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  leads: CustomerLeadItem[];
}

interface CustomerListProps {
  initialCustomers: CustomerItem[];
}

function getStageBadge(stage: string) {
  switch (stage) {
    case "NEW":
      return { label: "Baru", cls: "admin-badge-pending" };
    case "QUALIFIED":
      return { label: "Kualifikasi", cls: "admin-badge-ready" };
    case "VIEWING":
      return { label: "Survei", cls: "admin-badge-active" };
    case "NEGOTIATING":
      return { label: "Negosiasi", cls: "admin-badge-negotiation" };
    case "WON":
      return { label: "Closing Menang", cls: "admin-badge-sold" };
    case "LOST":
      return { label: "Closing Hilang", cls: "admin-badge-suspended" };
    default:
      return { label: stage, cls: "admin-badge-draft" };
  }
}

function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export default function CustomerList({ initialCustomers }: CustomerListProps) {
  const [customers, setCustomers] = useState<CustomerItem[]>(initialCustomers);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  const filteredCustomers = customers.filter((c) => {
    const q = search.toLowerCase();
    const matchesGeneral =
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.notes && c.notes.toLowerCase().includes(q));

    const matchesLeads = c.leads?.some(
      (l) =>
        l.listing.property.code.toLowerCase().includes(q) ||
        l.listing.property.area.name.toLowerCase().includes(q) ||
        (l.listing.property.kawasan?.name &&
          l.listing.property.kawasan.name.toLowerCase().includes(q))
    );

    return matchesGeneral || matchesLeads;
  });

  const openCreateModal = () => {
    setEditingCustomer(null);
    setName("");
    setPhone("");
    setEmail("");
    setNotes("");
    setModalOpen(true);
  };

  const openEditModal = (c: CustomerItem) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone);
    setEmail(c.email || "");
    setNotes(c.notes || "");
    setModalOpen(true);
  };

  const openDeleteModal = (c: CustomerItem) => {
    setDeletingCustomer(c);
    setDeleteModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nama customer wajib diisi");
      return;
    }
    if (!phone.trim()) {
      toast.error("Nomor telepon/WA wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        notes: notes.trim() || null,
      };

      if (editingCustomer) {
        const res = await fetch(`/api/customers/${editingCustomer.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal update customer");

        setCustomers((prev) =>
          prev.map((item) => (item.id === editingCustomer.id ? data.customer : item))
        );
        toast.success("Data customer berhasil diperbarui");
      } else {
        const res = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal menambah customer");

        setCustomers((prev) => [data.customer, ...prev]);
        toast.success("Customer baru berhasil ditambahkan");
      }

      setModalOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCustomer) return;

    if (deletingCustomer.leads && deletingCustomer.leads.length > 0) {
      toast.error(
        `Customer tidak dapat dihapus karena memiliki ${deletingCustomer.leads.length} tiket inquiry (leads).`
      );
      setDeleteModalOpen(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/customers/${deletingCustomer.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus customer");

      setCustomers((prev) => prev.filter((item) => item.id !== deletingCustomer.id));
      toast.success("Customer berhasil dihapus");
      setDeleteModalOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan saat menghapus");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <Toaster position="top-right" richColors />

      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Database Customer (Calon Pembeli)</h1>
          <p style={{ fontSize: 14, color: "var(--color-admin-text-secondary)", marginTop: 4 }}>
            {customers.length} calon pembeli unik terdata lintas seluruh listing & CRM leads
          </p>
        </div>
        <button onClick={openCreateModal} className="admin-btn admin-btn-primary">
          <Plus size={16} /> Tambah Customer
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="admin-card" style={{ padding: "12px 18px", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 420 }}>
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, no. HP, email, atau kode properti..."
              className="admin-input"
              style={{ paddingLeft: 36 }}
            />
          </div>
          {search && (
            <button onClick={() => setSearch("")} className="admin-btn admin-btn-ghost">
              Reset
            </button>
          )}
          <span style={{ fontSize: 13, color: "var(--color-admin-text-muted)", marginLeft: "auto" }}>
            Menampilkan {filteredCustomers.length} dari {customers.length} customer
          </span>
        </div>
      </div>

      {/* Grid Customers */}
      {filteredCustomers.length === 0 ? (
        <div className="admin-card">
          <div className="admin-empty">
            <Users size={48} className="admin-empty-icon" />
            <div className="admin-empty-title">
              {search ? "Customer tidak ditemukan" : "Belum ada customer"}
            </div>
            <div className="admin-empty-text">
              {search
                ? `Tidak ada hasil pencarian untuk "${search}". Coba kata kunci lain.`
                : "Customer tercatat otomatis saat lead masuk, atau bisa ditambahkan manual."}
            </div>
            {!search && (
              <button
                onClick={openCreateModal}
                className="admin-btn admin-btn-primary"
                style={{ marginTop: 14 }}
              >
                <Plus size={16} /> Tambah Customer Pertama
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="admin-card-grid">
          {filteredCustomers.map((c) => {
            const cleanPhone = c.phone.replace(/\D/g, "").replace(/^0/, "62");

            return (
              <div
                key={c.id}
                className="admin-card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "all 0.2s ease",
                }}
              >
                <div>
                  {/* Card Header with Name & Actions */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 700 }}>{c.name}</div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--color-admin-text-muted)",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          marginTop: 2,
                        }}
                      >
                        <Clock size={12} /> Sejak {formatDate(c.createdAt)}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <a
                        href={`https://wa.me/${cleanPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="admin-btn admin-btn-ghost"
                        style={{
                          padding: "4px 8px",
                          fontSize: 12,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          color: "var(--color-admin-accent)",
                        }}
                        title="Chat WhatsApp"
                      >
                        <MessageSquare size={13} />
                        WA
                      </a>
                      <button
                        onClick={() => openEditModal(c)}
                        className="admin-btn admin-btn-ghost"
                        style={{ padding: "4px 8px" }}
                        title="Edit Customer"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => openDeleteModal(c)}
                        className="admin-btn admin-btn-ghost"
                        style={{
                          padding: "4px 8px",
                          color:
                            c.leads && c.leads.length > 0
                              ? "var(--color-admin-text-muted)"
                              : "var(--color-admin-danger)",
                        }}
                        title={
                          c.leads && c.leads.length > 0
                            ? "Customer memiliki inquiry terkait"
                            : "Hapus Customer"
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Contact info */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 10 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 13,
                        color: "var(--color-admin-text-secondary)",
                      }}
                    >
                      <Phone size={14} style={{ color: "var(--color-admin-text-muted)" }} />
                      <span style={{ fontWeight: 500 }}>{c.phone}</span>
                    </div>
                    {c.email && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 13,
                          color: "var(--color-admin-text-secondary)",
                        }}
                      >
                        <Mail size={14} style={{ color: "var(--color-admin-text-muted)" }} />
                        <span>{c.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Notes / Preferences */}
                  {c.notes && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--color-admin-text-secondary)",
                        backgroundColor: "var(--color-admin-bg)",
                        padding: "8px 12px",
                        borderRadius: 8,
                        marginTop: 12,
                        borderLeft: "3px solid var(--color-admin-accent)",
                        lineHeight: 1.5,
                      }}
                    >
                      {c.notes}
                    </div>
                  )}
                </div>

                {/* Inquiries / Leads Timeline */}
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
                      marginBottom: 8,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>Listing Yang Ditanyakan</span>
                    <span>{c.leads?.length || 0} Inquiry</span>
                  </div>

                  {!c.leads || c.leads.length === 0 ? (
                    <div style={{ fontSize: 12, color: "var(--color-admin-text-muted)", fontStyle: "italic" }}>
                      Belum ada tiket inquiry aktif
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {c.leads.map((lead) => {
                        const stageBadge = getStageBadge(lead.currentStage);

                        return (
                          <div
                            key={lead.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              fontSize: 12,
                              padding: "6px 8px",
                              backgroundColor: "var(--color-admin-bg)",
                              borderRadius: 6,
                            }}
                          >
                            <Link
                              href={`/admin/properties/${lead.listing.property.code}`}
                              style={{
                                color: "var(--color-admin-accent)",
                                textDecoration: "none",
                                fontWeight: 600,
                              }}
                            >
                              {lead.listing.property.code} —{" "}
                              {lead.listing.property.kawasan?.name || lead.listing.property.area.name}
                            </Link>

                            <span className={`admin-badge ${stageBadge.cls}`} style={{ fontSize: 10 }}>
                              {stageBadge.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL TAMBAH / EDIT CUSTOMER */}
      {modalOpen && (
        <div className="admin-modal-overlay" onClick={() => setModalOpen(false)}>
          <div
            className="admin-modal-container"
            style={{ maxWidth: 520 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="admin-modal-header">
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>
                {editingCustomer ? "Edit Data Customer" : "Tambah Customer Baru"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="admin-btn admin-btn-ghost"
                style={{ padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} id="customer-form">
              <div className="admin-modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label className="admin-label">
                    Nama Lengkap Customer <span style={{ color: "var(--color-admin-danger)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Hendra Wijaya"
                    className="admin-input"
                  />
                </div>

                <div>
                  <label className="admin-label">
                    Nomor Telepon / WhatsApp <span style={{ color: "var(--color-admin-danger)" }}>*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 08123456789"
                    className="admin-input"
                  />
                  <span style={{ fontSize: 11, color: "var(--color-admin-text-muted)", marginTop: 4, display: "block" }}>
                    Nomor HP digunakan sebagai ID unik CRM (kunci dedupe calon pembeli).
                  </span>
                </div>

                <div>
                  <label className="admin-label">Email (Opsional)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hendra@example.com"
                    className="admin-input"
                  />
                </div>

                <div>
                  <label className="admin-label">Catatan Preferensi / Kebutuhan</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: Cari rumah 2 lantai di Kebayoran Baru, budget max 15 Milyar..."
                    className="admin-input"
                    style={{ resize: "vertical" }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="admin-modal-footer">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="admin-btn admin-btn-secondary"
                  disabled={isSubmitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  form="customer-form"
                  className="admin-btn admin-btn-primary"
                  disabled={isSubmitting}
                >
                  <Save size={16} />
                  {isSubmitting ? "Menyimpan..." : editingCustomer ? "Simpan Perubahan" : "Simpan Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS */}
      {deleteModalOpen && deletingCustomer && (
        <div className="admin-modal-overlay" onClick={() => setDeleteModalOpen(false)}>
          <div
            className="admin-modal-container"
            style={{ maxWidth: 440 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header">
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-admin-danger)" }}>
                Hapus Data Customer
              </h2>
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="admin-btn admin-btn-ghost"
                style={{ padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="admin-modal-body">
              <p style={{ fontSize: 14, color: "var(--color-admin-text-secondary)", lineHeight: 1.5 }}>
                Apakah Anda yakin ingin menghapus data customer{" "}
                <strong>{deletingCustomer.name}</strong> ({deletingCustomer.phone})?
              </p>

              {deletingCustomer.leads && deletingCustomer.leads.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    marginTop: 14,
                    padding: 12,
                    backgroundColor: "rgba(239, 68, 68, 0.08)",
                    borderRadius: 8,
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                  }}
                >
                  <AlertCircle size={18} style={{ color: "var(--color-admin-danger)", flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: 13, color: "var(--color-admin-danger)" }}>
                    Customer ini terhubung ke <strong>{deletingCustomer.leads.length} tiket inquiry (leads)</strong>.
                    Customer tidak dapat dihapus sebelum seluruh inquiry terkait diselesaikan atau dihapus dari CRM.
                  </div>
                </div>
              )}
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="admin-btn admin-btn-secondary"
                disabled={isSubmitting}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="admin-btn admin-btn-danger"
                disabled={isSubmitting || (deletingCustomer.leads && deletingCustomer.leads.length > 0)}
              >
                {isSubmitting ? "Menghapus..." : "Hapus Permanen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
