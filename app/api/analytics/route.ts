import { NextResponse } from "next/server";
import { auth, isFounder } from "@/lib/auth";
import { db } from "@/lib/db";
import { calls } from "@/lib/db/schema";
import { sql, gte, and } from "drizzle-orm";


export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role || "designer";

  // Founders see all analytics; designers see basic counts
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [totalCalls, statusCounts, monthlyCost, dailyCounts] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(calls),

    db
      .select({
        status: calls.leadStatus,
        count: sql<number>`count(*)`,
      })
      .from(calls)
      .groupBy(calls.leadStatus),

    isFounder(userRole)
      ? db
          .select({ total: sql<number>`sum(ai_cost_usd)` })
          .from(calls)
          .where(gte(calls.callTimestamp, thirtyDaysAgo))
      : Promise.resolve([{ total: null }]),

    db
      .select({
        date: sql<string>`date_trunc('day', call_timestamp)::date`,
        count: sql<number>`count(*)`,
        qualified: sql<number>`sum(case when lead_status = 'qualified' then 1 else 0 end)`,
        rejected: sql<number>`sum(case when lead_status = 'rejected' then 1 else 0 end)`,
      })
      .from(calls)
      .where(gte(calls.callTimestamp, thirtyDaysAgo))
      .groupBy(sql`date_trunc('day', call_timestamp)::date`)
      .orderBy(sql`date_trunc('day', call_timestamp)::date`),
  ]);

  const total = Number(totalCalls[0]?.count || 0);
  const statusMap: Record<string, number> = {};
  for (const row of statusCounts) {
    statusMap[row.status] = Number(row.count);
  }

  const qualified = statusMap.qualified || 0;
  const rejected = statusMap.rejected || 0;
  const pending = statusMap.pending_review || 0;

  return NextResponse.json({
    overview: {
      total,
      qualified,
      rejected,
      pending,
      qualificationRate: total > 0 ? ((qualified / total) * 100).toFixed(1) : "0",
    },
    cost: isFounder(userRole)
      ? {
          totalUsd: Number(monthlyCost[0]?.total || 0),
          period: "30 days",
        }
      : null,
    dailyBreakdown: dailyCounts.map((d) => ({
      date: d.date,
      total: Number(d.count),
      qualified: Number(d.qualified),
      rejected: Number(d.rejected),
      pending: Number(d.count) - Number(d.qualified) - Number(d.rejected),
    })),
  });
}
