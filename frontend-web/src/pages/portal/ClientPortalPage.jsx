import React from "react";
import { useParams, Link } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";

export default function ClientPortalPage() {
  const { subdomain } = useParams();
  const { isDark } = useTheme();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "var(--c-bg, #0f1117)" }}
    >
      {/* Logo area */}
      <div className="mb-10 flex flex-col items-center gap-3">
        <img
          src={isDark ? "/ort-logo-dark.png" : "/ort-logo-light.jpg"}
          alt="ORT"
          className="h-8 object-contain"
          style={isDark ? { mixBlendMode: "screen" } : {}}
        />
        <div
          className="h-px w-40 rounded-full"
          style={{ background: "linear-gradient(90deg,transparent,var(--c-accent,#00aeec),transparent)" }}
        />
      </div>

      {/* Card */}
      <div
        className="w-full max-w-md rounded-2xl p-8 text-center space-y-6"
        style={{
          background: "var(--c-surface, #1a1d27)",
          border: "1px solid var(--c-border, rgba(255,255,255,0.08))",
          boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
        }}
      >
        {/* Subdomain badge */}
        <div className="flex justify-center">
          <span
            className="text-xs font-mono px-3 py-1 rounded-full"
            style={{
              background: "rgba(0,174,236,0.1)",
              color: "#00aeec",
              border: "1px solid rgba(0,174,236,0.25)",
            }}
          >
            {subdomain}.{import.meta.env.VITE_BASE_DOMAIN || window.location.hostname}
          </span>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--c-heading, #f1f5f9)" }}>
            {subdomain.charAt(0).toUpperCase() + subdomain.slice(1)} Workspace
          </h1>
          <p className="text-sm" style={{ color: "var(--c-muted, #94a3b8)" }}>
            Your Office Repo workspace is being set up. The client portal will
            be available here once provisioning is complete.
          </p>
        </div>

        {/* Status indicator */}
        <div
          className="rounded-xl p-4 flex items-center gap-3"
          style={{
            background: "rgba(251,191,36,0.06)",
            border: "1px solid rgba(251,191,36,0.2)",
          }}
        >
          <span className="text-lg">🔧</span>
          <div className="text-left">
            <p className="text-sm font-medium" style={{ color: "#fbbf24" }}>
              Portal under construction
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--c-muted, #94a3b8)" }}>
              Client-facing features are coming soon.
            </p>
          </div>
        </div>

        {/* Dev notice */}
        {!import.meta.env.VITE_BASE_DOMAIN && (
          <div
            className="rounded-lg px-3 py-2 text-xs text-left"
            style={{
              background: "rgba(99,102,241,0.08)",
              border: "1px solid rgba(99,102,241,0.2)",
              color: "var(--c-muted, #94a3b8)",
            }}
          >
            <span style={{ color: "#818cf8" }} className="font-medium">Dev mode —</span>{" "}
            path-based URL active. Set{" "}
            <code className="font-mono">VITE_BASE_DOMAIN=officerepo.com</code>{" "}
            in production for real subdomain routing.
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs" style={{ color: "var(--c-muted, #64748b)" }}>
        Powered by{" "}
        <Link to="/" className="hover:underline" style={{ color: "var(--c-accent, #00aeec)" }}>
          Office Repo
        </Link>{" "}
        · by ort_
      </p>
    </div>
  );
}
