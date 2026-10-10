import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatCurrency(value: number, currency = "INR"): string {
  if (currency === "USD") {
    return `$${value.toFixed(4)}`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "…";
}

export function leadStatusLabel(status: string): string {
  switch (status) {
    case "qualified": return "Qualified";
    case "rejected": return "Rejected";
    case "pending_review": return "Pending Review";
    default: return status;
  }
}

export function outcomeLabel(outcome: string): string {
  const map: Record<string, string> = {
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
  return map[outcome] || outcome;
}
