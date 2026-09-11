"use client";

import { useEffect, useState, useCallback } from "react";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
}

export default function ThemeToggle({ showLabel = false, className = "" }: ThemeToggleProps) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  const applyTheme = useCallback((newTheme: "dark" | "light") => {
    setTheme(newTheme);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", newTheme);
      document.documentElement.style.colorScheme = newTheme;
      if (document.body) {
        document.body.setAttribute("data-theme", newTheme);
      }
      document.querySelectorAll<HTMLElement>(".admin-layout").forEach((el) => {
        el.setAttribute("data-theme", newTheme);
      });
      try {
        localStorage.setItem("admin-theme", newTheme);
      } catch {}
    }
  }, []);

  useEffect(() => {
    // 1. Initial sync on mount
    let saved: "dark" | "light" | null = null;
    try {
      saved = localStorage.getItem("admin-theme") as "dark" | "light" | null;
    } catch {}
    const currentAttr = typeof document !== "undefined"
      ? (document.documentElement.getAttribute("data-theme") as "dark" | "light" | null)
      : null;
    const active = saved || currentAttr || "dark";

    applyTheme(active);
    setMounted(true);

    // 2. Sync cross-tab changes
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "admin-theme" && (e.newValue === "dark" || e.newValue === "light")) {
        applyTheme(e.newValue);
      }
    };

    // 3. Sync same-page multiple toggle instances (e.g. sidebar vs topbar)
    const handleCustomChange = () => {
      const current = (document.documentElement.getAttribute("data-theme") as "dark" | "light" | null) || "dark";
      setTheme(current);
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("admin-theme-changed", handleCustomChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("admin-theme-changed", handleCustomChange);
    };
  }, [applyTheme]);

  const toggleTheme = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Read current theme from DOM directly to avoid any stale state
    const currentDOM = typeof document !== "undefined"
      ? (document.documentElement.getAttribute("data-theme") as "dark" | "light" | null)
      : null;
    const currentTheme = currentDOM || theme;
    const nextTheme = currentTheme === "dark" ? "light" : "dark";

    applyTheme(nextTheme);

    // Notify other toggle instances on the same page
    window.dispatchEvent(new Event("admin-theme-changed"));
  };

  // During SSR or before mount, use a fallback so button is never non-interactive or invisible
  const isDark = mounted ? theme === "dark" : true;

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`admin-theme-toggle ${showLabel ? "with-label" : ""} ${className}`}
      title={isDark ? "Beralih ke mode terang" : "Beralih ke mode gelap"}
      aria-label={isDark ? "Beralih ke mode terang" : "Beralih ke mode gelap"}
      style={{
        touchAction: "manipulation",
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
        userSelect: "none",
      }}
    >
      {isDark ? (
        <Sun size={18} className="theme-toggle-icon sun" style={{ pointerEvents: "none" }} />
      ) : (
        <Moon size={18} className="theme-toggle-icon moon" style={{ pointerEvents: "none" }} />
      )}
      {showLabel && (
        <span className="theme-toggle-label" style={{ pointerEvents: "none" }}>
          {isDark ? "Mode Terang" : "Mode Gelap"}
        </span>
      )}
    </button>
  );
}
