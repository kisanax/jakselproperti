import type { BrokerOrganization } from "./types";

// Design-review fixtures only. All addresses and contacts use non-production example data.
export const mockOrganizations: BrokerOrganization[] = [
  {
    id: "org-nusantara-prime",
    code: "BRK-0001",
    slug: "nusantara-prime-realty",
    name: "Nusantara Prime Realty",
    initials: "NP",
    legalName: "PT Nusantara Prime Realty",
    type: "BROKERAGE",
    status: "VERIFIED",
    email: "office@nusantaraprime.example.test",
    phone: "+62 21 0000 1201",
    whatsapp: "+62 811 0000 1201",
    website: "https://nusantaraprime.example.test",
    address: "Alamat kantor contoh untuk kebutuhan prototype",
    city: "Jakarta Selatan",
    province: "DKI Jakarta",
    serviceAreas: "DKI Jakarta, Tangerang Selatan, Depok",
    description: "Broker properti dengan fokus pada hunian premium, properti sekunder, dan investasi.",
    principalName: "Rina Putri",
    joinedAt: "12 Agustus 2026",
    memberCount: 18,
    listingCount: 126,
    activeLeadCount: 47,
    branches: [
      { id: "branch-jaksel", name: "Jakarta Selatan", city: "Jakarta Selatan", memberCount: 12, listingCount: 88, isHeadOffice: true },
      { id: "branch-tangsel", name: "Tangerang Selatan", city: "Tangerang Selatan", memberCount: 6, listingCount: 38, isHeadOffice: false },
    ],
  },
  {
    id: "org-arunika-network",
    code: "BRK-0002",
    slug: "arunika-property-network",
    name: "Arunika Property Network",
    initials: "AP",
    legalName: "PT Arunika Properti Nusantara",
    type: "BROKERAGE",
    status: "PENDING",
    email: "hello@arunika.example.test",
    phone: "+62 22 0000 1408",
    whatsapp: "+62 857 0000 1408",
    website: "https://arunika.example.test",
    address: "Alamat kantor contoh untuk kebutuhan prototype",
    city: "Bandung",
    province: "Jawa Barat",
    serviceAreas: "Bandung Raya, Surabaya",
    description: "Jaringan pemasaran properti residensial dan komersial lintas kota.",
    principalName: "Bayu Wicaksono",
    joinedAt: "1 September 2026",
    memberCount: 11,
    listingCount: 74,
    activeLeadCount: 29,
    branches: [
      { id: "branch-bandung", name: "Bandung", city: "Bandung", memberCount: 7, listingCount: 51, isHeadOffice: true },
      { id: "branch-surabaya", name: "Surabaya", city: "Surabaya", memberCount: 4, listingCount: 23, isHeadOffice: false },
    ],
  },
];

export function getMockOrganization(id: string) {
  return mockOrganizations.find((organization) => organization.id === id);
}
