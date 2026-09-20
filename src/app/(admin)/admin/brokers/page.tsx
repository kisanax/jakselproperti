import type { Metadata } from "next";
import { mockOrganizations } from "@/modules/organizations/mock-organizations";
import BrokerDirectory from "./BrokerDirectory";

export const metadata: Metadata = { title: "Broker & Cabang | Workspace" };

export default function BrokersPage() {
  return <BrokerDirectory organizations={mockOrganizations} />;
}
