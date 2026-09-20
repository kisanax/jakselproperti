import { describe, expect, it } from "vitest";
import {
  allowedListingTransitions,
  canAccessManagedListing,
  canAccessPropertyWithManagers,
  canTransitionListing,
  listingAccessFilter,
  propertyAccessFilter,
  validatePublishCompleteness,
  type OperationalActor,
} from "../services/property-listing-access";

const staff: OperationalActor = { userId: "staff-1", role: "SUPPORT" };
const broker: OperationalActor = { userId: "broker-1", role: "BROKER" };

describe("property and listing ownership filters", () => {
  it("does not constrain staff", () => {
    expect(listingAccessFilter(staff)).toEqual({});
    expect(propertyAccessFilter(staff)).toEqual({});
  });

  it("scopes brokers to their managed listings and properties", () => {
    expect(listingAccessFilter(broker)).toEqual({ managedById: "broker-1" });
    expect(propertyAccessFilter(broker)).toEqual({
      listings: { some: { managedById: "broker-1" } },
    });
  });

  it("verifies resource ownership while allowing staff access", () => {
    expect(canAccessManagedListing(broker, "broker-1")).toBe(true);
    expect(canAccessManagedListing(broker, "broker-2")).toBe(false);
    expect(canAccessPropertyWithManagers(broker, ["broker-2", "broker-1"])).toBe(true);
    expect(canAccessPropertyWithManagers(broker, [null, "broker-2"])).toBe(false);
    expect(canAccessManagedListing(staff, null)).toBe(true);
  });
});

describe("listing publishing permissions", () => {
  it("only lets brokers submit a draft for verification", () => {
    expect(allowedListingTransitions(broker, "DRAFT")).toEqual([
      "PENDING_VERIFICATION",
    ]);
    expect(canTransitionListing(broker, "DRAFT", "ACTIVE")).toBe(false);
    expect(allowedListingTransitions(broker, "PENDING_VERIFICATION")).toEqual([]);
  });

  it("retains the valid staff workflow", () => {
    expect(canTransitionListing(staff, "PENDING_VERIFICATION", "READY_TO_PUBLISH")).toBe(true);
    expect(canTransitionListing(staff, "READY_TO_PUBLISH", "ACTIVE")).toBe(true);
    expect(canTransitionListing(staff, "DRAFT", "ACTIVE")).toBe(false);
  });
});

describe("publish completeness", () => {
  it("reports every missing publish requirement", () => {
    expect(
      validatePublishCompleteness({
        ownerCount: 0,
        hasPrimaryPhoto: false,
        title: " ",
        description: null,
        askingPrice: 0,
        priceOnRequest: false,
      })
    ).toHaveLength(5);
  });

  it("accepts a complete listing with price on request", () => {
    expect(
      validatePublishCompleteness({
        ownerCount: 1,
        hasPrimaryPhoto: true,
        title: "Rumah di Kemang",
        description: "Deskripsi lengkap",
        askingPrice: 0,
        priceOnRequest: true,
      })
    ).toEqual([]);
  });
});
