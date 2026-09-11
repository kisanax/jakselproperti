import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Search, Building2, MapPin, Ruler, BedDouble, Bath, FileSpreadsheet, Sparkles } from "lucide-react";

// =============================================================================
// Data Fetching
// =============================================================================

async function getProperties(searchParams: Promise<{ page?: string; search?: string; type?: string; area?: string }>) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const perPage = 20;
  const search = params.search || "";
  const type = params.type || "";
  const areaSlug = params.area || "";

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { code: { contains: search } },
      { address: { contains: search } },
    ];
  }

  if (type) {
    where.type = type;
  }

  if (areaSlug) {
    where.area = { slug: areaSlug };
  }

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      include: {
        area: true,
        kawasan: true,
        listings: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            askingPrice: true,
            priceOnRequest: true,
          },
        },
        propertyOwners: {
          include: { owner: { select: { name: true } } },
          take: 1,
        },
        _count: {
          select: { propertyMedia: true, listings: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.property.count({ where }),
  ]);

  return { properties, total, page, perPage };
}

// =============================================================================
// Helpers
// =============================================================================

function getPropertyTypeLabel(type: string): string {
  const map: Record<string, string> = {
    HOUSE: "Rumah",
    APARTMENT: "Apartemen",
    LAND: "Tanah",
    SHOPHOUSE: "Ruko",
  };
  return map[type] || type;
}

function getPropertyTypeIcon(type: string): string {
  const map: Record<string, string> = {
    HOUSE: "🏠",
    APARTMENT: "🏢",
    LAND: "📐",
    SHOPHOUSE: "🏪",
  };
  return map[type] || "🏠";
}

function formatRupiah(amount: number | bigint | { toNumber?: () => number }): string {
  let num: number;
  if (typeof amount === "bigint") {
    num = Number(amount);
  } else if (typeof amount === "object" && amount !== null && "toNumber" in amount) {
    num = (amount as { toNumber: () => number }).toNumber();
  } else {
    num = amount as number;
  }

  if (num >= 1_000_000_000) {
    return `Rp ${(num / 1_000_000_000).toFixed(1).replace(/\.0$/, "")} M`;
  }
  if (num >= 1_000_000) {
    return `Rp ${(num / 1_000_000).toFixed(0)} Jt`;
  }
  return `Rp ${num.toLocaleString("id-ID")}`;
}

function getStatusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    DRAFT: "admin-badge-draft",
    PENDING_VERIFICATION: "admin-badge-pending",
    READY_TO_PUBLISH: "admin-badge-ready",
    ACTIVE: "admin-badge-active",
    IN_NEGOTIATION: "admin-badge-negotiation",
    SOLD: "admin-badge-sold",
    SUSPENDED: "admin-badge-suspended",
    WITHDRAWN: "admin-badge-withdrawn",
    EXPIRED: "admin-badge-expired",
    ARCHIVED: "admin-badge-archived",
  };
  return map[status] || "admin-badge-draft";
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    DRAFT: "Draft",
    PENDING_VERIFICATION: "Verifikasi",
    READY_TO_PUBLISH: "Siap Publish",
    ACTIVE: "Aktif",
    IN_NEGOTIATION: "Negosiasi",
    SOLD: "Terjual",
    SUSPENDED: "Ditunda",
    WITHDRAWN: "Ditarik",
    EXPIRED: "Kedaluwarsa",
    ARCHIVED: "Arsip",
  };
  return map[status] || status;
}

// =============================================================================
// Page
// =============================================================================

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; type?: string; area?: string }>;
}) {
  const { properties, total, page, perPage } = await getProperties(searchParams);
  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>
            Properti
          </h1>
          <p style={{ fontSize: 14, color: "var(--color-admin-text-secondary)", marginTop: 4 }}>
            {total} properti terdaftar
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link
            href="/admin/properties/smart-import"
            className="admin-btn admin-btn-secondary"
            style={{
              borderColor: "rgba(16, 185, 129, 0.4)",
              background: "rgba(16, 185, 129, 0.08)",
              color: "#10b981",
              fontWeight: 600,
            }}
          >
            <Sparkles size={16} /> Smart Paste WA
          </Link>
          <Link href="/admin/properties/import" className="admin-btn admin-btn-secondary">
            <FileSpreadsheet size={16} /> Import CSV
          </Link>
          <Link href="/admin/properties/new" className="admin-btn admin-btn-primary">
            <Plus size={18} /> Tambah Properti
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-card" style={{ marginBottom: 20, padding: 14 }}>
        <form className="admin-filter-bar">
          <div className="admin-filter-search">
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
              name="search"
              type="text"
              className="admin-input"
              placeholder="Cari kode, alamat..."
              defaultValue={(await searchParams).search || ""}
              style={{ paddingLeft: 40 }}
            />
          </div>
          <select
            name="type"
            className="admin-input admin-filter-select"
            defaultValue={(await searchParams).type || ""}
          >
            <option value="">Semua Tipe</option>
            <option value="HOUSE">Rumah</option>
            <option value="APARTMENT">Apartemen</option>
            <option value="LAND">Tanah</option>
            <option value="SHOPHOUSE">Ruko</option>
          </select>
          <button type="submit" className="admin-btn admin-btn-secondary admin-filter-btn">
            <Search size={16} /> Filter
          </button>
        </form>
      </div>

      {/* Property Cards */}
      {properties.length === 0 ? (
        <div className="admin-card">
          <div className="admin-empty">
            <Building2 size={48} className="admin-empty-icon" />
            <div className="admin-empty-title">Belum ada properti</div>
            <div className="admin-empty-text">
              Tambahkan properti pertama untuk mulai membuat listing
            </div>
            <Link
              href="/admin/properties/new"
              className="admin-btn admin-btn-primary"
              style={{ marginTop: 16 }}
            >
              <Plus size={16} /> Tambah Properti
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="admin-card-grid">
            {properties.map((property) => {
              const latestListing = property.listings[0];
              const primaryOwner = property.propertyOwners[0];

              return (
                <Link
                  key={property.id}
                  href={`/admin/properties/${property.id}`}
                  className="admin-card"
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    cursor: "pointer",
                    display: "block",
                  }}
                >
                  {/* Card Header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 24 }}>
                        {getPropertyTypeIcon(property.type)}
                      </span>
                      <div>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 600,
                            color: "var(--color-admin-text)",
                          }}
                        >
                          {property.code}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--color-admin-text-muted)",
                          }}
                        >
                          {getPropertyTypeLabel(property.type)}
                        </div>
                      </div>
                    </div>
                    {latestListing && (
                      <span
                        className={`admin-badge ${getStatusBadgeClass(latestListing.status)}`}
                      >
                        {getStatusLabel(latestListing.status)}
                      </span>
                    )}
                  </div>

                  {/* Location */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 12,
                      fontSize: 13,
                      color: "var(--color-admin-text-secondary)",
                    }}
                  >
                    <MapPin size={14} />
                    {property.kawasan
                      ? `${property.kawasan.name} • Kec. ${property.area.name}`
                      : property.area.name}
                  </div>

                  {/* Specs */}
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      fontSize: 13,
                      color: "var(--color-admin-text-secondary)",
                      flexWrap: "wrap",
                    }}
                  >
                    {property.landArea && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Ruler size={14} /> {property.landArea}/{property.buildingArea || "-"} m²
                      </span>
                    )}
                    {property.bedrooms && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <BedDouble size={14} /> {property.bedrooms} KT
                      </span>
                    )}
                    {property.bathrooms && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Bath size={14} /> {property.bathrooms} KM
                      </span>
                    )}
                  </div>

                  {/* Footer */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: 16,
                      paddingTop: 12,
                      borderTop: "1px solid var(--color-admin-border)",
                    }}
                  >
                    <div style={{ fontSize: 13, color: "var(--color-admin-text-muted)" }}>
                      {primaryOwner
                        ? `Owner: ${primaryOwner.owner.name}`
                        : "Owner: belum diisi"}
                    </div>
                    {latestListing && !latestListing.priceOnRequest ? (
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: "var(--color-admin-accent)",
                        }}
                      >
                        {formatRupiah(latestListing.askingPrice)}
                      </div>
                    ) : latestListing?.priceOnRequest ? (
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--color-admin-text-muted)",
                          fontStyle: "italic",
                        }}
                      >
                        Harga on request
                      </div>
                    ) : (
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--color-admin-text-muted)",
                        }}
                      >
                        Belum ada listing
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginTop: 24,
              }}
            >
              {page > 1 && (
                <Link
                  href={`/admin/properties?page=${page - 1}`}
                  className="admin-btn admin-btn-ghost admin-btn-sm"
                >
                  ← Sebelumnya
                </Link>
              )}
              <span
                style={{
                  fontSize: 13,
                  color: "var(--color-admin-text-secondary)",
                  padding: "0 12px",
                }}
              >
                Halaman {page} dari {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={`/admin/properties?page=${page + 1}`}
                  className="admin-btn admin-btn-ghost admin-btn-sm"
                >
                  Selanjutnya →
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
