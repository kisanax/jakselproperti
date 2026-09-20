"use client";

import { Children, type ReactNode, useState } from "react";

type PropertyFilter = "" | "HOUSE" | "APARTMENT" | "LAND" | "SHOPHOUSE";

const categories: Array<{ value: PropertyFilter; label: string }> = [
  { value: "", label: "Semua" },
  { value: "HOUSE", label: "Rumah" },
  { value: "APARTMENT", label: "Apartemen" },
  { value: "LAND", label: "Tanah" },
  { value: "SHOPHOUSE", label: "Ruko" },
];

function CategoryIcon({ type }: { type: PropertyFilter }) {
  if (type === "APARTMENT") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M11 21v-5h2v5"/></svg>;
  }
  if (type === "LAND") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 19 8 8l4 5 3-4 6 10H3Z"/><path d="M3 19h18"/></svg>;
  }
  if (type === "SHOPHOUSE") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h16v12H4V9ZM3 9l2-5h14l2 5"/><path d="M9 13v8M15 13v8"/></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={type === "HOUSE" ? "m3 11 9-7 9 7v9H3v-9Z" : "M4 11.5 12 5l8 6.5V20H4v-8.5Z"}/><path d="M9 20v-6h6v6"/></svg>;
}

interface MobilePropertyFilterProps {
  children: ReactNode;
  propertyTypes: string[];
}

export default function MobilePropertyFilter({ children, propertyTypes }: MobilePropertyFilterProps) {
  const [active, setActive] = useState<PropertyFilter>("");
  const [expanded, setExpanded] = useState(false);
  const cards = Children.toArray(children);
  const visibleCards = cards.filter((_, index) => !active || propertyTypes[index] === active);
  const displayedCards = expanded ? visibleCards : visibleCards.slice(0, 7);

  return (
    <>
      <nav className="mobile-property-categories" aria-label="Filter kategori properti">
        {categories.map((category) => (
          <button
            key={category.value || "all"}
            type="button"
            className={active === category.value ? "mobile-category-active" : undefined}
            aria-pressed={active === category.value}
            onClick={() => {
              setActive(category.value);
              setExpanded(false);
            }}
          >
            <CategoryIcon type={category.value} />
            <span>{category.label}</span>
          </button>
        ))}
      </nav>

      <section className="listing-section" id="jual" aria-label="Pilihan properti" aria-live="polite">
        <header className="listing-row-header">
          <div>
            <h2>Pilihan properti</h2>
            <p>{visibleCards.length} properti tersedia</p>
          </div>
          {visibleCards.length > 7 && (
            <button
              type="button"
              className="listing-see-all"
              aria-expanded={expanded}
              aria-controls="property-discovery-grid"
              onClick={() => setExpanded((current) => !current)}
            >
              <span>{expanded ? "Tampilkan sedikit" : "Lihat semua"}</span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d={expanded ? "m18 15-6-6-6 6" : "m9 18 6-6-6-6"}/></svg>
            </button>
          )}
        </header>
        {visibleCards.length > 0 ? (
          <div
            id="property-discovery-grid"
            className={`listing-grid${expanded ? " listing-grid-expanded" : ""}`}
          >
            {displayedCards}
          </div>
        ) : (
          <p className="mobile-filter-empty">Belum ada properti dalam kategori ini.</p>
        )}
        {visibleCards.length > 7 && (
          <button
            type="button"
            className="listing-see-all listing-see-all-bottom"
            aria-expanded={expanded}
            aria-controls="property-discovery-grid"
            onClick={() => setExpanded((current) => !current)}
          >
            <span>{expanded ? "Tampilkan sedikit" : `Lihat semua ${visibleCards.length} properti`}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d={expanded ? "m18 15-6-6-6 6" : "m9 18 6-6-6-6"}/></svg>
          </button>
        )}
      </section>
    </>
  );
}
