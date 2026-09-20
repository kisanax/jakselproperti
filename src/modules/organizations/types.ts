export type OrganizationStatus = "VERIFIED" | "PENDING" | "SUSPENDED" | "ARCHIVED";
export type OrganizationType = "BROKERAGE" | "INDEPENDENT";

export type OrganizationBranch = {
  id: string;
  name: string;
  city: string;
  memberCount: number;
  listingCount: number;
  isHeadOffice: boolean;
};

export type BrokerOrganization = {
  id: string;
  code: string;
  slug: string;
  name: string;
  initials: string;
  legalName: string;
  type: OrganizationType;
  status: OrganizationStatus;
  email: string;
  phone: string;
  whatsapp: string;
  website: string;
  address: string;
  city: string;
  province: string;
  serviceAreas: string;
  description: string;
  principalName: string;
  joinedAt: string;
  memberCount: number;
  listingCount: number;
  activeLeadCount: number;
  branches: OrganizationBranch[];
};
