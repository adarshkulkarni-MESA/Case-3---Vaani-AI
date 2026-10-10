import { NextRequest, NextResponse } from "next/server";
import { auth, isFounder } from "@/lib/auth";
import { db } from "@/lib/db";
import { calls, hubspotSync } from "@/lib/db/schema";
import { syncCallToHubSpot } from "@/lib/integrations/hubspot";
import { eq, and } from "drizzle-orm";


// Retry failed HubSpot syncs — founder only
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as { role?: string };
  if (!isFounder(user.role || "")) {
    return NextResponse.json({ error: "Forbidden — founders only" }, { status: 403 });
  }

  const { callId } = await request.json();

  const [call] = await db.select().from(calls).where(eq(calls.id, callId)).limit(1);
  if (!call) {
    return NextResponse.json({ error: "Call not found" }, { status: 404 });
  }

  const [existingSync] = await db
    .select()
    .from(hubspotSync)
    .where(eq(hubspotSync.callId, callId))
    .limit(1);

  if (existingSync?.retryCount && existingSync.retryCount >= 5) {
    return NextResponse.json({ error: "Max retries exceeded" }, { status: 429 });
  }

  try {
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

    if (existingSync) {
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
    } else {
      await db.insert(hubspotSync).values({
        callId: call.id,
        hubspotContactId: result.contactId,
        hubspotDealId: result.dealId,
        syncStatus: "synced",
        syncedAt: new Date(),
      });
    }

    return NextResponse.json({ success: true, contactId: result.contactId, dealId: result.dealId });
  } catch (err) {
    await db
      .update(hubspotSync)
      .set({
        syncStatus: "failed",
        errorMessage: String(err),
        retryCount: (existingSync?.retryCount || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(hubspotSync.callId, callId));

    return NextResponse.json({ error: "Sync failed", details: String(err) }, { status: 500 });
  }
}
