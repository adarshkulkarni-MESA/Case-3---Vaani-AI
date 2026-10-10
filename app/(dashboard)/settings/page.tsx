import { auth, isFounder } from "@/lib/auth";


export default async function SettingsPage() {
  const session = await auth();
  const user = session?.user as { name?: string; email?: string; role?: string };
  const founder = isFounder(user?.role || "");

  return (
    <div style={{ padding: "32px 40px", maxWidth: 700 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--color-ink)", marginBottom: 4 }}>
          Settings
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-ink-muted)" }}>
          Account and integration settings
        </p>
      </div>

      {/* Profile */}
      <div style={{
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)", padding: "24px", marginBottom: 20,
        boxShadow: "var(--shadow-sm)",
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-ink)", marginBottom: 16 }}>
          Your Account
        </h3>
        <div style={{ display: "grid", gap: 12 }}>
          <Row label="Name" value={user?.name || "—"} />
          <Row label="Email" value={user?.email || "—"} />
          <Row label="Role" value={founder ? "Founder" : "Designer"} />
        </div>
      </div>

      {/* Integrations — founder only */}
      {founder && (
        <div style={{
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)", padding: "24px", marginBottom: 20,
          boxShadow: "var(--shadow-sm)",
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-ink)", marginBottom: 4 }}>
            Integrations
          </h3>
          <p style={{ fontSize: 13, color: "var(--color-ink-muted)", marginBottom: 16 }}>
            Configured via environment variables. Contact your developer to update keys.
          </p>
          <div style={{ display: "grid", gap: 12 }}>
            <IntegrationRow name="VaaniVoice.ai" description="AI voice agent — inbound call handling" status="active" />
            <IntegrationRow name="Cal.com" description="Designer calendar and booking links" status="active" />
            <IntegrationRow name="Resend" description="Transactional email notifications" status="active" />
            <IntegrationRow name="HubSpot" description="CRM — lead and deal tracking" status="active" />
            <IntegrationRow name="Neon PostgreSQL" description="Primary database" status="active" />
          </div>
        </div>
      )}

      {/* Pricing guardrail info */}
      <div style={{
        background: "var(--color-pending-bg)", border: "1px solid var(--color-pending-border)",
        borderRadius: "var(--radius-lg)", padding: "16px 20px",
        display: "flex", alignItems: "flex-start", gap: 12,
      }}>
        <span style={{ fontSize: 20 }}>🛡️</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-pending)", marginBottom: 4 }}>
            Pricing Guardrail — Always Active
          </div>
          <div style={{ fontSize: 13, color: "var(--color-ink-secondary)" }}>
            The AI voice agent is configured to never disclose pricing, estimates, or project costs.
            When asked, it responds: "Pricing depends on the site, the materials you choose, and the scope —
            your designer will walk you through it in detail at the consultation."
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 16 }}>
      <span style={{ fontSize: 13, color: "var(--color-ink-muted)", width: 80, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: "var(--color-ink)", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function IntegrationRow({ name, description, status }: { name: string; description: string; status: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        background: status === "active" ? "var(--color-qualified)" : "var(--color-ink-muted)",
        flexShrink: 0,
      }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)" }}>{name}</div>
        <div style={{ fontSize: 12, color: "var(--color-ink-muted)" }}>{description}</div>
      </div>
    </div>
  );
}
