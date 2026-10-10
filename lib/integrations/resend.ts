import { Resend } from "resend";
import type { Call, User } from "@/lib/db/schema";

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "aangan@yourdomain.com";
const FRONT_DESK_EMAIL = process.env.FRONT_DESK_EMAIL || "frontdesk@aangan.studio";

export interface DesignerHandoffEmailData {
  call: Call & { customer?: { name?: string; phone?: string } | null };
  designer: User;
  handoffNote: string;
  transcript?: string;
  bookingLink?: string;
  dashboardUrl: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function markdownToHtml(md: string): string {
  return md
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/<\/li>\n<li>/g, "</li><li>")
    .replace(/(<li>[\s\S]*<\/li>)/, "<ul>$1</ul>")
    .replace(/\n/g, "<br>");
}

export async function sendDesignerHandoffEmail(data: DesignerHandoffEmailData) {
  const { call, designer, handoffNote, transcript, bookingLink, dashboardUrl } = data;
  const customerName = call.callerName || call.customer?.name || "Unknown Caller";
  const phone = call.callerPhone || call.customer?.phone || "—";
  const callDate = new Date(call.callTimestamp).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const statusColor =
    call.leadStatus === "qualified"
      ? "#16a34a"
      : call.leadStatus === "rejected"
      ? "#dc2626"
      : "#d97706";

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; margin: 0; padding: 0; background: #f5f1eb; }
    .container { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background: #1c2d3a; padding: 32px; }
    .header h1 { color: #fff; margin: 0 0 4px; font-size: 20px; font-weight: 600; }
    .header p { color: #9eb3c0; margin: 0; font-size: 14px; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; color: #fff; background: ${statusColor}; margin-top: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .content { padding: 32px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
    .meta-item { background: #f8f5f0; border-radius: 8px; padding: 12px 16px; }
    .meta-item .label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .meta-item .value { font-size: 14px; color: #1a1a1a; font-weight: 500; }
    .section { margin-bottom: 24px; }
    .section h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; margin: 0 0 12px; border-bottom: 1px solid #f0ebe3; padding-bottom: 8px; }
    .note { background: #f8f5f0; border-left: 3px solid #c4714b; padding: 16px; border-radius: 0 8px 8px 0; font-size: 14px; line-height: 1.6; }
    .transcript { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; font-size: 13px; line-height: 1.7; max-height: 300px; overflow-y: auto; font-family: 'Courier New', monospace; }
    .cta { text-align: center; margin: 24px 0; }
    .btn { display: inline-block; padding: 12px 28px; background: #1c2d3a; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; }
    .btn-secondary { background: #c4714b; margin-left: 12px; }
    .footer { background: #f8f5f0; padding: 20px 32px; font-size: 12px; color: #9ca3af; text-align: center; }
    .price-warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #92400e; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Aangan Studio — New Lead</h1>
      <p>A qualified call is ready for your review</p>
      <span class="status-badge">${call.leadStatus.replace("_", " ")}</span>
    </div>
    <div class="content">
      ${call.askedAboutPrice ? '<div class="price-warning">⚠️ <strong>Note:</strong> This caller asked about pricing. The standard approved response was given — no numbers were disclosed.</div>' : ""}
      <div class="meta-grid">
        <div class="meta-item">
          <div class="label">Caller</div>
          <div class="value">${escapeHtml(customerName)}</div>
        </div>
        <div class="meta-item">
          <div class="label">Phone</div>
          <div class="value">${escapeHtml(phone)}</div>
        </div>
        <div class="meta-item">
          <div class="label">Call Time</div>
          <div class="value">${callDate}</div>
        </div>
        <div class="meta-item">
          <div class="label">Location</div>
          <div class="value">${escapeHtml(call.projectLocation || "—")}</div>
        </div>
        <div class="meta-item">
          <div class="label">Property</div>
          <div class="value">${escapeHtml(call.propertyType || "—")}</div>
        </div>
        <div class="meta-item">
          <div class="label">Size</div>
          <div class="value">${call.squareFeet ? `${call.squareFeet} sq ft` : "—"}</div>
        </div>
      </div>
      <div class="section">
        <h2>Handoff Note</h2>
        <div class="note">${markdownToHtml(escapeHtml(handoffNote))}</div>
      </div>
      ${
        transcript
          ? `<div class="section">
        <h2>Call Transcript</h2>
        <div class="transcript">${escapeHtml(transcript).replace(/\n/g, "<br>")}</div>
      </div>`
          : ""
      }
      <div class="cta">
        <a href="${dashboardUrl}" class="btn">View in Dashboard</a>
        ${bookingLink ? `<a href="${escapeHtml(bookingLink)}" class="btn btn-secondary">Book Consultation</a>` : ""}
      </div>
    </div>
    <div class="footer">
      Aangan Studio · AI Operations Dashboard · This email was generated automatically from the call at ${callDate}
    </div>
  </div>
</body>
</html>`;

  const textBody = `
Aangan Studio — New Lead
Status: ${call.leadStatus.toUpperCase()}
Caller: ${customerName}
Phone: ${phone}
Call Time: ${callDate}
Location: ${call.projectLocation || "—"}

HANDOFF NOTE:
${handoffNote}

View in dashboard: ${dashboardUrl}
${bookingLink ? `Book consultation: ${bookingLink}` : ""}
  `.trim();

  const toAddresses = [designer.email];
  if (FRONT_DESK_EMAIL && FRONT_DESK_EMAIL !== designer.email) {
    toAddresses.push(FRONT_DESK_EMAIL);
  }

  const result = await resend.emails.send({
    from: `Aangan Studio AI <${FROM_EMAIL}>`,
    to: toAddresses,
    subject: `New Lead — ${customerName} · ${call.leadStatus.replace("_", " ").toUpperCase()}`,
    html: htmlBody,
    text: textBody,
  });

  return result;
}

export async function sendFrontDeskDeclineReview(
  call: Call & { customer?: { name?: string; phone?: string } | null }
) {
  const customerName = call.callerName || call.customer?.name || "Unknown Caller";
  const callDate = new Date(call.callTimestamp).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const result = await resend.emails.send({
    from: `Aangan Studio AI <${FROM_EMAIL}>`,
    to: [FRONT_DESK_EMAIL],
    subject: `Declined Call Review — ${customerName} · ${callDate}`,
    text: `
A call was declined by the AI agent. Please review and call back if the AI made an error.

Caller: ${customerName}
Phone: ${call.callerPhone || "—"}
Time: ${callDate}
Outcome: ${call.outcome}
Reason: ${call.rejectionReason || "—"}
Qualification notes: ${call.qualificationNotes || "—"}
AI Summary: ${call.aiSummary || "—"}

Please review in the dashboard.
    `.trim(),
  });

  return result;
}
