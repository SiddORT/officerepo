import React from "react";
import { usePortalNav } from "../../../contexts/PortalNavContext";
import PortalLayout from "../PortalLayout";

/**
 * Guards a route so it only renders when the given module is enabled for this client.
 * moduleRoute — the route code from the API (e.g. "crm", "lms", "finance").
 */
export default function PortalModuleGuard({ moduleRoute, children }) {
  const { navModules, navLoaded } = usePortalNav();

  if (!navLoaded) return null;

  const isEnabled = navModules.some(
    (m) => m.route === moduleRoute || (m.code || "").toLowerCase() === moduleRoute.toLowerCase()
  );

  if (!isEnabled) {
    return (
      <PortalLayout title="Module Unavailable">
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", minHeight: "55vh", padding: "40px 24px", textAlign: "center",
        }}>
          <div style={{
            width: 68, height: 68, borderRadius: 18, marginBottom: 20,
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="28" height="28" fill="none" stroke="#ef4444" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 700, color: "var(--c-heading)" }}>
            Module Not Enabled
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: "var(--c-muted)", maxWidth: 360, lineHeight: 1.6 }}>
            This module is not enabled for your workspace. Contact your administrator to activate it.
          </p>
        </div>
      </PortalLayout>
    );
  }

  return children;
}
