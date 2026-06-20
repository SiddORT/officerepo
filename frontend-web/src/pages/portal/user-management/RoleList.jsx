import React, { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalUserMgmtApi } from "../../../services/apiClient";
import UserManagementLayout from "./UserManagementLayout";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";

export default function RoleList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await portalUserMgmtApi.listRoles(subdomain, token);
      setRoles(res.data?.data || []);
    } catch {
      setError("Failed to load roles.");
    } finally {
      setLoading(false);
    }
  }, [subdomain, token]);

  useEffect(() => { load(); }, [load]);

  const handleClone = async (roleId, roleName) => {
    try {
      await portalUserMgmtApi.cloneRole(subdomain, token, roleId);
      showToast(`"${roleName}" cloned.`);
      load();
    } catch (e) {
      showToast(e.response?.data?.detail || "Clone failed.", false);
    }
  };

  const handleStatus = async (roleId, roleName, is_active) => {
    try {
      await portalUserMgmtApi.setRoleStatus(subdomain, token, roleId, is_active);
      showToast(`"${roleName}" ${is_active ? "activated" : "deactivated"}.`);
      load();
    } catch (e) {
      showToast(e.response?.data?.detail || "Failed.", false);
    }
  };

  const system = roles.filter(r => r.is_system_role);
  const custom = roles.filter(r => !r.is_system_role);

  return (
    <UserManagementLayout title="Roles">
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: toast.ok ? "#166534" : "#dc2626", color: "#fff", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <PageHeader 
        title="Roles" 
        subtitle={`Manage workspace roles — ${roles.length} defined`} 
        actions={
          <Link to={`/portal/${subdomain}/user-management/roles/new`} className="btn-primary" style={{ textDecoration: "none" }}>
            + Create Role
          </Link>
        } 
      />

      {error && (
        <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, marginBottom: 14, fontSize: 13, color: "#f87171" }}>{error}</div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
      ) : (
        <>
          {system.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>System Roles</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
                {system.map(r => <RoleCard key={r.id} role={r} subdomain={subdomain} onClone={handleClone} onStatus={handleStatus} />)}
              </div>
            </div>
          )}
          {custom.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Custom Roles</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
                {custom.map(r => <RoleCard key={r.id} role={r} subdomain={subdomain} onClone={handleClone} onStatus={handleStatus} />)}
              </div>
            </div>
          )}
          {roles.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13, background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10 }}>
              No roles yet. Default roles seed automatically.
            </div>
          )}
        </>
      )}
    </UserManagementLayout>
  );
}

function RoleCard({ role, subdomain, onClone, onStatus }) {
  return (
    <div className="card" style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text)" }}>{role.name}</span>
            {role.is_system_role && (
              <span className="badge-purple" style={{ fontSize: 10 }}>System</span>
            )}
            {!role.is_active && (
              <Badge status="Inactive" />
            )}
          </div>
          {role.description && (
            <p className="t-muted" style={{ margin: "4px 0 0", fontSize: 12, lineHeight: 1.4 }}>{role.description}</p>
          )}
        </div>
        <div className="t-accent" style={{ fontSize: 20, fontWeight: 700 }}>{role.user_count}</div>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--c-border)" }}>
        {!role.is_system_role && (
          <Link to={`/portal/${subdomain}/user-management/roles/${role.id}/edit`}
            className="t-accent" style={{ fontSize: 12, textDecoration: "none", fontWeight: 600 }}>Edit</Link>
        )}
        <button onClick={() => onClone(role.id, role.name)}
          className="t-muted" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
          Clone
        </button>
        {!role.is_system_role && (
          <button onClick={() => onStatus(role.id, role.name, !role.is_active)}
            className="t-accent" style={{ color: role.is_active ? "#f87171" : "#4ade80", background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 12 }}>
            {role.is_active ? "Deactivate" : "Activate"}
          </button>
        )}
      </div>
    </div>
  );
}
