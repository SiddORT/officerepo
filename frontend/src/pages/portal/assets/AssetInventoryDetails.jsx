import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { portalAssetApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import AssetLayout from "./AssetLayout";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";

function Field({ label, value }) {
  return (
    <div>
      <div className="portal-form-label">{label}</div>
      <div style={{ fontSize: 13 }} className={value ? "t-body" : "t-muted"}>{value || "—"}</div>
    </div>
  );
}

function InfoCard({ title, children, extra }) {
  return (
    <div className="portal-form-card">
      <div className="portal-form-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{title}</span>
        {extra}
      </div>
      <div className="portal-form-row">{children}</div>
    </div>
  );
}

function DaysChip({ days }) {
  if (days === null || days === undefined) return null;
  const cls = days < 0 ? "badge-danger" : days <= 30 ? "badge-warning" : "badge-active";
  const text = days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days}d remaining`;
  return <span className={cls} style={{ marginLeft: 6 }}>{text}</span>;
}

function QRCode({ value }) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(value)}&size=160x160&margin=8`;
  return (
    <div style={{ textAlign: "center", padding: 16 }}>
      <img src={url} alt="QR Code" style={{ width: 160, height: 160, borderRadius: 8, border: "1px solid var(--c-border)" }} />
      <div style={{ fontSize: 10, marginTop: 6, fontFamily: "monospace", wordBreak: "break-all" }} className="t-muted">
        {value}
      </div>
      <a href={url} download="qrcode.png" className="t-accent"
        style={{ display: "inline-block", marginTop: 8, fontSize: 11, textDecoration: "none", fontWeight: 600 }}>
        ↓ Download QR
      </a>
    </div>
  );
}

const TABS = ["Overview", "Assignment History", "Documents", "Activities"];

export default function AssetInventoryDetails() {
  const { subdomain, assetId } = useParams();
  const navigate = useNavigate();
  const { token } = usePortalAuth();

  const [asset, setAsset] = useState(null);
  const [activities, setActivities] = useState([]);
  const [tab, setTab] = useState("Overview");
  const [loading, setLoading] = useState(true);
  const [docTypes, setDocTypes] = useState([]);
  const [assignModal, setAssignModal] = useState(false);
  const [returnModal, setReturnModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ employee_name: "", assigned_date: "", expected_return_date: "", assignment_notes: "" });
  const [returnForm, setReturnForm] = useState({ return_date: "", condition_on_return: "Good", return_notes: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      portalAssetApi.getInventoryItem(subdomain, token, assetId),
      portalAssetApi.listInventoryActivities(subdomain, token, assetId),
      portalAssetApi.inventoryMeta(subdomain, token),
    ]).then(([ar, acr, mr]) => {
      setAsset(ar.data?.data || null);
      setActivities(acr.data?.data || []);
      setDocTypes(mr.data?.data?.document_types || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [subdomain, token, assetId]);

  useEffect(() => { load(); }, [load]);

  const doAssign = async () => {
    setSaving(true); setErr("");
    try {
      await portalAssetApi.assignAsset(subdomain, token, assetId, assignForm);
      setAssignModal(false); load();
    } catch (e) { setErr(e.response?.data?.detail || "Failed to assign."); }
    finally { setSaving(false); }
  };

  const doReturn = async () => {
    setSaving(true); setErr("");
    try {
      await portalAssetApi.returnAsset(subdomain, token, assetId, returnForm);
      setReturnModal(false); load();
    } catch (e) { setErr(e.response?.data?.detail || "Failed to return."); }
    finally { setSaving(false); }
  };

  if (loading) return <AssetLayout title="Asset"><div style={{ padding: 40, textAlign: "center" }} className="t-muted">Loading…</div></AssetLayout>;
  if (!asset) return <AssetLayout title="Asset"><div style={{ padding: 40, textAlign: "center" }} className="t-muted">Asset not found.</div></AssetLayout>;

  const qrUrl = `${window.location.origin}/portal/${subdomain}/assets/qr/${asset.asset_uuid}`;

  return (
    <AssetLayout title={asset.asset_name}>
      <PageHeader
        title={asset.asset_name}
        subtitle={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "monospace", fontWeight: 700 }} className="t-muted">{asset.asset_number}</span>
            <Badge status={asset.status} />
          </div>
        }
        breadcrumbs={[
          { label: "Asset Inventory", path: `/portal/${subdomain}/assets/inventory` }
        ]}
        actions={
          <>
            {asset.status === "Available" && (
              <button onClick={() => { setErr(""); setAssignModal(true); }} className="btn-secondary t-accent">
                Assign
              </button>
            )}
            {asset.status === "Assigned" && (
              <button onClick={() => { setErr(""); setReturnModal(true); }} className="btn-secondary" style={{ color: "#22c55e" }}>
                Return
              </button>
            )}
            <button onClick={() => navigate(`/portal/${subdomain}/assets/inventory/${assetId}/edit`)} className="btn-primary">
              Edit
            </button>
          </>
        }
      />

      {/* Header card — status + key meta; stacks to column at ≤640px */}
      <div className="card detail-header-card" style={{ padding: "14px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div className="detail-header-meta" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Badge status={asset.status} />
            {asset.category_name && <span className="t-muted" style={{ fontSize: 12 }}>{asset.category_name}{asset.sub_category_name ? ` › ${asset.sub_category_name}` : ""}</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {asset.brand && (
            <div>
              <div style={{ fontSize: 11, color: "var(--c-muted)" }}>Brand</div>
              <div style={{ fontSize: 13, fontWeight: 600 }} className="t-heading">{asset.brand}</div>
            </div>
          )}
          {asset.status === "Assigned" && asset.assigned_employee_name && (
            <div>
              <div style={{ fontSize: 11, color: "var(--c-muted)" }}>Assigned To</div>
              <div style={{ fontSize: 13, fontWeight: 600 }} className="t-heading">{asset.assigned_employee_name}</div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--c-border)", marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "8px 18px", fontWeight: 600, fontSize: 13, background: "none", border: "none", cursor: "pointer",
              color: tab === t ? "var(--c-accent)" : "var(--c-muted)",
              borderBottom: `2px solid ${tab === t ? "var(--c-accent)" : "transparent"}`, marginBottom: -2 }}>
            {t}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === "Overview" && (
        <div className="form-grid-2">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <InfoCard title="Basic Information">
              <Field label="Asset Number" value={asset.asset_number} />
              <Field label="Category" value={`${asset.category_name || ""}${asset.sub_category_name ? ` › ${asset.sub_category_name}` : ""}`} />
              <Field label="Brand" value={asset.brand} />
              <Field label="Model" value={asset.model_number} />
              <Field label="Serial Number" value={asset.serial_number} />
              <Field label="Part Number" value={asset.part_number} />
              <Field label="Barcode" value={asset.barcode_number} />
              <Field label="Work Location" value={asset.work_location_type} />
            </InfoCard>

            <InfoCard title="Organization">
              <Field label="Company" value={asset.company_name} />
              <Field label="Branch" value={asset.branch_name} />
              <Field label="Department" value={asset.department_name} />
              {asset.status === "Assigned" && <>
                <Field label="Assigned To" value={asset.assigned_employee_name} />
                <Field label="Assigned Date" value={asset.assigned_date} />
                <Field label="Expected Return" value={asset.expected_return_date} />
              </>}
            </InfoCard>

            <InfoCard title="Purchase Information">
              <Field label="Purchase Date" value={asset.purchase_date} />
              <Field label="Cost" value={asset.purchase_cost !== null ? `${asset.currency || ""} ${Number(asset.purchase_cost).toLocaleString()}` : null} />
              <Field label="Vendor" value={asset.vendor_name} />
              <Field label="Invoice #" value={asset.invoice_number} />
              <Field label="PO Number" value={asset.purchase_order_number} />
              <Field label="Vendor Contact" value={asset.vendor_contact} />
            </InfoCard>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* QR Code */}
            <div className="portal-form-card">
              <div className="portal-form-title">QR Code</div>
              <QRCode value={qrUrl} />
            </div>

            {asset.warranty_available && (
              <InfoCard title="Warranty" extra={<DaysChip days={asset.warranty_days_remaining} />}>
                <Field label="Start Date" value={asset.warranty_start_date} />
                <Field label="End Date" value={asset.warranty_end_date} />
                <Field label="Provider" value={asset.warranty_provider} />
                <Field label="Reference #" value={asset.warranty_reference_number} />
              </InfoCard>
            )}

            {asset.amc_applicable && (
              <InfoCard title="AMC" extra={<DaysChip days={asset.amc_days_remaining} />}>
                <Field label="Start Date" value={asset.amc_start_date} />
                <Field label="End Date" value={asset.amc_end_date} />
                <Field label="Vendor" value={asset.amc_vendor} />
                <Field label="Cost" value={asset.amc_cost != null ? `${Number(asset.amc_cost).toLocaleString()}` : null} />
              </InfoCard>
            )}

            {asset.insurance_available && (
              <InfoCard title="Insurance" extra={<DaysChip days={asset.insurance_days_remaining} />}>
                <Field label="Provider" value={asset.insurance_provider} />
                <Field label="Policy #" value={asset.policy_number} />
                <Field label="Coverage" value={asset.coverage_amount != null ? Number(asset.coverage_amount).toLocaleString() : null} />
                <Field label="Start Date" value={asset.insurance_start_date} />
                <Field label="End Date" value={asset.insurance_end_date} />
              </InfoCard>
            )}

            {asset.maintenance_required && (
              <InfoCard title="Maintenance">
                <Field label="Frequency" value={asset.maintenance_frequency} />
                <Field label="Last Date" value={asset.last_maintenance_date} />
                <Field label="Next Date" value={asset.next_maintenance_date} />
              </InfoCard>
            )}
          </div>
        </div>
      )}

      {/* Assignment History Tab */}
      {tab === "Assignment History" && (
        <div className="portal-table-wrap">
          {(asset.assignments || []).length === 0 ? (
            <div style={{ padding: 40, textAlign: "center" }} className="t-muted">No assignment history.</div>
          ) : (
            <table className="portal-table">
              <thead>
                <tr>
                  {["Employee", "Assigned", "Expected Return", "Returned", "Condition", "Status"].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(asset.assignments || []).map(a => (
                  <tr key={a.id}>
                    <td>{a.employee_name || "—"}</td>
                    <td>{a.assigned_date || "—"}</td>
                    <td>{a.expected_return_date || "—"}</td>
                    <td>{a.actual_return_date || "—"}</td>
                    <td>{a.condition_on_return || "—"}</td>
                    <td><Badge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Documents Tab */}
      {tab === "Documents" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(asset.documents || []).length === 0
            ? <div style={{ padding: 40, textAlign: "center" }} className="portal-form-card t-muted">No documents uploaded.</div>
            : (asset.documents || []).map(d => (
              <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }} className="portal-form-card">
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{d.original_filename || "—"}</div>
                  <div style={{ fontSize: 11 }} className="t-muted">{d.document_type} · {d.uploaded_by} · {d.uploaded_at?.split("T")[0]}</div>
                  {d.remarks && <div style={{ fontSize: 11, marginTop: 2 }} className="t-muted">{d.remarks}</div>}
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* Activities Tab */}
      {tab === "Activities" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {activities.length === 0
            ? <div style={{ padding: 40, textAlign: "center" }} className="portal-form-card t-muted">No activities recorded.</div>
            : activities.map(a => (
              <div key={a.id} style={{ display: "flex", gap: 12 }} className="portal-form-card">
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(0,174,236,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14 }}>📋</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{a.description}</div>
                  <div style={{ fontSize: 11, marginTop: 2 }} className="t-muted">
                    {a.actor_name || "System"} · {a.created_at ? new Date(a.created_at).toLocaleString() : ""}
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* Assign Modal */}
      {assignModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={e => e.target === e.currentTarget && setAssignModal(false)}>
          <div className="card" style={{ width: 440, maxWidth: "90vw", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Assign Asset</div>
            {err && <div style={{ color: "#f87171", fontSize: 12 }}>{err}</div>}
            <div>
              <label className="portal-form-label">Employee Name</label>
              <input value={assignForm.employee_name} onChange={e => setAssignForm(f => ({ ...f, employee_name: e.target.value }))} className="input-field" />
            </div>
            <div className="portal-form-row">
              <div>
                <label className="portal-form-label">Assigned Date</label>
                <input type="date" value={assignForm.assigned_date} onChange={e => setAssignForm(f => ({ ...f, assigned_date: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="portal-form-label">Expected Return</label>
                <input type="date" value={assignForm.expected_return_date} onChange={e => setAssignForm(f => ({ ...f, expected_return_date: e.target.value }))} className="input-field" />
              </div>
            </div>
            <div>
              <label className="portal-form-label">Notes</label>
              <textarea value={assignForm.assignment_notes} onChange={e => setAssignForm(f => ({ ...f, assignment_notes: e.target.value }))} rows={2} className="input-field" style={{ resize: "vertical" }} />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button onClick={doAssign} disabled={saving} className="btn-primary" style={{ flex: 1 }}>
                {saving ? "Assigning…" : "Assign"}
              </button>
              <button onClick={() => setAssignModal(false)} className="btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {returnModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={e => e.target === e.currentTarget && setReturnModal(false)}>
          <div className="card" style={{ width: 440, maxWidth: "90vw", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Return Asset</div>
            {err && <div style={{ color: "#f87171", fontSize: 12 }}>{err}</div>}
            <div>
              <label className="portal-form-label">Return Date</label>
              <input type="date" value={returnForm.return_date} onChange={e => setReturnForm(f => ({ ...f, return_date: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="portal-form-label">Condition</label>
              <select value={returnForm.condition_on_return} onChange={e => setReturnForm(f => ({ ...f, condition_on_return: e.target.value }))} className="input-field">
                {["Good", "Damaged", "Lost"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="portal-form-label">Notes</label>
              <textarea value={returnForm.return_notes} onChange={e => setReturnForm(f => ({ ...f, return_notes: e.target.value }))} rows={2} className="input-field" style={{ resize: "vertical" }} />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button onClick={doReturn} disabled={saving} className="btn-primary" style={{ flex: 1, background: "#22c55e" }}>
                {saving ? "Processing…" : "Confirm Return"}
              </button>
              <button onClick={() => setReturnModal(false)} className="btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AssetLayout>
  );
}
