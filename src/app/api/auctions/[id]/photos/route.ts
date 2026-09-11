import { prisma } from "@/lib/prisma";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export async function POST(req:Request, ctx:{params:Promise<{id:string}>}) {
  const {id}=await ctx.params;
  const row=await prisma.auctionRecord.findUnique({where:{id},select:{id:true}});
  if(!row) return Response.json({error:"Catatan tidak ditemukan"},{status:404});
  const form=await req.formData(); const file=form.get("file");
  if(!(file instanceof File) || !["image/jpeg","image/png","image/webp"].includes(file.type) || file.size>10*1024*1024 || !file.size) return Response.json({error:"Foto harus JPG/PNG/WebP maksimal 10 MB"},{status:400});
  let bytes:Buffer;
  try {bytes=await sharp(Buffer.from(await file.arrayBuffer()), {limitInputPixels:40000000}).rotate().resize({width:1920,height:1920,fit:"inside",withoutEnlargement:true}).webp({quality:82}).toBuffer();}
  catch {return Response.json({error:"File gambar tidak dapat dibaca"},{status:400});}
  const key=`auctions/${id}/${randomUUID()}.webp`;
  const disk=path.join(process.cwd(),"public","uploads",key);
  await mkdir(path.dirname(disk),{recursive:true});
  await writeFile(disk,bytes);
  try {
    // Serialize updates so concurrent uploads cannot replace one another's array.
    await prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM auction_records WHERE id = ${id} FOR UPDATE`;
      const current=await tx.auctionRecord.findUniqueOrThrow({where:{id}});
      const photos=Array.isArray(current.photos)?current.photos:[];
      if(photos.length>=30) throw new Error("PHOTO_LIMIT");
      await tx.auctionRecord.update({where:{id},data:{photos:[...photos,`/uploads/${key}`]}});
    });
    return Response.json({url:`/uploads/${key}`},{status:201});
  } catch {
    await unlink(disk).catch(()=>{});
    return Response.json({error:"Foto gagal disimpan atau batas 30 foto sudah tercapai"},{status:400});
  }
}
