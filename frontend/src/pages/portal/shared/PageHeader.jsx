import React from "react";
import { useNavigate } from "react-router-dom";

export default function PageHeader({ title, subtitle, actions, breadcrumbs }) {
  const navigate = useNavigate();
  return (
    <div className="portal-page-header">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 12, color: "var(--c-muted)" }}>
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span>/</span>}
                {crumb.path
                  ? <span onClick={() => navigate(crumb.path)} style={{ cursor: "pointer", color: "var(--c-accent)" }}>{crumb.label}</span>
                  : <span>{crumb.label}</span>}
              </React.Fragment>
            ))}
          </div>
        )}
        <h2 className="portal-page-title">{title}</h2>
        {subtitle && <p className="portal-page-subtitle">{subtitle}</p>}
      </div>
      {actions && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {actions}
        </div>
      )}
    </div>
  );
}
