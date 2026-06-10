import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { assetMgmtApi } from "../../../services/apiClient";

const inp = { padding: "8px 10px", background: "var(--c-bg)", border: "1px solid var(--c-border)", borderRadius: 6, fontSize: 13, color: "var(--c-text)", width: "100%", boxSizing: "border-box" };
const Label = ({ children }) => <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--c-text2)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{children}</label>;

function Section({ title, children }) {
  return (
    <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
      <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--c-border)", background: "var(--c-surface2)" }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--c-text2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</h3>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

function Field({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-muted)", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: 13, color: value ? "var(--c-text)" : "var(--c-muted)", fontFamily: mono ? "monospace" : undefined, opacity: value ? 1 : 0.5 }}>
        {value ?? "—"}
      </div>
    </div>
  );
}

function BoolField({ label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 14 }}>{value ? "✅" : "⬜"}</span>
      <span style={{ fontSize: 13, color: "var(--c-text2)" }}>{label}</span>
    </div>
  );
}

function EditModal({ master, categories, subCategories, onClose, onSaved }) {
  const [form, setForm] = useState({
    asset_code: master.asset_code || "", asset_name: master.asset_name || "",
    category_id: master.category_id || "", sub_category_id: master.sub_category_id || "",
    brand: master.brand || "", model_number: master.model_number || "",
    manufacturer: master.manufacturer || "", specifications: master.specifications || "",
    warranty_period_months: master.warranty_period_months ?? "",
    purchase_cost: master.purchase_cost ?? "", expected_life_years: master.expected_life_years ?? "",
    depreciation_applicable: master.depreciation_applicable ?? false,
    serial_number_required: master.serial_number_required ?? false,
    warranty_tracking_enabled: master.warranty_tracking_enabled ?? false,
    maintenance_tracking_enabled: master.maintenance_tracking_enabled ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setBool = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.checked }));
  const filteredSCs = form.category_id ? subCategories.filter(s => s.category_id === form.category_id) : subCategories;

  const submit = async () => {
    if (!form.asset_code.trim() || !form.asset_name.trim() || !form.category_id) { setError("Code, Name and Category are required."); return; }
    setSaving(true); setError("");
    try {
      const data = { ...form,
        warranty_period_months: form.warranty_period_months !== "" ? Number(form.warranty_period_months) : null,
        purchase_cost: form.purchase_cost !== "" ? Number(form.purchase_cost) : null,
        expected_life_years: form.expected_life_years !== "" ? Number(form.expected_life_years) : null,
        sub_category_id: form.sub_category_id || null,
      };
      await assetMgmtApi.updateMaster(master.id, data);
      onSaved();
    } catch (e) { setError(e.response?.data?.detail || "Save failed."); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 12, width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ position: "sticky", top: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--c-border)", background: "var(--c-surface)", zIndex: 1 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--c-heading)" }}>Edit Asset Master</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--c-muted)", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {error && <div style={{ padding: "8px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 6, fontSize: 13, color: "#f87171" }}>{error}</div>}

          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Basic Information</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><Label>Asset Code *</Label><input value={form.asset_code} onChange={set("asset_code")} style={inp} /></div>
            <div><Label>Asset Name *</Label><input value={form.asset_name} onChange={set("asset_name")} style={inp} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><Label>Category *</Label>
              <select value={form.category_id} onChange={e => { setForm(f => ({ ...f, category_id: e.target.value, sub_category_id: "" })); }} style={inp}>
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.category_name}</option>)}
              </select>
            </div>
            <div><Label>Sub-Category</Label>
              <select value={form.sub_category_id} onChange={set("sub_category_id")} style={inp}>
                <option value="">None</option>
                {filteredSCs.map(s => <option key={s.id} value={s.id}>{s.sub_category_name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 4 }}>Manufacturer</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div><Label>Brand</Label><input value={form.brand} onChange={set("brand")} style={inp} /></div>
            <div><Label>Model Number</Label><input value={form.model_number} onChange={set("model_number")} style={inp} /></div>
            <div><Label>Manufacturer</Label><input value={form.manufacturer} onChange={set("manufacturer")} style={inp} /></div>
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 4 }}>Technical Details</div>
          <div><Label>Specifications</Label><textarea value={form.specifications} onChange={set("specifications")} rows={3} style={{ ...inp, resize: "vertical" }} /></div>
          <div><Label>Warranty Period (months)</Label><input type="number" value={form.warranty_period_months} onChange={set("warranty_period_months")} style={{ ...inp, width: 160 }} min={0} /></div>

          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 4 }}>Commercial</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><Label>Purchase Cost</Label><input type="number" value={form.purchase_cost} onChange={set("purchase_cost")} style={inp} min={0} /></div>
            <div><Label>Expected Life (years)</Label><input type="number" value={form.expected_life_years} onChange={set("expected_life_years")} style={inp} min={0} /></div>
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 4 }}>Tracking</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[["depreciation_applicable", "Depreciation Applicable"], ["serial_number_required", "Serial Number Required"], ["warranty_tracking_enabled", "Warranty Tracking Enabled"], ["maintenance_tracking_enabled", "Maintenance Tracking Enabled"]].map(([k, lbl]) => (
              <label key={k} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--c-text)" }}>
                <input type="checkbox" checked={form[k]} onChange={setBool(k)} style={{ cursor: "pointer" }} /> {lbl}
              </label>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, padding: "14px 20px", borderTop: "1px solid var(--c-border)" }}>
          <button onClick={submit} disabled={saving} style={{ flex: 1, padding: "9px 0", borderRadius: 7, fontWeight: 600, fontSize: 13, background: saving ? "var(--c-muted)" : "var(--c-accent)", color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer" }}>{saving ? "Saving…" : "Save Changes"}</button>
          <button onClick={onClose} style={{ flex: 1, padding: "9px 0", borderRadius: 7, fontWeight: 500, fontSize: 13, background: "transparent", color: "var(--c-text2)", border: "1px solid var(--c-border)", cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function AssetMasterDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [master, setMaster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [mRes, optRes] = await Promise.all([assetMgmtApi.getMaster(id), assetMgmtApi.metaOptions()]);
      setMaster(mRes.data.data);
      setCategories(optRes.data.data.categories || []);
      setSubCategories(optRes.data.data.sub_categories || []);
    } catch { setError("Failed to load asset master."); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const toggleStatus = async () => {
    try {
      if (master.is_active) await assetMgmtApi.deactivateMaster(master.id);
      else await assetMgmtApi.activateMaster(master.id);
      showToast(`Asset ${master.is_active ? "deactivated" : "activated"}.`);
      load();
    } catch (e) { setError(e.response?.data?.detail || "Action failed."); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>;
  if (error) return <div style={{ padding: 40, textAlign: "center", color: "#f87171", fontSize: 13 }}>{error}</div>;
  if (!master) return null;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 900, margin: "0 auto" }}>
      {toast && <div style={{ position: "fixed", bottom: 24, right: 24, background: "#22c55e", color: "#fff", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, zIndex: 9999 }}>{toast}</div>}
      {editing && (
        <EditModal master={master} categories={categories} subCategories={subCategories}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); load(); showToast("Asset updated."); }}
        />
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
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontFamily: "monospace", padding: "2px 6px", borderRadius: 4, background: "var(--c-surface2)", color: "var(--c-text2)", border: "1px solid var(--c-border)" }}>{master.asset_code}</span>
              {master.category_name && <span style={{ fontSize: 12, color: "var(--c-muted)" }}>{master.category_name}{master.sub_category_name ? ` › ${master.sub_category_name}` : ""}</span>}
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, fontWeight: 600,
                background: master.is_active ? "rgba(34,197,94,0.1)" : "rgba(156,163,175,0.1)",
                color: master.is_active ? "#4ade80" : "#9ca3af",
                border: `1px solid ${master.is_active ? "rgba(34,197,94,0.2)" : "rgba(156,163,175,0.2)"}` }}>
                {master.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setEditing(true)} style={{ padding: "8px 16px", borderRadius: 7, fontWeight: 600, fontSize: 13, background: "var(--c-accent)", color: "#fff", border: "none", cursor: "pointer" }}>Edit</button>
            <button onClick={toggleStatus} style={{ padding: "8px 16px", borderRadius: 7, fontWeight: 500, fontSize: 13, background: "transparent", color: master.is_active ? "#f87171" : "#4ade80", border: `1px solid ${master.is_active ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`, cursor: "pointer" }}>
              {master.is_active ? "Deactivate" : "Activate"}
            </button>
          </div>
        </div>
      </div>

      <Section title="Manufacturer">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          <Field label="Brand" value={master.brand} />
          <Field label="Model Number" value={master.model_number} mono />
          <Field label="Manufacturer" value={master.manufacturer} />
        </div>
      </Section>

      <Section title="Technical Details">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: master.specifications ? 16 : 0 }}>
          <Field label="Warranty Period" value={master.warranty_period_months != null ? `${master.warranty_period_months} months` : null} />
          <Field label="Expected Life" value={master.expected_life_years != null ? `${master.expected_life_years} years` : null} />
        </div>
        {master.specifications && <Field label="Specifications" value={master.specifications} />}
      </Section>

      <Section title="Commercial">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          <Field label="Purchase Cost" value={master.purchase_cost != null ? `₹ ${Number(master.purchase_cost).toLocaleString()}` : null} />
          <Field label="Expected Life" value={master.expected_life_years != null ? `${master.expected_life_years} years` : null} />
          <div />
        </div>
      </Section>

      <Section title="Tracking & Controls">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          <BoolField label="Depreciation Applicable" value={master.depreciation_applicable} />
          <BoolField label="Serial Number Required" value={master.serial_number_required} />
          <BoolField label="Warranty Tracking Enabled" value={master.warranty_tracking_enabled} />
          <BoolField label="Maintenance Tracking Enabled" value={master.maintenance_tracking_enabled} />
        </div>
      </Section>

      <Section title="Audit">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Created" value={master.created_at ? new Date(master.created_at).toLocaleString() : null} />
          <Field label="Last Updated" value={master.updated_at ? new Date(master.updated_at).toLocaleString() : null} />
        </div>
      </Section>
    </div>
  );
}
