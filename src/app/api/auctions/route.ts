import { prisma } from "@/lib/prisma";
import { auctionInput, auctionData } from "@/lib/auctions";
import { getAuctionRecords } from "@/lib/auction-records";

export async function GET() {
  return Response.json({ records: await getAuctionRecords() }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({error: "JSON tidak valid"}, {status:400}); }
  const parsed = auctionInput.safeParse(body);
  if (!parsed.success) return Response.json({error: parsed.error.issues[0].message}, {status:400});
  const v = parsed.data;
  if (v.propertyId && !await prisma.property.findUnique({where:{id:v.propertyId},select:{id:true}})) return Response.json({error:"Properti terkait tidak ditemukan"},{status:400});
  if (v.sourceText) {
    const existing = await prisma.auctionRecord.findFirst({where:{sourceText:v.sourceText},select:{id:true}});
    if (existing) return Response.json({error:"Pesan ini sudah diimpor. Buka catatan yang ada untuk memperbaruinya.", existingId:existing.id},{status:409});
  }
  try {
    const row = await prisma.auctionRecord.create({data:auctionData(v)});
    return Response.json({id:row.id},{status:201});
  } catch { return Response.json({error:"Gagal menyimpan catatan lelang"},{status:500}); }
}
