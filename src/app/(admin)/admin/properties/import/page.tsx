import { prisma } from "@/lib/prisma";
import ImportPropertyClient from "./ImportPropertyClient";

export const dynamic = "force-dynamic";

export default async function ImportPropertyPage() {
  const [areas, kawasanList] = await Promise.all([
    prisma.area.findMany({
      where: { level: 1, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.kawasan.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return <ImportPropertyClient areas={areas} kawasanList={kawasanList} />;
}
