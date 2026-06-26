import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { assetMgmtApi } from "../../../services/apiClient";

const inp = { padding: "8px 10px", background: "var(--c-bg)", border: "1px solid var(--c-border)", borderRadius: 6, fontSize: 13, color: "var(--c-text)", width: "100%", boxSizing: "border-box" };

const Label = ({ children, req }) => (
  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--c-text2)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
    {children}{req && <span style={{ color: "#f87171", marginLeft: 2 }}>*</span>}
  </label>
);

const SectionHead = ({ title, sub }) => (
  <div style={{ marginTop: 4, paddingBottom: 10, borderBottom: "1px solid var(--c-border)" }}>
    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{title}</div>
    {sub && <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 2, opacity: 0.7 }}>{sub}</div>}
  </div>
);

const BLANK = {
  asset_code: "", asset_name: "", category_id: "", sub_category_id: "",
  brand: "", model_number: "", part_number: "", manufacturer: "",
  specifications: "", warranty_period_months: "", purchase_cost: "",
  expected_life_months: "", depreciation_applicable: false, depreciation_method: "",
  serial_number_required: false, warranty_tracking_enabled: false,
  maintenance_tracking_enabled: false, is_active: true,
};

export default function AssetMasterForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(BLANK);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [depMethods, setDepMethods] = useState(["Straight Line", "Written Down Value"]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    assetMgmtApi.metaOptions().then(r => {
      setCategories(r.data.data.categories || []);
      setSubCategories(r.data.data.sub_categories || []);
      if (r.data.data.depreciation_methods) setDepMethods(r.data.data.depreciation_methods);
    }).catch(() => {});
    if (isEdit) {
      assetMgmtApi.getMaster(id).then(r => {
        const m = r.data.data;
        setForm({
          ...BLANK, ...m,
          warranty_period_months: m.warranty_period_months ?? "",
          purchase_cost: m.purchase_cost ?? "",
          expected_life_months: m.expected_life_months ?? "",
          sub_category_id: m.sub_category_id || "",
          depreciation_method: m.depreciation_method || "",
          part_number: m.part_number || "",
        });
      }).catch(() => setError("Failed to load asset."));
    }
  }, [id]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setBool = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.checked }));
  const filteredSCs = form.category_id
    ? subCategories.filter(s => s.category_id === form.category_id)
    : subCategories;

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
      if (isEdit) await assetMgmtApi.updateMaster(id, data);
      else await assetMgmtApi.createMaster(data);
      navigate("/superadmin/assets/masters");
    } catch (err) { setError(err.response?.data?.detail || "Save failed."); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ padding: "24px 28px", maxWidth: 760, margin: "0 auto" }}>
      <button onClick={() => navigate("/superadmin/assets/masters")}
        style={{ background: "none", border: "none", color: "var(--c-muted)", fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 16 }}>
        ← Back to Asset Masters
      </button>
      <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: "var(--c-text)" }}>
        {isEdit ? "Edit Asset Master" : "New Asset Master"}
      </h2>

      {error && <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <form onSubmit={submit}>
        <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Section 1 — Basic Information */}
          <SectionHead title="Basic Information" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <Label req>Asset Code</Label>
              <input value={form.asset_code} onChange={set("asset_code")} style={inp} placeholder="AM-LAP-001" maxLength={30} />
            </div>
            <div>
              <Label req>Asset Name</Label>
              <input value={form.asset_name} onChange={set("asset_name")} style={inp} placeholder="Dell Latitude 5440" maxLength={150} />
            </div>
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

          {/* Section 2 — Manufacturer */}
          <SectionHead title="Manufacturer Information" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><Label>Brand</Label><input value={form.brand} onChange={set("brand")} style={inp} placeholder="Dell" /></div>
            <div><Label>Manufacturer</Label><input value={form.manufacturer} onChange={set("manufacturer")} style={inp} placeholder="Dell Technologies" /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><Label>Model Number</Label><input value={form.model_number} onChange={set("model_number")} style={inp} placeholder="Latitude 5440" /></div>
            <div><Label>Part Number</Label><input value={form.part_number} onChange={set("part_number")} style={inp} placeholder="DL-5440-001" /></div>
          </div>

          {/* Section 3 — Technical Specifications */}
          <SectionHead title="Technical Specifications" sub="Describe key specs: RAM, Storage, Processor, OS, etc." />
          <div>
            <Label>Specifications</Label>
            <textarea
              value={form.specifications}
              onChange={set("specifications")}
              rows={4}
              style={{ ...inp, resize: "vertical" }}
              placeholder={"RAM: 16GB DDR5\nStorage: 512GB NVMe SSD\nProcessor: Intel Core i7-1365U\nOS: Windows 11 Pro"}
            />
          </div>

          {/* Section 4 — Commercial Information */}
          <SectionHead title="Commercial Information" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <Label>Standard Purchase Cost (₹)</Label>
              <input type="number" value={form.purchase_cost} onChange={set("purchase_cost")} style={inp} min={0} placeholder="75000" />
            </div>
            <div>
              <Label>Expected Useful Life (Months)</Label>
              <input type="number" value={form.expected_life_months} onChange={set("expected_life_months")} style={inp} min={0} placeholder="48" />
            </div>
          </div>
          <div>
            <Label>Depreciation Applicable</Label>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              {[["Yes", true], ["No", false]].map(([lbl, val]) => (
                <button type="button" key={lbl}
                  onClick={() => setForm(f => ({ ...f, depreciation_applicable: val, depreciation_method: val ? f.depreciation_method : "" }))}
                  style={{ padding: "7px 20px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", border: `1px solid ${form.depreciation_applicable === val ? "var(--c-accent)" : "var(--c-border)"}`, background: form.depreciation_applicable === val ? "rgba(6,182,212,0.1)" : "transparent", color: form.depreciation_applicable === val ? "var(--c-accent)" : "var(--c-text2)" }}>
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

          {/* Section 5 — Tracking Configuration */}
          <SectionHead title="Tracking Configuration" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              ["serial_number_required", "Serial Number Required"],
              ["warranty_tracking_enabled", "Warranty Tracking Enabled"],
              ["maintenance_tracking_enabled", "Maintenance Tracking Enabled"],
            ].map(([k, lbl]) => (
              <label key={k} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--c-text)", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--c-border)", background: form[k] ? "rgba(6,182,212,0.05)" : "transparent" }}>
                <input type="checkbox" checked={form[k]} onChange={setBool(k)} style={{ cursor: "pointer", accentColor: "var(--c-accent)" }} /> {lbl}
              </label>
            ))}
          </div>

          {/* Section 6 — Media */}
          <SectionHead title="Media" />
          <div>
            <Label>Asset Image URL</Label>
            <input value={form.asset_image_url || ""} onChange={set("asset_image_url")} style={inp} placeholder="https://example.com/asset-image.jpg" />
            <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 4 }}>Accepted formats: JPG, PNG, WEBP</div>
          </div>

          {/* Section 7 — Status */}
          <SectionHead title="Status" />
          <div style={{ display: "flex", gap: 8 }}>
            {[["Active", true], ["Inactive", false]].map(([lbl, val]) => (
              <button type="button" key={lbl}
                onClick={() => setForm(f => ({ ...f, is_active: val }))}
                style={{ padding: "7px 20px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${form.is_active === val ? (val ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.4)") : "var(--c-border)"}`,
                  background: form.is_active === val ? (val ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)") : "transparent",
                  color: form.is_active === val ? (val ? "#4ade80" : "#f87171") : "var(--c-text2)" }}>
                {lbl}
              </button>
            ))}
          </div>

          {/* Warranty */}
          <SectionHead title="Warranty" />
          <div>
            <Label>Warranty Period (Months)</Label>
            <input type="number" value={form.warranty_period_months} onChange={set("warranty_period_months")} style={{ ...inp, maxWidth: 200 }} min={0} placeholder="36" />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button type="submit" disabled={saving}
            style={{ flex: 1, padding: "10px 0", borderRadius: 8, fontWeight: 600, fontSize: 14, background: saving ? "var(--c-muted)" : "var(--c-accent)", color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Asset Master"}
          </button>
          <button type="button" onClick={() => navigate("/superadmin/assets/masters")}
            style={{ flex: 1, padding: "10px 0", borderRadius: 8, fontWeight: 500, fontSize: 14, background: "transparent", color: "var(--c-text2)", border: "1px solid var(--c-border)", cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
