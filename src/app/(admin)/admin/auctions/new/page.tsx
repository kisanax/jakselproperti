import AuctionForm from "../AuctionForm";
import { prisma } from "@/lib/prisma";
export const dynamic="force-dynamic";
export default async function Page({searchParams}:{searchParams:Promise<{propertyId?:string}>}) {
  const properties=await prisma.property.findMany({select:{id:true,code:true,address:true},orderBy:{createdAt:"desc"}});
  const {propertyId}=await searchParams;
  const property=properties.find(p=>p.id===propertyId);
  return <AuctionForm properties={properties} preset={property?{propertyId:property.id,address:property.address}:undefined}/>;
}
