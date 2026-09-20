import { PrismaClient } from "@prisma/client";
import { getNextSequenceValue, incrementSequenceValue } from "./sequence-number";

// =============================================================================
// KODE PROPERTI — FORMAT NUMERIK: {KODE KEMENDAGRI KECAMATAN}-{RUNNING 4 DIGIT}
//
// Contoh:
//   317407-0001  → Kebayoran Baru (31.74.07), properti pertama
//   327102-0001  → Tanah Sareal, Kota Bogor (32.71.02), properti pertama
//
// - Prefix = 6 digit kode wilayah resmi Kemendagri (prov 2 + kab/kota 2 + kec 2)
//   dari kolom `areas.officialCode` — TANPA huruf.
// - Running number per-kecamatan, masing-masing mulai dari 0001.
// - Increment ATOMIC via tabel `sequence_counters` (name = "prop:{prefix}")
//   sesuai trap di AGENTS.md: JANGAN SELECT MAX+1 di luar transaction.
// - Kawasan TIDAK bagian dari kode — kawasan tampil sebagai badge/label
//   terpisah di UI (konsisten dengan prinsip nomor publik).
// =============================================================================

export interface PropertyCodeContext {
  kecamatanOfficialCode?: string | null;
}

/**
 * Normalisasi kode Kemendagri menjadi 6 digit (hapus titik).
 * Valid: "31.74.07" atau "317407" → "317407". Selain itu → null.
 */
export function normalizeOfficialCode(value?: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\./g, "");
  return /^\d{6}$/.test(digits) ? digits : null;
}

/**
 * Parsing kode properti menjadi komponen prefix & nomor urut.
 * Format: {6 digit}-{4 digit}, cth. "317407-0001".
 */
export function extractPropertyCodeParts(
  code: string
): { prefix: string; num: number } | null {
  const match = code.match(/^(\d{6})-(\d{4})$/);
  if (!match) return null;
  return { prefix: match[1], num: parseInt(match[2], 10) };
}

/**
 * Pastikan counter per-kecamatan ada (di-seed dari running number
 * tertinggi yang sudah tercatat di tabel properties), lalu increment
 * secara atomic dan kembalikan kode berikutnya.
 *
 * Dipakai di luar transaksi import (create manual & ai-parse).
 */
export async function getNextPropertyCode(
  prisma: PrismaClient,
  ctx: PropertyCodeContext
): Promise<string | null> {
  const prefix = normalizeOfficialCode(ctx.kecamatanOfficialCode);
  if (!prefix) return null;

  const counterName = `prop:${prefix}`;

  const counter = await prisma.sequenceCounter.findUnique({
    where: { name: counterName },
  });
  if (!counter) {
    // Seed dari max running yang sudah tercatat untuk prefix ini.
    const existing = await prisma.property.findMany({
      where: { code: { startsWith: `${prefix}-` } },
      select: { code: true },
    });
    let max = 0;
    for (const p of existing) {
      const parts = extractPropertyCodeParts(p.code);
      if (parts && parts.num > max) max = parts.num;
    }
    try {
      await prisma.sequenceCounter.create({
        data: { name: counterName, currentValue: BigInt(max) },
      });
    } catch {
      // Race: counter sudah dibuat proses lain — aman diabaikan.
    }
  }

  const seq = await getNextSequenceValue(prisma, counterName);
  return `${prefix}-${String(seq).padStart(4, "0")}`;
}

/**
 * Varian untuk dipakai DI DALAM transaksi (bulk import CSV):
 * pastikan counter ada dulu (di luar per-baris), lalu panggil ini
 * per baris dengan tx yang sedang berjalan.
 */
export async function ensurePropertyCodeCounter(
  prisma: PrismaClient,
  kecamatanOfficialCode: string | null | undefined
): Promise<string | null> {
  const prefix = normalizeOfficialCode(kecamatanOfficialCode);
  if (!prefix) return null;

  const counterName = `prop:${prefix}`;
  const counter = await prisma.sequenceCounter.findUnique({
    where: { name: counterName },
  });
  if (counter) return counterName;

  const existing = await prisma.property.findMany({
    where: { code: { startsWith: `${prefix}-` } },
    select: { code: true },
  });
  let max = 0;
  for (const p of existing) {
    const parts = extractPropertyCodeParts(p.code);
    if (parts && parts.num > max) max = parts.num;
  }
  try {
    await prisma.sequenceCounter.create({
      data: { name: counterName, currentValue: BigInt(max) },
    });
  } catch {
    // Race: sudah dibuat proses lain.
  }
  return counterName;
}

/** Increment counter kode di dalam transaksi & format kode lengkap. */
export async function nextPropertyCodeInTx(
  tx: Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0],
  counterName: string
): Promise<string> {
  const seq = await incrementSequenceValue(tx, counterName);
  return `${counterName.replace(/^prop:/, "")}-${String(seq).padStart(4, "0")}`;
}
