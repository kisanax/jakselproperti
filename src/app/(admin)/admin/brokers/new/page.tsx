import { redirect } from "next/navigation";

export default function NewBrokerPage() {
  redirect("/admin/users/new?role=BROKER");
}
