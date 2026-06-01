import React, { useState } from "react";

const SECTIONS = [
  {
    key: "profile", label: "Profile", icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" strokeWidth={1.8}/><path strokeWidth={1.8} strokeLinecap="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
    ), desc: "Name, email & password", color: "#3b82f6",
  },
  {
    key: "roles", label: "Roles & Permissions", icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={1.8} strokeLinecap="round" d="M12 3l8 4v5c0 4.4-3.4 8.5-8 9.5C7.4 20.5 4 16.4 4 12V7l8-4z"/></svg>
    ), desc: "Users, roles & access control", color: "#8b5cf6",
  },
  {
    key: "currency", label: "Currency", icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth={1.8}/><path strokeWidth={1.8} strokeLinecap="round" d="M12 7v10M9.5 9.5c0-1.4 1.1-2.5 2.5-2.5s2.5 1.1 2.5 2.5S13.4 12 12 12s-2.5 1.1-2.5 2.5S10.6 17 12 17s2.5-1.1 2.5-2.5"/></svg>
    ), desc: "Exchange rates & forex sync", color: "#10b981",
  },
  {
    key: "security", label: "Security", icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2" strokeWidth={1.8}/><path strokeWidth={1.8} strokeLinecap="round" d="M8 11V7a4 4 0 018 0v4"/></svg>
    ), desc: "Secrets, CORS & audit logs", color: "#f59e0b",
  },
  {
    key: "api", label: "API Docs", icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={1.8} strokeLinecap="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
    ), desc: "Explore & test API endpoints", color: "#06b6d4",
  },
];

const PROFILE_CONTENT = (
  <div className="space-y-6">
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {[["Full Name", "Admin User", false], ["Email", "admin@officerepo.com", true], ["Phone", "+91 98765 43210", false], ["Role", "Superadmin", true]].map(([label, val, disabled]) => (
        <div key={label}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</label>
          <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 14px", color: disabled ? "#475569" : "#f1f5f9", fontSize: 14 }}>{val}</div>
        </div>
      ))}
    </div>
    <div style={{ borderTop: "1px solid #1e293b", paddingTop: 20 }}>
      <h3 style={{ color: "#f1f5f9", fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Change Password</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        {["Current", "New", "Confirm"].map((f) => (
          <div key={f}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{f} Password</label>
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

export default function SettingsVariantB() {
  const [active, setActive] = useState("profile");
  const activeSection = SECTIONS.find(s => s.key === active);

  return (
    <div style={{ minHeight: "100vh", background: "#020817", fontFamily: "'Inter', system-ui, sans-serif", padding: 24 }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ color: "#f1f5f9", fontSize: 22, fontWeight: 700, margin: 0 }}>Settings</h1>
          <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>Manage your account and system preferences</p>
        </div>

        {/* Icon card grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 20 }}>
          {SECTIONS.map(s => {
            const isActive = s.key === active;
            return (
              <button key={s.key} onClick={() => setActive(s.key)} style={{
                background: isActive ? `${s.color}18` : "#0f172a",
                border: `1.5px solid ${isActive ? s.color + "55" : "#1e293b"}`,
                borderRadius: 12, padding: "16px 10px", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                transition: "all 0.15s", position: "relative", overflow: "hidden",
              }}>
                {isActive && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: s.color, borderRadius: "2px 2px 0 0" }} />}
                <div style={{ color: isActive ? s.color : "#475569", transition: "color 0.15s" }}>{s.icon}</div>
                <div style={{ color: isActive ? "#f1f5f9" : "#64748b", fontSize: 11, fontWeight: 600, textAlign: "center", lineHeight: 1.3 }}>{s.label}</div>
              </button>
            );
          })}
        </div>

        {/* Content panel */}
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22, paddingBottom: 18, borderBottom: "1px solid #1e293b" }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${activeSection.color}18`, border: `1px solid ${activeSection.color}33`, display: "flex", alignItems: "center", justifyContent: "center", color: activeSection.color }}>
              {activeSection.icon}
            </div>
            <div>
              <div style={{ color: "#f1f5f9", fontSize: 16, fontWeight: 600 }}>{activeSection.label}</div>
              <div style={{ color: "#64748b", fontSize: 12 }}>{activeSection.desc}</div>
            </div>
          </div>
          {active === "profile" ? PROFILE_CONTENT : (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#475569" }}>
              <div style={{ color: activeSection.color, marginBottom: 10 }}>{activeSection.icon}</div>
              <div style={{ fontSize: 14, color: "#64748b" }}>Content for {activeSection.label}</div>
            </div>
          )}
        </div>

        <div style={{ fontSize: 11, color: "#334155", textAlign: "center", marginTop: 16 }}>
          Variant B — Icon Card Grid
        </div>
      </div>
    </div>
  );
}
