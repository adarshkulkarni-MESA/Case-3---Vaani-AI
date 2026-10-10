import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { calls } from "@/lib/db/schema";
import { desc, sql, gte } from "drizzle-orm";
import { StatusBadge } from "@/components/ui/badge";
import { formatDate, formatDuration } from "@/lib/utils";
import Link from "next/link";

export const instant = false;

async function getDashboardData(isFounder: boolean) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [recentCalls, statusCounts, monthlyCost] = await Promise.all([
    db
      .select({
        id: calls.id,
        callerName: calls.callerName,
        callerPhone: calls.callerPhone,
        callTimestamp: calls.callTimestamp,
        durationSeconds: calls.durationSeconds,
        projectLocation: calls.projectLocation,
        propertyType: calls.propertyType,
        leadStatus: calls.leadStatus,
        outcome: calls.outcome,
        aiSummary: calls.aiSummary,
        askedAboutPrice: calls.askedAboutPrice,
        isEscalated: calls.isEscalated,
        isMissed: calls.isMissed,
      })
      .from(calls)
      .orderBy(desc(calls.callTimestamp))
      .limit(8),

    db
      .select({
        status: calls.leadStatus,
        count: sql<number>`count(*)`,
      })
      .from(calls)
      .where(gte(calls.callTimestamp, thirtyDaysAgo))
      .groupBy(calls.leadStatus),

    isFounder
      ? db
          .select({
            total: sql<number>`coalesce(sum(ai_cost_usd), 0)`,
            count: sql<number>`count(*)`,
          })
          .from(calls)
          .where(gte(calls.callTimestamp, thirtyDaysAgo))
      : Promise.resolve([{ total: 0, count: 0 }]),
  ]);

  const statusMap: Record<string, number> = {};
  for (const row of statusCounts) {
    statusMap[row.status] = Number(row.count);
  }

  const totalThisMonth = Object.values(statusMap).reduce((a, b) => a + b, 0);
  const qualified = statusMap.qualified || 0;
  const rejected = statusMap.rejected || 0;
  const pending = statusMap.pending_review || 0;

  return {
    recentCalls,
    stats: {
      total: totalThisMonth,
      qualified,
      rejected,
      pending,
      qualificationRate: totalThisMonth > 0 ? ((qualified / totalThisMonth) * 100).toFixed(0) : "0",
      aiCost: isFounder ? Number((monthlyCost as { total: number }[])[0]?.total || 0) : null,
    },
  };
}

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user as { name?: string; role?: string };
  const isFounder = user?.role === "founder" || user?.role === "admin";
  const { recentCalls, stats } = await getDashboardData(isFounder);

  const firstName = (name?: string) => name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="mesh-bg" style={{ minHeight: "100vh" }}>
      {/* ── Hero Banner ── */}
      <div
        className="hero-gradient grid-overlay"
        style={{
          padding: "40px 40px 32px",
          position: "relative",
          overflow: "hidden",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {/* Decorative orbs */}
        <div style={{
          position: "absolute", top: -60, right: -60,
          width: 280, height: 280, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(196,161,74,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: -40, left: 120,
          width: 180, height: 180, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(74,100,196,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Eyebrow */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(196,161,74,0.1)",
            border: "1px solid rgba(196,161,74,0.2)",
            borderRadius: 100, padding: "4px 12px",
            marginBottom: 14,
          }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 5px #4ade80" }} />
            <span style={{ fontSize: 11, color: "rgba(196,161,74,0.9)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Vaani AI — Live
            </span>
          </div>

          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: 32, fontWeight: 700,
            color: "#F0ECE4", lineHeight: 1.2,
            marginBottom: 8,
          }}>
            {greeting},{" "}
            <span className="shimmer-text">{firstName(user?.name)}</span>
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", maxWidth: 420 }}>
            Aangan Studio · Operations Dashboard · Last 30 days
          </p>

          {/* Quick action chips */}
          <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
            {[
              { label: "View Pipeline", href: "/pipeline", icon: "→" },
              { label: "Follow-ups", href: "/followups", icon: "⟳" },
              { label: "Transcripts", href: "/transcripts", icon: "☰" },
            ].map(chip => (
              <Link key={chip.href} href={chip.href} style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "7px 14px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, fontSize: 12, fontWeight: 500,
                color: "rgba(255,255,255,0.7)",
                textDecoration: "none",
                transition: "all 0.15s",
              }}>
                <span style={{ fontSize: 11 }}>{chip.icon}</span>
                {chip.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding: "28px 40px", maxWidth: 1200 }}>

        {/* ── Stats Grid ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${isFounder && stats.aiCost !== null ? 5 : 4}, 1fr)`,
          gap: 14, marginBottom: 28,
        }}>
          <StatCard
            label="Total Calls"
            value={stats.total}
            sub="this month"
            icon="📞"
            color="rgba(255,255,255,0.9)"
            accentColor="rgba(255,255,255,0.1)"
          />
          <StatCard
            label="Qualified"
            value={stats.qualified}
            sub={`${stats.qualificationRate}% conversion`}
            icon="✓"
            color="#4ade80"
            accentColor="rgba(74,222,128,0.1)"
            borderColor="rgba(74,222,128,0.2)"
          />
          <StatCard
            label="Pending Review"
            value={stats.pending}
            sub="need attention"
            icon="!"
            color="#fbbf24"
            accentColor="rgba(251,191,36,0.1)"
            borderColor="rgba(251,191,36,0.2)"
            href="/followups"
          />
          <StatCard
            label="Rejected"
            value={stats.rejected}
            sub="this month"
            icon="✕"
            color="#f87171"
            accentColor="rgba(248,113,113,0.1)"
            borderColor="rgba(248,113,113,0.2)"
          />
          {isFounder && stats.aiCost !== null && (
            <StatCard
              label="AI Cost"
              value={`$${stats.aiCost.toFixed(2)}`}
              sub="30 days · USD"
              icon="⚡"
              color="#a78bfa"
              accentColor="rgba(167,139,250,0.1)"
              borderColor="rgba(167,139,250,0.2)"
            />
          )}
        </div>

        {/* ── Two column layout ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>

          {/* Recent Calls */}
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16, overflow: "hidden",
          }}>
            <div style={{
              padding: "18px 24px",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <h2 style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 16, fontWeight: 600, color: "#F0ECE4",
                }}>
                  Recent Calls
                </h2>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                  Latest incoming enquiries
                </p>
              </div>
              <Link href="/calls" style={{
                fontSize: 12, color: "#C4A14A", fontWeight: 500,
                textDecoration: "none", display: "flex", alignItems: "center", gap: 4,
              }}>
                View all
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
            </div>

            {recentCalls.length === 0 ? (
              <div style={{ padding: 48, textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>📞</div>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
                  No calls yet. When Vaani AI answers its first call, it will appear here.
                </p>
              </div>
            ) : (
              <div>
                {recentCalls.map((call, i) => (
                  <Link
                    key={call.id}
                    href={`/calls/${call.id}`}
                    className="call-row-link"
                    style={{
                      display: "block", padding: "14px 24px",
                      textDecoration: "none",
                      borderBottom: i < recentCalls.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      {/* Avatar */}
                      <div style={{
                        width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                        background: call.isEscalated
                          ? "rgba(167,139,250,0.15)"
                          : "rgba(196,161,74,0.1)",
                        border: "1px solid",
                        borderColor: call.isEscalated ? "rgba(167,139,250,0.3)" : "rgba(196,161,74,0.2)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, fontWeight: 700,
                        color: call.isEscalated ? "#a78bfa" : "#C4A14A",
                        fontFamily: "var(--font-display)",
                      }}>
                        {call.isMissed ? "✕" : (call.callerName || call.callerPhone || "?").charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#F0ECE4" }}>
                            {call.callerName || call.callerPhone || "Unknown caller"}
                          </span>
                          <StatusBadge status={call.leadStatus} />
                          {call.askedAboutPrice && (
                            <span style={{
                              fontSize: 10, padding: "1px 6px", borderRadius: 100,
                              background: "rgba(251,191,36,0.1)", color: "#fbbf24",
                              border: "1px solid rgba(251,191,36,0.2)", fontWeight: 600,
                            }}>
                              💰 Pricing
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                          {[call.projectLocation, call.propertyType, formatDuration(call.durationSeconds)]
                            .filter(Boolean).join(" · ")}
                        </div>
                        {call.aiSummary && (
                          <div style={{
                            fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 3,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {call.aiSummary}
                          </div>
                        )}
                      </div>

                      {/* Date */}
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", flexShrink: 0, textAlign: "right" }}>
                        {formatDate(call.callTimestamp)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Right column — quick stats */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Qualification funnel */}
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16, padding: 20,
            }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 16 }}>
                Qualification Funnel
              </h3>
              {[
                { label: "Total Calls", count: stats.total, pct: 100, color: "rgba(255,255,255,0.4)" },
                { label: "Qualified", count: stats.qualified, pct: stats.total ? (stats.qualified / stats.total) * 100 : 0, color: "#4ade80" },
                { label: "Pending", count: stats.pending, pct: stats.total ? (stats.pending / stats.total) * 100 : 0, color: "#fbbf24" },
                { label: "Rejected", count: stats.rejected, pct: stats.total ? (stats.rejected / stats.total) * 100 : 0, color: "#f87171" },
              ].map(row => (
                <div key={row.label} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{row.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: row.color }}>{row.count}</span>
                  </div>
                  <div style={{
                    height: 4, background: "rgba(255,255,255,0.05)",
                    borderRadius: 2, overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%",
                      width: `${row.pct}%`,
                      background: row.color,
                      borderRadius: 2,
                      transition: "width 0.8s ease",
                      opacity: 0.7,
                    }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Links */}
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16, padding: 16,
            }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 12 }}>
                Quick Access
              </h3>
              {[
                { href: "/pipeline", label: "Lead Pipeline", sub: "Kanban view", icon: "⟶" },
                { href: "/followups", label: "Follow-ups", sub: `${stats.pending} need action`, icon: "⟳" },
                { href: "/transcripts", label: "Transcripts", sub: "Accepted & rejected", icon: "☰" },
                { href: "/calls", label: "All Calls", sub: `${stats.total} this month`, icon: "↗" },
              ].map(link => (
                <Link key={link.href} href={link.href} className="quick-link-card" style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", marginBottom: 4,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  borderRadius: 10, textDecoration: "none",
                }}>
                  <span style={{ fontSize: 14, color: "#C4A14A", width: 20 }}>{link.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "#F0ECE4" }}>{link.label}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{link.sub}</div>
                  </div>
                </Link>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label, value, sub, icon, color, accentColor, borderColor, href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: string;
  color?: string;
  accentColor?: string;
  borderColor?: string;
  href?: string;
}) {
  const inner = (
    <div
      className="card-hover"
      style={{
        background: accentColor || "rgba(255,255,255,0.03)",
        border: `1px solid ${borderColor || "rgba(255,255,255,0.08)"}`,
        borderRadius: 16, padding: "20px",
        cursor: href ? "pointer" : "default",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{
          fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 600,
          textTransform: "uppercase", letterSpacing: "0.08em",
        }}>
          {label}
        </div>
        {icon && (
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: accentColor || "rgba(255,255,255,0.05)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, color: color || "rgba(255,255,255,0.5)",
          }}>
            {icon}
          </div>
        )}
      </div>
      <div style={{
        fontSize: 34, fontWeight: 700,
        color: color || "#F0ECE4",
        fontFamily: "var(--font-display)",
        lineHeight: 1,
        marginBottom: 6,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{sub}</div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href} style={{ textDecoration: "none", display: "block" }}>{inner}</Link>;
  }
  return inner;
}
