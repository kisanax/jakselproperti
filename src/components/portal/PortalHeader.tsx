import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import logo from "../../../public/logo.png";
import AccountDropdown from "./AccountDropdown";
import SmartHeader from "./SmartHeader";
import PortalSubnav from "./PortalSubnav";
import CompactSearchPill from "./CompactSearchPill";

interface PortalHeaderProps {
  activeType?: string;
  initialArea?: string;
  initialBudget?: string;
  initialAreaName?: string;
}

const TYPE_NAMES: Record<string, string> = {
  HOUSE: "Rumah",
  APARTMENT: "Apartemen",
  LAND: "Tanah",
  SHOPHOUSE: "Ruko",
};

const BUDGET_NAMES: Record<string, string> = {
  under5: "< Rp5 M",
  "5to10": "Rp5–10 M",
  "10to25": "Rp10–25 M",
  above25: "> Rp25 M",
};

export default async function PortalHeader({
  activeType = "",
  initialArea = "",
  initialBudget = "",
  initialAreaName = "",
}: PortalHeaderProps) {
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const user = session?.user;
  const accountHref = user?.platformRole === "MEMBER" ? "/akun" : "/admin";
  const accountLabel = user?.platformRole === "MEMBER" ? "Akun Saya" : "Mode Agen";

  const currentTypeLabel = TYPE_NAMES[activeType] || "Semua Jenis";
  const currentBudgetLabel = BUDGET_NAMES[initialBudget] || "Semua Harga";
  const currentAreaLabel = initialAreaName || (initialArea ? "Area Terpilih" : "Semua Lokasi");

  return (
    <SmartHeader
      logoSlot={
        <Link className="brand" href="/" aria-label="Jakarta Selatan Properti — Beranda">
          <Image src={logo} alt="Jakarta Selatan Properti" priority />
        </Link>
      }
      compactSearchSlot={
        <CompactSearchPill
          areaLabel={currentAreaLabel}
          typeLabel={currentTypeLabel}
          budgetLabel={currentBudgetLabel}
        />
      }
      searchSlot={
        <PortalSubnav
          activeType={activeType}
          initialArea={initialArea}
          initialBudget={initialBudget}
        />
      }
      navSlot={
        <>
          <nav className="desktop-nav" aria-label="Navigasi utama">
            <Link
              href={isLoggedIn ? accountHref : "/daftar-broker"}
              className="nav-agent-btn"
            >
              {isLoggedIn ? accountLabel : "Jadi Agen"}
            </Link>

            <AccountDropdown
              userName={user?.name ?? null}
              userEmail={user?.email ?? null}
              userImage={user?.image ?? null}
              platformRole={user?.platformRole ?? null}
              isLoggedIn={isLoggedIn}
            />
          </nav>

          <details className="mobile-menu">
            <summary aria-label="Buka menu navigasi">
              <span />
              <span />
              <span />
            </summary>
            <nav aria-label="Navigasi mobile">
              <Link href={isLoggedIn ? accountHref : "/daftar-broker"}>
                {isLoggedIn ? accountLabel : "Jadi Agen"}
              </Link>
              {isLoggedIn && user ? (
                <>
                  {user.platformRole === "MEMBER" ? (
                    <>
                      <Link href="/akun">Akun Saya</Link>
                      <Link href="/daftar-broker">Menjadi Broker</Link>
                    </>
                  ) : (
                    <>
                      <Link href="/admin">Dashboard Operasional</Link>
                      <Link href="/admin/properties">Kelola Properti</Link>
                      <Link href="/admin/settings">Pengaturan Akun</Link>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Link href="/login">Masuk</Link>
                  <Link href="/daftar-broker">Daftar</Link>
                </>
              )}
            </nav>
          </details>

          <a
            className="mobile-call"
            href="tel:+6281234567890"
            aria-label="Telepon Jakarta Selatan Properti"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7.1 3.8 9 3.3c.5-.1 1 .2 1.2.7l1 2.6c.2.5 0 1-.4 1.3L9.4 9c.9 2 2.6 3.7 4.6 4.6l1.1-1.4c.3-.4.9-.6 1.3-.4l2.6 1c.5.2.8.7.7 1.2l-.5 1.9c-.2 1-1.1 1.7-2.1 1.7A12.7 12.7 0 0 1 4.4 4.9c0-1 .7-1.9 1.7-2.1Z" />
            </svg>
          </a>
        </>
      }
    />
  );
}
