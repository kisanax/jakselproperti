import type { ListingStatus, PlatformRole, Prisma } from "@prisma/client";

export type OperationalActor = {
  userId: string;
  role: PlatformRole;
};

export function isOperationalStaff(actor: OperationalActor): boolean {
  return actor.role === "SUPER_ADMIN" || actor.role === "SUPPORT";
}

export function listingAccessFilter(
  actor: OperationalActor
): Prisma.ListingWhereInput {
  return isOperationalStaff(actor) ? {} : { managedById: actor.userId };
}

export function propertyAccessFilter(
  actor: OperationalActor
): Prisma.PropertyWhereInput {
  return isOperationalStaff(actor)
    ? {}
    : { listings: { some: { managedById: actor.userId } } };
}

export function canAccessManagedListing(
  actor: OperationalActor,
  managedById: string | null
): boolean {
  return isOperationalStaff(actor) || managedById === actor.userId;
}

export function canAccessPropertyWithManagers(
  actor: OperationalActor,
  managedByIds: Array<string | null>
): boolean {
  return (
    isOperationalStaff(actor) ||
    managedByIds.some((managedById) => managedById === actor.userId)
  );
}

export function combineListingFilters(
  actor: OperationalActor,
  filter: Prisma.ListingWhereInput
): Prisma.ListingWhereInput {
  return { AND: [listingAccessFilter(actor), filter] };
}

export function combinePropertyFilters(
  actor: OperationalActor,
  filter: Prisma.PropertyWhereInput
): Prisma.PropertyWhereInput {
  return { AND: [propertyAccessFilter(actor), filter] };
}

export const VALID_LISTING_TRANSITIONS: Record<ListingStatus, ListingStatus[]> = {
  DRAFT: ["PENDING_VERIFICATION"],
  PENDING_VERIFICATION: ["READY_TO_PUBLISH", "DRAFT"],
  READY_TO_PUBLISH: ["ACTIVE", "DRAFT"],
  ACTIVE: ["IN_NEGOTIATION", "SUSPENDED", "WITHDRAWN", "EXPIRED"],
  IN_NEGOTIATION: ["SOLD", "ACTIVE", "SUSPENDED"],
  SOLD: ["ARCHIVED"],
  SUSPENDED: ["ACTIVE", "WITHDRAWN", "ARCHIVED"],
  WITHDRAWN: ["ARCHIVED", "DRAFT"],
  EXPIRED: ["ARCHIVED", "DRAFT"],
  ARCHIVED: [],
};

export function allowedListingTransitions(
  actor: OperationalActor,
  currentStatus: ListingStatus
): ListingStatus[] {
  if (!isOperationalStaff(actor)) {
    return currentStatus === "DRAFT" ? ["PENDING_VERIFICATION"] : [];
  }

  return VALID_LISTING_TRANSITIONS[currentStatus];
}

export function canTransitionListing(
  actor: OperationalActor,
  currentStatus: ListingStatus,
  nextStatus: ListingStatus
): boolean {
  return allowedListingTransitions(actor, currentStatus).includes(nextStatus);
}

export type PublishCompletenessInput = {
  ownerCount: number;
  hasPrimaryPhoto: boolean;
  title: string | null | undefined;
  description: string | null | undefined;
  askingPrice: number | null | undefined;
  priceOnRequest: boolean;
};

export function validatePublishCompleteness(
  listing: PublishCompletenessInput
): string[] {
  const errors: string[] = [];

  if (listing.ownerCount < 1) errors.push("Owner properti belum dihubungkan");
  if (!listing.hasPrimaryPhoto) errors.push("Foto utama properti belum tersedia");
  if (!listing.title?.trim()) errors.push("Judul listing wajib diisi");
  if (!listing.description?.trim()) errors.push("Deskripsi listing wajib diisi");
  if (!listing.priceOnRequest && (!listing.askingPrice || listing.askingPrice <= 0)) {
    errors.push("Harga penawaran wajib diisi atau aktifkan price on request");
  }

  return errors;
}

export function requiresPublishCompleteness(status: ListingStatus): boolean {
  return status === "READY_TO_PUBLISH" || status === "ACTIVE";
}
