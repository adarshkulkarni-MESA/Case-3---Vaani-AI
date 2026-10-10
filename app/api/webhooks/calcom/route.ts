import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { verifyCalcomWebhook } from "@/lib/integrations/calcom";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-cal-signature-256") ?? "";

  const secret = process.env.CALCOM_WEBHOOK_SECRET ?? "";
  if (secret && !verifyCalcomWebhook(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const triggerEvent = payload.triggerEvent as string;
  const bookingData = payload.payload as Record<string, unknown>;

  if (!bookingData?.uid) {
    return NextResponse.json({ ok: true });
  }

  const calcomBookingId = String(bookingData.uid);

  if (triggerEvent === "BOOKING_CREATED" || triggerEvent === "BOOKING_RESCHEDULED") {
    const scheduledAt = bookingData.startTime ? new Date(bookingData.startTime as string) : null;

    await db
      .update(meetings)
      .set({
        meetingStatus: "confirmed",
        scheduledAt: scheduledAt ?? undefined,
        calcomBookingId,
        updatedAt: new Date(),
      })
      .where(eq(meetings.calcomBookingId, calcomBookingId));
  }

  if (triggerEvent === "BOOKING_CANCELLED") {
    await db
      .update(meetings)
      .set({
        meetingStatus: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(meetings.calcomBookingId, calcomBookingId));
  }

  return NextResponse.json({ ok: true });
}
