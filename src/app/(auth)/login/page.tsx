import Link from "next/link";
import Image from "next/image";
import { googleEnabled } from "@/auth";
import { redirect } from "next/navigation";
import { getAccountAccess } from "@/lib/broker-workspace-access";
import styles from "../auth.module.css";
import { signInWithEmail, signInWithGoogle } from "./actions";
import GoogleMark from "../daftar-broker/GoogleMark";

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

        <div className={`${styles.divider} ${styles.loginDivider}`}><span>atau</span></div>
        <form action={signInWithGoogle} className={styles.socialLogin}>
          <input type="hidden" name="returnTo" value={returnTo} />
          <button
            type="submit"
            className={styles.googleIconButton}
            aria-label={googleEnabled ? "Masuk dengan Google" : "Masuk dengan Google belum dikonfigurasi"}
            title={googleEnabled ? "Masuk dengan Google" : "Google OAuth belum dikonfigurasi"}
            disabled={!googleEnabled}
          >
            <GoogleMark className={styles.googleIcon} />
          </button>
        </form>

        <p className={styles.loginLegal}>
          Belum punya akun? <Link href="/daftar-broker">Daftar broker</Link>
        </p>
      </div>

      <nav className={styles.loginMobileNav} aria-label="Navigasi portal">
        <Link href="/">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
          <span>Jelajah</span>
        </Link>
        <Link href="/jual">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-7 9 7v9H3v-9Z"/><path d="M9 20v-6h6v6"/></svg>
          <span>Dijual</span>
        </Link>
        <Link href="/login" className={styles.loginNavActive} aria-current="page">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="9" r="3"/><path d="M6.5 18a7 7 0 0 1 11 0"/></svg>
          <span>Masuk</span>
        </Link>
      </nav>
    </section>
  );
}
