import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import PropertyDetailActions from "./PropertyDetailActions";
import PropertyPhotoGallery from "./PropertyPhotoGallery";
import PropertyPublicPreviewModal from "./PropertyPublicPreviewModal";

export const dynamic = "force-dynamic";
import {
  ArrowLeft,
  MapPin,
  Ruler,
  BedDouble,
  Bath,
  Building2,
  Calendar,
  Zap,
  Droplets,
  Compass,
  FileText,
  Plus,
  ImageIcon,
  Users,
  Camera,
  Gavel,
} from "lucide-react";
import { categories, auctionStatuses, effectiveStatus } from "@/lib/auctions";
import { getCurrentOperationalActor } from "@/lib/api-auth";
import {
  combinePropertyFilters,
  listingAccessFilter,
} from "@/lib/services/property-listing-access";

// =============================================================================
// Helpers
// =============================================================================

function getPropertyTypeLabel(type: string) {
  const m: Record<string, string> = { HOUSE: "Rumah", APARTMENT: "Apartemen", LAND: "Tanah", SHOPHOUSE: "Ruko" };
  return m[type] || type;
}
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
  return `Rp ${num.toLocaleString("id-ID")}`;
}
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(date));
}

// =============================================================================
// Page
// =============================================================================

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const operational = await getCurrentOperationalActor();
  if (!operational) notFound();
  const { id } = await params;

  const property = await prisma.property.findFirst({
    where: {
      ...combinePropertyFilters(operational.actor, { OR: [{ id }, { code: id }] }),
    },
    include: {
      area: { include: { parent: true } },
      village: true,
      listings: {
        where: listingAccessFilter(operational.actor),
        orderBy: { createdAt: "desc" },
        include: {
          statusHistory: { orderBy: { createdAt: "desc" }, take: 5, include: { user: { select: { name: true } } } },
          leads: { orderBy: { createdAt: "desc" }, take: 3 },
        },
      },
      propertyOwners: { include: { owner: true } },
      propertyMedia: { orderBy: { sortOrder: "asc" } },
      documents: { orderBy: { type: "asc" } },
      amenities: { include: { amenity: true } },
      auctionRecords: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!property) notFound();

  const latestListing = property.listings[0];

  const publicPreviewData = {
    property: {
      id: property.id,
      code: property.code,
      type: property.type,
      address: property.address,
      landArea: property.landArea ? Number(property.landArea) : null,
      buildingArea: property.buildingArea ? Number(property.buildingArea) : null,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      floors: property.floors,
      garages: property.garages,
      carports: property.carports,
      certificateType: property.certificateType,
      electricity: property.electricity,
      waterSource: property.waterSource,
      facing: property.facing,
    },
    areaName: property.area?.name,
    listing: latestListing
      ? {
          title: latestListing.title,
          description: latestListing.description,
          askingPrice: latestListing.askingPrice ? Number(latestListing.askingPrice) : null,
          videoUrl: latestListing.videoUrl,
          videoPlatform: latestListing.videoPlatform,
          status: latestListing.status,
        }
      : null,
    media: property.propertyMedia.map((m) => ({
      id: m.id,
      filePath: m.filePath,
      isPrimary: m.isPrimary,
      altText: m.altText,
    })),
    amenities: property.amenities.map((a) => ({
      amenity: {
        name: a.amenity.name,
        icon: a.amenity.icon,
      },
    })),
  };

  return (
    <div className="animate-fade-in">
      {/* Back + Header */}
      <div style={{ marginBottom: 24 }}>
        <Link href="/admin/properties" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--color-admin-text-secondary)", textDecoration: "none", marginBottom: 12 }}>
          <ArrowLeft size={16} /> Kembali ke daftar properti
        </Link>
        <div className="admin-detail-header-wrap">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 32, lineHeight: 1 }}>
              {{ HOUSE: "🏠", APARTMENT: "🏢", LAND: "📐", SHOPHOUSE: "🏪" }[property.type] || "🏠"}
            </span>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>{property.code}</h1>
                {latestListing && (
                  <span className={`admin-badge ${getStatusBadgeClass(latestListing.status)}`}>
                    {getStatusLabel(latestListing.status)}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 13, color: "var(--color-admin-text-secondary)", marginTop: 3, marginBottom: 0 }}>
                {getPropertyTypeLabel(property.type)} • {property.village ? `${property.village.name}, ` : ""}{property.area.parent ? `${property.area.name}, ${property.area.parent.name}` : property.area.name}
              </p>
            </div>
          </div>
          <div className="admin-detail-actions">
            <PropertyPublicPreviewModal
              property={publicPreviewData.property}
              areaName={publicPreviewData.areaName}
              listing={publicPreviewData.listing}
              media={publicPreviewData.media}
              amenities={publicPreviewData.amenities}
              buttonClassName="admin-detail-preview-btn admin-btn admin-btn-secondary"
            />
            <PropertyDetailActions propertyId={property.id} propertyCode={property.code} />
          </div>
        </div>
      </div>

      <div className="admin-detail-layout">
        {/* Left Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Photos & Lightbox Preview Gallery */}
          <PropertyPhotoGallery
            propertyId={property.id}
            media={property.propertyMedia}
            videoUrl={latestListing?.videoUrl}
            videoPlatform={latestListing?.videoPlatform}
          />

          {/* Specs */}
          <div className="admin-card">
            <div className="admin-card-title" style={{ marginBottom: 16 }}>Spesifikasi</div>
            <div className="admin-specs-grid">
              {property.landArea && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Ruler size={18} style={{ color: "var(--color-admin-text-muted)" }} />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{property.landArea}/{property.buildingArea || "-"} m²</div>
                    <div style={{ fontSize: 11, color: "var(--color-admin-text-muted)" }}>Luas T/B</div>
                  </div>
                </div>
              )}
              {property.bedrooms && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <BedDouble size={18} style={{ color: "var(--color-admin-text-muted)" }} />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{property.bedrooms}</div>
                    <div style={{ fontSize: 11, color: "var(--color-admin-text-muted)" }}>Kamar Tidur</div>
                  </div>
                </div>
              )}
              {property.bathrooms && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Bath size={18} style={{ color: "var(--color-admin-text-muted)" }} />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{property.bathrooms}</div>
                    <div style={{ fontSize: 11, color: "var(--color-admin-text-muted)" }}>Kamar Mandi</div>
                  </div>
                </div>
              )}
              {property.floors && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Building2 size={18} style={{ color: "var(--color-admin-text-muted)" }} />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{property.floors}</div>
                    <div style={{ fontSize: 11, color: "var(--color-admin-text-muted)" }}>Lantai</div>
                  </div>
                </div>
              )}
              {property.yearBuilt && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Calendar size={18} style={{ color: "var(--color-admin-text-muted)" }} />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{property.yearBuilt}</div>
                    <div style={{ fontSize: 11, color: "var(--color-admin-text-muted)" }}>Tahun Bangun</div>
                  </div>
                </div>
              )}
              {property.facing && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Compass size={18} style={{ color: "var(--color-admin-text-muted)" }} />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{property.facing}</div>
                    <div style={{ fontSize: 11, color: "var(--color-admin-text-muted)" }}>Hadap</div>
                  </div>
                </div>
              )}
              {property.electricity && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Zap size={18} style={{ color: "var(--color-admin-text-muted)" }} />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{property.electricity}W</div>
                    <div style={{ fontSize: 11, color: "var(--color-admin-text-muted)" }}>Listrik</div>
                  </div>
                </div>
              )}
              {property.waterSource && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Droplets size={18} style={{ color: "var(--color-admin-text-muted)" }} />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{property.waterSource}</div>
                    <div style={{ fontSize: 11, color: "var(--color-admin-text-muted)" }}>Air</div>
                  </div>
                </div>
              )}
            </div>

            {/* Amenities */}
            {property.amenities.length > 0 && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--color-admin-border)" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-admin-text-secondary)", marginBottom: 8 }}>Fasilitas</div>
                <div className="admin-pill-group">
                  {property.amenities.map((pa) => (
                    <span key={pa.amenity.id} className="admin-pill admin-pill-sm active" style={{ cursor: "default" }}>
                      {pa.amenity.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Alamat & Lokasi */}
          <div className="admin-card">
            <div className="admin-card-title" style={{ marginBottom: 12 }}>
              <MapPin size={16} style={{ display: "inline", marginRight: 6 }} />Lokasi (Internal)
            </div>
            <div style={{ fontSize: 15, color: "var(--color-admin-text)" }}>{property.address}</div>
            {property.certificateType && (
              <div style={{ fontSize: 13, color: "var(--color-admin-text-secondary)", marginTop: 8 }}>
                Sertifikat: {property.certificateType}{property.certificateNo ? ` — ${property.certificateNo}` : ""}
              </div>
            )}
          </div>
        </div>

        {/* Right Column — Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Latest Listing */}
          {latestListing ? (
            <div className="admin-card">
              <div className="admin-card-title" style={{ marginBottom: 12 }}>Listing Terkini</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--color-admin-accent)" }}>
                {latestListing.priceOnRequest ? "Harga on request" : formatRupiah(latestListing.askingPrice)}
              </div>
              {latestListing.minimumPrice && (
                <div style={{ fontSize: 13, color: "var(--color-admin-text-muted)", marginTop: 4 }}>
                  Min: {formatRupiah(latestListing.minimumPrice)}
                </div>
              )}
              {latestListing.title && (
                <div style={{ fontSize: 14, color: "var(--color-admin-text-secondary)", marginTop: 12 }}>{latestListing.title}</div>
              )}

              {/* Status history */}
              {latestListing.statusHistory.length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--color-admin-border)" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-admin-text-muted)", marginBottom: 8 }}>RIWAYAT STATUS</div>
                  {latestListing.statusHistory.map((sh) => (
                    <div key={sh.id} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 12 }}>
                      <div style={{ color: "var(--color-admin-text-muted)", whiteSpace: "nowrap" }}>
                        {formatDate(sh.createdAt)}
                      </div>
                      <div style={{ color: "var(--color-admin-text-secondary)" }}>
                        {sh.fromStatus ? `${getStatusLabel(sh.fromStatus)} → ` : ""}{getStatusLabel(sh.toStatus)}
                        {sh.user && <span style={{ color: "var(--color-admin-text-muted)" }}> oleh {sh.user.name}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="admin-card">
              <div className="admin-card-title" style={{ marginBottom: 12 }}>Listing</div>
              <div className="admin-empty" style={{ padding: "16px 0" }}>
                <div className="admin-empty-text">Belum ada listing</div>
              </div>
              <Link href={`/admin/listings/new?propertyId=${property.id}`} className="admin-btn admin-btn-primary admin-btn-sm admin-btn-full" style={{ marginTop: 8 }}>
                <Plus size={16} /> Buat Listing
              </Link>
            </div>
          )}

          {/* Owners */}
          <div className="admin-card">
            <div className="admin-card-header">
              <div className="admin-card-title"><Users size={16} style={{ display: "inline", marginRight: 6 }} />Owner</div>
            </div>
            {property.propertyOwners.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--color-admin-text-muted)", fontStyle: "italic" }}>Belum diisi</div>
            ) : (
              property.propertyOwners.map((po) => (
                <div key={po.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--color-admin-border)" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{po.owner.name}</div>
                    {po.owner.phone && <div style={{ fontSize: 12, color: "var(--color-admin-text-muted)" }}>{po.owner.phone}</div>}
                  </div>
                  {po.isPrimary && <span className="admin-badge admin-badge-active" style={{ fontSize: 10 }}>Utama</span>}
                </div>
              ))
            )}
          </div>

          {/* Internal Notes */}
          {property.internalNotes && (
            <div className="admin-card">
              <div className="admin-card-title" style={{ marginBottom: 8 }}>
                <FileText size={16} style={{ display: "inline", marginRight: 6 }} />Catatan Internal
              </div>
              <div style={{ fontSize: 14, color: "var(--color-admin-text-secondary)", whiteSpace: "pre-wrap" }}>
                {property.internalNotes}
              </div>
            </div>
          )}

          {/* Listing History */}
          {property.listings.length > 1 && (
            <div className="admin-card">
              <div className="admin-card-title" style={{ marginBottom: 12 }}>Riwayat Listing ({property.listings.length})</div>
              {property.listings.map((listing) => (
                <div key={listing.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--color-admin-border)", fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className={`admin-badge ${getStatusBadgeClass(listing.status)}`} style={{ fontSize: 10 }}>
                      {getStatusLabel(listing.status)}
                    </span>
                    <span style={{ color: "var(--color-admin-text-muted)" }}>
                      {formatDate(listing.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sitaan & Lelang */}
          <div className="admin-card">
            <div className="admin-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div className="admin-card-title">
                <Gavel size={16} style={{ display: "inline", marginRight: 6 }} />
                Sitaan & Lelang ({property.auctionRecords.length})
              </div>
              <Link
                href={`/admin/auctions/new?propertyId=${property.id}`}
                className="admin-btn admin-btn-ghost admin-btn-sm"
                style={{ fontSize: 12, padding: "4px 8px" }}
              >
                <Plus size={14} /> Catat Baru
              </Link>
            </div>
            {property.auctionRecords.length === 0 ? (
              <div className="admin-empty" style={{ padding: "12px 0" }}>
                <div className="admin-empty-text" style={{ fontSize: 13 }}>Belum ada catatan sitaan / lelang</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {property.auctionRecords.map((ar) => {
                  const effStatus = effectiveStatus({
                    status: ar.status,
                    activeFrom: ar.activeFrom?.toISOString().slice(0, 10),
                    activeUntil: ar.activeUntil?.toISOString().slice(0, 10),
                  });
                  return (
                    <Link
                      key={ar.id}
                      href={`/admin/auctions/${ar.id}`}
                      style={{
                        display: "block",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid var(--color-admin-border)",
                        background: "var(--color-admin-surface)",
                        textDecoration: "none",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span className="admin-badge admin-badge-pending" style={{ fontSize: 10 }}>
                          {categories[ar.category as keyof typeof categories] || ar.category}
                        </span>
                        <span className="admin-badge" style={{ fontSize: 10 }}>
                          {effStatus === "SCHEDULED" ? "Terjadwal" : auctionStatuses[effStatus as keyof typeof auctionStatuses] || effStatus}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-admin-text)", marginBottom: 2 }}>
                        {ar.title}
                      </div>
                      {ar.limitPrice && (
                        <div style={{ fontSize: 12, color: "var(--color-admin-accent)", fontWeight: 500 }}>
                          Limit: Rp {Number(ar.limitPrice).toLocaleString("id-ID")}
                        </div>
                      )}
                      {ar.organizer && (
                        <div style={{ fontSize: 11, color: "var(--color-admin-text-muted)", marginTop: 2 }}>
                          {ar.organizer}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// For photo star icon
function Star({ size, className }: { size: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
