import { auth } from "@/auth";
import MobileBottomNavClient from "./MobileBottomNavClient";

export default async function MobileBottomNav() {
  const session = await auth();
  return <MobileBottomNavClient isLoggedIn={Boolean(session?.user)} />;
}
