import React from "react";

export default function StatCard({ label, value, color = "var(--c-accent)", onClick, icon }) {
  return (
    <div className="portal-stat-card" onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{value ?? "—"}</div>
          <div className="t-muted" style={{ fontSize: 12, marginTop: 5 }}>{label}</div>
        </div>
        {icon && (
          <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
