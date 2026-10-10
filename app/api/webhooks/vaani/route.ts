import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  calls,
  customers,
  transcripts,
  webhookEvents,
  meetings,
  emailNotifications,
  hubspotSync,
  auditLog,
} from "@/lib/db/schema";
import { verifyVaaniSignature, type VaaniCallPayload } from "@/lib/integrations/vaani";
import { qualifyLead, generateHandoffNote } from "@/lib/ai/qualification";
import { sendDesignerHandoffEmail, sendFrontDeskDeclineReview } from "@/lib/integrations/resend";
import { syncCallToHubSpot } from "@/lib/integrations/hubspot";
import { getDesignerBookingLink } from "@/lib/integrations/calcom";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isIdempotentEvent(eventId: string): Promise<boolean> {
  const existing = await db
    .select({ id: webhookEvents.id })
    .from(webhookEvents)
    .where(eq(webhookEvents.eventId, eventId))
    .limit(1);
  return existing.length > 0;
}

async function recordEvent(eventId: string, source: string, eventType: string, payload: unknown) {
  await db.insert(webhookEvents).values({
    eventId,
    source,
    eventType,
    payload: payload as Record<string, unknown>,
  });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Verify webhook signature
  const signature = request.headers.get("x-vaani-signature") || "";
  const secret = process.env.VAANI_WEBHOOK_SECRET!;

  if (secret && !verifyVaaniSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: VaaniCallPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Idempotency check
  const eventId = `vaani:${payload.call_id}:${payload.event_type}`;
  if (await isIdempotentEvent(eventId)) {
    return NextResponse.json({ status: "already_processed" });
  }

  // Record the event
  await recordEvent(eventId, "vaani", payload.event_type, payload);

  if (payload.event_type === "call.missed") {
    await handleMissedCall(payload);
    return NextResponse.json({ status: "ok" });
  }

  if (payload.event_type !== "call.completed") {
    return NextResponse.json({ status: "ignored" });
  }

  await handleCompletedCall(payload);
  return NextResponse.json({ status: "ok" });
}

async function handleMissedCall(payload: VaaniCallPayload) {
  // Find or create customer
  let customerId: string | undefined;
  if (payload.caller_number) {
    const existing = await db
      .select()
      .from(customers)
      .where(eq(customers.phone, payload.caller_number))
      .limit(1);

    if (existing[0]) {
      customerId = existing[0].id;
    } else {
      const [newCustomer] = await db
        .insert(customers)
        .values({ phone: payload.caller_number })
        .returning({ id: customers.id });
      customerId = newCustomer.id;
    }
  }

  await db.insert(calls).values({
    vaaniCallId: payload.call_id,
    customerId,
    callerPhone: payload.caller_number,
    callTimestamp: new Date(payload.timestamp),
    durationSeconds: 0,
    outcome: "missed",
    leadStatus: "pending_review",
    isMissed: true,
  });
}

async function handleCompletedCall(payload: VaaniCallPayload) {
  const extracted = payload.extracted_data || {};

  // Find or create customer
  let customerId: string | undefined;
  const phone = payload.caller_number || extracted.phone;
  if (phone) {
    const existing = await db
      .select()
      .from(customers)
      .where(eq(customers.phone, phone))
      .limit(1);

    if (existing[0]) {
      customerId = existing[0].id;
      // Update name if we have it now
      if (extracted.name && !existing[0].name) {
        await db.update(customers).set({ name: extracted.name, updatedAt: new Date() }).where(eq(customers.id, customerId));
      }
    } else {
      const [newCustomer] = await db
        .insert(customers)
        .values({
          phone,
          name: extracted.name,
          location: extracted.location,
        })
        .returning({ id: customers.id });
      customerId = newCustomer.id;
    }
  }

  // Run qualification
  const qualInput = {
    projectScope: extracted.project_scope,
    projectLocation: extracted.location,
    timeline: extracted.timeline,
    budgetMentioned: extracted.budget_mentioned,
    isDecisionMaker: extracted.is_decision_maker,
    decisionMakerNote: extracted.decision_maker_note,
    squareFeet: extracted.square_feet,
    projectType: extracted.project_type,
  };

  const qualification = qualifyLead(qualInput);

  // Generate handoff note
  const handoffNote = generateHandoffNote(
    extracted.name || payload.caller_name,
    { ...qualInput, askedAboutPrice: extracted.asked_about_price },
    qualification,
    extracted.ai_summary
  );

  // Insert call record
  const [call] = await db
    .insert(calls)
    .values({
      vaaniCallId: payload.call_id,
      customerId,
      callerPhone: phone,
      callerName: extracted.name || payload.caller_name,
      callTimestamp: new Date(payload.timestamp),
      durationSeconds: payload.duration_seconds,
      projectLocation: extracted.location,
      projectType: extracted.project_type,
      propertyType: extracted.property_type,
      squareFeet: extracted.square_feet,
      projectScope: extracted.project_scope,
      timeline: extracted.timeline,
      isDecisionMaker: extracted.is_decision_maker,
      decisionMakerNote: extracted.decision_maker_note,
      budgetMentioned: extracted.budget_mentioned,
      askedAboutPrice: extracted.asked_about_price || false,
      outcome: extracted.is_escalation ? "escalated" : qualification.outcome,
      leadStatus: qualification.status,
      qualificationNotes: qualification.notes,
      rejectionReason: qualification.rejectionReason,
      aiSummary: extracted.ai_summary,
      handoffNote,
      aiCostUsd: payload.cost_usd?.toString(),
      qualificationCriteria: qualification.criteria as Record<string, unknown>,
      isEscalated: extracted.is_escalation || false,
      escalationNote: extracted.escalation_note,
    })
    .returning();

  // Insert transcript if available
  if (payload.transcript || payload.transcript_segments) {
    await db.insert(transcripts).values({
      callId: call.id,
      fullText: payload.transcript,
      segments: payload.transcript_segments as unknown as Record<string, unknown>[],
      recordingUrl: payload.recording_url,
    });
  }

  // Handle qualified leads
  if (qualification.status === "qualified") {
    await handleQualifiedLead(call, extracted);
  }

  // Handle declined — send to front desk for review
  if (qualification.status === "rejected") {
    try {
      await sendFrontDeskDeclineReview({ ...call, customer: customerId ? { name: extracted.name, phone } : null });

      const [emailRecord] = await db.insert(emailNotifications).values({
        callId: call.id,
        toEmail: process.env.FRONT_DESK_EMAIL || "",
        subject: `Declined Call Review — ${extracted.name || "Unknown"} · ${new Date(payload.timestamp).toLocaleDateString("en-IN")}`,
        status: "sent",
        sentAt: new Date(),
      }).returning();
    } catch (err) {
      console.error("Failed to send decline review email:", err);
    }
  }

  // Queue HubSpot sync for qualified and rejected leads
  if (qualification.status !== "pending_review") {
    await db.insert(hubspotSync).values({
      callId: call.id,
      customerId,
      syncStatus: "pending",
    });

    // Attempt sync in background (in production, use a queue)
    setImmediate(() => triggerHubSpotSync(call.id));
  }

  // Audit log
  await db.insert(auditLog).values({
    entityType: "call",
    entityId: call.id,
    action: "created",
    actorType: "system",
    changes: { qualification: qualification.status, outcome: qualification.outcome },
  });
}

async function handleQualifiedLead(
  call: Awaited<ReturnType<typeof db.insert>>[number] & { id: string },
  extracted: NonNullable<VaaniCallPayload["extracted_data"]>
) {
  const typedCall = call as { id: string; handoffNote: string | null; callerName: string | null; callerPhone: string | null; aiSummary: string | null; leadStatus: string; askedAboutPrice: boolean; callTimestamp: Date; projectLocation: string | null };

  // Get available designers — for MVP, assign to first active designer
  const designers = await db
    .select()
    .from(require("@/lib/db/schema").users)
    .where(eq(require("@/lib/db/schema").users.role, "designer"))
    .limit(1);

  const designer = designers[0];
  if (!designer) return;

  // Update call with designer assignment
  await db
    .update(calls)
    .set({ assignedDesignerId: designer.id, updatedAt: new Date() })
    .where(eq(calls.id, typedCall.id));

  // Create meeting record
  const bookingLink = designer.calcomUsername
    ? getDesignerBookingLink(designer.calcomUsername)
    : null;

  await db.insert(meetings).values({
    callId: typedCall.id,
    designerId: designer.id,
    meetingStatus: bookingLink ? "booking_sent" : "not_scheduled",
    bookingLink,
  });

  // Send handoff email
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/calls/${typedCall.id}`;

  try {
    const emailResult = await sendDesignerHandoffEmail({
      call: typedCall as Parameters<typeof sendDesignerHandoffEmail>[0]["call"],
      designer,
      handoffNote: typedCall.handoffNote || "",
      bookingLink: bookingLink || undefined,
      dashboardUrl,
    });

    await db.insert(emailNotifications).values({
      callId: typedCall.id,
      designerId: designer.id,
      toEmail: designer.email,
      subject: `New Lead — ${typedCall.callerName || "Unknown"} · QUALIFIED`,
      resendMessageId: (emailResult.data as { id?: string })?.id,
      status: "sent",
      sentAt: new Date(),
    });
  } catch (err) {
    console.error("Failed to send designer handoff email:", err);
    await db.insert(emailNotifications).values({
      callId: typedCall.id,
      designerId: designer.id,
      toEmail: designer.email,
      subject: `New Lead — ${typedCall.callerName || "Unknown"} · QUALIFIED`,
      status: "failed",
      errorMessage: String(err),
    });
  }
}

async function triggerHubSpotSync(callId: string) {
  try {
    const [call] = await db
      .select()
      .from(calls)
      .where(eq(calls.id, callId))
      .limit(1);

    if (!call) return;

    const result = await syncCallToHubSpot({
      callId: call.id,
      callerName: call.callerName,
      callerPhone: call.callerPhone,
      projectLocation: call.projectLocation,
      projectType: call.projectType,
      propertyType: call.propertyType,
      squareFeet: call.squareFeet,
      projectScope: call.projectScope,
      timeline: call.timeline,
      leadStatus: call.leadStatus,
      aiSummary: call.aiSummary,
      callTimestamp: call.callTimestamp,
      askedAboutPrice: call.askedAboutPrice,
      qualificationNotes: call.qualificationNotes,
    });

    await db
      .update(hubspotSync)
      .set({
        hubspotContactId: result.contactId,
        hubspotDealId: result.dealId,
        syncStatus: "synced",
        syncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(hubspotSync.callId, callId));
  } catch (err) {
    await db
      .update(hubspotSync)
      .set({
        syncStatus: "failed",
        errorMessage: String(err),
        retryCount: 1,
        updatedAt: new Date(),
      })
      .where(eq(hubspotSync.callId, callId));
  }
}
