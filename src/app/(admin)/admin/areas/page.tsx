import { prisma } from "@/lib/prisma";
import { MapPin } from "lucide-react";

export default async function AreasPage() {
  const areas = await prisma.area.findMany({
    where: { level: 1 },
    include: {
      children: {
        orderBy: { name: "asc" },
        include: {
          _count: { select: { properties: true } },
        },
      },
      _count: { select: { properties: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Area</h1>
          <p style={{ fontSize: 14, color: "var(--color-admin-text-secondary)", marginTop: 4 }}>
            Kecamatan & kelurahan Jakarta Selatan
          </p>
        </div>
      </div>

      <div className="admin-card-grid">
        {areas.map((kecamatan) => (
          <div key={kecamatan.id} className="admin-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <MapPin size={18} style={{ color: "var(--color-admin-accent)" }} />
                <span style={{ fontSize: 16, fontWeight: 700 }}>{kecamatan.name}</span>
              </div>
              <span style={{ fontSize: 12, color: "var(--color-admin-text-muted)" }}>
                {kecamatan._count.properties} properti
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {kecamatan.children.map((kelurahan) => (
                <div
                  key={kelurahan.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 8px",
                    borderRadius: 6,
                    fontSize: 13,
                    color: "var(--color-admin-text-secondary)",
                  }}
                >
                  <span>{kelurahan.name}</span>
                  {kelurahan._count.properties > 0 && (
                    <span style={{ fontSize: 11, color: "var(--color-admin-text-muted)" }}>
                      {kelurahan._count.properties}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
