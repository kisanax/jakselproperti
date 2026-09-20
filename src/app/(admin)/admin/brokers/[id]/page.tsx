import { notFound } from "next/navigation";
import { getMockOrganization } from "@/modules/organizations/mock-organizations";
import BrokerWorksheet from "../BrokerWorksheet";

export default async function BrokerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const organization = getMockOrganization(id);
  if (!organization) notFound();
  return <BrokerWorksheet organization={organization} />;
}
