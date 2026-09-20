"use client";

import styles from "./CompactSearchPill.module.css";

interface CompactSearchPillProps {
  areaLabel?: string;
  typeLabel?: string;
  budgetLabel?: string;
}

export default function CompactSearchPill({
  areaLabel = "Lokasi",
  typeLabel = "Semua Jenis",
  budgetLabel = "Semua Harga",
}: CompactSearchPillProps) {
  const openSegment = (segment: "location" | "type" | "budget") => {
    window.dispatchEvent(new CustomEvent("portal-search-open", { detail: { segment } }));
  };

  return (
    <div className={styles.pill} role="group" aria-label="Pencarian properti ringkas">
      <button type="button" className={styles.segment} onClick={() => openSegment("location")}>
        <span className={styles.segmentBold}>{areaLabel || "Lokasi"}</span>
      </button>
      
      <span className={styles.divider} />
      
      <button type="button" className={styles.segment} onClick={() => openSegment("type")}>
        <span>{typeLabel || "Semua Jenis"}</span>
      </button>
      
      <span className={styles.divider} />
      
      <button type="button" className={styles.segment} onClick={() => openSegment("budget")}>
        <span className={styles.segmentMuted}>{budgetLabel || "Harga"}</span>
      </button>
      
      <button type="button" className={styles.iconWrapper} onClick={() => openSegment("location")} aria-label="Buka pencarian properti">
        <svg viewBox="0 0 24 24" className={styles.searchIcon} aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.2" fill="none" />
          <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
