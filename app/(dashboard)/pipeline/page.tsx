import { db } from "@/lib/db";
import { calls, meetings, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { formatDate, formatDuration } from "@/lib/utils";
import Link from "next/link";

export const instant = false;

async function getPipelineData() {
  const qualifiedCalls = await db
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
      handoffNote: calls.handoffNote,
      assignedDesignerId: calls.assignedDesignerId,
    })
    .from(calls)
    .where(eq(calls.leadStatus, "qualified"))
    .orderBy(desc(calls.callTimestamp));

  const allMeetings = await db
    .select()
    .from(meetings)
    .orderBy(desc(meetings.createdAt));

  const allDesigners = await db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users);

  const meetingMap: Record<string, typeof allMeetings[0]> = {};
  for (const m of allMeetings) {
    meetingMap[m.callId] = m;
  }

  const designerMap: Record<string, string> = {};
  for (const d of allDesigners) {
    designerMap[d.id] = d.name;
  }

  return qualifiedCalls.map(c => ({
    ...c,
    meeting: meetingMap[c.id] || null,
    assignedDesignerName: c.assignedDesignerId ? designerMap[c.assignedDesignerId] : null,
  }));
}

export default async function PipelinePage() {
  const pipelineLeads = await getPipelineData();

  const newLeads = pipelineLeads.filter(l => !l.meeting || l.meeting.meetingStatus === "not_scheduled");
  const bookingSent = pipelineLeads.filter(l => l.meeting?.meetingStatus === "booking_sent");
  const confirmed = pipelineLeads.filter(l => l.meeting?.meetingStatus === "confirmed");
  const completed = pipelineLeads.filter(l => l.meeting?.meetingStatus === "completed");

  const columns = [
    { id: "new", label: "New Leads", color: "#C4A14A", bg: "rgba(196,161,74,0.08)", border: "rgba(196,161,74,0.2)", leads: newLeads },
    { id: "booking", label: "Booking Sent", color: "#60a5fa", bg: "rgba(96,165,250,0.08)", border: "rgba(96,165,250,0.2)", leads: bookingSent },
    { id: "confirmed", label: "Consultation Booked", color: "#4ade80", bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.2)", leads: confirmed },
    { id: "completed", label: "Completed", color: "#a78bfa", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.2)", leads: completed },
  ];

  return (
    <div className="mesh-bg" style={{ minHeight: "100vh" }}>
      {/* Header */}
      <div style={{
        padding: "32px 40px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        background: "linear-gradient(180deg, rgba(196,161,74,0.04) 0%, transparent 100%)",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "rgba(196,161,74,0.1)", border: "1px solid rgba(196,161,74,0.2)",
              borderRadius: 100, padding: "3px 10px", marginBottom: 10,
            }}>
              <span style={{ fontSize: 10, color: "#C4A14A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Lead Pipeline
              </span>
            </div>
            <h1 style={{
              fontFamily: "var(--font-display)",
              fontSize: 28, fontWeight: 700, color: "#F0ECE4", marginBottom: 6,
            }}>
              Sales Pipeline
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
              {pipelineLeads.length} qualified leads · Track from enquiry to consultation
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {columns.map(col => (
              <div key={col.id} style={{
                padding: "10px 16px",
                background: col.bg, border: `1px solid ${col.border}`,
                borderRadius: 10, textAlign: "center",
              }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: col.color, fontFamily: "var(--font-display)" }}>
                  {col.leads.length}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{col.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Kanban board */}
      <div style={{
        padding: "24px 40px",
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 16,
        alignItems: "start",
      }}>
        {columns.map(col => (
          <div key={col.id}>
            {/* Column header */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
              padding: "10px 14px",
              background: col.bg,
              border: `1px solid ${col.border}`,
              borderRadius: 10,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: col.color, boxShadow: `0 0 6px ${col.color}` }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: col.color, letterSpacing: "0.04em" }}>
                {col.label}
              </span>
              <span style={{
                marginLeft: "auto", fontSize: 11, fontWeight: 700,
                background: col.bg, color: col.color,
                border: `1px solid ${col.border}`,
                borderRadius: 100, padding: "1px 7px",
              }}>
                {col.leads.length}
              </span>
            </div>

            {/* Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {col.leads.length === 0 ? (
                <div style={{
                  padding: "24px 16px", textAlign: "center",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px dashed rgba(255,255,255,0.08)",
                  borderRadius: 12,
                }}>
                  <div style={{ fontSize: 22, opacity: 0.2, marginBottom: 6 }}>◯</div>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>No leads here</p>
                </div>
              ) : (
                col.leads.map(lead => (
                  <Link
                    key={lead.id}
                    href={`/calls/${lead.id}`}
                    className="pipeline-card"
                    style={{ padding: 16, display: "block", textDecoration: "none" }}
                  >
                    {/* Caller */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: "50%",
                        background: col.bg, border: `1px solid ${col.border}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 700, color: col.color,
                        fontFamily: "var(--font-display)",
                      }}>
                        {(lead.callerName || lead.callerPhone || "?").charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#F0ECE4", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {lead.callerName || lead.callerPhone || "Unknown"}
                        </div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                          {formatDate(lead.callTimestamp)}
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                      {lead.projectLocation && (
                        <span style={{
                          fontSize: 10, padding: "2px 7px", borderRadius: 100,
                          background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}>
                          📍 {lead.projectLocation}
                        </span>
                      )}
                      {lead.propertyType && (
                        <span style={{
                          fontSize: 10, padding: "2px 7px", borderRadius: 100,
                          background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}>
                          🏠 {lead.propertyType}
                        </span>
                      )}
                      {lead.squareFeet && (
                        <span style={{
                          fontSize: 10, padding: "2px 7px", borderRadius: 100,
                          background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}>
                          {lead.squareFeet} sqft
                        </span>
                      )}
                    </div>

                    {/* AI Summary */}
                    {lead.aiSummary && (
                      <p style={{
                        fontSize: 11, color: "rgba(255,255,255,0.3)",
                        lineHeight: 1.5, marginBottom: 10,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}>
                        {lead.aiSummary}
                      </p>
                    )}

                    {/* Footer */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      {lead.assignedDesignerName ? (
                        <span style={{ fontSize: 10, color: col.color, fontWeight: 500 }}>
                          → {lead.assignedDesignerName}
                        </span>
                      ) : (
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>Unassigned</span>
                      )}
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
                        {formatDuration(lead.durationSeconds)}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
