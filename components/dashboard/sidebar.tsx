"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  userRole: string;
  userName: string;
}

const navItems = [
  {
    href: "/",
    label: "Overview",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: "/calls",
    label: "All Calls",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.22 2.18 2 2 0 012.18 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.29 6.29l1.28-1.28a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
      </svg>
    ),
  },
  {
    href: "/calls?status=qualified",
    label: "Qualified",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  {
    href: "/calls?status=pending_review",
    label: "Pending Review",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  {
    href: "/calls?status=rejected",
    label: "Rejected",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
  },
];

const founderItems = [
  {
    href: "/analytics",
    label: "Analytics",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
];

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname();
  const isFounder = userRole === "founder" || userRole === "admin";

  function isActive(href: string) {
    if (href === "/") return pathname === "/" || pathname === "/dashboard";
    if (href.includes("?")) {
      const [path, query] = href.split("?");
      return pathname === path || pathname === path + "?" + query;
    }
    return pathname.startsWith(href);
  }

  return (
    <aside style={{
      width: 240, minHeight: "100vh", background: "var(--color-brand)",
      display: "flex", flexDirection: "column", flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "var(--color-accent)", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "white", fontSize: 14, fontWeight: 700 }}>A</span>
          </div>
          <div>
            <div style={{ color: "white", fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>Aangan</div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>Operations</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "12px 0" }}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 20px", fontSize: 13, fontWeight: 500,
              color: isActive(item.href) ? "white" : "rgba(255,255,255,0.55)",
              background: isActive(item.href) ? "rgba(255,255,255,0.1)" : "transparent",
              borderRight: isActive(item.href) ? "2px solid var(--color-accent)" : "2px solid transparent",
              textDecoration: "none", transition: "all 0.15s",
            }}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}

        {isFounder && (
          <>
            <div style={{
              margin: "12px 20px 6px", paddingTop: 12,
              borderTop: "1px solid rgba(255,255,255,0.08)",
              fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.3)",
              textTransform: "uppercase", letterSpacing: "0.08em",
            }}>
              Founder
            </div>
            {founderItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 20px", fontSize: 13, fontWeight: 500,
                  color: isActive(item.href) ? "white" : "rgba(255,255,255,0.55)",
                  background: isActive(item.href) ? "rgba(255,255,255,0.1)" : "transparent",
                  borderRight: isActive(item.href) ? "2px solid var(--color-accent)" : "2px solid transparent",
                  textDecoration: "none", transition: "all 0.15s",
                }}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* User / Sign out */}
      <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "var(--color-accent)", display: "flex",
            alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <span style={{ color: "white", fontSize: 11, fontWeight: 700 }}>
              {(userName || "U").charAt(0).toUpperCase()}
            </span>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "white", fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {userName}
            </div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, textTransform: "capitalize" }}>
              {userRole}
            </div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.6)", border: "none", borderRadius: "var(--radius-md)",
            fontSize: 12, cursor: "pointer", textAlign: "left",
          }}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
