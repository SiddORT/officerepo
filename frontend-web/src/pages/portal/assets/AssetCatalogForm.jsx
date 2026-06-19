import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalAssetApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import AssetLayout from "./AssetLayout";

const inp = {
  padding: "8px 10px", background: "var(--c-bg,var(--c-surface))",
  border: "1px solid var(--c-border)", borderRadius: 6,
  fontSize: 13, color: "var(--c-text)", width: "100%", boxSizing: "border-box",
};

const Label = ({ children, req }) => (
  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--c-text2,var(--c-muted))", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
    {children}{req && <span style={{ color: "#f87171", marginLeft: 2 }}>*</span>}
  </label>
);

const SectionHead = ({ title }) => (
  <div style={{ paddingBottom: 8, borderBottom: "1px solid var(--c-border)", marginTop: 4 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{title}</div>
  </div>
);

const BLANK = {
  asset_code: "", asset_name: "", category_id: "", sub_category_id: "",
  brand: "", model_number: "", part_number: "", manufacturer: "",
  specifications: "", warranty_period_months: "", purchase_cost: "",
  expected_life_months: "", depreciation_applicable: false,
  depreciation_method: "", serial_number_required: false,
  warranty_tracking_enabled: false, maintenance_tracking_enabled: false,
  is_active: true,
};

export default function AssetCatalogForm() {
  const { subdomain } = useParams();
  const navigate = useNavigate();
  const { token } = usePortalAuth();

  const [form, setForm] = useState(BLANK);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [depMethods, setDepMethods] = useState(["Straight Line", "Written Down Value"]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    portalAssetApi.metaOptions(subdomain, token).then(r => {
      setCategories(r.data?.data?.categories || []);
      setSubCategories(r.data?.data?.sub_categories || []);
      if (r.data?.data?.depreciation_methods) setDepMethods(r.data.data.depreciation_methods);
    }).catch(() => {});
  }, [subdomain, token]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setBool = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.checked }));
  const filteredSCs = form.category_id
    ? subCategories.filter(s => s.category_id === form.category_id)
    : subCategories;

  const back = () => navigate(`/portal/${subdomain}/assets/catalog`);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.asset_code.trim()) { setError("Asset Code is required."); return; }
    if (!form.asset_name.trim()) { setError("Asset Name is required."); return; }
    if (!form.category_id) { setError("Category is required."); return; }
    if (!form.sub_category_id) { setError("Sub-Category is required."); return; }
    setSaving(true); setError("");
    try {
      const data = {
        ...form,
        warranty_period_months: form.warranty_period_months !== "" ? Number(form.warranty_period_months) : null,
        purchase_cost: form.purchase_cost !== "" ? Number(form.purchase_cost) : null,
        expected_life_months: form.expected_life_months !== "" ? Number(form.expected_life_months) : null,
        sub_category_id: form.sub_category_id || null,
        depreciation_method: form.depreciation_applicable && form.depreciation_method ? form.depreciation_method : null,
        part_number: form.part_number || null,
        specifications: form.specifications || null,
        brand: form.brand || null,
        model_number: form.model_number || null,
        manufacturer: form.manufacturer || null,
      };
      await portalAssetApi.createCatalogItem(subdomain, token, data);
      back();
    } catch (err) {
      setError(err.response?.data?.detail || "Save failed. Please check your entries.");
    } finally { setSaving(false); }
  };

  return (
    <AssetLayout title="Add Asset">
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <button onClick={back}
          style={{ background: "none", border: "none", color: "var(--c-muted)", fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 16 }}>
          ← Back to Asset Catalog
        </button>
        <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: "var(--c-text)" }}>Add Asset to Catalog</h2>

        {error && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 13, marginBottom: 16 }}>{error}</div>
        )}

        <form onSubmit={submit}>
          <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>

            <SectionHead title="Basic Information" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><Label req>Asset Code</Label><input value={form.asset_code} onChange={set("asset_code")} style={inp} placeholder="AM-LAP-004" maxLength={30} /></div>
              <div><Label req>Asset Name</Label><input value={form.asset_name} onChange={set("asset_name")} style={inp} placeholder="MacBook Pro 14" maxLength={150} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <Label req>Category</Label>
                <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value, sub_category_id: "" }))} style={inp}>
                  <option value="">Select category…</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ""}{c.category_name}</option>)}
                </select>
              </div>
              <div>
                <Label req>Sub-Category</Label>
                <select value={form.sub_category_id} onChange={set("sub_category_id")} style={inp}>
                  <option value="">Select sub-category…</option>
                  {filteredSCs.map(s => <option key={s.id} value={s.id}>{s.sub_category_name}</option>)}
                </select>
              </div>
            </div>

            <SectionHead title="Manufacturer" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><Label>Brand</Label><input value={form.brand} onChange={set("brand")} style={inp} placeholder="Apple" /></div>
              <div><Label>Manufacturer</Label><input value={form.manufacturer} onChange={set("manufacturer")} style={inp} placeholder="Apple Inc." /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><Label>Model Number</Label><input value={form.model_number} onChange={set("model_number")} style={inp} placeholder="MNW83HN/A" /></div>
              <div><Label>Part Number</Label><input value={form.part_number} onChange={set("part_number")} style={inp} placeholder="APPLE-MBP14-001" /></div>
            </div>

            <SectionHead title="Specifications" />
            <div>
              <Label>Technical Specifications</Label>
              <textarea value={form.specifications} onChange={set("specifications")} rows={3}
                style={{ ...inp, resize: "vertical" }}
                placeholder={"RAM: 16GB\nStorage: 512GB SSD\nProcessor: M3 Pro\nOS: macOS Sonoma"} />
            </div>

            <SectionHead title="Commercial" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><Label>Standard Purchase Cost (₹)</Label><input type="number" value={form.purchase_cost} onChange={set("purchase_cost")} style={inp} min={0} placeholder="180000" /></div>
              <div><Label>Useful Life (Months)</Label><input type="number" value={form.expected_life_months} onChange={set("expected_life_months")} style={inp} min={0} placeholder="48" /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><Label>Warranty Period (Months)</Label><input type="number" value={form.warranty_period_months} onChange={set("warranty_period_months")} style={inp} min={0} placeholder="12" /></div>
            </div>
            <div>
              <Label>Depreciation Applicable</Label>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                {[["Yes", true], ["No", false]].map(([lbl, val]) => (
                  <button type="button" key={lbl}
                    onClick={() => setForm(f => ({ ...f, depreciation_applicable: val, depreciation_method: val ? f.depreciation_method : "" }))}
                    style={{ padding: "6px 18px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
                      border: `1px solid ${form.depreciation_applicable === val ? "var(--c-accent)" : "var(--c-border)"}`,
                      background: form.depreciation_applicable === val ? "rgba(0,174,236,0.1)" : "transparent",
                      color: form.depreciation_applicable === val ? "var(--c-accent)" : "var(--c-text2,var(--c-muted))" }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
            {form.depreciation_applicable && (
              <div>
                <Label>Depreciation Method</Label>
                <select value={form.depreciation_method} onChange={set("depreciation_method")} style={inp}>
                  <option value="">Select method…</option>
                  {depMethods.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            )}

            <SectionHead title="Tracking" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                ["serial_number_required", "Serial Number Required"],
                ["warranty_tracking_enabled", "Warranty Tracking"],
                ["maintenance_tracking_enabled", "Maintenance Tracking"],
              ].map(([k, lbl]) => (
                <label key={k} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--c-text)", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--c-border)", background: form[k] ? "rgba(0,174,236,0.05)" : "transparent" }}>
                  <input type="checkbox" checked={form[k]} onChange={setBool(k)} style={{ cursor: "pointer", accentColor: "var(--c-accent)" }} /> {lbl}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button type="submit" disabled={saving}
              style={{ flex: 1, padding: "10px 0", borderRadius: 8, fontWeight: 600, fontSize: 14, background: saving ? "var(--c-muted)" : "var(--c-accent)", color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Adding…" : "Add to Catalog"}
            </button>
            <button type="button" onClick={back}
              style={{ flex: 1, padding: "10px 0", borderRadius: 8, fontWeight: 500, fontSize: 14, background: "transparent", color: "var(--c-text2,var(--c-muted))", border: "1px solid var(--c-border)", cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </AssetLayout>
  );
}
