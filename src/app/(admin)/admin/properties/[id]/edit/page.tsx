import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EditPropertyClient from "./EditPropertyClient";

export const dynamic = "force-dynamic";

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [property, areas, kawasanList] = await Promise.all([
    prisma.property.findFirst({
      where: { OR: [{ id }, { code: id }] },
      include: {
        area: { select: { name: true } },
        listings: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        amenities: {
          include: { amenity: true },
        },
        propertyMedia: {
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
    prisma.area.findMany({
      where: { level: 1, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    prisma.kawasan.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, areaId: true },
    }),
  ]);

  if (!property) {
    notFound();
  }

  const propertyData = {
    id: property.id,
    code: property.code,
    type: property.type,
    areaId: property.areaId,
    kawasanId: property.kawasanId,
    address: property.address,
    landArea: property.landArea ? Number(property.landArea) : null,
    buildingArea: property.buildingArea ? Number(property.buildingArea) : null,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    floors: property.floors,
    garages: property.garages,
    carports: property.carports,
    certificateType: property.certificateType,
    yearBuilt: property.yearBuilt,
    facing: property.facing,
    electricity: property.electricity,
    waterSource: property.waterSource,
    internalNotes: property.internalNotes,
  };

  const latestListing = property.listings[0];
  const listingData = latestListing
    ? {
        title: latestListing.title,
        description: latestListing.description,
        askingPrice: latestListing.askingPrice ? Number(latestListing.askingPrice) : null,
        videoUrl: latestListing.videoUrl,
        videoPlatform: latestListing.videoPlatform,
        status: latestListing.status,
      }
    : null;

  const amenitiesData = property.amenities.map((a) => ({
    amenity: {
      name: a.amenity.name,
      icon: a.amenity.icon,
    },
  }));

  const initialMedia = property.propertyMedia.map((m) => ({
    id: m.id,
    fileName: m.fileName,
    filePath: m.filePath,
    isPrimary: m.isPrimary,
    altText: m.altText,
    type: m.type,
  }));

  return (
    <EditPropertyClient
      property={propertyData}
      areaName={property.area?.name}
      listing={listingData}
      amenities={amenitiesData}
      areas={areas}
      kawasanList={kawasanList}
      initialMedia={initialMedia}
    />
  );
}
