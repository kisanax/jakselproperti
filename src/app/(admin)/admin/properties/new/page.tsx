import { prisma } from "@/lib/prisma";
import PropertyForm from "./PropertyForm";

export const dynamic = "force-dynamic";

// =============================================================================
// Server component: fetch areas, amenities & kawasan for the form
// =============================================================================

async function getFormData() {
  const [areas, amenities, kawasan] = await Promise.all([
    prisma.area.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { name: "asc" },
        },
      },
    }),
    prisma.amenity.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    prisma.kawasan.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, areaId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Flatten areas for autocomplete (kecamatan + kelurahan)
  const flatAreas = areas.flatMap((kecamatan) => [
    {
      id: kecamatan.id,
      name: kecamatan.name,
      slug: kecamatan.slug,
      level: kecamatan.level,
      parentName: null as string | null,
    },
    ...kecamatan.children.map((kelurahan) => ({
      id: kelurahan.id,
      name: kelurahan.name,
      slug: kelurahan.slug,
      level: kelurahan.level,
      parentName: kecamatan.name,
    })),
  ]);

  // Group amenities by category
  const amenitiesByCategory = amenities.reduce(
    (acc, amenity) => {
      const cat = amenity.category || "Lainnya";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push({
        id: amenity.id,
        name: amenity.name,
        slug: amenity.slug,
        icon: amenity.icon,
      });
      return acc;
    },
    {} as Record<string, { id: string; name: string; slug: string; icon: string | null }[]>
  );

  return { flatAreas, amenitiesByCategory, kawasan };
}

export default async function NewPropertyPage() {
  const { flatAreas, amenitiesByCategory, kawasan } = await getFormData();

  return (
    <div className="animate-fade-in" style={{ maxWidth: 680, margin: "0 auto" }}>
      <PropertyForm
        areas={flatAreas}
        amenitiesByCategory={amenitiesByCategory}
        kawasan={kawasan}
      />
    </div>
  );
}
