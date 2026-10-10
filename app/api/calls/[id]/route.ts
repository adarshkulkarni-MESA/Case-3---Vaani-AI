import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  calls,
  customers,
  meetings,
  transcripts,
  users,
  emailNotifications,
  hubspotSync,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";


export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [call] = await db
    .select()
    .from(calls)
    .where(eq(calls.id, id))
    .limit(1);

  if (!call) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [transcript] = await db
    .select()
    .from(transcripts)
    .where(eq(transcripts.callId, id))
    .limit(1);

  const [meeting] = await db
    .select()
    .from(meetings)
    .where(eq(meetings.callId, id))
    .limit(1);

  const [customer] = call.customerId
    ? await db
        .select()
        .from(customers)
        .where(eq(customers.id, call.customerId!))
        .limit(1)
    : [undefined];

  const [designer] = call.assignedDesignerId
    ? await db
        .select({ id: users.id, name: users.name, email: users.email, calcomUsername: users.calcomUsername })
        .from(users)
        .where(eq(users.id, call.assignedDesignerId!))
        .limit(1)
    : [undefined];

  const emails = await db
    .select()
    .from(emailNotifications)
    .where(eq(emailNotifications.callId, id));

  const [sync] = await db
    .select()
    .from(hubspotSync)
    .where(eq(hubspotSync.callId, id))
    .limit(1);

  return NextResponse.json({
    call,
    transcript,
    meeting,
    customer,
    designer,
    emails,
    hubspotSync: sync,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const allowed = ["leadStatus", "assignedDesignerId", "reviewedByFrontDesk", "qualificationNotes"];
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  for (const key of allowed) {
    if (key in body) {
      updates[key === "leadStatus" ? "lead_status" : key] = body[key];
    }
  }

  await db.update(calls).set(updates).where(eq(calls.id, id));
  return NextResponse.json({ success: true });
}
