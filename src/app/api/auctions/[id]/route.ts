import { prisma } from "@/lib/prisma";
import { auctionInput, auctionData } from "@/lib/auctions";
import { serializeAuction } from "@/lib/auction-records";
type Context = {params:Promise<{id:string}>};
export async function GET(_req:Request, ctx:Context) {
  const {id} = await ctx.params;
  const row = await prisma.auctionRecord.findUnique({where:{id}});
  return row ? Response.json(serializeAuction(row), {headers:{"Cache-Control":"no-store"}}) : Response.json({error:"Tidak ditemukan"},{status:404});
}
export async function PUT(req:Request, ctx:Context) {
  const {id} = await ctx.params;
  let body:unknown;
  try {body=await req.json();} catch {return Response.json({error:"JSON tidak valid"},{status:400});}
  const parsed=auctionInput.safeParse(body);
  if(!parsed.success) return Response.json({error:parsed.error.issues[0].message},{status:400});
  if(!await prisma.auctionRecord.findUnique({where:{id},select:{id:true}})) return Response.json({error:"Tidak ditemukan"},{status:404});
  if(parsed.data.propertyId && !await prisma.property.findUnique({where:{id:parsed.data.propertyId},select:{id:true}})) return Response.json({error:"Properti terkait tidak ditemukan"},{status:400});
  try {
    await prisma.auctionRecord.update({where:{id},data:auctionData(parsed.data)});
    return Response.json({id});
  } catch {return Response.json({error:"Gagal menyimpan perubahan"},{status:500});}
}
