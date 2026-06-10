import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { assetMgmtApi } from "../../../services/apiClient";

const inp = { padding: "8px 10px", background: "var(--c-bg)", border: "1px solid var(--c-border)", borderRadius: 6, fontSize: 13, color: "var(--c-text)", width: "100%", boxSizing: "border-box" };
const Label = ({ children, req }) => (
  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--c-text2)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
    {children}{req && <span style={{ color: "#f87171", marginLeft: 2 }}>*</span>}
  </label>
);

const BLANK = {
  asset_code: "", asset_name: "", category_id: "", sub_category_id: "",
  brand: "", model_number: "", manufacturer: "", specifications: "",
  warranty_period_months: "", purchase_cost: "", expected_life_years: "",
  depreciation_applicable: false, serial_number_required: false,
  warranty_tracking_enabled: false, maintenance_tracking_enabled: false,
};

export default function AssetMasterForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(BLANK);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    assetMgmtApi.metaOptions().then(r => {
      setCategories(r.data.data.categories || []);
      setSubCategories(r.data.data.sub_categories || []);
    }).catch(() => {});
    if (isEdit) {
      assetMgmtApi.getMaster(id).then(r => {
        const m = r.data.data;
        setForm({ ...BLANK, ...m,
          warranty_period_months: m.warranty_period_months ?? "",
          purchase_cost: m.purchase_cost ?? "",
          expected_life_years: m.expected_life_years ?? "",
          sub_category_id: m.sub_category_id || "",
        });
      }).catch(() => setError("Failed to load asset."));
    }
  }, [id]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setBool = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.checked }));
  const filteredSCs = form.category_id ? subCategories.filter(s => s.category_id === form.category_id) : subCategories;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.asset_code.trim() || !form.asset_name.trim() || !form.category_id) { setError("Code, Name and Category are required."); return; }
    setSaving(true); setError("");
    try {
      const data = { ...form,
        warranty_period_months: form.warranty_period_months !== "" ? Number(form.warranty_period_months) : null,
        purchase_cost: form.purchase_cost !== "" ? Number(form.purchase_cost) : null,
        expected_life_years: form.expected_life_years !== "" ? Number(form.expected_life_years) : null,
        sub_category_id: form.sub_category_id || null,
      };
      if (isEdit) await assetMgmtApi.updateMaster(id, data);
      else await assetMgmtApi.createMaster(data);
      navigate("/superadmin/assets/masters");
    } catch (e) { setError(e.response?.data?.detail || "Save failed."); }
    finally { setSaving(false); }
  };

  const SectionHead = ({ title }) => (
    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 8, paddingBottom: 8, borderBottom: "1px solid var(--c-border)" }}>{title}</div>
  );

  return (
    <div style={{ padding: "24px 28px", maxWidth: 720, margin: "0 auto" }}>
      <button onClick={() => navigate("/superadmin/assets/masters")}
        style={{ background: "none", border: "none", color: "var(--c-muted)", fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 16 }}>
        ← Back to Asset Masters
      </button>
      <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: "var(--c-text)" }}>
        {isEdit ? "Edit Asset Master" : "New Asset Master"}
      </h2>

      {error && <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <form onSubmit={submit}>
        <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <SectionHead title="Basic Information" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><Label req>Asset Code</Label><input value={form.asset_code} onChange={set("asset_code")} style={inp} placeholder="AM-LAP-001" /></div>
            <div><Label req>Asset Name</Label><input value={form.asset_name} onChange={set("asset_name")} style={inp} placeholder="Dell Latitude 5440" /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><Label req>Category</Label>
              <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value, sub_category_id: "" }))} style={inp}>
                <option value="">Select category…</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ""}{c.category_name}</option>)}
              </select>
            </div>
            <div><Label>Sub-Category</Label>
              <select value={form.sub_category_id} onChange={set("sub_category_id")} style={inp}>
                <option value="">None</option>
                {filteredSCs.map(s => <option key={s.id} value={s.id}>{s.sub_category_name}</option>)}
              </select>
            </div>
          </div>

          <SectionHead title="Manufacturer" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div><Label>Brand</Label><input value={form.brand} onChange={set("brand")} style={inp} placeholder="Dell" /></div>
            <div><Label>Model Number</Label><input value={form.model_number} onChange={set("model_number")} style={inp} placeholder="Latitude 5440" /></div>
            <div><Label>Manufacturer</Label><input value={form.manufacturer} onChange={set("manufacturer")} style={inp} placeholder="Dell Technologies" /></div>
          </div>

          <SectionHead title="Technical Details" />
          <div><Label>Specifications</Label><textarea value={form.specifications} onChange={set("specifications")} rows={3} style={{ ...inp, resize: "vertical" }} placeholder="i7, 16GB RAM, 512GB SSD…" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12 }}>
            <div><Label>Warranty (months)</Label><input type="number" value={form.warranty_period_months} onChange={set("warranty_period_months")} style={inp} min={0} placeholder="36" /></div>
          </div>

          <SectionHead title="Commercial" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><Label>Purchase Cost (₹)</Label><input type="number" value={form.purchase_cost} onChange={set("purchase_cost")} style={inp} min={0} placeholder="75000" /></div>
            <div><Label>Expected Life (years)</Label><input type="number" value={form.expected_life_years} onChange={set("expected_life_years")} style={inp} min={0} placeholder="4" /></div>
          </div>

          <SectionHead title="Tracking" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[["depreciation_applicable", "Depreciation Applicable"], ["serial_number_required", "Serial Number Required"], ["warranty_tracking_enabled", "Warranty Tracking Enabled"], ["maintenance_tracking_enabled", "Maintenance Tracking Enabled"]].map(([k, lbl]) => (
              <label key={k} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--c-text)" }}>
                <input type="checkbox" checked={form[k]} onChange={setBool(k)} style={{ cursor: "pointer" }} /> {lbl}
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button type="submit" disabled={saving} style={{ flex: 1, padding: "10px 0", borderRadius: 8, fontWeight: 600, fontSize: 14, background: saving ? "var(--c-muted)" : "var(--c-accent)", color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer" }}>{saving ? "Saving…" : isEdit ? "Save Changes" : "Create Asset Master"}</button>
          <button type="button" onClick={() => navigate("/superadmin/assets/masters")} style={{ flex: 1, padding: "10px 0", borderRadius: 8, fontWeight: 500, fontSize: 14, background: "transparent", color: "var(--c-text2)", border: "1px solid var(--c-border)", cursor: "pointer" }}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
