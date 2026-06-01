import React, { useState } from "react";

const TABS = [
  { key: "profile", label: "Profile", icon: "👤" },
  { key: "roles", label: "Roles & Permissions", icon: "🛡️" },
  { key: "currency", label: "Currency", icon: "💱" },
  { key: "security", label: "Security", icon: "🔒" },
  { key: "api", label: "API Docs", icon: "📡" },
];

const PROFILE_CONTENT = (
  <div className="space-y-6">
    <div>
      <h3 style={{ color: "#f1f5f9", fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Profile Information</h3>
      <p style={{ color: "#64748b", fontSize: 13 }}>Update your display name and contact details</p>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {[["Full Name", "Admin User"], ["Email", "admin@officerepo.com"], ["Phone", "+91 98765 43210"], ["Role", "Superadmin"]].map(([label, val]) => (
        <div key={label}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</label>
          <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 14px", color: label === "Email" || label === "Role" ? "#475569" : "#f1f5f9", fontSize: 14 }}>{val}</div>
        </div>
      ))}
    </div>
    <div style={{ borderTop: "1px solid #1e293b", paddingTop: 20 }}>
      <h3 style={{ color: "#f1f5f9", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Change Password</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {["Current Password", "New Password", "Confirm Password"].map((f) => (
          <div key={f}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{f}</label>
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 14px", color: "#f1f5f9", fontSize: 14 }}>••••••••</div>
          </div>
        ))}
      </div>
    </div>
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
      <button style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #1e293b", background: "transparent", color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>Discard</button>
      <button style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#06b6d4,#3b82f6)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Save Changes</button>
    </div>
  </div>
);

export default function SettingsVariantA() {
  const [active, setActive] = useState("profile");

  return (
    <div style={{ minHeight: "100vh", background: "#020817", fontFamily: "'Inter', system-ui, sans-serif", padding: 24 }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ color: "#f1f5f9", fontSize: 22, fontWeight: 700, margin: 0 }}>Settings</h1>
          <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>Manage your account and system preferences</p>
        </div>

        {/* Horizontal tab bar */}
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, marginBottom: 20, overflow: "hidden" }}>
          <div style={{ display: "flex", borderBottom: "1px solid #1e293b", padding: "0 8px" }}>
            {TABS.map((t) => {
              const isActive = t.key === active;
              return (
                <button key={t.key} onClick={() => setActive(t.key)} style={{
                  display: "flex", alignItems: "center", gap: 7, padding: "14px 18px",
                  background: "transparent", border: "none", cursor: "pointer", position: "relative",
                  color: isActive ? "#06b6d4" : "#64748b", fontSize: 13, fontWeight: isActive ? 600 : 400,
                  borderBottom: isActive ? "2px solid #06b6d4" : "2px solid transparent",
                  marginBottom: -1, transition: "all 0.15s",
                }}>
                  <span style={{ fontSize: 15 }}>{t.icon}</span>
                  {t.label}
                </button>
              );
            })}
          </div>
          <div style={{ padding: 28 }}>
            {active === "profile" ? PROFILE_CONTENT : (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#475569" }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>{TABS.find(t => t.key === active)?.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 500, color: "#64748b" }}>{TABS.find(t => t.key === active)?.label}</div>
                <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>Content for this section</div>
              </div>
            )}
          </div>
        </div>

        <div style={{ fontSize: 11, color: "#334155", textAlign: "center" }}>
          Variant A — Horizontal Tab Bar
        </div>
      </div>
    </div>
  );
}
