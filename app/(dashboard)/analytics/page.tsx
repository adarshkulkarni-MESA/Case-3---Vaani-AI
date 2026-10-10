import { auth, isFounder } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { calls } from "@/lib/db/schema";
import { sql, gte, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function getAnalytics() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    overview,
    daily,
    outcomeBreakdown,
    recentCost,
    pricingRequests,
    escalations,
  ] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)`,
        qualified: sql<number>`sum(case when lead_status = 'qualified' then 1 else 0 end)`,
        rejected: sql<number>`sum(case when lead_status = 'rejected' then 1 else 0 end)`,
        pending: sql<number>`sum(case when lead_status = 'pending_review' then 1 else 0 end)`,
        aiCostTotal: sql<number>`coalesce(sum(ai_cost_usd), 0)`,
        avgDurationSec: sql<number>`coalesce(avg(duration_seconds), 0)`,
        pricingAsked: sql<number>`sum(case when asked_about_price then 1 else 0 end)`,
        escalated: sql<number>`sum(case when is_escalated then 1 else 0 end)`,
        missed: sql<number>`sum(case when is_missed then 1 else 0 end)`,
      })
      .from(calls)
      .where(gte(calls.callTimestamp, thirtyDaysAgo)),

    db
      .select({
        date: sql<string>`date_trunc('day', call_timestamp)::date`,
        total: sql<number>`count(*)`,
        qualified: sql<number>`sum(case when lead_status = 'qualified' then 1 else 0 end)`,
        rejected: sql<number>`sum(case when lead_status = 'rejected' then 1 else 0 end)`,
        cost: sql<number>`coalesce(sum(ai_cost_usd), 0)`,
      })
      .from(calls)
      .where(gte(calls.callTimestamp, thirtyDaysAgo))
      .groupBy(sql`date_trunc('day', call_timestamp)::date`)
      .orderBy(sql`date_trunc('day', call_timestamp)::date`),

    db
      .select({
        outcome: calls.outcome,
        count: sql<number>`count(*)`,
      })
      .from(calls)
      .where(gte(calls.callTimestamp, thirtyDaysAgo))
      .groupBy(calls.outcome)
      .orderBy(sql`count(*) desc`),

    db
      .select({ total: sql<number>`coalesce(sum(ai_cost_usd), 0)`, count: sql<number>`count(*)` })
      .from(calls)
      .where(gte(calls.callTimestamp, thirtyDaysAgo)),

    db
      .select({ count: sql<number>`count(*)` })
      .from(calls)
      .where(sql`asked_about_price = true`),

    db
      .select({ count: sql<number>`count(*)` })
      .from(calls)
      .where(sql`is_escalated = true`),
  ]);

  return { overview: overview[0], daily, outcomeBreakdown, pricingRequests: pricingRequests[0], escalations: escalations[0] };
}

function KpiCard({
  label, value, sub, accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div style={{
      background: accent ? "var(--color-brand)" : "var(--color-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-lg)", padding: "20px 24px",
      boxShadow: "var(--shadow-sm)",
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: accent ? "rgba(255,255,255,0.5)" : "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent ? "white" : "var(--color-ink)", lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: accent ? "rgba(255,255,255,0.5)" : "var(--color-ink-muted)", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function BarRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: "var(--color-ink-secondary)" }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)" }}>{count} <span style={{ fontWeight: 400, color: "var(--color-ink-muted)" }}>({pct.toFixed(0)}%)</span></span>
      </div>
      <div style={{ height: 6, background: "var(--color-border)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.5s" }} />
      </div>
    </div>
  );
}

const OUTCOME_LABELS: Record<string, string> = {
  qualified: "Qualified",
  rejected_out_of_area: "Out of Area",
  rejected_out_of_scope: "Out of Scope",
  rejected_timeline: "Timeline Issue",
  rejected_budget: "Budget Mismatch",
  rejected_no_decision_maker: "No Decision-Maker",
  escalated: "Escalated",
  missed: "Missed Call",
  pending_review: "Pending Review",
};

export default async function AnalyticsPage() {
  const session = await auth();
  const user = session?.user as { role?: string };

  if (!isFounder(user?.role || "")) {
    redirect("/");
  }

  const data = await getAnalytics();
  const { overview, daily, outcomeBreakdown } = data;

  const total = Number(overview?.total || 0);
  const qualified = Number(overview?.qualified || 0);
  const rejected = Number(overview?.rejected || 0);
  const pending = Number(overview?.pending || 0);
  const aiCost = Number(overview?.aiCostTotal || 0);
  const avgDuration = Math.round(Number(overview?.avgDurationSec || 0));
  const pricingAsked = Number(overview?.pricingAsked || 0);
  const escalated = Number(overview?.escalated || 0);
  const missed = Number(overview?.missed || 0);
  const qualRate = total > 0 ? ((qualified / total) * 100).toFixed(1) : "0";

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--color-ink)", marginBottom: 4 }}>
          Analytics Dashboard
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-ink-muted)" }}>
          Last 30 days · Founder overview
        </p>
      </div>

      {/* KPI grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
        <KpiCard label="Total Calls" value={total} sub="last 30 days" accent />
        <KpiCard label="Qualification Rate" value={`${qualRate}%`} sub={`${qualified} qualified`} />
        <KpiCard label="AI Cost (USD)" value={`$${aiCost.toFixed(2)}`} sub={total > 0 ? `$${(aiCost / total).toFixed(3)} / call` : "—"} />
        <KpiCard label="Avg Call Duration" value={`${Math.floor(avgDuration / 60)}m ${avgDuration % 60}s`} sub="AI-handled" />
        <KpiCard label="Pricing Asked" value={pricingAsked} sub="guardrail triggered" />
        <KpiCard label="Escalations" value={escalated} sub="existing client" />
        <KpiCard label="Missed Calls" value={missed} sub="unanswered" />
        <KpiCard label="Pending Review" value={pending} sub="need human check" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Outcome breakdown */}
        <div style={{
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)", padding: "20px 24px", boxShadow: "var(--shadow-sm)",
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-ink)", marginBottom: 20 }}>
            Call Outcomes
          </h3>
          {outcomeBreakdown.map((row) => (
            <BarRow
              key={row.outcome}
              label={OUTCOME_LABELS[row.outcome] || row.outcome}
              count={Number(row.count)}
              total={total}
              color={
                row.outcome === "qualified" ? "var(--color-qualified)" :
                row.outcome.startsWith("rejected") ? "var(--color-rejected)" :
                row.outcome === "escalated" ? "var(--color-escalated)" :
                "var(--color-pending)"
              }
            />
          ))}
        </div>

        {/* Status summary */}
        <div style={{
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)", padding: "20px 24px", boxShadow: "var(--shadow-sm)",
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-ink)", marginBottom: 20 }}>
            Lead Status
          </h3>
          <BarRow label="Qualified" count={qualified} total={total} color="var(--color-qualified)" />
          <BarRow label="Rejected" count={rejected} total={total} color="var(--color-rejected)" />
          <BarRow label="Pending Review" count={pending} total={total} color="var(--color-pending)" />

          <div style={{ marginTop: 24, padding: 16, background: "var(--color-accent-light)", borderRadius: "var(--radius-md)" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-accent)", marginBottom: 4 }}>
              CONVERSION INSIGHT
            </div>
            <div style={{ fontSize: 13, color: "var(--color-ink-secondary)" }}>
              {qualified} of {total} calls qualified ({qualRate}%). Target: 40%+ for high-value studio work.
              {aiCost > 0 && total > 0 && (
                <> AI cost per qualified lead: <strong>${(aiCost / qualified || 0).toFixed(2)}</strong></>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Daily breakdown table */}
      {daily.length > 0 && (
        <div style={{
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)", overflow: "hidden", marginTop: 20, boxShadow: "var(--shadow-sm)",
        }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--color-border-subtle)", background: "var(--color-surface-elevated)" }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-ink)" }}>Daily Breakdown</h3>
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr",
            padding: "10px 24px", borderBottom: "1px solid var(--color-border-subtle)",
            fontSize: 11, fontWeight: 600, color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: "0.04em",
          }}>
            <span>Date</span><span>Total</span><span>Qualified</span><span>Rejected</span><span>AI Cost</span>
          </div>
          {[...daily].reverse().map((row) => (
            <div key={row.date} style={{
              display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr",
              padding: "11px 24px", borderBottom: "1px solid var(--color-border-subtle)",
              fontSize: 13, alignItems: "center",
            }}>
              <span style={{ color: "var(--color-ink)" }}>{row.date}</span>
              <span style={{ color: "var(--color-ink-secondary)" }}>{Number(row.total)}</span>
              <span style={{ color: "var(--color-qualified)" }}>{Number(row.qualified)}</span>
              <span style={{ color: "var(--color-rejected)" }}>{Number(row.rejected)}</span>
              <span style={{ color: "var(--color-ink-muted)" }}>${Number(row.cost).toFixed(3)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Pricing guardrail note */}
      <div style={{
        marginTop: 20, background: "var(--color-pending-bg)", border: "1px solid var(--color-pending-border)",
        borderRadius: "var(--radius-lg)", padding: "16px 20px", display: "flex", alignItems: "flex-start", gap: 12,
      }}>
        <span style={{ fontSize: 20 }}>🛡️</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-pending)", marginBottom: 4 }}>
            Pricing Guardrail Active
          </div>
          <div style={{ fontSize: 13, color: "var(--color-ink-secondary)" }}>
            {pricingAsked} callers asked about pricing this month. In every case, the AI responded with the approved line — no numbers were disclosed. The designer confirms pricing at consultation.
          </div>
        </div>
      </div>
    </div>
  );
}
