import { db } from "@/lib/db";
import { calls, transcripts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { formatDate, formatDuration } from "@/lib/utils";
import Link from "next/link";

export const instant = false;

type TabType = "qualified" | "rejected" | "all";

async function getTranscriptData(tab: TabType) {
  const statusFilter =
    tab === "qualified"
      ? eq(calls.leadStatus, "qualified")
      : tab === "rejected"
      ? eq(calls.leadStatus, "rejected")
      : undefined;

  const rows = await db
    .select({
      callId: calls.id,
      callerName: calls.callerName,
      callerPhone: calls.callerPhone,
      callTimestamp: calls.callTimestamp,
      durationSeconds: calls.durationSeconds,
      projectLocation: calls.projectLocation,
      propertyType: calls.propertyType,
      leadStatus: calls.leadStatus,
      outcome: calls.outcome,
      aiSummary: calls.aiSummary,
      rejectionReason: calls.rejectionReason,
      transcriptId: transcripts.id,
      fullText: transcripts.fullText,
    })
    .from(calls)
    .innerJoin(transcripts, eq(transcripts.callId, calls.id))
    .where(statusFilter)
    .orderBy(desc(calls.callTimestamp));

  return rows;
}

async function getCounts() {
  const [qualified, rejected, all] = await Promise.all([
    db.select({ id: calls.id }).from(calls)
      .innerJoin(transcripts, eq(transcripts.callId, calls.id))
      .where(eq(calls.leadStatus, "qualified")),
    db.select({ id: calls.id }).from(calls)
      .innerJoin(transcripts, eq(transcripts.callId, calls.id))
      .where(eq(calls.leadStatus, "rejected")),
    db.select({ id: calls.id }).from(calls)
      .innerJoin(transcripts, eq(transcripts.callId, calls.id)),
  ]);
  return { qualified: qualified.length, rejected: rejected.length, all: all.length };
}

interface Props {
  searchParams: Promise<{ tab?: string }>;
}

export default async function TranscriptsPage({ searchParams }: Props) {
  const params = await searchParams;
  const tab: TabType = (params.tab === "rejected" || params.tab === "all") ? params.tab : "qualified";
  const [rows, counts] = await Promise.all([getTranscriptData(tab), getCounts()]);

  const tabs: { id: TabType; label: string; count: number; color: string; border: string; bg: string }[] = [
    { id: "qualified", label: "Accepted", count: counts.qualified, color: "#4ade80", border: "rgba(74,222,128,0.3)", bg: "rgba(74,222,128,0.08)" },
    { id: "rejected", label: "Rejected", count: counts.rejected, color: "#f87171", border: "rgba(248,113,113,0.3)", bg: "rgba(248,113,113,0.08)" },
    { id: "all", label: "All", count: counts.all, color: "#C4A14A", border: "rgba(196,161,74,0.3)", bg: "rgba(196,161,74,0.08)" },
  ];

  const activeTab = tabs.find(t => t.id === tab)!;

  return (
    <div className="mesh-bg" style={{ minHeight: "100vh" }}>
      {/* Header */}
      <div style={{
        padding: "32px 40px 0",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        background: "linear-gradient(180deg, rgba(14,165,233,0.03) 0%, transparent 100%)",
      }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 100, padding: "3px 10px", marginBottom: 10,
          }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Call Transcripts
            </span>
          </div>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: 28, fontWeight: 700, color: "#F0ECE4", marginBottom: 6,
          }}>
            Transcripts
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
            Full call transcripts from Vaani AI receptionist
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4 }}>
          {tabs.map(t => (
            <Link
              key={t.id}
              href={`/transcripts?tab=${t.id}`}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "10px 18px",
                background: tab === t.id ? t.bg : "transparent",
                border: "1px solid",
                borderColor: tab === t.id ? t.border : "transparent",
                borderBottom: tab === t.id ? `2px solid ${t.color}` : "1px solid transparent",
                borderRadius: "10px 10px 0 0",
                textDecoration: "none",
                fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
                color: tab === t.id ? t.color : "rgba(255,255,255,0.4)",
                transition: "all 0.15s",
              }}
            >
              {t.label}
              <span style={{
                fontSize: 10, padding: "1px 6px", borderRadius: 100,
                background: tab === t.id ? t.bg : "rgba(255,255,255,0.05)",
                color: tab === t.id ? t.color : "rgba(255,255,255,0.3)",
                border: `1px solid ${tab === t.id ? t.border : "rgba(255,255,255,0.08)"}`,
                fontWeight: 700,
              }}>
                {t.count}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "24px 40px", maxWidth: 900 }}>
        {rows.length === 0 ? (
          <div style={{
            padding: 60, textAlign: "center",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 20,
          }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.2 }}>💬</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "#F0ECE4", marginBottom: 8 }}>
              No transcripts yet
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.3)" }}>
              {tab === "qualified" ? "Accepted" : tab === "rejected" ? "Rejected" : ""} transcripts will appear here.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {rows.map((row, i) => {
              const isQualified = row.leadStatus === "qualified";
              const statusColor = isQualified ? "#4ade80" : row.leadStatus === "rejected" ? "#f87171" : "#fbbf24";
              const statusBg = isQualified ? "rgba(74,222,128,0.08)" : row.leadStatus === "rejected" ? "rgba(248,113,113,0.08)" : "rgba(251,191,36,0.08)";
              const statusBorder = isQualified ? "rgba(74,222,128,0.2)" : row.leadStatus === "rejected" ? "rgba(248,113,113,0.2)" : "rgba(251,191,36,0.2)";

              return (
                <div
                  key={row.callId}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 16, overflow: "hidden",
                  }}
                >
                  {/* Card header */}
                  <div style={{
                    padding: "16px 20px",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    display: "flex", alignItems: "flex-start", gap: 14,
                    background: isQualified ? "rgba(74,222,128,0.03)" : "rgba(248,113,113,0.03)",
                  }}>
                    {/* Avatar */}
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                      background: statusBg, border: `1px solid ${statusBorder}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 15, fontWeight: 700, color: statusColor,
                      fontFamily: "var(--font-display)",
                    }}>
                      {(row.callerName || row.callerPhone || "?").charAt(0).toUpperCase()}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "#F0ECE4", fontFamily: "var(--font-display)" }}>
                          {row.callerName || row.callerPhone || "Unknown caller"}
                        </span>
                        <span style={{
                          fontSize: 10, padding: "2px 8px", borderRadius: 100,
                          background: statusBg, color: statusColor,
                          border: `1px solid ${statusBorder}`, fontWeight: 700,
                          textTransform: "uppercase", letterSpacing: "0.06em",
                        }}>
                          {isQualified ? "✓ Accepted" : row.leadStatus === "rejected" ? "✕ Rejected" : "⟳ Pending"}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                          {formatDate(row.callTimestamp)}
                        </span>
                        {row.projectLocation && (
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                            · 📍 {row.projectLocation}
                          </span>
                        )}
                        {row.propertyType && (
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                            · 🏠 {row.propertyType}
                          </span>
                        )}
                        {row.durationSeconds && (
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                            · ⏱ {formatDuration(row.durationSeconds)}
                          </span>
                        )}
                      </div>
                    </div>

                    <Link
                      href={`/calls/${row.callId}`}
                      className="quick-link-card"
                      style={{
                        padding: "7px 14px",
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 8, textDecoration: "none",
                        fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 500,
                        flexShrink: 0, whiteSpace: "nowrap",
                      }}
                    >
                      Full Details →
                    </Link>
                  </div>

                  {/* AI Summary */}
                  {row.aiSummary && (
                    <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#C4A14A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                        AI Summary
                      </div>
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
                        {row.aiSummary}
                      </p>
                    </div>
                  )}

                  {/* Rejection reason if rejected */}
                  {row.rejectionReason && (
                    <div style={{ padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(248,113,113,0.04)" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                        Rejection Reason
                      </div>
                      <p style={{ fontSize: 12, color: "rgba(248,113,113,0.7)", lineHeight: 1.5 }}>
                        {row.rejectionReason}
                      </p>
                    </div>
                  )}

                  {/* Transcript */}
                  {row.fullText ? (
                    <details style={{ padding: "0" }}>
                      <summary style={{
                        padding: "12px 20px", cursor: "pointer",
                        fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)",
                        display: "flex", alignItems: "center", gap: 6,
                        userSelect: "none", listStyle: "none",
                        borderTop: "1px solid rgba(255,255,255,0.04)",
                      }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                        View Full Transcript
                      </summary>
                      <div style={{
                        padding: "16px 20px",
                        background: "rgba(0,0,0,0.3)",
                        borderTop: "1px solid rgba(255,255,255,0.04)",
                        maxHeight: 360, overflowY: "auto",
                      }}>
                        <pre style={{
                          fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
                          fontSize: 11, color: "rgba(255,255,255,0.5)",
                          whiteSpace: "pre-wrap", lineHeight: 1.7,
                          margin: 0,
                        }}>
                          {row.fullText}
                        </pre>
                      </div>
                    </details>
                  ) : (
                    <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>No transcript recorded</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
