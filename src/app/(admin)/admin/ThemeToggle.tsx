"use client";

import { useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
}

type Theme = "dark" | "light";

function getThemeSnapshot(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function applyTheme(newTheme: Theme) {
  document.documentElement.setAttribute("data-theme", newTheme);
  document.documentElement.style.colorScheme = newTheme;
  document.body?.setAttribute("data-theme", newTheme);
  document.querySelectorAll<HTMLElement>(".admin-layout").forEach((element) => {
    element.setAttribute("data-theme", newTheme);
  });
  try {
    localStorage.setItem("admin-theme", newTheme);
  } catch {}
}

function subscribeToTheme(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === "admin-theme" && (event.newValue === "dark" || event.newValue === "light")) {
      applyTheme(event.newValue);
      onStoreChange();
    }
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener("admin-theme-changed", onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("admin-theme-changed", onStoreChange);
  };
}

export default function ThemeToggle({ showLabel = false, className = "" }: ThemeToggleProps) {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, () => "light");

  const toggleTheme = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Read current theme from DOM directly to avoid any stale state
    const currentDOM = document.documentElement.getAttribute("data-theme") as Theme | null;
    const currentTheme = currentDOM || theme;
    const nextTheme = currentTheme === "dark" ? "light" : "dark";

    applyTheme(nextTheme);

    // Notify other toggle instances on the same page
    window.dispatchEvent(new Event("admin-theme-changed"));
  };

  const isDark = theme === "dark";

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
