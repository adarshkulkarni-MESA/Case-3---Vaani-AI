"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid email or password.");
      } else {
        router.push("/");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo / Brand */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: "var(--color-brand)", display: "inline-flex",
            alignItems: "center", justifyContent: "center", marginBottom: 16
          }}>
            <span style={{ color: "white", fontSize: 20, fontWeight: 700 }}>A</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--color-ink)", marginBottom: 6 }}>Aangan Studio</h1>
          <p style={{ fontSize: 14, color: "var(--color-ink-muted)" }}>Operations Dashboard</p>
        </div>

        {/* Login Card */}
        <div style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          padding: 32,
          boxShadow: "var(--shadow-md)",
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6, color: "var(--color-ink)" }}>Sign in</h2>
          <p style={{ fontSize: 13, color: "var(--color-ink-muted)", marginBottom: 24 }}>Use your studio email and password</p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--color-ink-secondary)" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@aangan.studio"
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)", background: "var(--color-bg)",
                  color: "var(--color-ink)", fontSize: 14, outline: "none",
                }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--color-ink-secondary)" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)", background: "var(--color-bg)",
                  color: "var(--color-ink)", fontSize: 14, outline: "none",
                }}
              />
            </div>

            {error && (
              <div style={{
                background: "var(--color-rejected-bg)", border: "1px solid var(--color-rejected-border)",
                borderRadius: "var(--radius-md)", padding: "10px 14px", marginBottom: 16,
                fontSize: 13, color: "var(--color-rejected)",
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "12px 24px", background: loading ? "var(--color-ink-muted)" : "var(--color-brand)",
                color: "white", borderRadius: "var(--radius-md)", border: "none",
                fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
                transition: "background 0.15s",
              }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "var(--color-ink-placeholder)" }}>
          Aangan Studio · Internal use only
        </p>
      </div>
    </div>
  );
}
