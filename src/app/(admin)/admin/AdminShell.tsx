"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  ListChecks,
  Gavel,
  Users,
  UserCheck,
  Handshake,
  MessageSquare,
  MapPin,
  Sparkles,
  Menu,
  X,
  Home,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";

// =============================================================================
// Navigation Config
// =============================================================================

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  section?: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, section: "Utama" },
  { label: "Properti", href: "/admin/properties", icon: Building2, section: "Utama" },
  { label: "Listing", href: "/admin/listings", icon: ListChecks, section: "Utama" },
  { label: "Sitaan & Lelang", href: "/admin/auctions", icon: Gavel, section: "Utama" },
  { label: "Owner", href: "/admin/owners", icon: Users, section: "Pihak Terkait" },
  { label: "Perantara", href: "/admin/intermediaries", icon: Handshake, section: "Pihak Terkait" },
  { label: "Leads (Kanban)", href: "/admin/leads", icon: MessageSquare, section: "CRM" },
  { label: "Customer", href: "/admin/customers", icon: UserCheck, section: "CRM" },
  { label: "Kawasan", href: "/admin/kawasan", icon: Sparkles, section: "Area & Lokasi" },
  { label: "Kecamatan", href: "/admin/areas", icon: MapPin, section: "Area & Lokasi" },
];

// Bottom nav shows 4 core items + 1 "Menu" trigger that opens the full sidebar drawer
const bottomNavItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Properti", href: "/admin/properties", icon: Building2 },
  { label: "Listing", href: "/admin/listings", icon: ListChecks },
  { label: "Leads", href: "/admin/leads", icon: MessageSquare },
  { label: "Menu", href: "#menu", icon: Menu, isTrigger: true },
];


// =============================================================================
// AdminShell Component
// =============================================================================

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  // Lock body scroll when mobile sidebar drawer is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  // Close sidebar on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sidebarOpen]);

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  // Group nav items by section
  const sections = navItems.reduce(
    (acc, item) => {
      const section = item.section || "Lainnya";
      if (!acc[section]) acc[section] = [];
      acc[section].push(item);
      return acc;
    },
    {} as Record<string, NavItem[]>
  );

  return (
    <>
      {/* ---- Sidebar Overlay (Mobile/Tablet) ---- */}
      <div
        className={`admin-sidebar-overlay ${sidebarOpen ? "open" : ""}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      {/* ---- Sidebar ---- */}
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="admin-sidebar-logo">
          <Home size={22} style={{ color: "var(--color-admin-accent)" }} />
          <div>
            <h1>jakselproperti</h1>
            <span>Admin Panel</span>
          </div>
          {/* Close button for mobile */}
          <button
            className="admin-menu-toggle"
            onClick={closeSidebar}
            aria-label="Tutup menu"
            style={{ marginLeft: "auto" }}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="admin-sidebar-nav">
          {Object.entries(sections).map(([section, items]) => (
            <div key={section} className="admin-nav-section">
              <div className="admin-nav-section-title">{section}</div>
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`admin-nav-item ${isActive(item.href) ? "active" : ""}`}
                    onClick={closeSidebar}
                  >
                    <Icon className="nav-icon" size={20} />
                    {item.label}
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="admin-nav-badge">{item.badge}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div style={{ padding: "12px", borderTop: "1px solid var(--color-admin-border)" }}>
          <ThemeToggle showLabel />
        </div>
      </aside>

      {/* ---- Main Content ---- */}
      <main className="admin-main">
        {/* Top Bar */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              className="admin-menu-toggle"
              onClick={toggleSidebar}
              aria-label="Buka menu"
            >
              <Menu size={22} />
            </button>
            <div className="admin-topbar-brand">
              <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em" }}>jakselproperti</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--color-admin-accent)", marginLeft: 6, textTransform: "uppercase" }}>Admin</span>
            </div>
          </div>
          <div className="admin-topbar-right">
            <ThemeToggle />
            {/* User avatar / info — placeholder for when auth is implemented */}
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                backgroundColor: "var(--color-admin-surface-hover)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--color-admin-text-secondary)",
              }}
            >
              A
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="admin-content">{children}</div>
      </main>

      {/* ---- Bottom Navigation (Mobile) ---- */}
      <nav className="admin-bottom-nav">
        <div className="admin-bottom-nav-inner">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            if (item.isTrigger) {
              return (
                <button
                  key="menu-trigger"
                  type="button"
                  onClick={toggleSidebar}
                  className={`admin-bottom-nav-item ${sidebarOpen ? "active" : ""}`}
                  aria-label="Menu Lengkap"
                  style={{ background: "none", border: "none", cursor: "pointer", width: "100%" }}
                >
                  <Icon className="nav-icon" size={22} />
                  <span>{item.label}</span>
                </button>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-bottom-nav-item ${isActive(item.href) ? "active" : ""}`}
              >
                <Icon className="nav-icon" size={22} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

    </>
  );
}
