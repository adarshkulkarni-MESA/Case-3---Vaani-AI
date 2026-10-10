import { db } from "@/lib/db";
import { calls, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { formatDate, formatDuration } from "@/lib/utils";
import Link from "next/link";

export const instant = false;

async function getFollowups() {
  const pendingCalls = await db
    .select({
      id: calls.id,
      callerName: calls.callerName,
      callerPhone: calls.callerPhone,
      callTimestamp: calls.callTimestamp,
      durationSeconds: calls.durationSeconds,
      projectLocation: calls.projectLocation,
      propertyType: calls.propertyType,
      projectType: calls.projectType,
      squareFeet: calls.squareFeet,
      timeline: calls.timeline,
      aiSummary: calls.aiSummary,
      qualificationNotes: calls.qualificationNotes,
      outcome: calls.outcome,
      isEscalated: calls.isEscalated,
      askedAboutPrice: calls.askedAboutPrice,
      reviewedByFrontDesk: calls.reviewedByFrontDesk,
      assignedDesignerId: calls.assignedDesignerId,
    })
    .from(calls)
    .where(eq(calls.leadStatus, "pending_review"))
    .orderBy(desc(calls.callTimestamp));

  const designers = await db
    .select({ id: users.id, name: users.name })
    .from(users);

  const designerMap: Record<string, string> = {};
  for (const d of designers) {
    designerMap[d.id] = d.name;
  }

  return pendingCalls.map(c => ({
    ...c,
    assignedDesignerName: c.assignedDesignerId ? designerMap[c.assignedDesignerId] : null,
  }));
}

function urgencyLevel(callTimestamp: Date): "high" | "medium" | "low" {
  const hours = (Date.now() - new Date(callTimestamp).getTime()) / 3600000;
  if (hours > 48) return "high";
  if (hours > 24) return "medium";
  return "low";
}

export default async function FollowupsPage() {
  const pendingCalls = await getFollowups();
  const high = pendingCalls.filter(c => urgencyLevel(c.callTimestamp) === "high");
  const medium = pendingCalls.filter(c => urgencyLevel(c.callTimestamp) === "medium");
  const low = pendingCalls.filter(c => urgencyLevel(c.callTimestamp) === "low");

  return (
    <div className="mesh-bg" style={{ minHeight: "100vh" }}>
      {/* Header */}
      <div style={{
        padding: "32px 40px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        background: "linear-gradient(180deg, rgba(251,191,36,0.04) 0%, transparent 100%)",
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)",
          borderRadius: 100, padding: "3px 10px", marginBottom: 10,
        }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#fbbf24", boxShadow: "0 0 5px #fbbf24" }} />
          <span style={{ fontSize: 10, color: "#fbbf24", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Needs Attention
          </span>
        </div>
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: 28, fontWeight: 700, color: "#F0ECE4", marginBottom: 6,
        }}>
          Follow-ups
        </h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
          {pendingCalls.length} calls pending review · Sorted by urgency
        </p>

        {/* Urgency summary */}
        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          {[
            { label: "Overdue (48h+)", count: high.length, color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.2)" },
            { label: "Needs Action (24h+)", count: medium.length, color: "#fbbf24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.2)" },
            { label: "Recent (< 24h)", count: low.length, color: "#4ade80", bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.2)" },
          ].map(s => (
            <div key={s.label} style={{
              padding: "10px 16px",
              background: s.bg, border: `1px solid ${s.border}`,
              borderRadius: 10,
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: "var(--font-display)" }}>
                {s.count}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "24px 40px", maxWidth: 900 }}>
        {pendingCalls.length === 0 ? (
          <div style={{
            padding: 60, textAlign: "center",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 20,
          }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>✓</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "#F0ECE4", marginBottom: 8 }}>
              All caught up!
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.3)" }}>
              No calls pending review at this time.
            </p>
          </div>
        ) : (
          <>
            {[
              { id: "rejected", label: "Overdue", calls: high, color: "#f87171", bg: "rgba(248,113,113,0.06)", border: "rgba(248,113,113,0.15)" },
              { id: "pending", label: "Needs Action", calls: medium, color: "#fbbf24", bg: "rgba(251,191,36,0.06)", border: "rgba(251,191,36,0.15)" },
              { id: "qualified", label: "Recent", calls: low, color: "#4ade80", bg: "rgba(74,222,128,0.06)", border: "rgba(74,222,128,0.15)" },
            ].map(group => group.calls.length > 0 && (
              <div key={group.label} style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: group.color, boxShadow: `0 0 6px ${group.color}` }} />
                  <h2 style={{ fontSize: 13, fontWeight: 700, color: group.color, letterSpacing: "0.04em" }}>
                    {group.label}
                  </h2>
                  <span style={{
                    fontSize: 10, padding: "1px 7px", borderRadius: 100,
                    background: group.bg, color: group.color, border: `1px solid ${group.border}`,
                    fontWeight: 700,
                  }}>
                    {group.calls.length}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {group.calls.map(call => (
                    <Link
                      key={call.id}
                      href={`/calls/${call.id}`}
                      className={`followup-card followup-${group.id === "new" ? "pending" : group.id === "booking" ? "pending" : group.id}`}
                      style={{
                        display: "block",
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        borderRadius: 14, padding: 20, textDecoration: "none",
                      }}
                    >
                      <div style={{ display: "flex", gap: 14 }}>
                        {/* Avatar */}
                        <div style={{
                          width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                          background: group.bg, border: `1px solid ${group.border}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 16, fontWeight: 700, color: group.color,
                          fontFamily: "var(--font-display)",
                        }}>
                          {(call.callerName || call.callerPhone || "?").charAt(0).toUpperCase()}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: "#F0ECE4", fontFamily: "var(--font-display)" }}>
                              {call.callerName || call.callerPhone || "Unknown caller"}
                            </span>
                            {call.isEscalated && (
                              <span style={{
                                fontSize: 10, padding: "1px 8px", borderRadius: 100,
                                background: "rgba(167,139,250,0.1)", color: "#a78bfa",
                                border: "1px solid rgba(167,139,250,0.2)", fontWeight: 600,
                              }}>
                                ⬆ Escalated
                              </span>
                            )}
                            {call.askedAboutPrice && (
                              <span style={{
                                fontSize: 10, padding: "1px 8px", borderRadius: 100,
                                background: "rgba(251,191,36,0.08)", color: "#fbbf24",
                                border: "1px solid rgba(251,191,36,0.2)", fontWeight: 600,
                              }}>
                                💰 Asked pricing
                              </span>
                            )}
                          </div>

                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                            {call.projectLocation && (
                              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>📍 {call.projectLocation}</span>
                            )}
                            {call.propertyType && (
                              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>· 🏠 {call.propertyType}</span>
                            )}
                            {call.timeline && (
                              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>· ⏱ {call.timeline}</span>
                            )}
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>· {formatDuration(call.durationSeconds)}</span>
                          </div>

                          {call.aiSummary && (
                            <p style={{
                              fontSize: 12, color: "rgba(255,255,255,0.4)",
                              lineHeight: 1.5, marginBottom: 8,
                            }}>
                              {call.aiSummary}
                            </p>
                          )}

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
                              {formatDate(call.callTimestamp)}
                            </span>
                            <span style={{
                              fontSize: 11, padding: "3px 10px",
                              background: group.bg, color: group.color,
                              border: `1px solid ${group.border}`,
                              borderRadius: 100, fontWeight: 600,
                            }}>
                              Review →
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
