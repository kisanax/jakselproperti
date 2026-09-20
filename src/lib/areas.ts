import type { PrismaClient } from "@prisma/client";

export const areaSelect = {
  id: true,
  name: true,
  slug: true,
  level: true,
  parentId: true,
} as const;

export type AreaSummary = {
  id: number;
  name: string;
  slug: string;
  level: number;
  parentId: number | null;
};

export async function getArea(prisma: PrismaClient, id: number) {
  return prisma.area.findUnique({ where: { id }, select: areaSelect });
}

export async function getKecamatanArea(prisma: PrismaClient, id: number) {
  const area = await prisma.area.findUnique({
    where: { id },
    select: { id: true, level: true, officialCode: true },
  });
  return area?.level === 3 ? area : null;
}

export async function getVillageArea(
  prisma: PrismaClient,
  id: number,
  kecamatanId: number
) {
  const area = await prisma.area.findUnique({
    where: { id },
    select: { id: true, level: true, parentId: true },
  });
  return area?.level === 4 && area.parentId === kecamatanId ? area : null;
}

export async function getAreaAncestors(
  prisma: PrismaClient,
  id: number
): Promise<AreaSummary[] | null> {
  const chain: AreaSummary[] = [];
  let currentId: number | null = id;

  while (currentId !== null && chain.length < 4) {
    const area: AreaSummary | null = await getArea(prisma, currentId);
    if (!area) return null;
    chain.unshift(area);
    currentId = area.parentId;
  }

  if (chain[0]?.level !== 1 || chain.some((area, index) => area.level !== index + 1)) {
    return null;
  }

  return chain;
}

export async function getAreaChildren(
  prisma: PrismaClient,
  level: number,
  parentId: number | null,
  query?: string
) {
  return prisma.area.findMany({
    where: {
      isActive: true,
      level,
      parentId,
      ...(level === 4 && query ? { name: { contains: query } } : {}),
    },
    select: areaSelect,
    orderBy: { name: "asc" },
    ...(level === 4 ? { take: 30 } : {}),
  });
}
