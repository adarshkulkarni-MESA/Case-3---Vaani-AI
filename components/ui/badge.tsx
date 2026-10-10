import { cn } from "@/lib/utils";

type BadgeVariant = "qualified" | "rejected" | "pending" | "escalated" | "default" | "outline";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  qualified: "bg-[var(--color-qualified-bg)] text-[var(--color-qualified)] border-[var(--color-qualified-border)]",
  rejected: "bg-[var(--color-rejected-bg)] text-[var(--color-rejected)] border-[var(--color-rejected-border)]",
  pending: "bg-[var(--color-pending-bg)] text-[var(--color-pending)] border-[var(--color-pending-border)]",
  escalated: "bg-[var(--color-escalated-bg)] text-[var(--color-escalated)] border-[var(--color-escalated-border)]",
  default: "bg-[var(--color-surface-elevated)] text-[var(--color-ink-secondary)] border-[var(--color-border)]",
  outline: "bg-transparent text-[var(--color-ink-secondary)] border-[var(--color-border)]",
};

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    qualified: { variant: "qualified", label: "Qualified" },
    rejected: { variant: "rejected", label: "Rejected" },
    pending_review: { variant: "pending", label: "Pending Review" },
    escalated: { variant: "escalated", label: "Escalated" },
  };
  const { variant = "default", label = status } = map[status] || {};
  return <Badge variant={variant}>{label}</Badge>;
}
