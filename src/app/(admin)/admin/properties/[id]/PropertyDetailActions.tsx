"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Edit2, Trash2, X, AlertTriangle } from "lucide-react";
import { toast, Toaster } from "sonner";

interface PropertyDetailActionsProps {
  propertyId: string;
  propertyCode: string;
}

export default function PropertyDetailActions({
  propertyId,
  propertyCode,
}: PropertyDetailActionsProps) {
  const router = useRouter();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmCode, setConfirmCode] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmCode.trim() !== propertyCode) {
      toast.error(`Ketik kode properti "${propertyCode}" dengan tepat untuk konfirmasi.`);
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus properti");

      toast.success(`Properti ${propertyCode} berhasil dihapus`);
      setTimeout(() => {
        router.push("/admin/properties");
        router.refresh();
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus properti";
      toast.error(msg);
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="admin-detail-action-subgroup">
        <Link
          href={`/admin/properties/${propertyId}/edit`}
          className="admin-btn admin-btn-secondary"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
        >
          <Edit2 size={14} /> Edit Properti
        </Link>
        <button
          type="button"
          onClick={() => {
            setConfirmCode("");
            setDeleteModalOpen(true);
          }}
          className="admin-btn admin-btn-secondary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "#ef4444",
          }}
        >
          <Trash2 size={14} /> Hapus
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="admin-modal-overlay" onClick={() => setDeleteModalOpen(false)}>
          <div className="admin-modal-container" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ef4444" }}>
                <AlertTriangle size={20} />
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "var(--color-admin-text)" }}>
                  Hapus Properti {propertyCode}?
                </h3>
              </div>
              <button
                className="admin-modal-close-btn"
                onClick={() => setDeleteModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleDelete} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <div className="admin-modal-body">
                <p style={{ fontSize: 13, color: "var(--color-admin-text-secondary)", lineHeight: 1.5, margin: 0 }}>
                  Tindakan ini permanen. Semua data terkait properti ini (termasuk riwayat listing, foto, riwayat harga, dokumen, dan lead) akan ikut dihapus.
                </p>

                <div>
                  <label className="admin-label">
                    Ketik <strong>{propertyCode}</strong> untuk konfirmasi:
                  </label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder={propertyCode}
                    value={confirmCode}
                    onChange={(e) => setConfirmCode(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setDeleteModalOpen(false)}
                  disabled={isDeleting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={isDeleting || confirmCode.trim() !== propertyCode}
                  style={{
                    backgroundColor: "#ef4444",
                    borderColor: "#ef4444",
                    color: "#fff",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Trash2 size={14} />
                  {isDeleting ? "Menghapus..." : "Ya, Hapus Properti"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
