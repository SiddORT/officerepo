import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { assetMgmtApi } from "../../../services/apiClient";

const Label = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-muted)", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>{children}</div>
);

const Value = ({ children, mono, fallback = "—" }) => (
  <div style={{ fontSize: 13, color: children ? "var(--c-text)" : "var(--c-muted)", fontFamily: mono ? "monospace" : undefined, opacity: children ? 1 : 0.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
    {children ?? fallback}
  </div>
);

function Field({ label, value, mono }) {
  return <div><Label>{label}</Label><Value mono={mono}>{value}</Value></div>;
}

function BoolField({ label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 14 }}>{value ? "✅" : "⬜"}</span>
      <span style={{ fontSize: 13, color: "var(--c-text2)" }}>{label}</span>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
      <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--c-border)", background: "var(--c-surface2)" }}>
        <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "var(--c-text2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</h3>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

function ActionLabel(action) {
  const map = {
    "asset_master.created": { label: "Created", color: "#4ade80" },
    "asset_master.updated": { label: "Updated", color: "#60a5fa" },
    "asset_master.activated": { label: "Activated", color: "#4ade80" },
    "asset_master.deactivated": { label: "Deactivated", color: "#f87171" },
  };
  return map[action] || { label: action.split(".").pop(), color: "#9ca3af" };
}

function OverviewTab({ master }) {
  return (
    <>
      <SectionCard title="Manufacturer Information">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16 }}>
          <Field label="Brand" value={master.brand} />
          <Field label="Manufacturer" value={master.manufacturer} />
          <Field label="Model Number" value={master.model_number} mono />
          <Field label="Part Number" value={master.part_number} mono />
        </div>
      </SectionCard>

      <SectionCard title="Commercial Information">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
          <Field label="Standard Purchase Cost" value={master.purchase_cost != null ? `₹ ${Number(master.purchase_cost).toLocaleString("en-IN")}` : null} />
          <Field label="Expected Useful Life" value={master.expected_life_months != null ? `${master.expected_life_months} months` : null} />
          <Field label="Warranty Period" value={master.warranty_period_months != null ? `${master.warranty_period_months} months` : null} />
        </div>
        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
          <div>
            <Label>Depreciation Applicable</Label>
            <Value>{master.depreciation_applicable ? "Yes" : "No"}</Value>
          </div>
          {master.depreciation_applicable && (
            <Field label="Depreciation Method" value={master.depreciation_method} />
          )}
        </div>
      </SectionCard>

      <SectionCard title="Tracking Configuration">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <BoolField label="Serial Number Required" value={master.serial_number_required} />
          <BoolField label="Warranty Tracking Enabled" value={master.warranty_tracking_enabled} />
          <BoolField label="Maintenance Tracking Enabled" value={master.maintenance_tracking_enabled} />
        </div>
      </SectionCard>

      {master.asset_image_url && (
        <SectionCard title="Media">
          <div style={{ fontSize: 13, color: "var(--c-text2)", wordBreak: "break-all" }}>
            <a href={master.asset_image_url} target="_blank" rel="noreferrer" style={{ color: "var(--c-accent)" }}>{master.asset_image_url}</a>
          </div>
        </SectionCard>
      )}

      <SectionCard title="Audit">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Created" value={master.created_at ? new Date(master.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST" : null} />
          <Field label="Last Updated" value={master.updated_at ? new Date(master.updated_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST" : null} />
        </div>
      </SectionCard>
    </>
  );
}

function SpecificationsTab({ master }) {
  if (!master.specifications) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
        <div style={{ fontWeight: 600, color: "var(--c-text)", marginBottom: 4 }}>No specifications</div>
        <div>Technical specifications have not been added for this asset master.</div>
      </div>
    );
  }
  return (
    <SectionCard title="Technical Specifications">
      <pre style={{ margin: 0, fontSize: 13, color: "var(--c-text)", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit", lineHeight: 1.7 }}>
        {master.specifications}
      </pre>
    </SectionCard>
  );
}

function ActivitiesTab({ masterId }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await assetMgmtApi.listMasterActivities(masterId, { page, page_size: PAGE_SIZE });
      setRows(res.data.data.data || []);
      setTotal(res.data.data.total || 0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [masterId, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading activities…</div>;

  if (rows.length === 0) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>📝</div>
        <div style={{ fontWeight: 600, color: "var(--c-text)", marginBottom: 4 }}>No activity yet</div>
        <div>Activity will be recorded here when this asset master is created, updated, or status changed.</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, overflow: "hidden" }}>
        {rows.map((r, i) => {
          const { label, color } = ActionLabel(r.action);
          return (
            <div key={r.id} style={{ padding: "14px 20px", borderBottom: i < rows.length - 1 ? "1px solid var(--c-border)" : "none", display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, marginTop: 5, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>{label}</span>
                  {r.actor && <span style={{ fontSize: 11, color: "var(--c-muted)" }}>by {r.actor}</span>}
                  <span style={{ fontSize: 11, color: "var(--c-muted)", marginLeft: "auto" }}>
                    {new Date(r.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
                  </span>
                </div>
                {r.metadata && Object.keys(r.metadata).length > 0 && (
                  <div style={{ marginTop: 6, padding: "6px 10px", background: "var(--c-surface2)", borderRadius: 6, fontSize: 11, color: "var(--c-text2)", fontFamily: "monospace", wordBreak: "break-all" }}>
                    {JSON.stringify(r.metadata, null, 2)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, fontSize: 13, color: "var(--c-text2)" }}>
          <span>{total} total · page {page} of {totalPages}</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text2)", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.5 : 1 }}>
              ← Prev
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text2)", cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.5 : 1 }}>
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const TABS = ["Overview", "Specifications", "Activities"];

export default function AssetMasterDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [master, setMaster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [activeTab, setActiveTab] = useState("Overview");
  const [toast, setToast] = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [mRes, optRes] = await Promise.all([assetMgmtApi.getMaster(id), assetMgmtApi.metaOptions()]);
      setMaster(mRes.data.data);
      setCategories(optRes.data.data.categories || []);
      setSubCategories(optRes.data.data.sub_categories || []);
    } catch { setError("Failed to load asset master."); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = async () => {
    try {
      if (master.is_active) await assetMgmtApi.deactivateMaster(master.id);
      else await assetMgmtApi.activateMaster(master.id);
      showToast(`Asset master ${master.is_active ? "deactivated" : "activated"}.`);
      load();
    } catch (e) { setError(e.response?.data?.detail || "Action failed."); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>;
  if (error) return <div style={{ padding: 40, textAlign: "center", color: "#f87171", fontSize: 13 }}>{error}</div>;
  if (!master) return null;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 960, margin: "0 auto" }}>
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "#22c55e", color: "#fff", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, zIndex: 9999 }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => navigate("/superadmin/assets/masters")}
          style={{ background: "none", border: "none", color: "var(--c-muted)", fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 8 }}>
          ← Back to Asset Masters
        </button>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--c-heading)" }}>{master.asset_name}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontFamily: "monospace", padding: "2px 6px", borderRadius: 4, background: "var(--c-surface2)", color: "var(--c-text2)", border: "1px solid var(--c-border)" }}>{master.asset_code}</span>
              {master.category_name && (
                <span style={{ fontSize: 12, color: "var(--c-muted)" }}>
                  {master.category_name}{master.sub_category_name ? ` › ${master.sub_category_name}` : ""}
                </span>
              )}
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, fontWeight: 600,
                background: master.is_active ? "rgba(34,197,94,0.1)" : "rgba(156,163,175,0.1)",
                color: master.is_active ? "#4ade80" : "#9ca3af",
                border: `1px solid ${master.is_active ? "rgba(34,197,94,0.2)" : "rgba(156,163,175,0.2)"}` }}>
                {master.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => navigate(`/superadmin/assets/masters/${master.id}/edit`)}
              style={{ padding: "8px 16px", borderRadius: 7, fontWeight: 600, fontSize: 13, background: "var(--c-accent)", color: "#fff", border: "none", cursor: "pointer" }}>
              Edit
            </button>
            <button onClick={toggleStatus}
              style={{ padding: "8px 16px", borderRadius: 7, fontWeight: 500, fontSize: 13, background: "transparent", color: master.is_active ? "#f87171" : "#4ade80", border: `1px solid ${master.is_active ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`, cursor: "pointer" }}>
              {master.is_active ? "Deactivate" : "Activate"}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--c-border)", marginBottom: 20 }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding: "10px 20px", fontSize: 13, fontWeight: activeTab === tab ? 600 : 400, color: activeTab === tab ? "var(--c-accent)" : "var(--c-text2)", background: "transparent", border: "none", borderBottom: activeTab === tab ? "2px solid var(--c-accent)" : "2px solid transparent", cursor: "pointer", marginBottom: -1, transition: "all 0.15s" }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "Overview" && <OverviewTab master={master} />}
      {activeTab === "Specifications" && <SpecificationsTab master={master} />}
      {activeTab === "Activities" && <ActivitiesTab masterId={master.id} />}
    </div>
  );
}
