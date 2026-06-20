import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalAssetApi, portalOrgApi, portalEmployeeApi } from "../../../services/apiClient";
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

const Card = ({ title, children }) => (
  <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
    <div style={{ paddingBottom: 8, borderBottom: "1px solid var(--c-border)" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{title}</div>
    </div>
    {children}
  </div>
);

const Row2 = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{children}</div>
);

const BLANK = {
  asset_name: "", category_id: "", category_name: "", sub_category_id: "", sub_category_name: "",
  asset_master_id: "", status: "Available",
  brand: "", manufacturer: "", model_number: "", part_number: "", serial_number: "", barcode_number: "",
  company_id: "", company_name: "", branch_id: "", branch_name: "", department_id: "", department_name: "",
  work_location_type: "",
  purchase_date: "", purchase_cost: "", currency: "INR",
  vendor_name: "", vendor_contact: "", invoice_number: "", purchase_order_number: "",
  warranty_available: false, warranty_start_date: "", warranty_end_date: "", warranty_provider: "", warranty_reference_number: "",
  amc_applicable: false, amc_start_date: "", amc_end_date: "", amc_vendor: "", amc_cost: "",
  insurance_available: false, insurance_provider: "", policy_number: "", coverage_amount: "",
  insurance_start_date: "", insurance_end_date: "",
  maintenance_required: false, last_maintenance_date: "", next_maintenance_date: "", maintenance_frequency: "",
};

export default function AssetInventoryForm({ editMode = false }) {
  const { subdomain, assetId } = useParams();
  const navigate = useNavigate();
  const { token } = usePortalAuth();

  const [form, setForm] = useState(BLANK);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [workLocations, setWorkLocations] = useState([]);
  const [maintenanceFreqs, setMaintenanceFreqs] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const back = () => navigate(editMode
    ? `/portal/${subdomain}/assets/inventory/${assetId}`
    : `/portal/${subdomain}/assets/inventory`);

  useEffect(() => {
    portalAssetApi.metaOptions(subdomain, token).then(r => {
      const d = r.data?.data || {};
      setCategories(d.categories || []);
      setSubCategories(d.sub_categories || []);
    }).catch(() => {});
    portalAssetApi.inventoryMeta(subdomain, token).then(r => {
      const d = r.data?.data || {};
      setStatuses(d.statuses || []);
      setWorkLocations(d.work_location_types || []);
      setMaintenanceFreqs(d.maintenance_frequencies || []);
      setCurrencies(d.currencies || []);
    }).catch(() => {});
    portalOrgApi.listCompanies(subdomain, token, { page_size: 200 }).then(r => setCompanies(r.data?.data?.items || [])).catch(() => {});
    portalOrgApi.listBranches(subdomain, token, { page_size: 200 }).then(r => setBranches(r.data?.data?.items || [])).catch(() => {});
    portalOrgApi.listDepts(subdomain, token, { page_size: 200 }).then(r => setDepartments(r.data?.data?.items || [])).catch(() => {});
    portalEmployeeApi.list(subdomain, token, { page_size: 200 }).then(r => setEmployees(r.data?.data?.items || [])).catch(() => {});
    if (editMode && assetId) {
      portalAssetApi.getInventoryItem(subdomain, token, assetId).then(r => {
        const d = r.data?.data || {};
        const mapped = {};
        Object.keys(BLANK).forEach(k => {
          mapped[k] = d[k] ?? BLANK[k];
          if (mapped[k] === null) mapped[k] = BLANK[k];
        });
        setForm(mapped);
      }).catch(() => {});
    }
  }, [subdomain, token, editMode, assetId]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setBool = k => e => setForm(f => ({ ...f, [k]: e.target.checked }));
  const filteredSCs = form.category_id
    ? subCategories.filter(s => s.category_id === form.category_id)
    : subCategories;
  const filteredBranches = form.company_id
    ? branches.filter(b => b.company_id === form.company_id)
    : branches;

  const submit = async e => {
    e.preventDefault();
    if (!form.asset_name.trim()) { setError("Asset Name is required."); return; }
    if (!form.category_id) { setError("Category is required."); return; }
    setSaving(true); setError("");
    try {
      const data = { ...form };
      ["purchase_cost", "amc_cost", "coverage_amount"].forEach(k => {
        data[k] = data[k] !== "" ? Number(data[k]) : null;
      });
      ["purchase_date", "warranty_start_date", "warranty_end_date",
       "amc_start_date", "amc_end_date", "insurance_start_date",
       "insurance_end_date", "last_maintenance_date", "next_maintenance_date"
      ].forEach(k => { data[k] = data[k] || null; });
      ["asset_master_id", "sub_category_id", "company_id", "branch_id",
       "department_id", "work_location_type", "maintenance_frequency"].forEach(k => {
        data[k] = data[k] || null;
      });
      if (editMode) {
        await portalAssetApi.updateInventoryItem(subdomain, token, assetId, data);
        navigate(`/portal/${subdomain}/assets/inventory/${assetId}`);
      } else {
        const r = await portalAssetApi.createInventoryItem(subdomain, token, data);
        const id = r.data?.data?.id;
        navigate(id ? `/portal/${subdomain}/assets/inventory/${id}` : `/portal/${subdomain}/assets/inventory`);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Save failed. Please check your entries.");
    } finally { setSaving(false); }
  };

  return (
    <AssetLayout title={editMode ? "Edit Asset" : "Add Asset"}>
      <div style={{ width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <button onClick={back} style={{ background: "none", border: "none", color: "var(--c-muted)", fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 4, display: "block" }}>
              ← {editMode ? "Back to Asset" : "Asset Inventory"}
            </button>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--c-text)" }}>
              {editMode ? "Edit Asset" : "Add Asset to Inventory"}
            </h2>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={back}
              style={{ padding: "8px 20px", borderRadius: 8, fontWeight: 500, fontSize: 13, background: "transparent", color: "var(--c-text2,var(--c-muted))", border: "1px solid var(--c-border)", cursor: "pointer" }}>
              Cancel
            </button>
            <button form="inv-form" type="submit" disabled={saving}
              style={{ padding: "8px 24px", borderRadius: 8, fontWeight: 600, fontSize: 13, background: saving ? "var(--c-muted)" : "var(--c-accent)", color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Saving…" : editMode ? "Save Changes" : "Create Asset"}
            </button>
          </div>
        </div>

        {error && <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 13, marginBottom: 16 }}>{error}</div>}

        <form id="inv-form" onSubmit={submit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>

            {/* LEFT */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              <Card title="Basic Information">
                <div><Label req>Asset Name</Label><input value={form.asset_name} onChange={set("asset_name")} style={inp} placeholder="Dell Latitude 5440" /></div>
                <Row2>
                  <div>
                    <Label req>Category</Label>
                    <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value, category_name: categories.find(c => c.id === e.target.value)?.category_name || "", sub_category_id: "", sub_category_name: "" }))} style={inp}>
                      <option value="">Select category…</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ""}{c.category_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Sub-Category</Label>
                    <select value={form.sub_category_id} onChange={e => setForm(f => ({ ...f, sub_category_id: e.target.value, sub_category_name: filteredSCs.find(s => s.id === e.target.value)?.sub_category_name || "" }))} style={inp}>
                      <option value="">Select sub-category…</option>
                      {filteredSCs.map(s => <option key={s.id} value={s.id}>{s.sub_category_name}</option>)}
                    </select>
                  </div>
                </Row2>
                <Row2>
                  <div>
                    <Label>Status</Label>
                    <select value={form.status} onChange={set("status")} style={inp}>
                      {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><Label>Work Location</Label>
                    <select value={form.work_location_type} onChange={set("work_location_type")} style={inp}>
                      <option value="">Select…</option>
                      {workLocations.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                </Row2>
              </Card>

              <Card title="Asset Details">
                <Row2>
                  <div><Label>Brand</Label><input value={form.brand} onChange={set("brand")} style={inp} placeholder="Dell" /></div>
                  <div><Label>Manufacturer</Label><input value={form.manufacturer} onChange={set("manufacturer")} style={inp} placeholder="Dell Technologies" /></div>
                </Row2>
                <Row2>
                  <div><Label>Model Number</Label><input value={form.model_number} onChange={set("model_number")} style={inp} placeholder="Latitude 5440" /></div>
                  <div><Label>Part Number</Label><input value={form.part_number} onChange={set("part_number")} style={inp} placeholder="5440-PART-001" /></div>
                </Row2>
                <Row2>
                  <div><Label>Serial Number</Label><input value={form.serial_number} onChange={set("serial_number")} style={inp} placeholder="SN123456789" /></div>
                  <div><Label>Barcode Number</Label><input value={form.barcode_number} onChange={set("barcode_number")} style={inp} placeholder="BC-00001" /></div>
                </Row2>
              </Card>

              <Card title="Organization Mapping">
                <Row2>
                  <div>
                    <Label>Company</Label>
                    <select value={form.company_id} onChange={e => setForm(f => ({ ...f, company_id: e.target.value, company_name: companies.find(c => c.id === e.target.value)?.company_name || "", branch_id: "", branch_name: "" }))} style={inp}>
                      <option value="">Select company…</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Branch</Label>
                    <select value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value, branch_name: filteredBranches.find(b => b.id === e.target.value)?.branch_name || "" }))} style={inp}>
                      <option value="">Select branch…</option>
                      {filteredBranches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
                    </select>
                  </div>
                </Row2>
                <div>
                  <Label>Department</Label>
                  <select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value, department_name: departments.find(d => d.id === e.target.value)?.department_name || "" }))} style={inp}>
                    <option value="">Select department…</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
                  </select>
                </div>
              </Card>

              <Card title="Purchase Information">
                <Row2>
                  <div><Label>Purchase Date</Label><input type="date" value={form.purchase_date} onChange={set("purchase_date")} style={inp} /></div>
                  <div>
                    <Label>Currency</Label>
                    <select value={form.currency} onChange={set("currency")} style={inp}>
                      {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </Row2>
                <Row2>
                  <div><Label>Purchase Cost</Label><input type="number" value={form.purchase_cost} onChange={set("purchase_cost")} style={inp} min={0} placeholder="0.00" /></div>
                  <div><Label>Vendor Name</Label><input value={form.vendor_name} onChange={set("vendor_name")} style={inp} placeholder="Vendor Co." /></div>
                </Row2>
                <Row2>
                  <div><Label>Invoice Number</Label><input value={form.invoice_number} onChange={set("invoice_number")} style={inp} /></div>
                  <div><Label>PO Number</Label><input value={form.purchase_order_number} onChange={set("purchase_order_number")} style={inp} /></div>
                </Row2>
                <div><Label>Vendor Contact</Label><input value={form.vendor_contact} onChange={set("vendor_contact")} style={inp} /></div>
              </Card>
            </div>

            {/* RIGHT */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              <Card title="Warranty Information">
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                  <input type="checkbox" checked={form.warranty_available} onChange={setBool("warranty_available")} style={{ accentColor: "var(--c-accent)" }} />
                  <span style={{ fontWeight: 600 }}>Warranty Available</span>
                </label>
                {form.warranty_available && <>
                  <Row2>
                    <div><Label>Start Date</Label><input type="date" value={form.warranty_start_date} onChange={set("warranty_start_date")} style={inp} /></div>
                    <div><Label>End Date</Label><input type="date" value={form.warranty_end_date} onChange={set("warranty_end_date")} style={inp} /></div>
                  </Row2>
                  <Row2>
                    <div><Label>Provider</Label><input value={form.warranty_provider} onChange={set("warranty_provider")} style={inp} /></div>
                    <div><Label>Reference #</Label><input value={form.warranty_reference_number} onChange={set("warranty_reference_number")} style={inp} /></div>
                  </Row2>
                </>}
              </Card>

              <Card title="AMC Information">
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                  <input type="checkbox" checked={form.amc_applicable} onChange={setBool("amc_applicable")} style={{ accentColor: "var(--c-accent)" }} />
                  <span style={{ fontWeight: 600 }}>AMC Applicable</span>
                </label>
                {form.amc_applicable && <>
                  <Row2>
                    <div><Label>Start Date</Label><input type="date" value={form.amc_start_date} onChange={set("amc_start_date")} style={inp} /></div>
                    <div><Label>End Date</Label><input type="date" value={form.amc_end_date} onChange={set("amc_end_date")} style={inp} /></div>
                  </Row2>
                  <Row2>
                    <div><Label>Vendor</Label><input value={form.amc_vendor} onChange={set("amc_vendor")} style={inp} /></div>
                    <div><Label>Cost</Label><input type="number" value={form.amc_cost} onChange={set("amc_cost")} style={inp} min={0} /></div>
                  </Row2>
                </>}
              </Card>

              <Card title="Insurance Information">
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                  <input type="checkbox" checked={form.insurance_available} onChange={setBool("insurance_available")} style={{ accentColor: "var(--c-accent)" }} />
                  <span style={{ fontWeight: 600 }}>Insurance Available</span>
                </label>
                {form.insurance_available && <>
                  <Row2>
                    <div><Label>Provider</Label><input value={form.insurance_provider} onChange={set("insurance_provider")} style={inp} /></div>
                    <div><Label>Policy Number</Label><input value={form.policy_number} onChange={set("policy_number")} style={inp} /></div>
                  </Row2>
                  <Row2>
                    <div><Label>Coverage Amount</Label><input type="number" value={form.coverage_amount} onChange={set("coverage_amount")} style={inp} min={0} /></div>
                    <div />
                  </Row2>
                  <Row2>
                    <div><Label>Start Date</Label><input type="date" value={form.insurance_start_date} onChange={set("insurance_start_date")} style={inp} /></div>
                    <div><Label>End Date</Label><input type="date" value={form.insurance_end_date} onChange={set("insurance_end_date")} style={inp} /></div>
                  </Row2>
                </>}
              </Card>

              <Card title="Maintenance Information">
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                  <input type="checkbox" checked={form.maintenance_required} onChange={setBool("maintenance_required")} style={{ accentColor: "var(--c-accent)" }} />
                  <span style={{ fontWeight: 600 }}>Maintenance Required</span>
                </label>
                {form.maintenance_required && <>
                  <div>
                    <Label>Frequency</Label>
                    <select value={form.maintenance_frequency} onChange={set("maintenance_frequency")} style={inp}>
                      <option value="">Select…</option>
                      {maintenanceFreqs.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <Row2>
                    <div><Label>Last Maintenance</Label><input type="date" value={form.last_maintenance_date} onChange={set("last_maintenance_date")} style={inp} /></div>
                    <div><Label>Next Maintenance</Label><input type="date" value={form.next_maintenance_date} onChange={set("next_maintenance_date")} style={inp} /></div>
                  </Row2>
                </>}
              </Card>

            </div>
          </div>
        </form>
      </div>
    </AssetLayout>
  );
}
