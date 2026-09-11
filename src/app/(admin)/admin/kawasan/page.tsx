import { prisma } from "@/lib/prisma";
import KawasanList from "./KawasanList";

export const dynamic = "force-dynamic";

export default async function KawasanPage() {
  const [areas, kawasan] = await Promise.all([
    // 10 Kecamatan resmi
    prisma.area.findMany({
      where: { level: 1 },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
    // Daftar kawasan populer
    prisma.kawasan.findMany({
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
    }),
  ]);

  return (
    <div className="animate-fade-in">
      <KawasanList initialKawasan={kawasan} areas={areas} />
    </div>
  );
}
