"use client";

import { useState, useRef, useEffect, useId, useCallback } from "react";
import styles from "./PortalSubnav.module.css";

export interface PortalSubnavProps {
  activeType?: string;
  initialArea?: string;
  initialBudget?: string;
  initialQuery?: string;
}

interface SuggestionItem {
  id: string | number;
  type: "kawasan" | "kecamatan" | "kota";
  name: string;
  subtitle: string;
  areaId?: number;
  kawasanId?: string;
  cityId?: number;
  propertyCount?: number;
}

type SearchSegment = "location" | "type" | "budget";

const PROPERTY_TYPES = [
  {
    value: "",
    label: "Semua Jenis",
    desc: "Seluruh portofolio properti",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9.5Z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    value: "HOUSE",
    label: "Rumah & Mansion",
    desc: "Hunian tapak, villa & private compound",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="m3 11 9-7 9 7v9H3v-9Z" />
        <path d="M9 20v-6h6v6" />
      </svg>
    ),
  },
  {
    value: "APARTMENT",
    label: "Apartemen & Penthouse",
    desc: "High-rise luxury & suite pribadi",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <path d="M9 6h2M13 6h2M9 10h2M13 10h2M9 14h2M13 14h2M11 18h2" />
      </svg>
    ),
  },
  {
    value: "LAND",
    label: "Tanah & Kavling",
    desc: "Lahan siap bangun di lokasi prestisius",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="m2 22 10-6 10 6" />
        <path d="M12 2v6l3-3" />
        <path d="M12 8 9 5" />
        <path d="M12 16V8" />
      </svg>
    ),
  },
  {
    value: "SHOPHOUSE",
    label: "Ruko & Komersial",
    desc: "Properti bisnis, kantor & retail elit",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 7h18M3 7l2-4h14l2 4M3 7v13a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V7M9 11v10M15 11v10" />
      </svg>
    ),
  },
];

const BUDGET_PRESETS = [
  {
    value: "",
    label: "Semua Harga",
    desc: "Tanpa batas anggaran",
    badge: "Fleksibel",
  },
  {
    value: "under5",
    label: "Di bawah Rp5 Miliar",
    desc: "Townhouse & properti starter luxury",
    badge: "< Rp5 M",
  },
  {
    value: "5to10",
    label: "Rp5 – 10 Miliar",
    desc: "Hunian premium keluarga di Jaksel",
    badge: "Rp5–10 M",
  },
  {
    value: "10to25",
    label: "Rp10 – 25 Miliar",
    desc: "Mansion mewah & kawasan prestisius",
    badge: "Rp10–25 M",
  },
  {
    value: "above25",
    label: "Di atas Rp25 Miliar",
    desc: "Trophy assets & estate eksklusif",
    badge: "> Rp25 M",
  },
];

const CURATED_JAKSEL_HIGHLIGHTS = [
  { name: "Pondok Indah", tag: "Prime Living", desc: "Kawasan hunian paling bergengsi" },
  { name: "Kebayoran Baru", tag: "Heritage & Luxury", desc: "Senopati, Dharmawangsa, SCBD" },
  { name: "Cilandak", tag: "Spacious Compound", desc: "Akses TB Simatupang & MRT" },
  { name: "Kemang", tag: "Expat Favorite", desc: "Suasana hijau & gaya hidup kosmopolitan" },
];

export default function PortalSubnav({
  activeType = "",
  initialArea = "",
  initialBudget = "",
  initialQuery = "",
}: PortalSubnavProps) {
  const [activeSegment, setActiveSegment] = useState<SearchSegment | null>(null);
  const [locationQuery, setLocationQuery] = useState(initialQuery);
  const [selectedAreaId, setSelectedAreaId] = useState(initialArea);
  const [selectedKawasanId, setSelectedKawasanId] = useState("");
  const [selectedType, setSelectedType] = useState(activeType);
  const [selectedBudget, setSelectedBudget] = useState(initialBudget);

  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const capsuleRef = useRef<HTMLDivElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const formId = useId();

  // Close popover on Escape or Click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (capsuleRef.current && !capsuleRef.current.contains(e.target as Node)) {
        setActiveSegment(null);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setActiveSegment(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const handleCompactOpen = (event: Event) => {
      const segment = (event as CustomEvent<{ segment: SearchSegment }>).detail.segment;
      setActiveSegment(segment);
    };

    window.addEventListener("portal-search-open", handleCompactOpen);
    return () => window.removeEventListener("portal-search-open", handleCompactOpen);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("portal-search-state", {
      detail: { open: activeSegment !== null },
    }));
  }, [activeSegment]);

  // Fetch suggestions when location segment is opened or query changes
  const fetchSuggestions = useCallback(async (query: string) => {
    setLoadingSuggestions(true);
    try {
      const res = await fetch(`/api/portal/search-suggestions?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      }
    } catch {
      // Ignore network errors gracefully
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  useEffect(() => {
    if (activeSegment === "location") {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        fetchSuggestions(locationQuery);
      }, 200);
    }
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [activeSegment, locationQuery, fetchSuggestions]);

  // Focus location input when segment is active
  useEffect(() => {
    if (activeSegment === "location") {
      locationInputRef.current?.focus();
    }
  }, [activeSegment]);

  const handleSelectSuggestion = (item: SuggestionItem) => {
    if (item.type === "kawasan") {
      setSelectedKawasanId(item.kawasanId || "");
      setSelectedAreaId(item.areaId ? String(item.areaId) : "");
      setLocationQuery(item.name);
    } else {
      setSelectedKawasanId("");
      setSelectedAreaId(item.areaId ? String(item.areaId) : "");
      setLocationQuery(item.name);
    }
    setActiveSegment("type"); // Advance naturally to next segment
  };

  const handleClearLocation = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocationQuery("");
    setSelectedAreaId("");
    setSelectedKawasanId("");
    locationInputRef.current?.focus();
  };

  const currentTypeLabel = PROPERTY_TYPES.find((t) => t.value === selectedType)?.label || "Semua Jenis";
  const currentBudgetLabel = BUDGET_PRESETS.find((b) => b.value === selectedBudget)?.badge || "Semua Harga";

  const isAnyPopoverOpen = activeSegment !== null;

  const openLocationSearch = () => {
    setActiveSegment("location");
    requestAnimationFrame(() => locationInputRef.current?.focus());
  };

  return (
    <>
      {/* Soft Backdrop Scrim when search capsule is active */}
      <div
        className={`${styles.scrim} ${isAnyPopoverOpen ? styles.scrimActive : ""}`}
        style={{ background: "transparent", backdropFilter: "none", WebkitBackdropFilter: "none" }}
        onClick={() => setActiveSegment(null)}
        aria-hidden="true"
      />

      <div ref={capsuleRef} className={styles.container} data-active-segment={activeSegment || undefined}>
        <div className={styles.mobileSearchBar}>
          <button
            type="button"
            className={styles.mobileSearchTrigger}
            onClick={openLocationSearch}
            aria-expanded={isAnyPopoverOpen}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <span>
              <strong>Cari properti</strong>
              <small>{locationQuery || currentTypeLabel} · {currentBudgetLabel}</small>
            </span>
          </button>
        </div>

        {/* Main Search Form Capsule */}
        <form
          id={formId}
          action="/jual"
          method="GET"
          role="search"
          aria-label="Pencarian Properti Eksklusif"
          className={`${styles.capsule} ${isAnyPopoverOpen ? styles.capsuleOpen : ""}`}
        >
          {/* Hidden inputs to pass params to /jual */}
          <input type="hidden" name="area" value={selectedAreaId} />
          {selectedKawasanId && <input type="hidden" name="kawasan" value={selectedKawasanId} />}
          <input type="hidden" name="type" value={selectedType} />
          <input type="hidden" name="budget" value={selectedBudget} />
          {locationQuery && !selectedAreaId && <input type="hidden" name="q" value={locationQuery} />}

          {/* ─── SEGMENT 1: LOKASI & KAWASAN ─── */}
          <div
            className={`${styles.segment} ${activeSegment === "location" ? styles.segmentActive : ""}`}
            onClick={openLocationSearch}
            role="button"
            tabIndex={0}
            aria-expanded={activeSegment === "location"}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openLocationSearch();
              }
            }}
          >
            <div className={styles.segmentText}>
              <span className={styles.segmentLabel}>Lokasi / Kawasan</span>
              <input
                ref={locationInputRef}
                type="text"
                className={styles.segmentInput}
                placeholder="Cari kawasan atau area..."
                value={locationQuery}
                onChange={(e) => {
                  setLocationQuery(e.target.value);
                  setSelectedAreaId("");
                  setSelectedKawasanId("");
                  if (activeSegment !== "location") setActiveSegment("location");
                }}
                onFocus={() => setActiveSegment("location")}
                onClick={(e) => {
                  e.stopPropagation();
                  openLocationSearch();
                }}
                autoComplete="off"
              />
            </div>
            {locationQuery && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={handleClearLocation}
                aria-label="Hapus lokasi"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                  <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
                </svg>
              </button>
            )}
          </div>

          <div className={styles.divider} />

          {/* ─── SEGMENT 2: TIPE PROPERTI ─── */}
          <div
            className={`${styles.segment} ${activeSegment === "type" ? styles.segmentActive : ""}`}
            onClick={() => setActiveSegment(activeSegment === "type" ? null : "type")}
            role="button"
            tabIndex={0}
            aria-expanded={activeSegment === "type"}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setActiveSegment("type");
              }
            }}
          >
            <div className={styles.segmentText}>
              <span className={styles.segmentLabel}>Tipe Properti</span>
              <span className={styles.segmentValue}>{currentTypeLabel}</span>
            </div>
          </div>

          <div className={styles.divider} />

          {/* ─── SEGMENT 3: RANGE HARGA ─── */}
          <div
            className={`${styles.segment} ${activeSegment === "budget" ? styles.segmentActive : ""}`}
            onClick={() => setActiveSegment(activeSegment === "budget" ? null : "budget")}
            role="button"
            tabIndex={0}
            aria-expanded={activeSegment === "budget"}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setActiveSegment("budget");
              }
            }}
          >
            <div className={styles.segmentText}>
              <span className={styles.segmentLabel}>Rentang Budget</span>
              <span className={styles.segmentValue}>{currentBudgetLabel}</span>
            </div>
          </div>

          {/* ─── SEARCH BUTTON (Square Rounded) ─── */}
          <div className={styles.buttonWrapper}>
            <button type="submit" className={styles.searchButton} aria-label="Cari Properti">
              <svg viewBox="0 0 24 24" className={styles.searchIcon} aria-hidden="true">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.2" fill="none" />
                <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
              <span className={styles.buttonLabel}>Cari</span>
            </button>
          </div>
        </form>

        {/* ================================================================= */}
        {/* LUXURY POPOVERS (Aligned to Capsule Segments)                    */}
        {/* ================================================================= */}

        {/* ─── POPOVER 1: LOKASI ─── */}
        {activeSegment === "location" && (
          <div className={`${styles.popover} ${styles.popoverLocation}`}>
            <div className={styles.popoverHeader}>
              <span className={styles.popoverTitle}>
                {locationQuery ? "Hasil Pencarian Wilayah" : "Kawasan Unggulan Jakarta Selatan"}
              </span>
              <span className={styles.popoverHint}>Pilih kawasan elit atau ketik kota nasional</span>
            </div>

            {/* If empty query, show curated highlights & featured */}
            {!locationQuery && (
              <div className={styles.curatedGrid}>
                {CURATED_JAKSEL_HIGHLIGHTS.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    className={styles.curatedCard}
                    onClick={() => {
                      setLocationQuery(item.name);
                      // find matching in suggestions if available
                      const match = suggestions.find((s) => s.name.toLowerCase().includes(item.name.toLowerCase()));
                      if (match) {
                        setSelectedAreaId(match.areaId ? String(match.areaId) : "");
                        setSelectedKawasanId(match.kawasanId || "");
                      }
                      setActiveSegment("type");
                    }}
                  >
                    <div className={styles.curatedIcon}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
                        <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" />
                        <circle cx="12" cy="10" r="2.2" />
                      </svg>
                    </div>
                    <div className={styles.curatedContent}>
                      <span className={styles.curatedName}>{item.name}</span>
                      <span className={styles.curatedDesc}>{item.desc}</span>
                    </div>
                    <span className={styles.curatedTag}>{item.tag}</span>
                  </button>
                ))}
              </div>
            )}

            {/* List of Dynamic Suggestions */}
            <div className={styles.suggestionList}>
              {loadingSuggestions && (
                <div className={styles.loadingRow}>
                  <div className={styles.spinner} />
                  <span>Mencari lokasi...</span>
                </div>
              )}
              {!loadingSuggestions && suggestions.length > 0 && (
                suggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={styles.suggestionItem}
                    onClick={() => handleSelectSuggestion(item)}
                  >
                    <div className={styles.suggestionIcon}>
                      {item.type === "kawasan" ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
                          <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" />
                          <circle cx="12" cy="10" r="2.2" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
                          <path d="m3 11 9-7 9 7v9H3v-9Z" />
                          <path d="M9 20v-6h6v6" />
                        </svg>
                      )}
                    </div>
                    <div className={styles.suggestionInfo}>
                      <span className={styles.suggestionName}>{item.name}</span>
                      <span className={styles.suggestionSub}>{item.subtitle}</span>
                    </div>
                    {item.propertyCount !== undefined && item.propertyCount > 0 && (
                      <span className={styles.suggestionBadge}>{item.propertyCount} Unit</span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* ─── POPOVER 2: TIPE PROPERTI ─── */}
        {activeSegment === "type" && (
          <div className={`${styles.popover} ${styles.popoverType}`}>
            <div className={styles.popoverHeader}>
              <span className={styles.popoverTitle}>Kategori & Tipe Properti</span>
              <span className={styles.popoverHint}>Pilih format hunian atau investasi yang sesuai</span>
            </div>
            <div className={styles.typeGrid}>
              {PROPERTY_TYPES.map((t) => {
                const isSelected = selectedType === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    className={`${styles.typeCard} ${isSelected ? styles.typeCardSelected : ""}`}
                    onClick={() => {
                      setSelectedType(t.value);
                      setActiveSegment("budget"); // Advance naturally to budget
                    }}
                  >
                    <div className={styles.typeIcon}>{t.icon}</div>
                    <div className={styles.typeInfo}>
                      <span className={styles.typeLabel}>{t.label}</span>
                      <span className={styles.typeDesc}>{t.desc}</span>
                    </div>
                    {isSelected && (
                      <div className={styles.typeCheck}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── POPOVER 3: BUDGET ─── */}
        {activeSegment === "budget" && (
          <div className={`${styles.popover} ${styles.popoverBudget}`}>
            <div className={styles.popoverHeader}>
              <span className={styles.popoverTitle}>Rentang Anggaran Investasi</span>
              <span className={styles.popoverHint}>Filter berdasarkan skala nilai properti</span>
            </div>
            <div className={styles.budgetList}>
              {BUDGET_PRESETS.map((b) => {
                const isSelected = selectedBudget === b.value;
                return (
                  <button
                    key={b.value}
                    type="button"
                    className={`${styles.budgetItem} ${isSelected ? styles.budgetItemSelected : ""}`}
                    onClick={() => {
                      setSelectedBudget(b.value);
                      setActiveSegment(null); // All segments complete
                    }}
                  >
                    <div className={styles.budgetInfo}>
                      <span className={styles.budgetLabel}>{b.label}</span>
                      <span className={styles.budgetDesc}>{b.desc}</span>
                    </div>
                    <span className={`${styles.budgetPill} ${isSelected ? styles.budgetPillSelected : ""}`}>
                      {b.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
