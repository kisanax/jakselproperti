import Link from "next/link";
import Image from "next/image";
import { googleEnabled } from "@/auth";
import { redirect } from "next/navigation";
import { getAccountAccess } from "@/lib/broker-workspace-access";
import styles from "../auth.module.css";
import { signInWithEmail, signInWithGoogle } from "./actions";
import GoogleMark from "../daftar-broker/GoogleMark";
import MobileBottomNav from "@/components/portal/MobileBottomNav";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const access = await getAccountAccess();
  if (access.kind === "member") redirect("/akun");
  if (access.kind === "staff" || access.kind === "broker-verified") redirect("/admin");
  if (access.kind === "broker-incomplete" || access.kind === "broker-revision") redirect("/onboarding");
  if (access.kind.startsWith("broker-")) redirect("/onboarding/status");

  const query = await searchParams;
  const returnTo = typeof query.returnTo === "string" ? query.returnTo : "";
  return (
    <section className={`${styles.card} ${styles.loginCard}`}>
      <Link href="/" className={styles.loginClose} aria-label="Tutup dan kembali ke beranda">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
      </Link>

      <div className={styles.loginBody}>
        <Link href="/" className={styles.loginLogo} aria-label="Jakarta Selatan Properti — beranda">
          <Image src="/logo.png" alt="Jakarta Selatan Properti" width={230} height={80} priority />
        </Link>
        <h1 className={styles.loginTitle}>Masuk atau daftar</h1>

        <form action={signInWithEmail} className={styles.loginForm}>
          <input type="hidden" name="returnTo" value={returnTo} />
          <div className={styles.field}>
            <label htmlFor="email" className={styles.srOnly}>Email</label>
            <input id="email" name="email" className={styles.loginInput} type="email" inputMode="email" autoComplete="email" required placeholder="Email" />
          </div>
          <div className={styles.field}>
            <label htmlFor="password" className={styles.srOnly}>Kata sandi</label>
            <input id="password" name="password" className={styles.loginInput} type="password" autoComplete="current-password" required minLength={8} placeholder="Kata sandi" />
          </div>
          {query.error === "invalid-credentials" && (
            <p className={styles.formError} role="alert">Email atau password tidak sesuai.</p>
          )}
          <button type="submit" className={styles.primaryButton}>Masuk</button>
        </form>

        {googleEnabled && (
          <>
            <div className={`${styles.divider} ${styles.loginDivider}`}><span>atau</span></div>
            <form action={signInWithGoogle} className={styles.socialLogin}>
              <input type="hidden" name="returnTo" value={returnTo} />
              <button type="submit" className={styles.googleIconButton} aria-label="Masuk dengan Google" title="Masuk dengan Google">
                <GoogleMark className={styles.googleIcon} />
              </button>
            </form>
          </>
        )}

        <p className={styles.loginLegal}>
          Belum punya akun? <Link href={`/daftar?returnTo=${encodeURIComponent(returnTo || "/akun")}`}>Daftar</Link>
        </p>
      </div>

      <MobileBottomNav />
    </section>
  );
}
