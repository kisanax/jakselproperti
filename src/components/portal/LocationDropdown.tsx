"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./LocationDropdown.module.css";

interface Area {
  id: number;
  name: string;
}

const FUILTIN_AREAS: Area[] = [
  { id: 7812, name: "Kebayoran Baru" },
  { id: 7813, name: "Kebayoran Lama" },
  { id: 7814, name: "Pesanggrahan" },
  { id: 7815, name: "Cilandak" },
  { id: 7816, name: "Pasar Minggu" },
  { id: 7817, name: "Jagakarsa" },
  { id: 7818, name: "Tebet" },
  { id: 7819, name: "Setiabudi" },
];

interface LocationDropdownProps {
  name?: string;
  defaultValue?: string;
}

export default function LocationDropdown({ name = "area", defaultValue = "" }: LocationDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Area | null>(() => {
    return FUILTIN_AREAS.find((a) => String(a.id) === defaultValue) || null;
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  const filtered = FUILTIN_AREAS.filter((a) =>
    a.name.toLowerCase().includes(query.toLowerCase())
  );

  function handleSelect(area: Area) {
    setSelected(area);
    setQuery("");
    setOpen(false);
  }

  function handleClear() {
    setSelected(null);
    setQuery("");
    inputRef.current?.focus();
  }

  const displayValue = selected ? selected.name : query;

  return (
    <div ref={boxRef} className={styles.wrapper}>
      <input type="hidden" name={name} value={selected ? String(selected.id) : ""} />
      <input
        ref={inputRef}
        className={styles.input}
        type="text"
        value={displayValue}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelected(null);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Cari area, kawasan..."
        autoComplete="off"
      />
      {selected && (
        <button type="button" className={styles.clear} onClick={handleClear} aria-label="Hapus pilihan">
          <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" /></svg>
        </button>
      )}
      {open && filtered.length > 0 && (
        <div ref={dropdownRef} className={styles.dropdown}>
          <div className={styles.head}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16"><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" /><circle cx="12" cy="10" r="2.2" /></svg>
            Jakarta Selatan
          </div>
          {filtered.map((area) => (
            <button
              key={area.id}
              type="button"
              className={`${styles.item} ${selected?.id === area.id ? styles.itemActive : ""}`}
              onClick={() => handleSelect(area)}
            >
              <span className={styles.itemIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20"><path d="m3 11 9-7 9 7v9H3v-9Z" /><path d="M9 20v-6h6v6" /></svg>
              </span>
              <span className={styles.itemText}>
                <span className={styles.itemName}>{area.name}</span>
                <span className={styles.itemSub}>Jakarta Selatan</span>
              </span>
              {selected?.id === area.id && (
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" className={styles.check}><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
