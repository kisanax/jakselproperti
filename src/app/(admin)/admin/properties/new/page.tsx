import { prisma } from "@/lib/prisma";
import PropertyForm from "./PropertyForm";

export const dynamic = "force-dynamic";

// =============================================================================
// Server component: fetch amenities & kawasan for the form
// =============================================================================

async function getFormData() {
  const [amenities, kawasan] = await Promise.all([
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

  return { amenitiesByCategory, kawasan };
}

export default async function NewPropertyPage() {
  const { amenitiesByCategory, kawasan } = await getFormData();

  return (
    <div className="animate-fade-in" style={{ maxWidth: 680, margin: "0 auto" }}>
      <PropertyForm
        amenitiesByCategory={amenitiesByCategory}
        kawasan={kawasan}
      />
    </div>
  );
}
