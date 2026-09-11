import Link from "next/link";
import Image from "next/image";
import logo from "../../public/logo.png";

const PinIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"/><circle cx="12" cy="10" r="2.2"/></svg>
);

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-7 9 7v9H3v-9Z"/><path d="M9 20v-6h6v6"/></svg>
);

const PriceIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M15 8.5c-.6-.7-1.6-1-2.8-1-1.7 0-2.7.7-2.7 1.8 0 2.8 5.4 1.2 5.4 4.3 0 1.2-1.1 2-2.9 2-1.2 0-2.3-.4-3-1.1M12 5.5v13"/></svg>
);

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Jakarta Selatan Properti — Beranda">
          <Image
            src={logo}
            alt="Jakarta Selatan Properti"
            priority
          />
        </Link>
        <nav className="desktop-nav" aria-label="Navigasi utama">
          <a href="#jual">Properti Dijual</a>
          <a href="#area">Area Jaksel</a>
          <a href="#insight">Insight</a>
          <a href="#tentang">Tentang Kami</a>
          <a className="nav-contact" href="https://wa.me/6281234567890" target="_blank" rel="noreferrer">Hubungi Kami</a>
        </nav>
        <details className="mobile-menu">
          <summary aria-label="Buka menu navigasi"><span /><span /><span /></summary>
          <nav aria-label="Navigasi mobile">
            <a href="#jual">Properti Dijual</a>
            <a href="#area">Area Jaksel</a>
            <a href="#insight">Insight</a>
            <a href="#tentang">Tentang Kami</a>
            <a href="https://wa.me/6281234567890" target="_blank" rel="noreferrer">Hubungi Kami</a>
          </nav>
        </details>
        <a className="mobile-call" href="tel:+6281234567890" aria-label="Telepon Jakarta Selatan Properti">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7.1 3.8 9 3.3c.5-.1 1 .2 1.2.7l1 2.6c.2.5 0 1-.4 1.3L9.4 9c.9 2 2.6 3.7 4.6 4.6l1.1-1.4c.3-.4.9-.6 1.3-.4l2.6 1c.5.2.8.7.7 1.2l-.5 1.9c-.2 1-1.1 1.7-2.1 1.7A12.7 12.7 0 0 1 4.4 4.9c0-1 .7-1.9 1.7-2.1Z" />
          </svg>
        </a>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <video
          className="hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="https://images.unsplash.com/photo-1555899434-94d1368aa7af?auto=format&fit=crop&w=1800&q=85"
          aria-label="Pemandangan udara kota Jakarta"
        >
          <source src="/videos/hero-jakarta.mp4" type="video/mp4" />
        </video>
        <div className="hero-shade" />
        <div className="hero-content">
          <h1 id="hero-title">Properti Pilihan<br />Jakarta Selatan</h1>

          <form className="property-search" action="#jual">
            <div className="search-tabs" role="tablist" aria-label="Jenis pencarian">
              <button type="button" className="active" role="tab" aria-selected="true">Dijual</button>
              <button type="button" role="tab" aria-selected="false">Disewa</button>
            </div>
            <div className="search-fields">
              <label>
                <PinIcon />
                <span><small>LOKASI</small><select defaultValue=""><option value="">Pilih area Jakarta Selatan</option><option>Kebayoran Baru</option><option>Pondok Indah</option><option>Kemang</option><option>Cilandak</option></select></span>
              </label>
              <label>
                <HomeIcon />
                <span><small>JENIS PROPERTI</small><select defaultValue=""><option value="">Semua jenis</option><option>Rumah</option><option>Apartemen</option><option>Tanah</option><option>Ruko</option></select></span>
              </label>
              <label>
                <PriceIcon />
                <span><small>RENTANG HARGA</small><select defaultValue=""><option value="">Semua harga</option><option>Di bawah Rp5 M</option><option>Rp5–10 M</option><option>Rp10–25 M</option><option>Di atas Rp25 M</option></select></span>
              </label>
              <button className="submit-search" type="submit" aria-label="Cari properti">
                <span>Cari</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </div>
          </form>
        </div>
      </section>

      <a className="floating-cta" href="https://wa.me/6281234567890?text=Halo%20Jaksel%20Properti%2C%20saya%20ingin%20konsultasi." target="_blank" rel="noreferrer" aria-label="Konsultasi melalui WhatsApp">
        <span className="pulse" />
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 11.7a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.4-5a8.4 8.4 0 1 1 16.1-3.8Z"/><path d="M8.1 7.8c.2-.4.4-.4.7-.4h.5c.2 0 .3 0 .5.5l.7 1.7c.1.2 0 .4-.1.6l-.6.7c-.2.2-.1.4 0 .6.5 1 1.3 1.8 2.2 2.3.3.2.5.2.7 0l.8-1c.2-.2.4-.2.6-.1l1.8.8c.3.2.5.2.5.4 0 .2-.1 1.2-.8 1.8-.6.6-1.5.8-2.5.5-1.1-.3-2.6-.9-4.3-2.4-1.4-1.3-2.4-2.9-2.7-4-.3-1.1 0-1.9.4-2.5Z"/></svg>
        <span className="cta-copy"><small>BUTUH BANTUAN?</small><strong>Chat dengan kami</strong></span>
        <span className="cta-arrow">↗</span>
      </a>
    </main>
  );
}
