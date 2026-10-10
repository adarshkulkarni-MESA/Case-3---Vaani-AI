"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { Suspense } from "react";

interface SidebarProps {
  userRole: string;
  userName: string;
}

const navItems = [
  {
    href: "/",
    label: "Overview",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    href: "/calls",
    label: "All Calls",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.22 2.18 2 2 0 012.18 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.29 6.29l1.28-1.28a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
      </svg>
    ),
  },
  {
    href: "/pipeline",
    label: "Pipeline",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12H2"/><path d="M5 5l-3 7 3 7"/><path d="M19 5l3 7-3 7"/>
        <circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/>
      </svg>
    ),
  },
  {
    href: "/followups",
    label: "Follow-ups",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    badge: "pending",
  },
  {
    href: "/transcripts",
    label: "Transcripts",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    href: "/calls?status=qualified",
    label: "Qualified",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
  },
  {
    href: "/calls?status=pending_review",
    label: "Pending Review",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
  },
  {
    href: "/calls?status=rejected",
    label: "Rejected",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    ),
  },
];

const founderItems = [
  {
    href: "/analytics",
    label: "Analytics",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
];

function SidebarInner({ userRole, userName }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFounder = userRole === "founder" || userRole === "admin";

  function isActive(href: string) {
    if (href === "/") return pathname === "/" || pathname === "/dashboard";
    if (href.includes("?")) {
      const [path, query] = href.split("?");
      const [key, val] = query.split("=");
      return pathname === path && searchParams.get(key) === val;
    }
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside style={{
      width: 220,
      minHeight: "100vh",
      background: "linear-gradient(180deg, #0D1220 0%, #0A0E15 100%)",
      borderRight: "1px solid rgba(255,255,255,0.06)",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      position: "sticky",
      top: 0,
      height: "100vh",
      overflowY: "auto",
    }}>
      {/* Logo */}
      <div style={{
        padding: "20px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "linear-gradient(135deg, #C4A14A 0%, #E8C876 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(196,161,74,0.3)",
          }}>
            <span style={{ color: "#0A0E15", fontSize: 14, fontWeight: 800, fontFamily: "var(--font-display)" }}>A</span>
          </div>
          <div>
            <div style={{ color: "#F0ECE4", fontSize: 14, fontWeight: 700, fontFamily: "var(--font-display)", lineHeight: 1.2 }}>Aangan</div>
            <div style={{ color: "rgba(196,161,74,0.7)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>Studio Ops</div>
          </div>
        </div>
      </div>

      {/* AI Status Badge */}
      <div style={{ padding: "12px 16px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "rgba(74,222,128,0.06)",
          border: "1px solid rgba(74,222,128,0.15)",
          borderRadius: 8, padding: "7px 10px",
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#4ade80",
            boxShadow: "0 0 6px #4ade80",
          }} />
          <span style={{ fontSize: 11, color: "rgba(74,222,128,0.9)", fontWeight: 500 }}>Vaani AI Active</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "4px 8px" }}>
        {/* Main section */}
        <div style={{ marginBottom: 4 }}>
          <div style={{
            fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.2)",
            textTransform: "uppercase", letterSpacing: "0.1em",
            padding: "4px 8px 6px",
          }}>
            Main
          </div>
          {navItems.slice(0, 5).map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="nav-item-transition"
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 10px", fontSize: 13, fontWeight: active ? 600 : 400,
                  color: active ? "#E8C876" : "rgba(255,255,255,0.5)",
                  background: active ? "rgba(196,161,74,0.1)" : "transparent",
                  borderRadius: 8,
                  border: "1px solid",
                  borderColor: active ? "rgba(196,161,74,0.2)" : "transparent",
                  textDecoration: "none",
                  marginBottom: 2,
                  position: "relative",
                }}
              >
                <span style={{ opacity: active ? 1 : 0.7 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Calls section */}
        <div style={{ marginTop: 8 }}>
          <div style={{
            fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.2)",
            textTransform: "uppercase", letterSpacing: "0.1em",
            padding: "4px 8px 6px",
          }}>
            Calls
          </div>
          {navItems.slice(5).map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="nav-item-transition"
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 10px", fontSize: 13, fontWeight: active ? 600 : 400,
                  color: active ? "#E8C876" : "rgba(255,255,255,0.5)",
                  background: active ? "rgba(196,161,74,0.1)" : "transparent",
                  borderRadius: 8,
                  border: "1px solid",
                  borderColor: active ? "rgba(196,161,74,0.2)" : "transparent",
                  textDecoration: "none",
                  marginBottom: 2,
                }}
              >
                <span style={{ opacity: active ? 1 : 0.7 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>

        {isFounder && (
          <div style={{ marginTop: 8 }}>
            <div style={{
              fontSize: 9, fontWeight: 700, color: "rgba(196,161,74,0.4)",
              textTransform: "uppercase", letterSpacing: "0.1em",
              padding: "4px 8px 6px",
            }}>
              Founder
            </div>
            {founderItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="nav-item-transition"
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 10px", fontSize: 13, fontWeight: active ? 600 : 400,
                    color: active ? "#E8C876" : "rgba(255,255,255,0.5)",
                    background: active ? "rgba(196,161,74,0.1)" : "transparent",
                    borderRadius: 8,
                    border: "1px solid",
                    borderColor: active ? "rgba(196,161,74,0.2)" : "transparent",
                    textDecoration: "none",
                    marginBottom: 2,
                  }}
                >
                  <span style={{ opacity: active ? 1 : 0.7 }}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* User footer */}
      <div style={{
        padding: "12px 8px",
        borderTop: "1px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 10px", marginBottom: 4,
          background: "rgba(255,255,255,0.03)",
          borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)",
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            background: "linear-gradient(135deg, #C4A14A, #E8C876)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, fontFamily: "var(--font-display)",
          }}>
            <span style={{ color: "#0A0E15", fontSize: 12, fontWeight: 700 }}>
              {(userName || "U").charAt(0).toUpperCase()}
            </span>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              color: "#F0ECE4", fontSize: 12, fontWeight: 600,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {userName}
            </div>
            <div style={{ color: "rgba(196,161,74,0.6)", fontSize: 10, textTransform: "capitalize" }}>
              {userRole}
            </div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            width: "100%", padding: "7px 10px",
            background: "transparent",
            color: "rgba(255,255,255,0.3)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 8, fontSize: 12, cursor: "pointer",
            textAlign: "left", transition: "all 0.15s",
            display: "flex", alignItems: "center", gap: 6,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(248,113,113,0.8)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(248,113,113,0.2)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.3)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.06)";
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}

export function Sidebar({ userRole, userName }: SidebarProps) {
  return (
    <Suspense fallback={null}>
      <SidebarInner userRole={userRole} userName={userName} />
    </Suspense>
  );
}
