import { z } from "zod";

export const categories = { AUCTION: "Properti Lelang", SEIZED: "Rumah Sitaan", BOTH: "Sitaan & Lelang" } as const;
export const auctionStatuses = { DRAFT: "Draft", ACTIVE: "Aktif", EXPIRED: "Kedaluwarsa", CANCELLED: "Dibatalkan", COMPLETED: "Selesai" } as const;
export const cities = ["Jakarta Selatan", "Jakarta Barat", "Jakarta Pusat", "Jakarta Timur", "Jakarta Utara", "Kota Bogor", "Kabupaten Bogor", "Depok", "Kota Tangerang", "Kabupaten Tangerang", "Tangerang Selatan", "Kota Bekasi", "Kabupaten Bekasi"];
export const jakartaToday = (now = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function addCalendarMonths(start: string, months: number) {
  if (!validDate(start) || !Number.isInteger(months) || months < 1 || months > 120) return "";
  const [year, month, day] = start.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month - 1 + months + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1 + months, Math.min(day, lastDay))).toISOString().slice(0, 10);
}

const text = (max: number) => z.string().trim().max(max).default("");
const date = text(10).refine(v => !v || validDate(v), "Tanggal tidak valid");
const instant = text(16).refine(v => !v || (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) && validDate(v.slice(0, 10)) && Number(v.slice(11,13)) < 24 && Number(v.slice(14,16)) < 60), "Waktu tidak valid");
const money = text(15).refine(v => !v || /^\d{1,15}$/.test(v), "Isi nominal Rupiah bulat tanpa titik/koma");
export const auctionInput = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi").max(255),
  propertyId: z.union([z.literal(""), z.string().uuid()]).default(""),
  category: z.enum(["AUCTION", "SEIZED", "BOTH"]).default("AUCTION"),
  propertyType: z.enum(["HOUSE", "APARTMENT", "LAND", "SHOPHOUSE"]).default("HOUSE"),
  city: text(120), district: text(120), address: text(8000), description: text(16000), specifications: text(8000),
  limitPrice: money, depositAmount: money, seller: text(255), organizer: text(255), contactName: text(255), contactPhone: text(80),
  sourceUrl: text(1000).refine(v => { try { return !v || ["https:", "http:"].includes(new URL(v).protocol); } catch { return false; } }, "URL harus http/https"),
  sourceText: text(16000), termsNotes: text(16000), resultNotes: text(8000),
  status: z.enum(["DRAFT", "ACTIVE", "EXPIRED", "CANCELLED", "COMPLETED"]).default("DRAFT"),
  activeFrom: date, activeUntil: date,
  durationMonths: text(3).refine(v => !v || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 120), "Durasi 1–120 bulan"),
  auctionAt: instant, depositDeadline: instant,
}).superRefine((v, ctx) => {
  const end = v.activeUntil || addCalendarMonths(v.activeFrom, Number(v.durationMonths));
  if (v.status === "ACTIVE" && (!v.activeFrom || !end)) ctx.addIssue({code: "custom", message: "Status aktif memerlukan tanggal mulai dan berakhir"});
  if (v.activeUntil && !v.activeFrom) ctx.addIssue({code: "custom", message: "Isi tanggal mulai"});
  if (end && v.activeFrom && end < v.activeFrom) ctx.addIssue({code: "custom", message: "Tanggal berakhir tidak boleh sebelum tanggal mulai"});
  if (v.auctionAt && v.depositDeadline && v.depositDeadline > v.auctionAt) ctx.addIssue({code: "custom", message: "Batas deposit tidak boleh setelah jadwal lelang"});
  if (v.status === "COMPLETED" && !v.resultNotes) ctx.addIssue({code: "custom", message: "Isi catatan hasil/konfirmasi penyelenggara sebelum menyelesaikan"});
});
export type AuctionForm = z.infer<typeof auctionInput>;
export const emptyAuction: AuctionForm = auctionInput.parse({ title: "Properti baru" });
emptyAuction.title = "";
export function effectiveStatus(record: {status: string; activeFrom?: string | null; activeUntil?: string | null}, today = jakartaToday()) {
  if (record.status !== "ACTIVE") return record.status;
  if (record.activeUntil && record.activeUntil < today) return "EXPIRED";
  if (record.activeFrom && record.activeFrom > today) return "SCHEDULED";
  return "ACTIVE";
}
export function auctionData(v: AuctionForm) {
  const end = v.activeUntil || addCalendarMonths(v.activeFrom, Number(v.durationMonths));
  return { ...v, propertyId: v.propertyId || null, limitPrice: v.limitPrice || null, depositAmount: v.depositAmount || null,
    activeFrom: v.activeFrom ? new Date(v.activeFrom + "T00:00:00Z") : null,
    activeUntil: end ? new Date(end + "T00:00:00Z") : null,
    durationMonths: v.durationMonths ? Number(v.durationMonths) : null,
    auctionAt: v.auctionAt ? new Date(v.auctionAt + ":00+07:00") : null,
    depositDeadline: v.depositDeadline ? new Date(v.depositDeadline + ":00+07:00") : null };
}

// Conservative local extraction: unknown fields stay blank; never infer an auction winner.
export function parseAuctionMessage(raw: string): Partial<AuctionForm> {
  const lines = raw.replace(/\r/g, "").split("\n").map(l => l.replace(/[*_~`]/g, "").trim()).filter(Boolean);
  const read = (label: string) => lines.map(l => l.match(new RegExp("^(?:[-•*#\\d.]+\\s*)?(?:" + label + ")\\s*[:=]\\s*(.+)$", "i"))).find(Boolean)?.[1]?.trim() || "";
  const amount = (s: string) => {
    const m = s.match(/^(?:rp\.?\s*)?(\d[\d.,]*)\s*(miliar|milyar|m|juta|jt)?(?:\s|$|[-–])/i);
    if (!m || s.includes("%")) return "";
    const n = m[2] ? Number(m[1].replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".")) * (/^m/i.test(m[2]) ? 1e9 : 1e6) : Number(m[1].replace(/[.,]/g, ""));
    return Number.isSafeInteger(n) && n >= 0 && n < 1e15 ? String(n) : "";
  };
  const seized = /\bsitaan\b/i.test(raw), auction = /\blelang\b/i.test(raw);
  return {title: (lines[0] || "").slice(0,255), sourceText: raw, description: raw,
    category: seized ? auction ? "BOTH" : "SEIZED" : "AUCTION",
    propertyType: /\bruko\b/i.test(raw) ? "SHOPHOUSE" : /\bapartemen\b/i.test(raw) ? "APARTMENT" : /\btanah\b/i.test(lines[0] || "") && !/rumah/i.test(lines[0] || "") ? "LAND" : "HOUSE",
    city: read("kota|kabupaten|kota/kabupaten"), district: read("kecamatan"), address: read("alamat|lokasi"),
    specifications: lines.filter(l => /\b(lt|lb|luas|kamar|shm|shgb|sertifikat|lantai)\b/i.test(l)).join("\n"),
    limitPrice: amount(read("nilai limit|harga limit|harga lelang|limit|harga")), depositAmount: amount(read("deposit|uang jaminan|jaminan lelang|jaminan")),
    durationMonths: raw.match(/(?:masa aktif|durasi|aktif selama|aktif)\s*[:=]?\s*(\d{1,3})\s*(?:bulan|bln)/i)?.[1] || "",
    seller: read("bank|penjual|kreditur|pemilik"), organizer: read("penyelenggara|kpknl|balai lelang|kantor lelang"), contactName: read("kontak|perantara|pic"), contactPhone: read("whatsapp|wa|telepon|hp"),
    sourceUrl: read("sumber|link|url"), status: "DRAFT" };
}
