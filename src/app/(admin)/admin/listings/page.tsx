import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, ListChecks } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { getCurrentOperationalActor } from "@/lib/api-auth";
import { combineListingFilters } from "@/lib/services/property-listing-access";
import { notFound } from "next/navigation";

function getStatusBadgeClass(s: string) {
  const m: Record<string, string> = {
    DRAFT: "admin-badge-draft", PENDING_VERIFICATION: "admin-badge-pending",
    READY_TO_PUBLISH: "admin-badge-ready", ACTIVE: "admin-badge-active",
    IN_NEGOTIATION: "admin-badge-negotiation", SOLD: "admin-badge-sold",
    SUSPENDED: "admin-badge-suspended", WITHDRAWN: "admin-badge-withdrawn",
    EXPIRED: "admin-badge-expired", ARCHIVED: "admin-badge-archived",
  };
  return m[s] || "admin-badge-draft";
}
function getStatusLabel(s: string) {
  const m: Record<string, string> = {
    DRAFT: "Draft", PENDING_VERIFICATION: "Verifikasi", READY_TO_PUBLISH: "Siap Publish",
    ACTIVE: "Aktif", IN_NEGOTIATION: "Negosiasi", SOLD: "Terjual",
    SUSPENDED: "Ditunda", WITHDRAWN: "Ditarik", EXPIRED: "Kedaluwarsa", ARCHIVED: "Arsip",
  };
  return m[s] || s;
}
function formatRupiah(amount: number | bigint | { toNumber?: () => number }): string {
  let num: number;
  if (typeof amount === "bigint") num = Number(amount);
  else if (typeof amount === "object" && amount !== null && "toNumber" in amount) num = (amount as { toNumber: () => number }).toNumber();
  else num = amount as number;
  if (num >= 1e9) return `Rp ${(num / 1e9).toFixed(1).replace(/\.0$/, "")} M`;
  if (num >= 1e6) return `Rp ${(num / 1e6).toFixed(0)} Jt`;
  return `Rp ${num.toLocaleString("id-ID")}`;
}
function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));
}

export const dynamic = "force-dynamic";

export default async function ListingsPage({ searchParams }: { searchParams: Promise<{ status?: string; search?: string; page?: string }> }) {
  const operational = await getCurrentOperationalActor();
  if (!operational) notFound();
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const perPage = 20;
  const filters: Prisma.ListingWhereInput = {};
  if (params.status) filters.status = params.status as Prisma.EnumListingStatusFilter["equals"];
  if (params.search) {
    filters.OR = [
      { title: { contains: params.search } },
      { property: { code: { contains: params.search } } },
    ];
  }
  const where = combineListingFilters(operational.actor, filters);

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      include: { property: { include: { area: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.listing.count({ where }),
  ]);

  const statuses = ["", "DRAFT", "ACTIVE", "PENDING_VERIFICATION", "IN_NEGOTIATION", "SOLD", "SUSPENDED", "WITHDRAWN", "EXPIRED", "ARCHIVED"];

  return (
    <div className="animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Listing</h1>
          <p style={{ fontSize: 14, color: "var(--color-admin-text-secondary)", marginTop: 4 }}>{total} listing</p>
        </div>
        <Link href="/admin/properties/new" className="admin-btn admin-btn-primary"><Plus size={18} /> Buat Listing Baru</Link>
      </div>

      {/* Status Filter Pills */}
      <div className="admin-pill-group" style={{ marginBottom: 20 }}>
        {statuses.map((s) => (
          <Link key={s} href={`/admin/listings${s ? `?status=${s}` : ""}`} className={`admin-pill admin-pill-sm ${params.status === s || (!params.status && !s) ? "active" : ""}`}>
            {s ? getStatusLabel(s) : "Semua"}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="admin-table-wrapper admin-listing-table">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Judul</th>
              <th>Area</th>
              <th>Harga</th>
              <th>Status</th>
              <th>Dibuat</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {listings.length === 0 ? (
              <tr><td colSpan={7}><div className="admin-empty"><ListChecks size={32} className="admin-empty-icon" /><div className="admin-empty-title">Belum ada listing</div></div></td></tr>
            ) : (
              listings.map((listing) => (
                <tr key={listing.id}>
                  <td><Link href={`/admin/properties/${listing.property.id}`} style={{ color: "var(--color-admin-accent)", textDecoration: "none", fontWeight: 600 }}>{listing.property.code}</Link></td>
                  <td style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <Link href={`/admin/listings/${listing.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                      {listing.title || "—"}
                    </Link>
                  </td>
                  <td>{listing.property.area.name}</td>
                  <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{listing.priceOnRequest ? <span style={{ fontStyle: "italic", color: "var(--color-admin-text-muted)" }}>On request</span> : formatRupiah(listing.askingPrice)}</td>
                  <td><span className={`admin-badge ${getStatusBadgeClass(listing.status)}`}>{getStatusLabel(listing.status)}</span></td>
                  <td style={{ color: "var(--color-admin-text-muted)", whiteSpace: "nowrap" }}>{formatDate(listing.createdAt)}</td>
                  <td>
                    <Link
                      href={`/admin/listings/${listing.id}`}
                      className="admin-btn admin-btn-secondary"
                      style={{ padding: "4px 10px", fontSize: 12, textDecoration: "none", whiteSpace: "nowrap" }}
                    >
                      Kelola ↗
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards: informasi dan aksi utama langsung terlihat tanpa scroll horizontal */}
      <div className="admin-listing-mobile">
        {listings.length === 0 ? (
          <div className="admin-card admin-empty">
            <ListChecks size={32} className="admin-empty-icon" />
            <div className="admin-empty-title">Belum ada listing</div>
          </div>
        ) : (
          listings.map((listing) => (
            <article className="admin-listing-mobile-card" key={listing.id}>
              <div className="admin-listing-mobile-topline">
                <Link href={`/admin/properties/${listing.property.id}`} className="admin-listing-mobile-code">
                  {listing.property.code}
                </Link>
                <span className={`admin-badge ${getStatusBadgeClass(listing.status)}`}>
                  {getStatusLabel(listing.status)}
                </span>
              </div>
              <Link href={`/admin/listings/${listing.id}`} className="admin-listing-mobile-title">
                {listing.title || "Listing tanpa judul"}
              </Link>
              <div className="admin-listing-mobile-meta">
                <span>{listing.property.area.name}</span>
                <span>{formatDate(listing.createdAt)}</span>
              </div>
              <div className="admin-listing-mobile-footer">
                <strong>{listing.priceOnRequest ? "Harga on request" : formatRupiah(listing.askingPrice)}</strong>
                <Link href={`/admin/listings/${listing.id}`} className="admin-btn admin-btn-secondary admin-btn-sm">
                  Kelola <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
