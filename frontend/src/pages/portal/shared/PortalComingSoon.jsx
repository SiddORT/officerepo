import React from "react";
import PortalLayout from "../PortalLayout";

export default function PortalComingSoon({ module, submodule, description }) {
  const title = submodule || module || "Coming Soon";
  return (
    <PortalLayout title={title}>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: "55vh", padding: "40px 24px", textAlign: "center",
      }}>
        {/* Breadcrumbs */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6, marginBottom: 32,
          fontSize: 12, color: "var(--c-muted)",
        }}>
          <span>Portal</span>
          {module && (
            <>
              <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
              <span style={{ color: "var(--c-text2)" }}>{module}</span>
            </>
          )}
          {submodule && (
            <>
              <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
              <span style={{ color: "var(--c-accent)", fontWeight: 600 }}>{submodule}</span>
            </>
          )}
        </div>

        {/* Icon */}
        <div style={{
          width: 76, height: 76, borderRadius: 20, marginBottom: 24,
          background: "rgba(0,174,236,0.08)", border: "1px solid rgba(0,174,236,0.18)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="32" height="32" fill="none" stroke="var(--c-accent)" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>

        {/* Title */}
        <h2 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 700, color: "var(--c-heading)" }}>
          {title}
        </h2>

        {/* Description */}
        <p style={{
          margin: "0 0 28px", fontSize: 14, color: "var(--c-muted)",
          maxWidth: 420, lineHeight: 1.65,
        }}>
          {description || (
            submodule
              ? `${submodule} is part of the ${module} module and will be available in a future release.`
              : `${module} is on the Office Repo roadmap and will be available in a future release.`
          )}
        </p>

        {/* Badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "7px 18px", borderRadius: 999,
          background: "rgba(0,174,236,0.08)", border: "1px solid rgba(0,174,236,0.2)",
          fontSize: 11, fontWeight: 700, color: "var(--c-accent)", letterSpacing: "0.06em",
        }}>
          <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          COMING SOON
        </div>
      </div>
    </PortalLayout>
  );
}
