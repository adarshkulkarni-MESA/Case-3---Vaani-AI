import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { formatDate, formatDuration, outcomeLabel } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/badge";
import Link from "next/link";

async function getCallDetail(id: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/calls/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

function CriterionRow({ label, value }: { label: string; value: boolean | null }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--color-border-subtle)" }}>
      <span style={{ fontSize: 16 }}>
        {value === true ? "✅" : value === false ? "❌" : "⚠️"}
      </span>
      <span style={{ fontSize: 13, color: "var(--color-ink-secondary)", flex: 1 }}>{label}</span>
      <span style={{
        fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
        background: value === true ? "var(--color-qualified-bg)" : value === false ? "var(--color-rejected-bg)" : "var(--color-pending-bg)",
        color: value === true ? "var(--color-qualified)" : value === false ? "var(--color-rejected)" : "var(--color-pending)",
      }}>
        {value === true ? "Pass" : value === false ? "Fail" : "Unclear"}
      </span>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--color-surface)", border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-lg)", overflow: "hidden", marginBottom: 16,
      boxShadow: "var(--shadow-sm)",
    }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--color-border-subtle)", background: "var(--color-surface-elevated)" }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {title}
        </h3>
      </div>
      <div style={{ padding: "16px 20px" }}>
        {children}
      </div>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value?: string | number | boolean | null }) {
  const display = value === null || value === undefined ? "—" : String(value);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: "var(--color-ink)" }}>{display || "—"}</div>
    </div>
  );
}

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return notFound();

  const data = await getCallDetail(id);
  if (!data) return notFound();

  const { call, transcript, meeting, customer, designer, emails, hubspotSync } = data;
  const criteria = call.qualificationCriteria || {};

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1100 }}>
      {/* Back */}
      <Link href="/calls" style={{ fontSize: 13, color: "var(--color-accent)", textDecoration: "none", display: "inline-block", marginBottom: 20 }}>
        ← Back to calls
      </Link>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 20, marginBottom: 28 }}>
        {/* Avatar */}
        <div style={{
          width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
          background: "var(--color-accent-light)", display: "flex",
          alignItems: "center", justifyContent: "center",
          fontSize: 20, fontWeight: 700, color: "var(--color-accent)",
        }}>
          {call.isMissed ? "📵" : (call.callerName || call.callerPhone || "?").charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--color-ink)" }}>
              {call.callerName || call.callerPhone || "Unknown caller"}
            </h1>
            <StatusBadge status={call.leadStatus} />
            {call.askedAboutPrice && (
              <span style={{ fontSize: 11, padding: "2px 8px", background: "#fef9c3", color: "#713f12", border: "1px solid #fde047", borderRadius: 10, fontWeight: 600 }}>
                💰 Asked about pricing
              </span>
            )}
            {call.isEscalated && (
              <span style={{ fontSize: 11, padding: "2px 8px", background: "var(--color-escalated-bg)", color: "var(--color-escalated)", borderRadius: 10, fontWeight: 600 }}>
                ⚡ Escalated
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, color: "var(--color-ink-muted)", marginTop: 6 }}>
            {call.callerPhone && <span>{call.callerPhone} · </span>}
            {formatDate(call.callTimestamp)} · {formatDuration(call.durationSeconds)}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, alignItems: "start" }}>
        {/* Left column */}
        <div>
          {/* AI Summary */}
          {call.aiSummary && (
            <SectionCard title="AI Summary">
              <p style={{ fontSize: 14, color: "var(--color-ink-secondary)", lineHeight: 1.7 }}>
                {call.aiSummary}
              </p>
            </SectionCard>
          )}

          {/* Handoff Note */}
          {call.handoffNote && (
            <SectionCard title="Handoff Note">
              <pre style={{
                fontSize: 13, color: "var(--color-ink-secondary)", lineHeight: 1.7,
                whiteSpace: "pre-wrap", fontFamily: "inherit",
                margin: 0,
              }}>
                {call.handoffNote}
              </pre>
            </SectionCard>
          )}

          {/* Transcript */}
          {transcript?.fullText && (
            <SectionCard title="Call Transcript">
              <div style={{
                fontSize: 13, color: "var(--color-ink-secondary)", lineHeight: 1.8,
                maxHeight: 400, overflowY: "auto",
                fontFamily: "'Courier New', monospace",
                background: "var(--color-bg)", borderRadius: "var(--radius-md)",
                padding: 16,
              }}>
                {transcript.fullText}
              </div>
            </SectionCard>
          )}

          {/* Rejection reason */}
          {call.rejectionReason && (
            <SectionCard title="Rejection Reason">
              <div style={{
                background: "var(--color-rejected-bg)", border: "1px solid var(--color-rejected-border)",
                borderRadius: "var(--radius-md)", padding: "12px 16px",
                fontSize: 14, color: "var(--color-rejected)",
              }}>
                {call.rejectionReason}
              </div>
            </SectionCard>
          )}
        </div>

        {/* Right column */}
        <div>
          {/* Project details */}
          <SectionCard title="Project Details">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
              <MetaItem label="Location" value={call.projectLocation} />
              <MetaItem label="Property" value={call.propertyType} />
              <MetaItem label="Size" value={call.squareFeet ? `${call.squareFeet} sq ft` : null} />
              <MetaItem label="Project type" value={call.projectType} />
              <MetaItem label="Timeline" value={call.timeline} />
              <MetaItem label="Budget mentioned" value={call.budgetMentioned} />
              <MetaItem label="Decision-maker" value={call.isDecisionMaker === true ? "Yes" : call.isDecisionMaker === false ? "No" : "Not confirmed"} />
              {call.decisionMakerNote && <MetaItem label="DM Note" value={call.decisionMakerNote} />}
            </div>
            {call.projectScope && (
              <div style={{ marginTop: 8, borderTop: "1px solid var(--color-border-subtle)", paddingTop: 12 }}>
                <MetaItem label="Scope" value={call.projectScope} />
              </div>
            )}
          </SectionCard>

          {/* Qualification criteria */}
          <SectionCard title="Qualification Criteria">
            <CriterionRow label="Real project (design + execution)" value={criteria.real_project ?? null} />
            <CriterionRow label="In service area (Pune / PCMC)" value={criteria.in_area ?? null} />
            <CriterionRow label="Realistic timeline (8–10 weeks)" value={criteria.timeline ?? null} />
            <CriterionRow label="Budget alignment" value={criteria.budget ?? null} />
            <CriterionRow label="Decision-maker on call" value={criteria.decision_maker ?? null} />
            {call.qualificationNotes && (
              <p style={{ marginTop: 12, fontSize: 12, color: "var(--color-ink-muted)", lineHeight: 1.6 }}>
                {call.qualificationNotes}
              </p>
            )}
          </SectionCard>

          {/* Designer & meeting */}
          <SectionCard title="Assignment & Meeting">
            <MetaItem label="Assigned Designer" value={designer?.name || "Unassigned"} />
            <MetaItem label="Meeting Status" value={meeting?.meetingStatus?.replace("_", " ") || "Not scheduled"} />
            {meeting?.bookingLink && (
              <div style={{ marginTop: 8 }}>
                <a
                  href={meeting.bookingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block", padding: "8px 16px",
                    background: "var(--color-accent)", color: "white",
                    borderRadius: "var(--radius-md)", textDecoration: "none",
                    fontSize: 13, fontWeight: 600,
                  }}
                >
                  Book consultation →
                </a>
              </div>
            )}
          </SectionCard>

          {/* HubSpot Sync */}
          {hubspotSync && (
            <SectionCard title="HubSpot Sync">
              <MetaItem label="Status" value={hubspotSync.syncStatus} />
              {hubspotSync.hubspotContactId && <MetaItem label="Contact ID" value={hubspotSync.hubspotContactId} />}
              {hubspotSync.hubspotDealId && <MetaItem label="Deal ID" value={hubspotSync.hubspotDealId} />}
              {hubspotSync.errorMessage && (
                <div style={{ fontSize: 12, color: "var(--color-rejected)", marginTop: 8 }}>
                  Error: {hubspotSync.errorMessage}
                </div>
              )}
            </SectionCard>
          )}

          {/* Emails sent */}
          {emails?.length > 0 && (
            <SectionCard title="Emails Sent">
              {emails.map((email: { id: string; toEmail: string; subject: string; status: string; sentAt?: string }) => (
                <div key={email.id} style={{ marginBottom: 8, fontSize: 13 }}>
                  <div style={{ fontWeight: 500, color: "var(--color-ink)" }}>{email.subject}</div>
                  <div style={{ color: "var(--color-ink-muted)", fontSize: 11, marginTop: 2 }}>
                    To: {email.toEmail} · {email.status} · {email.sentAt ? formatDate(email.sentAt) : "—"}
                  </div>
                </div>
              ))}
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
