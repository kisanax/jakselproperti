import { prisma } from "@/lib/prisma";
import KawasanList from "./KawasanList";

export const dynamic = "force-dynamic";

export default async function KawasanPage() {
  const kawasan = await prisma.kawasan.findMany({
    include: {
      area: {
        select: { id: true, name: true, slug: true },
      },
      _count: {
        select: { properties: true },
      },
    },
    orderBy: [
      { isFeatured: "desc" },
      { sortOrder: "asc" },
      { name: "asc" },
    ],
  });

  return (
    <div className="animate-fade-in">
      <KawasanList initialKawasan={kawasan} />
    </div>
  );
}
