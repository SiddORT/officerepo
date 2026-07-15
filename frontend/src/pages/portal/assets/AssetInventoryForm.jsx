import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalAssetApi, portalOrgApi, portalEmployeeApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import AssetLayout from "./AssetLayout";
import PageHeader from "../shared/PageHeader";

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
        <PageHeader
          title={editMode ? "Edit Asset" : "Add Asset to Inventory"}
          breadcrumbs={[
            { label: editMode ? "Back to Asset" : "Asset Inventory", path: editMode ? `/portal/${subdomain}/assets/inventory/${assetId}` : `/portal/${subdomain}/assets/inventory` }
          ]}
          actions={
            <>
              <button type="button" onClick={back} className="btn-secondary">
                Cancel
              </button>
              <button form="inv-form" type="submit" disabled={saving} className="btn-primary">
                {saving ? "Saving…" : editMode ? "Save Changes" : "Create Asset"}
              </button>
            </>
          }
        />

        {error && <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 13, marginBottom: 16 }}>{error}</div>}

        <form id="inv-form" onSubmit={submit}>
          <div className="form-grid-2" style={{ alignItems: "start" }}>

            {/* LEFT */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              <div className="portal-form-card">
                <div className="portal-form-title">Basic Information</div>
                <div><label className="portal-form-label portal-form-label-req">Asset Name</label><input value={form.asset_name} onChange={set("asset_name")} className="input-field" placeholder="Dell Latitude 5440" /></div>
                <div className="portal-form-row">
                  <div>
                    <label className="portal-form-label portal-form-label-req">Category</label>
                    <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value, category_name: categories.find(c => c.id === e.target.value)?.category_name || "", sub_category_id: "", sub_category_name: "" }))} className="input-field">
                      <option value="">Select category…</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ""}{c.category_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="portal-form-label">Sub-Category</label>
                    <select value={form.sub_category_id} onChange={e => setForm(f => ({ ...f, sub_category_id: e.target.value, sub_category_name: filteredSCs.find(s => s.id === e.target.value)?.sub_category_name || "" }))} className="input-field">
                      <option value="">Select sub-category…</option>
                      {filteredSCs.map(s => <option key={s.id} value={s.id}>{s.sub_category_name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="portal-form-row">
                  <div>
                    <label className="portal-form-label">Status</label>
                    <select value={form.status} onChange={set("status")} className="input-field">
                      {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label className="portal-form-label">Work Location</label>
                    <select value={form.work_location_type} onChange={set("work_location_type")} className="input-field">
                      <option value="">Select…</option>
                      {workLocations.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="portal-form-card">
                <div className="portal-form-title">Asset Details</div>
                <div className="portal-form-row">
                  <div><label className="portal-form-label">Brand</label><input value={form.brand} onChange={set("brand")} className="input-field" placeholder="Dell" /></div>
                  <div><label className="portal-form-label">Manufacturer</label><input value={form.manufacturer} onChange={set("manufacturer")} className="input-field" placeholder="Dell Technologies" /></div>
                </div>
                <div className="portal-form-row">
                  <div><label className="portal-form-label">Model Number</label><input value={form.model_number} onChange={set("model_number")} className="input-field" placeholder="Latitude 5440" /></div>
                  <div><label className="portal-form-label">Part Number</label><input value={form.part_number} onChange={set("part_number")} className="input-field" placeholder="5440-PART-001" /></div>
                </div>
                <div className="portal-form-row">
                  <div><label className="portal-form-label">Serial Number</label><input value={form.serial_number} onChange={set("serial_number")} className="input-field" placeholder="SN123456789" /></div>
                  <div><label className="portal-form-label">Barcode Number</label><input value={form.barcode_number} onChange={set("barcode_number")} className="input-field" placeholder="BC-00001" /></div>
                </div>
              </div>

              <div className="portal-form-card">
                <div className="portal-form-title">Organization Mapping</div>
                <div className="portal-form-row">
                  <div>
                    <label className="portal-form-label">Company</label>
                    <select value={form.company_id} onChange={e => setForm(f => ({ ...f, company_id: e.target.value, company_name: companies.find(c => c.id === e.target.value)?.company_name || "", branch_id: "", branch_name: "" }))} className="input-field">
                      <option value="">Select company…</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="portal-form-label">Branch</label>
                    <select value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value, branch_name: filteredBranches.find(b => b.id === e.target.value)?.branch_name || "" }))} className="input-field">
                      <option value="">Select branch…</option>
                      {filteredBranches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="portal-form-label">Department</label>
                  <select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value, department_name: departments.find(d => d.id === e.target.value)?.department_name || "" }))} className="input-field">
                    <option value="">Select department…</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
                  </select>
                </div>
              </div>

              <div className="portal-form-card">
                <div className="portal-form-title">Purchase Information</div>
                <div className="portal-form-row">
                  <div><label className="portal-form-label">Purchase Date</label><input type="date" value={form.purchase_date} onChange={set("purchase_date")} className="input-field" /></div>
                  <div>
                    <label className="portal-form-label">Currency</label>
                    <select value={form.currency} onChange={set("currency")} className="input-field">
                      {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="portal-form-row">
                  <div><label className="portal-form-label">Purchase Cost</label><input type="number" value={form.purchase_cost} onChange={set("purchase_cost")} className="input-field" min={0} placeholder="0.00" /></div>
                  <div><label className="portal-form-label">Vendor Name</label><input value={form.vendor_name} onChange={set("vendor_name")} className="input-field" placeholder="Vendor Co." /></div>
                </div>
                <div className="portal-form-row">
                  <div><label className="portal-form-label">Invoice Number</label><input value={form.invoice_number} onChange={set("invoice_number")} className="input-field" /></div>
                  <div><label className="portal-form-label">PO Number</label><input value={form.purchase_order_number} onChange={set("purchase_order_number")} className="input-field" /></div>
                </div>
                <div><label className="portal-form-label">Vendor Contact</label><input value={form.vendor_contact} onChange={set("vendor_contact")} className="input-field" /></div>
              </div>
            </div>

            {/* RIGHT */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              <div className="portal-form-card">
                <div className="portal-form-title">Warranty Information</div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                  <input type="checkbox" checked={form.warranty_available} onChange={setBool("warranty_available")} style={{ accentColor: "var(--c-accent)" }} />
                  <span style={{ fontWeight: 600 }}>Warranty Available</span>
                </label>
                {form.warranty_available && <>
                  <div className="portal-form-row">
                    <div><label className="portal-form-label">Start Date</label><input type="date" value={form.warranty_start_date} onChange={set("warranty_start_date")} className="input-field" /></div>
                    <div><label className="portal-form-label">End Date</label><input type="date" value={form.warranty_end_date} onChange={set("warranty_end_date")} className="input-field" /></div>
                  </div>
                  <div className="portal-form-row">
                    <div><label className="portal-form-label">Provider</label><input value={form.warranty_provider} onChange={set("warranty_provider")} className="input-field" /></div>
                    <div><label className="portal-form-label">Reference #</label><input value={form.warranty_reference_number} onChange={set("warranty_reference_number")} className="input-field" /></div>
                  </div>
                </>}
              </div>

              <div className="portal-form-card">
                <div className="portal-form-title">AMC Information</div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                  <input type="checkbox" checked={form.amc_applicable} onChange={setBool("amc_applicable")} style={{ accentColor: "var(--c-accent)" }} />
                  <span style={{ fontWeight: 600 }}>AMC Applicable</span>
                </label>
                {form.amc_applicable && <>
                  <div className="portal-form-row">
                    <div><label className="portal-form-label">Start Date</label><input type="date" value={form.amc_start_date} onChange={set("amc_start_date")} className="input-field" /></div>
                    <div><label className="portal-form-label">End Date</label><input type="date" value={form.amc_end_date} onChange={set("amc_end_date")} className="input-field" /></div>
                  </div>
                  <div className="portal-form-row">
                    <div><label className="portal-form-label">Vendor</label><input value={form.amc_vendor} onChange={set("amc_vendor")} className="input-field" /></div>
                    <div><label className="portal-form-label">Cost</label><input type="number" value={form.amc_cost} onChange={set("amc_cost")} className="input-field" min={0} /></div>
                  </div>
                </>}
              </div>

              <div className="portal-form-card">
                <div className="portal-form-title">Insurance Information</div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                  <input type="checkbox" checked={form.insurance_available} onChange={setBool("insurance_available")} style={{ accentColor: "var(--c-accent)" }} />
                  <span style={{ fontWeight: 600 }}>Insurance Available</span>
                </label>
                {form.insurance_available && <>
                  <div className="portal-form-row">
                    <div><label className="portal-form-label">Provider</label><input value={form.insurance_provider} onChange={set("insurance_provider")} className="input-field" /></div>
                    <div><label className="portal-form-label">Policy Number</label><input value={form.policy_number} onChange={set("policy_number")} className="input-field" /></div>
                  </div>
                  <div className="portal-form-row">
                    <div><label className="portal-form-label">Coverage Amount</label><input type="number" value={form.coverage_amount} onChange={set("coverage_amount")} className="input-field" min={0} /></div>
                    <div />
                  </div>
                  <div className="portal-form-row">
                    <div><label className="portal-form-label">Start Date</label><input type="date" value={form.insurance_start_date} onChange={set("insurance_start_date")} className="input-field" /></div>
                    <div><label className="portal-form-label">End Date</label><input type="date" value={form.insurance_end_date} onChange={set("insurance_end_date")} className="input-field" /></div>
                  </div>
                </>}
              </div>

              <div className="portal-form-card">
                <div className="portal-form-title">Maintenance Information</div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                  <input type="checkbox" checked={form.maintenance_required} onChange={setBool("maintenance_required")} style={{ accentColor: "var(--c-accent)" }} />
                  <span style={{ fontWeight: 600 }}>Maintenance Required</span>
                </label>
                {form.maintenance_required && <>
                  <div>
                    <label className="portal-form-label">Frequency</label>
                    <select value={form.maintenance_frequency} onChange={set("maintenance_frequency")} className="input-field">
                      <option value="">Select…</option>
                      {maintenanceFreqs.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div className="portal-form-row">
                    <div><label className="portal-form-label">Last Maintenance</label><input type="date" value={form.last_maintenance_date} onChange={set("last_maintenance_date")} className="input-field" /></div>
                    <div><label className="portal-form-label">Next Maintenance</label><input type="date" value={form.next_maintenance_date} onChange={set("next_maintenance_date")} className="input-field" /></div>
                  </div>
                </>}
              </div>

            </div>
          </div>
        </form>
      </div>
    </AssetLayout>
  );
}
