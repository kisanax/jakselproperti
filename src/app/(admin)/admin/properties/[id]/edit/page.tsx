import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EditPropertyClient from "./EditPropertyClient";
import { getCurrentOperationalActor } from "@/lib/api-auth";
import {
  combinePropertyFilters,
  listingAccessFilter,
} from "@/lib/services/property-listing-access";

export const dynamic = "force-dynamic";

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const operational = await getCurrentOperationalActor();
  if (!operational) notFound();
  const { id } = await params;

  const [property, kawasanList] = await Promise.all([
    prisma.property.findFirst({
      where: combinePropertyFilters(operational.actor, { OR: [{ id }, { code: id }] }),
      include: {
        area: { select: { name: true } },
        village: { select: { name: true } },
        listings: {
          where: listingAccessFilter(operational.actor),
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
    villageId: property.villageId,
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
      areaName={property.village?.name || property.area?.name}
      listing={listingData}
      amenities={amenitiesData}
      kawasanList={kawasanList}
      initialMedia={initialMedia}
    />
  );
}
