import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializeAuction } from "@/lib/auction-records";
import AuctionForm from "../AuctionForm";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  const [record,properties]=await Promise.all([prisma.auctionRecord.findUnique({where:{id}}),prisma.property.findMany({select:{id:true,code:true,address:true},orderBy:{createdAt:"desc"}})]);
  if(!record) notFound();
  return <AuctionForm initial={serializeAuction(record)} properties={properties}/>;
}
