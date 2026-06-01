import React, { useState } from "react";

const SECTIONS = [
  {
    key: "profile", label: "Profile", icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" strokeWidth={1.8}/><path strokeWidth={1.8} strokeLinecap="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
    ), desc: "Name, email & password", color: "#3b82f6",
  },
  {
    key: "roles", label: "Roles & Permissions", icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={1.8} strokeLinecap="round" d="M12 3l8 4v5c0 4.4-3.4 8.5-8 9.5C7.4 20.5 4 16.4 4 12V7l8-4z"/></svg>
    ), desc: "Users, roles & access control", color: "#8b5cf6",
  },
  {
    key: "currency", label: "Currency", icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth={1.8}/><path strokeWidth={1.8} strokeLinecap="round" d="M12 7v10M9.5 9.5c0-1.4 1.1-2.5 2.5-2.5s2.5 1.1 2.5 2.5S13.4 12 12 12s-2.5 1.1-2.5 2.5S10.6 17 12 17s2.5-1.1 2.5-2.5"/></svg>
    ), desc: "Exchange rates & forex sync", color: "#10b981",
  },
  {
    key: "security", label: "Security", icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2" strokeWidth={1.8}/><path strokeWidth={1.8} strokeLinecap="round" d="M8 11V7a4 4 0 018 0v4"/></svg>
    ), desc: "Secrets, CORS & audit logs", color: "#f59e0b",
  },
  {
    key: "notifications", label: "Notifications", icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={1.8} strokeLinecap="round" d="M15 17H9m6 0a3 3 0 01-6 0m6 0H4.5a1 1 0 01-.8-1.6L5 14V11a7 7 0 1114 0v3l1.3 1.4a1 1 0 01-.8 1.6H15z"/></svg>
    ), desc: "Email, SMS & push alerts", color: "#ec4899",
  },
  {
    key: "integrations", label: "Integrations", icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={1.8} strokeLinecap="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
    ), desc: "Third-party connections", color: "#06b6d4",
  },
  {
    key: "billing", label: "Billing", icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2" strokeWidth={1.8}/><path strokeWidth={1.8} strokeLinecap="round" d="M2 10h20"/></svg>
    ), desc: "Plans, invoices & usage", color: "#f97316",
  },
  {
    key: "audit", label: "Audit Logs", icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={1.8} strokeLinecap="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
    ), desc: "Activity & change history", color: "#64748b",
  },
  {
    key: "api", label: "API Docs", icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={1.8} strokeLinecap="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
    ), desc: "Explore & test endpoints", color: "#94a3b8",
  },
];

const PROFILE_CONTENT = (
  <div>
    <div style={{ marginBottom: 20 }}>
      <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>Update your display name and contact details</p>
    </div>
    <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 20, marginBottom: 16 }}>
      <h3 style={{ color: "#f1f5f9", fontSize: 14, fontWeight: 600, margin: "0 0 16px" }}>Profile Information</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {[["Full Name", "Admin User", false], ["Email", "admin@officerepo.com", true], ["Phone", "+91 98765 43210", false], ["Role", "Superadmin", true]].map(([label, val, disabled]) => (
          <div key={label}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>{label}</label>
            <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 7, padding: "9px 12px", color: disabled ? "#475569" : "#f1f5f9", fontSize: 13 }}>{val}</div>
          </div>
        ))}
      </div>
    </div>
    <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 20 }}>
      <h3 style={{ color: "#f1f5f9", fontSize: 14, fontWeight: 600, margin: "0 0 16px" }}>Change Password</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
        {["Current Password", "New Password", "Confirm Password"].map(label => (
          <div key={label}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>{label}</label>
            <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 7, padding: "9px 12px", color: "#475569", fontSize: 13 }}>••••••••</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button style={{ background: "transparent", border: "1px solid #334155", borderRadius: 7, padding: "8px 16px", color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>Discard</button>
        <button style={{ background: "#0ea5e9", border: "none", borderRadius: 7, padding: "8px 18px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Save Changes</button>
      </div>
    </div>
  </div>
);

const CollapseIcon = ({ collapsed }) => (
  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transition: "transform 0.2s", transform: collapsed ? "rotate(180deg)" : "rotate(0deg)" }}>
    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
  </svg>
);

export default function SettingsVariantC() {
  const [active, setActive] = useState("profile");
  const [collapsed, setCollapsed] = useState(false);

  const activeSection = SECTIONS.find(s => s.key === active);

  return (
    <div style={{ minHeight: "100vh", background: "#020817", fontFamily: "Inter, system-ui, sans-serif", display: "flex", flexDirection: "column" }}>

      {/* Page header */}
      <div style={{ padding: "20px 24px 0", borderBottom: "1px solid #1e293b" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 16 }}>
          <div>
            <h1 style={{ color: "#f1f5f9", fontSize: 20, fontWeight: 700, margin: 0 }}>Settings</h1>
            <p style={{ color: "#64748b", fontSize: 12, margin: "2px 0 0" }}>Manage your account and system preferences</p>
          </div>
        </div>
      </div>

      {/* Body: collapsible inner sidebar + content */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Inner nav sidebar */}
        <div style={{
          width: collapsed ? 56 : 200,
          minWidth: collapsed ? 56 : 200,
          background: "#0a1628",
          borderRight: "1px solid #1e293b",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.22s ease, min-width 0.22s ease",
          overflow: "hidden",
        }}>
          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? "Expand" : "Collapse"}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-end",
              padding: collapsed ? "12px 0" : "12px 14px",
              background: "transparent",
              border: "none",
              borderBottom: "1px solid #1e293b",
              color: "#475569",
              cursor: "pointer",
              width: "100%",
            }}
          >
            <CollapseIcon collapsed={collapsed} />
          </button>

          {/* Nav items */}
          <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
            {SECTIONS.map(s => {
              const isActive = s.key === active;
              return (
                <button
                  key={s.key}
                  onClick={() => setActive(s.key)}
                  title={collapsed ? s.label : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: collapsed ? "10px 0" : "9px 14px",
                    justifyContent: collapsed ? "center" : "flex-start",
                    background: isActive ? "#1e293b" : "transparent",
                    border: "none",
                    borderLeft: isActive ? `3px solid ${s.color}` : "3px solid transparent",
                    color: isActive ? "#f1f5f9" : "#64748b",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    transition: "all 0.15s",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                  }}
                >
                  <span style={{ color: isActive ? s.color : "#475569", flexShrink: 0, display: "flex" }}>
                    {s.icon}
                  </span>
                  {!collapsed && (
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content area */}
        <div style={{ flex: 1, padding: "20px 24px", overflowY: "auto" }}>
          {/* Section header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
              background: activeSection.color + "22",
              color: activeSection.color,
              flexShrink: 0,
            }}>
              {activeSection.icon}
            </div>
            <div>
              <h2 style={{ color: "#f1f5f9", fontSize: 16, fontWeight: 700, margin: 0 }}>{activeSection.label}</h2>
              <p style={{ color: "#64748b", fontSize: 12, margin: "1px 0 0" }}>{activeSection.desc}</p>
            </div>
          </div>

          {active === "profile" ? PROFILE_CONTENT : (
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 32, textAlign: "center" }}>
              <div style={{ color: activeSection.color, marginBottom: 10, display: "flex", justifyContent: "center" }}>
                {React.cloneElement(activeSection.icon, { width: 32, height: 32 })}
              </div>
              <p style={{ color: "#475569", fontSize: 13, margin: 0 }}>{activeSection.label} settings will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "8px 24px", borderTop: "1px solid #1e293b", textAlign: "center" }}>
        <span style={{ color: "#1e293b", fontSize: 11 }}>Variant C — Collapsible Vertical Nav</span>
      </div>
    </div>
  );
}
