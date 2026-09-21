import Link from "next/link";
import { redirect } from "next/navigation";
import PortalHeader from "@/components/portal/PortalHeader";
import MobileBottomNav from "@/components/portal/MobileBottomNav";
import { getAccountAccess } from "@/lib/broker-workspace-access";
import styles from "./favorites.module.css";

export default async function FavoritesPage() {
  const access = await getAccountAccess();
  if (access.kind === "unauthenticated") redirect("/login?returnTo=/favorit");

  return (
    <main className={styles.page}>
      <PortalHeader />
      <section className={styles.content}>
        <div className={styles.icon} aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg>
        </div>
        <p className={styles.eyebrow}>Koleksi pribadi</p>
        <h1>Properti favorit</h1>
        <p>Simpan properti yang menarik agar mudah dibandingkan dan ditemukan kembali.</p>
        <div className={styles.notice}>Belum ada properti yang disimpan.</div>
        <Link href="/" className={styles.action}>Jelajahi properti</Link>
      </section>
      <MobileBottomNav />
    </main>
  );
}
