/**
 * Importer Wilayah Administratif Nasional (Kemendagri)
 *
 * Sumber data : prisma/data/wilayah.sql — dataset cahyadsn/wilayah
 *               (https://github.com/cahyadsn/wilayah, MIT License)
 *               sesuai Kepmendagri No 300.2.2-2430 Tahun 2025.
 * Skema       : Area.level 1=provinsi, 2=kab/kota, 3=kecamatan,4=kelurahan/desa.
 *               Primary key Int autoincrement — id dibuat database, bukan
 *               script; hierarki induk dihubungkan lewat officialCode.
 *
 * Perilaku:
 * - Idempotent: baris yang sudah ada (match via officialCode / slug-nama
 *   Jaksel) di-update, tidak diduplikasi.
 * - Kecamatan & kelurahan Jaksel dari seed dipertahankan (id, slug,
 *   dan kode legacy tidak berubah) — hanya diisi officialCode.
 * - Diproses per level berurutan (provinsi → kab/kota → kecamatan →
 *   kelurahan) supaya parentId selalu resolvable.
 *
 * Jalankan: npm run db:import-wilayah (setelah npm run db:seed)
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type WilayahRow = {
  kode: string;
  nama: string;
  level: number; // 1..4 dari panjang kode
  parentKode: string | null;
};

function parseDataset(sql: string): WilayahRow[] {
  const rows: WilayahRow[] = [];
  const seen = new Set<string>();
  const tupleRe = /\('([0-9.]+)','([^']+)'\)/g;
  let m: RegExpExecArray | null;
  while ((m = tupleRe.exec(sql)) !== null) {
    const kode = m[1];
    const nama = m[2].trim();
    if (seen.has(kode)) continue;
    seen.add(kode);

    const segments = kode.split(".");
    const level = segments.length === 1 ? 1 : segments.length === 2 ? 2 : segments.length === 3 ? 3 : 4;
    const parentKode = segments.length > 1 ? segments.slice(0, segments.length - 1).join(".") : null;
    rows.push({ kode, nama, level, parentKode });
  }
  return rows;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  console.log("🇮🇩 Import wilayah administratif nasional (Kemendagri)...\n");

  const sql = readFileSync(join(process.cwd(), "prisma", "data", "wilayah.sql"), "utf8");
  const dataset = parseDataset(sql);

  const byLevel = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const row of dataset) byLevel[row.level as 1 | 2 | 3 | 4]++;
  console.log(
    `   Dataset: ${dataset.length} baris — ${byLevel[1]} provinsi, ${byLevel[2]} kab/kota, ${byLevel[3]} kecamatan, ${byLevel[4]} kelurahan/desa`
  );

  // Snapshot existing ( hasil seed ) + index pencocokan.
  const existing = await prisma.area.findMany({
    select: { id: true, name: true, slug: true, officialCode: true, level: true, parentId: true },
  });
  const existingByOfficial = new Map<string, (typeof existing)[number]>();
  const existingBySlug = new Map<string, (typeof existing)[number]>();
  for (const area of existing) {
    if (area.officialCode) existingByOfficial.set(area.officialCode, area);
    existingBySlug.set(area.slug, area);
  }

  const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Peta officialCode → id (Int, diisi progresif per level).
  const codeToId = new Map<string, number>();
  const slugTaken = new Set(existing.map((a) => a.slug));
  const BATCH = 2000;

  for (const level of [1, 2, 3, 4] as const) {
    const rows = dataset.filter((r) => r.level === level);
    const updates: {
      id: number;
      officialCode: string;
      level: number;
      parentId: number | null;
    }[] = [];
    const inserts: {
      name: string;
      slug: string;
      officialCode: string;
      parentId: number | null;
      level: number;
    }[] = [];

    for (const row of rows) {
      // a. Sudah ada via officialCode (mis. DKI "31", Jaksel "31.74" dari seed)
      const byOfficial = existingByOfficial.get(row.kode);
      if (byOfficial) {
        codeToId.set(row.kode, byOfficial.id);
        continue;
      }

      const parentDbId = row.parentKode ? (codeToId.get(row.parentKode) ?? null) : null;

      // b. Baris Jaksel (31.74.x / 31.74.x.xxxx) — cocokkan dengan baris
      //    seed via slug atau nama supaya id, slug, dan kode legacy
      //    tidak berubah. PENTING: kecamatan Jaksel yang punya kelurahan
      //    bernama sama (Pancoran, Jagakarsa, dll) WAJIB match dengan
      //    constraint level — slug "pancoran" (kecamatan) vs
      //    "pancoran-kel" (kelurahan seed). Nama dicocokkan normal tanpa
      //    spasi ("Setiabudi" == "Setia Budi") dan di-scope pada induk.
      if (row.kode.startsWith("31.74")) {
        const slugGuess = slugify(row.nama);
        const bySlug = existingBySlug.get(slugGuess);
        const bySlugKel = existingBySlug.get(`${slugGuess}-kel`);
        const matched =
          (level === 3 && bySlug?.level === 3 ? bySlug : undefined) ||
          (level === 4 && bySlugKel?.level === 4 ? bySlugKel : undefined) ||
          existing.find(
            (a) =>
              norm(a.name) === norm(row.nama) &&
              a.level === level &&
              (!parentDbId || a.parentId === parentDbId)
          );
        if (matched) {
          codeToId.set(row.kode, matched.id);
          updates.push({
            id: matched.id,
            officialCode: row.kode,
            level,
            parentId: parentDbId ?? matched.id,
          });
          continue;
        }
      }

      // c. Baris baru — slug unik: provinsi/kab-kota pakai nama;
      //    kecamatan/kelurahan diberi suffix segmen kode terakhir
      //    karena nama sering kembar antar daerah.
      let slug = slugify(row.nama);
      if (level >= 3) slug = `${slug}-${row.kode.split(".").pop()}`;
      while (slugTaken.has(slug)) slug = `x-${slug}`;
      slugTaken.add(slug);

      inserts.push({
        name: row.nama,
        slug,
        officialCode: row.kode,
        parentId: parentDbId,
        level,
      });
    }

    // Terapkan update baris Jaksel existing.
    for (const update of updates) {
      await prisma.area.update({
        where: { id: update.id },
        data: {
          officialCode: update.officialCode,
          level: update.level,
          ...(update.parentId !== null && { parentId: update.parentId }),
        },
      });
    }

    // Insert batch baris baru — id dibuat database (autoincrement).
    for (let i = 0; i < inserts.length; i += BATCH) {
      await prisma.area.createMany({ data: inserts.slice(i, i + BATCH) });
    }

    // Muat ulang peta officialCode → id untuk level ini ( hasil insert ).
    if (inserts.length > 0) {
      const inserted = await prisma.area.findMany({
        where: { level, officialCode: { not: null } },
        select: { id: true, officialCode: true },
      });
      for (const area of inserted) codeToId.set(area.officialCode as string, area.id);
    }

    console.log(
      `   ✅ Level ${level}: ${inserts.length} baris baru, ${updates.length} baris existing dipetakan`
    );
  }

  // ---------------------------------------------------------------------
  // Ringkasan
  // ---------------------------------------------------------------------
  const counts = await prisma.area.groupBy({ by: ["level"], _count: true });
  console.log(
    "\n   Total di database: " +
      counts
        .sort((a, b) => a.level - b.level)
        .map((c) => `L${c.level}=${c._count}`)
        .join(", ")
  );
  console.log("\n🎉 Import wilayah nasional selesai.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
