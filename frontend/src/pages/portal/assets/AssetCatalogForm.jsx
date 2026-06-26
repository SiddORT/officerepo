import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalAssetApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import AssetLayout from "./AssetLayout";
import PageHeader from "../shared/PageHeader";

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
      <div style={{ width: "100%" }}>
        <PageHeader
          title="Add Asset to Catalog"
          breadcrumbs={[
            { label: "Asset Catalog", path: `/portal/${subdomain}/assets/catalog` }
          ]}
          actions={
            <>
              <button type="button" onClick={back} className="btn-secondary">
                Cancel
              </button>
              <button form="asset-catalog-form" type="submit" disabled={saving} className="btn-primary">
                {saving ? "Adding…" : "Add to Catalog"}
              </button>
            </>
          }
        />

        {error && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 13, marginBottom: 16 }}>{error}</div>
        )}

        <form id="asset-catalog-form" onSubmit={submit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>

            {/* LEFT COLUMN */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Basic Information */}
              <div className="portal-form-card">
                <div className="portal-form-title">Basic Information</div>
                <div className="portal-form-row">
                  <div><label className="portal-form-label portal-form-label-req">Asset Code</label><input value={form.asset_code} onChange={set("asset_code")} className="input-field" placeholder="AM-LAP-004" maxLength={30} /></div>
                  <div><label className="portal-form-label portal-form-label-req">Asset Name</label><input value={form.asset_name} onChange={set("asset_name")} className="input-field" placeholder="MacBook Pro 14" maxLength={150} /></div>
                </div>
                <div className="portal-form-row">
                  <div>
                    <label className="portal-form-label portal-form-label-req">Category</label>
                    <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value, sub_category_id: "" }))} className="input-field">
                      <option value="">Select category…</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ""}{c.category_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="portal-form-label portal-form-label-req">Sub-Category</label>
                    <select value={form.sub_category_id} onChange={set("sub_category_id")} className="input-field">
                      <option value="">Select sub-category…</option>
                      {filteredSCs.map(s => <option key={s.id} value={s.id}>{s.sub_category_name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Manufacturer */}
              <div className="portal-form-card">
                <div className="portal-form-title">Manufacturer</div>
                <div className="portal-form-row">
                  <div><label className="portal-form-label">Brand</label><input value={form.brand} onChange={set("brand")} className="input-field" placeholder="Apple" /></div>
                  <div><label className="portal-form-label">Manufacturer</label><input value={form.manufacturer} onChange={set("manufacturer")} className="input-field" placeholder="Apple Inc." /></div>
                </div>
                <div className="portal-form-row">
                  <div><label className="portal-form-label">Model Number</label><input value={form.model_number} onChange={set("model_number")} className="input-field" placeholder="MNW83HN/A" /></div>
                  <div><label className="portal-form-label">Part Number</label><input value={form.part_number} onChange={set("part_number")} className="input-field" placeholder="APPLE-MBP14-001" /></div>
                </div>
              </div>

              {/* Specifications */}
              <div className="portal-form-card">
                <div className="portal-form-title">Specifications</div>
                <div>
                  <label className="portal-form-label">Technical Specifications</label>
                  <textarea value={form.specifications} onChange={set("specifications")} rows={5}
                    className="input-field" style={{ resize: "vertical" }}
                    placeholder={"RAM: 16GB\nStorage: 512GB SSD\nProcessor: M3 Pro\nOS: macOS Sonoma"} />
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Commercial */}
              <div className="portal-form-card">
                <div className="portal-form-title">Commercial</div>
                <div className="portal-form-row">
                  <div><label className="portal-form-label">Purchase Cost (₹)</label><input type="number" value={form.purchase_cost} onChange={set("purchase_cost")} className="input-field" min={0} placeholder="180000" /></div>
                  <div><label className="portal-form-label">Useful Life (Months)</label><input type="number" value={form.expected_life_months} onChange={set("expected_life_months")} className="input-field" min={0} placeholder="48" /></div>
                </div>
                <div className="portal-form-row">
                  <div><label className="portal-form-label">Warranty Period (Months)</label><input type="number" value={form.warranty_period_months} onChange={set("warranty_period_months")} className="input-field" min={0} placeholder="12" /></div>
                </div>
                <div>
                  <label className="portal-form-label">Depreciation Applicable</label>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    {[["Yes", true], ["No", false]].map(([lbl, val]) => (
                      <button type="button" key={lbl}
                        onClick={() => setForm(f => ({ ...f, depreciation_applicable: val, depreciation_method: val ? f.depreciation_method : "" }))}
                        className={form.depreciation_applicable === val ? "btn-primary" : "btn-secondary"}
                        style={{ padding: "6px 18px", fontSize: 13, flex: 1 }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
                {form.depreciation_applicable && (
                  <div>
                    <label className="portal-form-label">Depreciation Method</label>
                    <select value={form.depreciation_method} onChange={set("depreciation_method")} className="input-field">
                      <option value="">Select method…</option>
                      {depMethods.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Tracking */}
              <div className="portal-form-card">
                <div className="portal-form-title">Tracking</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    ["serial_number_required", "Serial Number Required", "Track assets by individual serial numbers"],
                    ["warranty_tracking_enabled", "Warranty Tracking", "Monitor warranty expiry per asset"],
                    ["maintenance_tracking_enabled", "Maintenance Tracking", "Schedule and log maintenance activities"],
                  ].map(([k, lbl, desc]) => (
                    <label key={k} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", padding: "12px 14px", borderRadius: 8, border: "1px solid var(--c-border)", background: form[k] ? "rgba(0,174,236,0.05)" : "transparent" }}>
                      <input type="checkbox" checked={form[k]} onChange={setBool(k)} style={{ cursor: "pointer", accentColor: "var(--c-accent)", width: 15, height: 15, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{lbl}</div>
                        <div style={{ fontSize: 11, marginTop: 1 }} className="t-muted">{desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </form>
      </div>
    </AssetLayout>
  );
}
