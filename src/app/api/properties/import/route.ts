import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOperationalUser } from "@/lib/api-auth";
import { PropertyImportRow } from "@/lib/csv-parser";
import {
  ensurePropertyCodeCounter,
  nextPropertyCodeInTx,
} from "@/lib/property-code";
import { incrementSequenceValue, formatPublicNumber } from "@/lib/sequence-number";
import { isOperationalStaff } from "@/lib/services/property-listing-access";

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
  const guard = await requireOperationalUser();
  if (guard.error) return guard.error;

  try {
    const body = await request.json();
    const rows: PropertyImportRow[] = body.rows || [];
    const defaultStatus = body.defaultStatus || "DRAFT";

    if (defaultStatus !== "DRAFT") {
      return NextResponse.json(
        { error: "Import hanya dapat membuat draft. Gunakan alur verifikasi untuk publikasi." },
        { status: 400 }
      );
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada data baris properti yang dikirim." },
        { status: 400 }
      );
    }

    // Load reference areas and kawasan
    // Level 3 = kecamatan nasional; parent (kab/kota) untuk disambiguasi
    // kecamatan bernama sama antar daerah; officialCode untuk kode properti.
    const [areas, kawasanList] = await Promise.all([
      prisma.area.findMany({
        where: { level: 3, isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          officialCode: true,
          parent: { select: { name: true } },
        },
      }),
      prisma.kawasan.findMany({
        where: { isActive: true },
        select: { id: true, name: true, slug: true, areaId: true },
      }),
    ]);

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

        // Match Area — kecamatan nasional; nama bisa kembar antar kota,
        // jadi kolom kota (opsional) dipakai untuk disambiguasi.
        const kecClean = row.kecamatan.trim().toLowerCase();
        let candidates = areas.filter(
          (a) =>
            a.name.toLowerCase().includes(kecClean) ||
            kecClean.includes(a.name.toLowerCase()) ||
            a.slug.toLowerCase().includes(kecClean)
        );

        if (row.kota && row.kota.trim()) {
          const kotaClean = row.kota.trim().toLowerCase();
          candidates = candidates.filter(
            (a) => a.parent?.name?.toLowerCase().includes(kotaClean)
          );
        }

        let matchedArea: (typeof areas)[number] | null = null;
        if (candidates.length === 1) {
          matchedArea = candidates[0];
        } else if (candidates.length > 1) {
          errors.push({
            row: rowNum,
            error: `Kecamatan "${row.kecamatan}" ditemukan di ${candidates.length} kota — isi kolom "kota" untuk memperjelas (contoh: ${candidates[0].parent?.name}).`,
          });
          continue;
        }

        if (!matchedArea) {
          errors.push({
            row: rowNum,
            error: `Kecamatan "${row.kecamatan}" tidak ditemukan. Pastikan penulisan nama kecamatan benar${row.kota ? " dan sesuai kota" : " — atau isi kolom kota"}.`,
          });
          continue;
        }

        // Match Kawasan (optional) — kawasan TIDAK memengaruhi kode properti,
        // hanya tersimpan sebagai atribut (badge/label UI).
        let matchedKawasanId: string | null = null;
        if (row.kawasan && row.kawasan.trim()) {
          const kawClean = row.kawasan.trim().toLowerCase();
          const found = kawasanList.find(
            (k) =>
              k.name.toLowerCase().includes(kawClean) ||
              kawClean.includes(k.name.toLowerCase())
          );
          if (found) {
            matchedKawasanId = found.id;
          }
        }

        // Pastikan counter kode per-kecamatan sudah ada (di-seed dari max
        // existing) SEBELUM loop transaksi — per AGENTS.md: increment
        // harus atomic di dalam transaction, bukan MAX+1 di memori.
        const codeCounter = await ensurePropertyCodeCounter(
          prisma,
          matchedArea.officialCode
        );
        if (!codeCounter) {
          errors.push({
            row: rowNum,
            error: `Kecamatan "${row.kecamatan}" tidak punya kode wilayah resmi — tidak bisa membuat kode properti.`,
          });
          continue;
        }

        // Determine Code — kode manual dipakai apa adanya bila belum dipakai;
        // selain itu ambil running number atomic per-kecamatan.
        let code: string | null = row.kode?.trim() || null;
        if (code) {
          const exists = await prisma.property.findUnique({ where: { code } });
          if (exists) code = null; // sudah dipakai → generate baru
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
          const finalCode =
            code ?? (await nextPropertyCodeInTx(tx, codeCounter));

          // 1. Create Property
          const propertyNumber = formatPublicNumber(
            await incrementSequenceValue(tx, "property")
          );
          const prop = await tx.property.create({
            data: {
              code: finalCode,
              propertyNumber,
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

          // 3. Broker properties always need an owned draft to remain in scope.
          if ((askingPrice && askingPrice > 0) || !isOperationalStaff(guard.actor)) {
            const typeLabel = {
              HOUSE: "Rumah",
              APARTMENT: "Apartemen",
              LAND: "Tanah",
              SHOPHOUSE: "Ruko",
            }[prop.type];

            const listing = await tx.listing.create({
              data: {
                propertyId: prop.id,
                listingNumber: formatPublicNumber(
                  await incrementSequenceValue(tx, "listing")
                ),
                managedById: guard.actor.userId,
                status: "DRAFT",
                askingPrice: askingPrice || 0,
                title: `${typeLabel} Dijual di ${matchedArea.name}`,
                description: row.catatan_internal?.trim() || null,
                showFullAddress: false,
                priceOnRequest: false,
              },
            });

            await tx.listingStatusHistory.create({
              data: {
                listingId: listing.id,
                fromStatus: null,
                toStatus: "DRAFT",
                changedBy: guard.actor.userId,
                reason: "Listing dibuat melalui import CSV",
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
