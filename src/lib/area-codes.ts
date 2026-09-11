import { PrismaClient } from "@prisma/client";

// =============================================================================
// KODE SINGKATAN 10 KECAMATAN RESMI JAKARTA SELATAN
// =============================================================================

export const KECAMATAN_CODE_MAP: Record<string, string> = {
  "cilandak": "CLD",
  "kebayoran-baru": "KBB",
  "kebayoran-lama": "KBL",
  "mampang-prapatan": "MPP",
  "pasar-minggu": "PSM",
  "setiabudi": "STB",
  "tebet": "TBT",
  "pancoran": "PCR",
  "pesanggrahan": "PSG",
  "jagakarsa": "JGK",
};

/**
 * Mendapatkan kode 3 huruf dari nama atau slug kecamatan
 */
export function getAreaCode(areaSlugOrName?: string | null): string {
  if (!areaSlugOrName) return "GEN"; // General fallback

  const clean = areaSlugOrName.toLowerCase().trim().replace(/\s+/g, "-");

  for (const [slug, code] of Object.entries(KECAMATAN_CODE_MAP)) {
    if (clean.includes(slug) || slug.includes(clean)) {
      return code;
    }
  }

  // Fallback 3 huruf pertama
  return clean.replace(/[^a-z]/g, "").slice(0, 3).toUpperCase() || "GEN";
}

/**
 * Generate kode properti berikutnya dengan format: JS-[KEC]-[NOMOR]
 * Contoh: JS-CLD-0004
 */
export async function generatePropertyCode(
  prisma: PrismaClient,
  areaSlugOrName?: string | null
): Promise<string> {
  const areaCode = getAreaCode(areaSlugOrName);
  const prefix = `JS-${areaCode}-`;

  // Cari kode tertinggi yang menggunakan prefix area ini
  const existingWithPrefix = await prisma.property.findMany({
    where: {
      code: { startsWith: prefix },
    },
    select: { code: true },
  });

  let maxNum = 0;
  existingWithPrefix.forEach((p) => {
    const match = p.code.match(new RegExp(`^JS-${areaCode}-(\\d+)`, "i"));
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });

  // Jika belum ada yang pakai format baru dengan prefix ini, cek total properti global untuk kelanjutan nomor
  if (maxNum === 0) {
    const allProps = await prisma.property.findMany({
      select: { code: true },
    });
    allProps.forEach((p) => {
      const match = p.code.match(/JS-(\d+)/i) || p.code.match(/JS-[A-Z]{3}-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
  }

  const nextNum = maxNum + 1;
  return `${prefix}${String(nextNum).padStart(4, "0")}`;
}
