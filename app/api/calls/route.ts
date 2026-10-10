import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { calls, customers, meetings, transcripts } from "@/lib/db/schema";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";


export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  const conditions = [];

  if (status && status !== "all") {
    conditions.push(eq(calls.leadStatus, status as "qualified" | "rejected" | "pending_review"));
  }

  if (search) {
    conditions.push(
      or(
        ilike(calls.callerName, `%${search}%`),
        ilike(calls.callerPhone, `%${search}%`),
        ilike(calls.projectLocation, `%${search}%`),
        ilike(calls.projectScope, `%${search}%`)
      )
    );
  }

  const [data, countResult] = await Promise.all([
    db
      .select({
        id: calls.id,
        callerName: calls.callerName,
        callerPhone: calls.callerPhone,
        callTimestamp: calls.callTimestamp,
        durationSeconds: calls.durationSeconds,
        projectLocation: calls.projectLocation,
        propertyType: calls.propertyType,
        squareFeet: calls.squareFeet,
        leadStatus: calls.leadStatus,
        outcome: calls.outcome,
        aiSummary: calls.aiSummary,
        askedAboutPrice: calls.askedAboutPrice,
        isEscalated: calls.isEscalated,
        isMissed: calls.isMissed,
        createdAt: calls.createdAt,
        meetingStatus: meetings.meetingStatus,
        customerName: customers.name,
      })
      .from(calls)
      .leftJoin(customers, eq(calls.customerId, customers.id))
      .leftJoin(meetings, eq(calls.id, meetings.callId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(calls.callTimestamp))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(calls)
      .where(conditions.length > 0 ? and(...conditions) : undefined),
  ]);

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total: Number(countResult[0]?.count || 0),
      totalPages: Math.ceil(Number(countResult[0]?.count || 0) / limit),
    },
  });
}
