import { prisma } from "@/lib/prisma";
import { effectiveStatus, type AuctionForm } from "./auctions";
import type { AuctionRecord } from "@prisma/client";

export type AuctionView = AuctionForm & { id: string; effectiveStatus: string; photos: string[] };
const wib = (date: Date | null) => date ? new Date(date.getTime() + 7 * 3600000).toISOString().slice(0,16) : "";
export function serializeAuction(row: AuctionRecord): AuctionView {
  const values = Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value == null ? "" : String(value)]));
  const form = { ...values, activeFrom: row.activeFrom?.toISOString().slice(0,10) || "", activeUntil: row.activeUntil?.toISOString().slice(0,10) || "", auctionAt: wib(row.auctionAt), depositDeadline: wib(row.depositDeadline) } as AuctionForm;
  return { ...form, id: row.id, effectiveStatus: effectiveStatus(form), photos: Array.isArray(row.photos) ? row.photos.filter((v): v is string => typeof v === "string") : [] };
}
export async function getAuctionRecords() {
  return (await prisma.auctionRecord.findMany({ orderBy: { updatedAt: "desc" } })).map(serializeAuction);
}
