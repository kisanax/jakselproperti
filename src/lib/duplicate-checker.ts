import { PrismaClient } from "@prisma/client";

export interface DuplicateMatch {
  id: string;
  code: string;
  address: string;
  areaName: string;
  kawasanName?: string | null;
  landArea?: number | null;
  buildingArea?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  latestPrice?: number | null;
  status?: string | null;
  similarityScore: number; // 0 - 100%
  reason: string;
}

export interface DuplicateCheckParams {
  areaId?: string | null;
  areaSlug?: string | null;
  landArea?: number | null;
  buildingArea?: number | null;
  address?: string | null;
  excludePropertyId?: string | null;
}

/**
 * Memeriksa potensi duplikasi properti berdasarkan sidik jari fisik:
 * - Area / Kecamatan yang sama
 * - Luas Tanah sama atau selisih sangat kecil (±5 m²)
 * - Luas Bangunan sama atau selisih sangat kecil (±10 m²)
 */
export async function checkDuplicateProperties(
  prisma: PrismaClient,
  params: DuplicateCheckParams
): Promise<DuplicateMatch[]> {
  if (!params.areaId && !params.areaSlug && !params.landArea) {
    return [];
  }

  // Cari areaId jika hanya slug yang diberikan
  let resolvedAreaId = params.areaId;
  if (!resolvedAreaId && params.areaSlug) {
    const area = await prisma.area.findUnique({
      where: { slug: params.areaSlug },
      select: { id: true },
    });
    if (area) resolvedAreaId = area.id;
  }

  // Buat query filter
  const where: Record<string, unknown> = {};

  if (params.excludePropertyId) {
    where.id = { not: params.excludePropertyId };
  }

  if (resolvedAreaId) {
    where.areaId = resolvedAreaId;
  }

  // Jika ada luas tanah, cari yang toleransinya ±10 m²
  if (params.landArea && params.landArea > 0) {
    where.landArea = {
      gte: Math.max(1, params.landArea - 10),
      lte: params.landArea + 10,
    };
  }

  const candidates = await prisma.property.findMany({
    where,
    include: {
      area: { select: { name: true } },
      kawasan: { select: { name: true } },
      listings: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { askingPrice: true, status: true },
      },
    },
    take: 5,
  });

  const matches: DuplicateMatch[] = [];

  for (const c of candidates) {
    let score = 0;
    const reasons: string[] = [];

    // Cek kesamaan area
    if (resolvedAreaId && c.areaId === resolvedAreaId) {
      score += 30;
      reasons.push(`Kecamatan sama (${c.area.name})`);
    }

    // Cek kesamaan luas tanah
    if (params.landArea && c.landArea) {
      const diffLT = Math.abs(c.landArea - params.landArea);
      if (diffLT === 0) {
        score += 40;
        reasons.push(`Luas tanah persis (${c.landArea} m²)`);
      } else if (diffLT <= 5) {
        score += 30;
        reasons.push(`Luas tanah sangat mendekati (${c.landArea} m² vs ${params.landArea} m²)`);
      } else if (diffLT <= 10) {
        score += 15;
        reasons.push(`Luas tanah mirip (selisih ${diffLT} m²)`);
      }
    }

    // Cek kesamaan luas bangunan
    if (params.buildingArea && c.buildingArea) {
      const diffLB = Math.abs(c.buildingArea - params.buildingArea);
      if (diffLB === 0) {
        score += 25;
        reasons.push(`Luas bangunan persis (${c.buildingArea} m²)`);
      } else if (diffLB <= 10) {
        score += 15;
        reasons.push(`Luas bangunan mendekati (${c.buildingArea} m²)`);
      }
    }

    // Cek kesamaan alamat jika ada kata kunci yang cocok
    if (params.address && c.address) {
      const addrClean = params.address.toLowerCase();
      const candAddr = c.address.toLowerCase();
      // Cari kata-kata spesifik minimal 4 huruf
      const words = addrClean.split(/\s+/).filter((w) => w.length >= 4 && !["jalan", "jl.", "raya", "selatan", "barat"].includes(w));
      const matchWords = words.filter((w) => candAddr.includes(w));
      if (matchWords.length > 0) {
        score += 15;
        reasons.push(`Alamat mengandung kata yang sama ("${matchWords.join(", ")}")`);
      }
    }

    // Batasi skor maksimal 99% jika belum verifikasi alamat pasti
    const finalScore = Math.min(score, 99);

    if (finalScore >= 50) {
      matches.push({
        id: c.id,
        code: c.code,
        address: c.address,
        areaName: c.area.name,
        kawasanName: c.kawasan?.name,
        landArea: c.landArea,
        buildingArea: c.buildingArea,
        bedrooms: c.bedrooms,
        bathrooms: c.bathrooms,
        latestPrice: c.listings[0]?.askingPrice ? Number(c.listings[0].askingPrice) : null,
        status: c.listings[0]?.status,
        similarityScore: finalScore,
        reason: reasons.join(" • "),
      });
    }
  }

  // Urutkan dari skor tertinggi
  return matches.sort((a, b) => b.similarityScore - a.similarityScore);
}
