"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/badge";
import { formatDate, formatDuration } from "@/lib/utils";

type CallRow = {
  id: string;
  callerName: string | null;
  callerPhone: string | null;
  callTimestamp: string;
  durationSeconds: number | null;
  projectLocation: string | null;
  propertyType: string | null;
  squareFeet: number | null;
  leadStatus: string;
  outcome: string;
  aiSummary: string | null;
  askedAboutPrice: boolean;
  isEscalated: boolean;
  isMissed: boolean;
  meetingStatus: string | null;
};

export default function CallsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const statusFilter = searchParams.get("status") || "all";
  const searchQuery = searchParams.get("search") || "";

  const [calls, setCalls] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchQuery);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchCalls = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search) params.set("search", search);
    params.set("page", page.toString());

    const res = await fetch(`/api/calls?${params}`);
    if (res.ok) {
      const data = await res.json();
      setCalls(data.data || []);
      setTotal(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    }
    setLoading(false);
  }, [statusFilter, search, page]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  function handleStatusFilter(status: string) {
    const params = new URLSearchParams(searchParams);
    if (status === "all") params.delete("status");
    else params.set("status", status);
    router.push(`/calls?${params}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (search) params.set("search", search);
    else params.delete("search");
    router.push(`/calls?${params}`);
  }

  const filters = [
    { value: "all", label: "All" },
    { value: "qualified", label: "Qualified" },
    { value: "pending_review", label: "Pending" },
    { value: "rejected", label: "Rejected" },
  ];

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--color-ink)", marginBottom: 4 }}>
          All Calls
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-ink-muted)" }}>
          {total} total — every call is logged, qualified or not
        </p>
      </div>

      {/* Filters + Search */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {/* Status tabs */}
        <div style={{ display: "flex", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: 3, gap: 2 }}>
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => handleStatusFilter(f.value)}
              style={{
                padding: "6px 14px", borderRadius: 6, border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer",
                background: statusFilter === f.value ? "var(--color-brand)" : "transparent",
                color: statusFilter === f.value ? "white" : "var(--color-ink-secondary)",
                transition: "all 0.15s",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, location…"
            style={{
              padding: "8px 14px", borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)", background: "var(--color-surface)",
              color: "var(--color-ink)", fontSize: 13, outline: "none", width: 260,
            }}
          />
          <button
            type="submit"
            style={{
              padding: "8px 16px", background: "var(--color-brand)", color: "white",
              border: "none", borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 500, cursor: "pointer",
            }}
          >
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      <div style={{
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-sm)", overflow: "hidden",
      }}>
        {/* Table header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "2fr 1.2fr 1fr 1fr 1fr 80px",
          padding: "10px 20px",
          background: "var(--color-surface-elevated)",
          borderBottom: "1px solid var(--color-border-subtle)",
          fontSize: 11, fontWeight: 600, color: "var(--color-ink-muted)",
          textTransform: "uppercase", letterSpacing: "0.04em",
          gap: 8,
        }}>
          <span>Caller</span>
          <span>Location</span>
          <span>Duration</span>
          <span>Status</span>
          <span>Date</span>
          <span>Meeting</span>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--color-ink-muted)", fontSize: 14 }}>
            Loading calls…
          </div>
        ) : calls.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
            <p style={{ color: "var(--color-ink-muted)", fontSize: 14 }}>No calls match your filters.</p>
          </div>
        ) : (
          calls.map((call, i) => (
            <Link
              key={call.id}
              href={`/calls/${call.id}`}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1.2fr 1fr 1fr 1fr 80px",
                padding: "13px 20px",
                borderBottom: i < calls.length - 1 ? "1px solid var(--color-border-subtle)" : "none",
                textDecoration: "none", color: "inherit",
                alignItems: "center", gap: 8,
                transition: "background 0.1s",
              }}
            >
              {/* Caller */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)" }}>
                    {call.isMissed ? "📵 " : ""}
                    {call.callerName || call.callerPhone || "Unknown"}
                  </span>
                  {call.askedAboutPrice && (
                    <span style={{ fontSize: 9, padding: "1px 5px", background: "#fef9c3", color: "#713f12", borderRadius: 8, fontWeight: 600 }}>
                      PRICE
                    </span>
                  )}
                  {call.isEscalated && (
                    <span style={{ fontSize: 9, padding: "1px 5px", background: "var(--color-escalated-bg)", color: "var(--color-escalated)", borderRadius: 8, fontWeight: 600 }}>
                      ESCALATED
                    </span>
                  )}
                </div>
                {call.callerName && call.callerPhone && (
                  <div style={{ fontSize: 11, color: "var(--color-ink-muted)", marginTop: 2 }}>{call.callerPhone}</div>
                )}
              </div>

              {/* Location */}
              <div style={{ fontSize: 13, color: "var(--color-ink-secondary)" }}>
                {call.projectLocation || "—"}
                {call.propertyType && <span style={{ fontSize: 11, color: "var(--color-ink-muted)" }}><br />{call.propertyType}{call.squareFeet ? ` · ${call.squareFeet} sqft` : ""}</span>}
              </div>

              {/* Duration */}
              <div style={{ fontSize: 13, color: "var(--color-ink-muted)" }}>
                {formatDuration(call.durationSeconds)}
              </div>

              {/* Status */}
              <div>
                <StatusBadge status={call.leadStatus} />
              </div>

              {/* Date */}
              <div style={{ fontSize: 12, color: "var(--color-ink-muted)" }}>
                {formatDate(call.callTimestamp)}
              </div>

              {/* Meeting */}
              <div>
                <MeetingDot status={call.meetingStatus} />
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: "8px 16px", borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)", background: "var(--color-surface)",
              fontSize: 13, cursor: page === 1 ? "not-allowed" : "pointer",
              color: "var(--color-ink-secondary)",
            }}
          >
            ← Prev
          </button>
          <span style={{ padding: "8px 16px", fontSize: 13, color: "var(--color-ink-muted)" }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding: "8px 16px", borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)", background: "var(--color-surface)",
              fontSize: 13, cursor: page === totalPages ? "not-allowed" : "pointer",
              color: "var(--color-ink-secondary)",
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

function MeetingDot({ status }: { status: string | null }) {
  const map: Record<string, { color: string; label: string }> = {
    not_scheduled: { color: "var(--color-ink-muted)", label: "—" },
    booking_sent: { color: "var(--color-pending)", label: "Sent" },
    confirmed: { color: "var(--color-qualified)", label: "Booked" },
    completed: { color: "#6366f1", label: "Done" },
    cancelled: { color: "var(--color-rejected)", label: "Cancelled" },
  };
  const { color, label } = map[status || "not_scheduled"] || map["not_scheduled"];
  return <span style={{ fontSize: 11, color, fontWeight: 500 }}>{label}</span>;
}
