import UserWorksheet from "../UserWorksheet";

export default async function NewUserPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams;
  return <UserWorksheet mode="create" defaultRole={role === "BROKER" ? "BROKER" : "MEMBER"} />;
}
