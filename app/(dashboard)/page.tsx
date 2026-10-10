import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { calls, meetings } from "@/lib/db/schema";
import { desc, eq, sql, gte, and } from "drizzle-orm";
import { StatusBadge } from "@/components/ui/badge";
import { formatDate, formatDuration, outcomeLabel } from "@/lib/utils";
import Link from "next/link";


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
      .limit(10),

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

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div style={{
      background: "var(--color-surface)", border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-lg)", padding: "20px 24px",
      boxShadow: "var(--shadow-sm)",
    }}>
      <div style={{ fontSize: 12, color: "var(--color-ink-muted)", fontWeight: 500, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || "var(--color-ink)", lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: "var(--color-ink-muted)", marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user as { name?: string; role?: string };
  const isFounder = user?.role === "founder" || user?.role === "admin";

  const { recentCalls, stats } = await getDashboardData(isFounder);

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--color-ink)", marginBottom: 4 }}>
          Good {getTimeOfDay()}, {firstName(user?.name)}
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-ink-muted)" }}>
          Here&apos;s what&apos;s happening at Aangan Studio — last 30 days
        </p>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
        <StatCard label="Total Calls" value={stats.total} sub="this month" />
        <StatCard label="Qualified" value={stats.qualified} color="var(--color-qualified)" sub={`${stats.qualificationRate}% conversion`} />
        <StatCard label="Pending Review" value={stats.pending} color="var(--color-pending)" sub="need attention" />
        <StatCard label="Rejected" value={stats.rejected} color="var(--color-rejected)" sub="this month" />
        {isFounder && stats.aiCost !== null && (
          <StatCard label="AI Cost" value={`$${stats.aiCost.toFixed(2)}`} sub="30 days · USD" />
        )}
      </div>

      {/* Recent calls */}
      <div style={{
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-sm)", overflow: "hidden",
      }}>
        <div style={{
          padding: "16px 24px", borderBottom: "1px solid var(--color-border-subtle)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--color-ink)" }}>Recent Calls</h2>
            <p style={{ fontSize: 12, color: "var(--color-ink-muted)", marginTop: 2 }}>Latest incoming enquiries</p>
          </div>
          <Link
            href="/calls"
            style={{ fontSize: 13, color: "var(--color-accent)", fontWeight: 500, textDecoration: "none" }}
          >
            View all →
          </Link>
        </div>

        {recentCalls.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📞</div>
            <p style={{ color: "var(--color-ink-muted)", fontSize: 14 }}>No calls yet. When the AI answers its first call, it will appear here.</p>
          </div>
        ) : (
          <div>
            {recentCalls.map((call, i) => (
              <Link
                key={call.id}
                href={`/calls/${call.id}`}
                style={{
                  display: "block", padding: "14px 24px", textDecoration: "none",
                  borderBottom: i < recentCalls.length - 1 ? "1px solid var(--color-border-subtle)" : "none",
                  background: "transparent", transition: "background 0.1s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                    background: call.isEscalated ? "var(--color-escalated-bg)" : "var(--color-accent-light)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700,
                    color: call.isEscalated ? "var(--color-escalated)" : "var(--color-accent)",
                  }}>
                    {call.isMissed ? "📵" : (call.callerName || call.callerPhone || "?").charAt(0).toUpperCase()}
                  </div>

                  {/* Main info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-ink)" }}>
                        {call.callerName || call.callerPhone || "Unknown caller"}
                      </span>
                      <StatusBadge status={call.leadStatus} />
                      {call.askedAboutPrice && (
                        <span style={{
                          fontSize: 10, padding: "1px 6px", borderRadius: 10,
                          background: "#fef9c3", color: "#713f12", border: "1px solid #fde047",
                          fontWeight: 600,
                        }}>
                          💰 Asked pricing
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-ink-muted)" }}>
                      {call.projectLocation && `${call.projectLocation} · `}
                      {call.propertyType && `${call.propertyType} · `}
                      {formatDuration(call.durationSeconds)}
                    </div>
                  </div>

                  {/* Date */}
                  <div style={{ fontSize: 12, color: "var(--color-ink-muted)", flexShrink: 0, textAlign: "right" }}>
                    {formatDate(call.callTimestamp)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function firstName(name?: string) {
  if (!name) return "there";
  return name.split(" ")[0];
}
