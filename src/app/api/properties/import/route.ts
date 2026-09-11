import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PropertyImportRow } from "@/lib/csv-parser";

// Helper for type mapping
function mapPropertyType(t?: string): "HOUSE" | "APARTMENT" | "LAND" | "SHOPHOUSE" {
  if (!t) return "HOUSE";
  const s = t.trim().toUpperCase();
  if (s.includes("APART") || s === "APARTEMEN") return "APARTMENT";
  if (s.includes("TANAH") || s === "LAND") return "LAND";
  if (s.includes("RUKO") || s === "SHOPHOUSE") return "SHOPHOUSE";
  return "HOUSE";
}

// Helper for certificate mapping
function mapCertificateType(
  c?: string
): "SHM" | "SHGB" | "SHSRS" | "AJB" | "GIRIK" | "PPJB" | "OTHER" {
  if (!c) return "SHM";
  const s = c.trim().toUpperCase();
  if (s.includes("HGB") || s.includes("SHGB")) return "SHGB";
  if (s.includes("STRATA") || s.includes("SHSRS") || s.includes("RUSUN")) return "SHSRS";
  if (s.includes("AJB")) return "AJB";
  if (s.includes("PPJB")) return "PPJB";
  if (s.includes("GIRIK") || s.includes("ADAT") || s.includes("LETTER")) return "GIRIK";
  if (s.includes("SHM") || s.includes("MILIK")) return "SHM";
  return "OTHER";
}

// Helper to parse numbers safely
function parseNum(v?: string | number): number | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "number") return isNaN(v) ? null : v;
  // Clean currency symbols, commas, dots
  const clean = v.replace(/[^0-9.-]+/g, "");
  const num = Number(clean);
  return isNaN(num) ? null : num;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rows: PropertyImportRow[] = body.rows || [];
    const defaultStatus = body.defaultStatus || "DRAFT";

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada data baris properti yang dikirim." },
        { status: 400 }
      );
    }

    // Load reference areas and kawasan
    const [areas, kawasanList] = await Promise.all([
      prisma.area.findMany({
        where: { level: 1, isActive: true },
        select: { id: true, name: true, slug: true },
      }),
      prisma.kawasan.findMany({
        where: { isActive: true },
        select: { id: true, name: true, slug: true, areaId: true },
      }),
    ]);

    // Find highest JS-xxxx code to increment for empty codes
    const existingCodes = await prisma.property.findMany({
      select: { code: true },
    });

    let currentMaxNum = 0;
    existingCodes.forEach((p) => {
      const match = p.code.match(/JS-(\d+)/i);
      if (match) {
        const n = parseInt(match[1]);
        if (n > currentMaxNum) currentMaxNum = n;
      }
    });

    const createdProperties: { id: string; code: string; address: string }[] = [];
    const errors: { row: number; error: string; code?: string }[] = [];

    // Process each row sequentially to maintain code ordering and avoid race conditions
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNum = index + 1;

      try {
        if (!row.alamat || !row.alamat.trim()) {
          errors.push({ row: rowNum, error: "Alamat properti wajib diisi" });
          continue;
        }

        if (!row.kecamatan || !row.kecamatan.trim()) {
          errors.push({ row: rowNum, error: "Kecamatan wajib diisi" });
          continue;
        }

        // Match Area
        const kecClean = row.kecamatan.trim().toLowerCase();
        const matchedArea = areas.find(
          (a) =>
            a.name.toLowerCase().includes(kecClean) ||
            kecClean.includes(a.name.toLowerCase()) ||
            a.slug.toLowerCase().includes(kecClean)
        );

        if (!matchedArea) {
          errors.push({
            row: rowNum,
            error: `Kecamatan "${row.kecamatan}" tidak ditemukan di daftar 10 Kecamatan Jakarta Selatan.`,
          });
          continue;
        }

        // Match Kawasan (optional)
        let matchedKawasanId: string | null = null;
        if (row.kawasan && row.kawasan.trim()) {
          const kawClean = row.kawasan.trim().toLowerCase();
          const matchedKawasan = kawasanList.find(
            (k) =>
              k.name.toLowerCase().includes(kawClean) ||
              kawClean.includes(k.name.toLowerCase())
          );
          if (matchedKawasan) {
            matchedKawasanId = matchedKawasan.id;
          }
        }

        // Determine Code
        let code = row.kode?.trim();
        if (!code) {
          currentMaxNum++;
          code = `JS-${currentMaxNum.toString().padStart(4, "0")}`;
        } else {
          // Check if code already exists
          const exists = await prisma.property.findUnique({ where: { code } });
          if (exists) {
            currentMaxNum++;
            code = `JS-${currentMaxNum.toString().padStart(4, "0")}`;
          }
        }

        // Parse Specs
        const landArea = parseNum(row.luas_tanah);
        const buildingArea = parseNum(row.luas_bangunan);
        const bedrooms = parseNum(row.kamar_tidur);
        const bathrooms = parseNum(row.kamar_mandi);
        const floors = parseNum(row.lantai) || 1;
        const electricity = parseNum(row.daya_listrik);
        const askingPrice = parseNum(row.harga_penawaran);

        // Transaction for this property
        const newProp = await prisma.$transaction(async (tx) => {
          // 1. Create Property
          const prop = await tx.property.create({
            data: {
              code: code as string,
              type: mapPropertyType(row.tipe),
              areaId: matchedArea.id,
              kawasanId: matchedKawasanId,
              address: row.alamat.trim(),
              landArea: landArea ? Math.round(landArea) : null,
              buildingArea: buildingArea ? Math.round(buildingArea) : null,
              bedrooms: bedrooms ? Math.round(bedrooms) : null,
              bathrooms: bathrooms ? Math.round(bathrooms) : null,
              floors: Math.round(floors),
              certificateType: mapCertificateType(row.sertifikat),
              facing: row.arah_hadap?.trim() || null,
              electricity: electricity ? Math.round(electricity) : null,
              internalNotes: row.catatan_internal?.trim() || null,
            },
          });

          // 2. Handle Owner (if name or phone provided)
          if (row.nama_owner?.trim() || row.telepon_owner?.trim()) {
            const ownerPhone = row.telepon_owner?.trim() || null;
            const ownerName = row.nama_owner?.trim() || "Owner " + code;

            let owner = null;
            if (ownerPhone) {
              owner = await tx.owner.findFirst({ where: { phone: ownerPhone } });
            }
            if (!owner && ownerName) {
              owner = await tx.owner.findFirst({ where: { name: ownerName } });
            }

            if (!owner) {
              owner = await tx.owner.create({
                data: {
                  name: ownerName,
                  phone: ownerPhone,
                },
              });
            }

            await tx.propertyOwner.create({
              data: {
                propertyId: prop.id,
                ownerId: owner.id,
                isPrimary: true,
              },
            });
          }

          // 3. Create Initial Listing if price is provided
          if (askingPrice && askingPrice > 0) {
            const typeLabel = {
              HOUSE: "Rumah",
              APARTMENT: "Apartemen",
              LAND: "Tanah",
              SHOPHOUSE: "Ruko",
            }[prop.type];

            await tx.listing.create({
              data: {
                propertyId: prop.id,
                status: defaultStatus as "DRAFT" | "ACTIVE",
                askingPrice,
                title: `${typeLabel} Dijual di ${matchedArea.name}`,
                description: row.catatan_internal?.trim() || null,
                showFullAddress: false,
                priceOnRequest: false,
              },
            });
          }

          return prop;
        });

        createdProperties.push({
          id: newProp.id,
          code: newProp.code,
          address: newProp.address,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Gagal memproses baris ini";
        errors.push({ row: rowNum, error: msg, code: row.kode });
      }
    }

    return NextResponse.json({
      success: true,
      total: rows.length,
      successCount: createdProperties.length,
      failedCount: errors.length,
      createdProperties,
      errors,
    });
  } catch (error) {
    console.error("Batch property import error:", error);
    return NextResponse.json(
      { error: "Gagal memproses import data properti." },
      { status: 500 }
    );
  }
}
