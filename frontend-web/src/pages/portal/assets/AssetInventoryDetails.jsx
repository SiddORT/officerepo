import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { portalAssetApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import AssetLayout from "./AssetLayout";

const STATUS_COLORS = {
  "Available":         { bg: "rgba(34,197,94,0.12)",  color: "#22c55e" },
  "Assigned":          { bg: "rgba(59,130,246,0.12)", color: "#3b82f6" },
  "Draft":             { bg: "rgba(148,163,184,0.15)",color: "#94a3b8" },
  "Under Maintenance": { bg: "rgba(245,158,11,0.12)", color: "#f59e0b" },
  "Lost":              { bg: "rgba(239,68,68,0.12)",  color: "#ef4444" },
  "Damaged":           { bg: "rgba(239,68,68,0.12)",  color: "#ef4444" },
  "Retired":           { bg: "rgba(148,163,184,0.15)",color: "#94a3b8" },
  "Disposed":          { bg: "rgba(148,163,184,0.15)",color: "#94a3b8" },
};

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || { bg: "rgba(148,163,184,0.15)", color: "#94a3b8" };
  return <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: c.bg, color: c.color }}>{status}</span>;
}

function Field({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: value ? "var(--c-text)" : "var(--c-muted)" }}>{value || "—"}</div>
    </div>
  );
}

function InfoCard({ title, children }) {
  return (
    <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid var(--c-border)" }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>{children}</div>
    </div>
  );
}

function DaysChip({ days, label }) {
  if (days === null || days === undefined) return null;
  const color = days < 0 ? "#ef4444" : days <= 30 ? "#f59e0b" : "#22c55e";
  const text = days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days}d remaining`;
  return <span style={{ fontSize: 11, fontWeight: 600, color, background: `${color}18`, padding: "2px 8px", borderRadius: 999, marginLeft: 6 }}>{text}</span>;
}

function QRCode({ value }) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(value)}&size=160x160&margin=8`;
  return (
    <div style={{ textAlign: "center", padding: 16 }}>
      <img src={url} alt="QR Code" style={{ width: 160, height: 160, borderRadius: 8, border: "1px solid var(--c-border)" }} />
      <div style={{ fontSize: 10, color: "var(--c-muted)", marginTop: 6, fontFamily: "monospace", wordBreak: "break-all" }}>
        {value}
      </div>
      <a href={url} download="qrcode.png"
        style={{ display: "inline-block", marginTop: 8, fontSize: 11, color: "var(--c-accent)", textDecoration: "none", fontWeight: 600 }}>
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

  const inp = { padding: "7px 10px", background: "var(--c-bg,var(--c-surface))", border: "1px solid var(--c-border)", borderRadius: 6, fontSize: 13, color: "var(--c-text)", width: "100%", boxSizing: "border-box" };
  const modalBg = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" };
  const modalBox = { background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 12, padding: 28, width: 440, maxWidth: "90vw", display: "flex", flexDirection: "column", gap: 14 };

  if (loading) return <AssetLayout title="Asset"><div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)" }}>Loading…</div></AssetLayout>;
  if (!asset) return <AssetLayout title="Asset"><div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)" }}>Asset not found.</div></AssetLayout>;

  const qrUrl = `${window.location.origin}/portal/${subdomain}/assets/qr/${asset.asset_uuid}`;

  return (
    <AssetLayout title={asset.asset_name}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <button onClick={() => navigate(`/portal/${subdomain}/assets/inventory`)}
            style={{ background: "none", border: "none", color: "var(--c-muted)", fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 4, display: "block" }}>
            ← Asset Inventory
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--c-text)" }}>{asset.asset_name}</h2>
            <StatusBadge status={asset.status} />
          </div>
          <div style={{ fontSize: 12, color: "var(--c-muted)", marginTop: 2, fontFamily: "monospace", fontWeight: 700 }}>
            {asset.asset_number}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {asset.status === "Available" && (
            <button onClick={() => { setErr(""); setAssignModal(true); }}
              style={{ padding: "7px 14px", borderRadius: 7, fontWeight: 600, fontSize: 12, background: "rgba(59,130,246,0.1)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.3)", cursor: "pointer" }}>
              Assign
            </button>
          )}
          {asset.status === "Assigned" && (
            <button onClick={() => { setErr(""); setReturnModal(true); }}
              style={{ padding: "7px 14px", borderRadius: 7, fontWeight: 600, fontSize: 12, background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)", cursor: "pointer" }}>
              Return
            </button>
          )}
          <button onClick={() => navigate(`/portal/${subdomain}/assets/inventory/${assetId}/edit`)}
            style={{ padding: "7px 14px", borderRadius: 7, fontWeight: 600, fontSize: 12, background: "var(--c-accent)", color: "#fff", border: "none", cursor: "pointer" }}>
            Edit
          </button>
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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
            <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid var(--c-border)" }}>QR Code</div>
              <QRCode value={qrUrl} />
            </div>

            {asset.warranty_available && (
              <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid var(--c-border)" }}>
                  Warranty <DaysChip days={asset.warranty_days_remaining} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px" }}>
                  <Field label="Start Date" value={asset.warranty_start_date} />
                  <Field label="End Date" value={asset.warranty_end_date} />
                  <Field label="Provider" value={asset.warranty_provider} />
                  <Field label="Reference #" value={asset.warranty_reference_number} />
                </div>
              </div>
            )}

            {asset.amc_applicable && (
              <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid var(--c-border)" }}>
                  AMC <DaysChip days={asset.amc_days_remaining} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px" }}>
                  <Field label="Start Date" value={asset.amc_start_date} />
                  <Field label="End Date" value={asset.amc_end_date} />
                  <Field label="Vendor" value={asset.amc_vendor} />
                  <Field label="Cost" value={asset.amc_cost != null ? `${Number(asset.amc_cost).toLocaleString()}` : null} />
                </div>
              </div>
            )}

            {asset.insurance_available && (
              <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid var(--c-border)" }}>
                  Insurance <DaysChip days={asset.insurance_days_remaining} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px" }}>
                  <Field label="Provider" value={asset.insurance_provider} />
                  <Field label="Policy #" value={asset.policy_number} />
                  <Field label="Coverage" value={asset.coverage_amount != null ? Number(asset.coverage_amount).toLocaleString() : null} />
                  <Field label="Start Date" value={asset.insurance_start_date} />
                  <Field label="End Date" value={asset.insurance_end_date} />
                </div>
              </div>
            )}

            {asset.maintenance_required && (
              <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid var(--c-border)" }}>Maintenance</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px" }}>
                  <Field label="Frequency" value={asset.maintenance_frequency} />
                  <Field label="Last Date" value={asset.last_maintenance_date} />
                  <Field label="Next Date" value={asset.next_maintenance_date} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assignment History Tab */}
      {tab === "Assignment History" && (
        <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, overflow: "hidden" }}>
          {(asset.assignments || []).length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)" }}>No assignment history.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--c-surface-alt,var(--c-surface))" }}>
                  {["Employee", "Assigned", "Expected Return", "Returned", "Condition", "Status"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", fontSize: 10, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", textAlign: "left", borderBottom: "2px solid var(--c-border)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(asset.assignments || []).map(a => (
                  <tr key={a.id}>
                    {[a.employee_name || "—", a.assigned_date || "—", a.expected_return_date || "—",
                      a.actual_return_date || "—", a.condition_on_return || "—",
                    ].map((v, i) => (
                      <td key={i} style={{ padding: "10px 14px", fontSize: 12, color: "var(--c-text)", borderBottom: "1px solid var(--c-border)" }}>{v}</td>
                    ))}
                    <td style={{ padding: "10px 14px", borderBottom: "1px solid var(--c-border)" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: a.status === "Active" ? "rgba(59,130,246,0.12)" : "rgba(148,163,184,0.15)", color: a.status === "Active" ? "#3b82f6" : "#94a3b8" }}>
                        {a.status}
                      </span>
                    </td>
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
            ? <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10 }}>No documents uploaded.</div>
            : (asset.documents || []).map(d => (
              <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>{d.original_filename || "—"}</div>
                  <div style={{ fontSize: 11, color: "var(--c-muted)" }}>{d.document_type} · {d.uploaded_by} · {d.uploaded_at?.split("T")[0]}</div>
                  {d.remarks && <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 2 }}>{d.remarks}</div>}
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
            ? <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10 }}>No activities recorded.</div>
            : activities.map(a => (
              <div key={a.id} style={{ display: "flex", gap: 12, padding: "12px 16px", background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(0,174,236,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14 }}>📋</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>{a.description}</div>
                  <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 2 }}>
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
        <div style={modalBg} onClick={e => e.target === e.currentTarget && setAssignModal(false)}>
          <div style={modalBox}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--c-text)" }}>Assign Asset</div>
            {err && <div style={{ color: "#f87171", fontSize: 12 }}>{err}</div>}
            <div><label style={{ fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase" }}>Employee Name</label>
              <input value={assignForm.employee_name} onChange={e => setAssignForm(f => ({ ...f, employee_name: e.target.value }))} style={{ ...inp, marginTop: 4 }} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={{ fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase" }}>Assigned Date</label>
                <input type="date" value={assignForm.assigned_date} onChange={e => setAssignForm(f => ({ ...f, assigned_date: e.target.value }))} style={{ ...inp, marginTop: 4 }} /></div>
              <div><label style={{ fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase" }}>Expected Return</label>
                <input type="date" value={assignForm.expected_return_date} onChange={e => setAssignForm(f => ({ ...f, expected_return_date: e.target.value }))} style={{ ...inp, marginTop: 4 }} /></div>
            </div>
            <div><label style={{ fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase" }}>Notes</label>
              <textarea value={assignForm.assignment_notes} onChange={e => setAssignForm(f => ({ ...f, assignment_notes: e.target.value }))} rows={2} style={{ ...inp, marginTop: 4, resize: "vertical" }} /></div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button onClick={doAssign} disabled={saving} style={{ flex: 1, padding: "9px 0", borderRadius: 7, fontWeight: 600, fontSize: 13, background: "var(--c-accent)", color: "#fff", border: "none", cursor: "pointer" }}>
                {saving ? "Assigning…" : "Assign"}
              </button>
              <button onClick={() => setAssignModal(false)} style={{ flex: 1, padding: "9px 0", borderRadius: 7, fontWeight: 500, fontSize: 13, background: "transparent", border: "1px solid var(--c-border)", color: "var(--c-text2,var(--c-muted))", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {returnModal && (
        <div style={modalBg} onClick={e => e.target === e.currentTarget && setReturnModal(false)}>
          <div style={modalBox}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--c-text)" }}>Return Asset</div>
            {err && <div style={{ color: "#f87171", fontSize: 12 }}>{err}</div>}
            <div><label style={{ fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase" }}>Return Date</label>
              <input type="date" value={returnForm.return_date} onChange={e => setReturnForm(f => ({ ...f, return_date: e.target.value }))} style={{ ...inp, marginTop: 4 }} /></div>
            <div><label style={{ fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase" }}>Condition</label>
              <select value={returnForm.condition_on_return} onChange={e => setReturnForm(f => ({ ...f, condition_on_return: e.target.value }))} style={{ ...inp, marginTop: 4 }}>
                {["Good", "Damaged", "Lost"].map(c => <option key={c} value={c}>{c}</option>)}
              </select></div>
            <div><label style={{ fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase" }}>Notes</label>
              <textarea value={returnForm.return_notes} onChange={e => setReturnForm(f => ({ ...f, return_notes: e.target.value }))} rows={2} style={{ ...inp, marginTop: 4, resize: "vertical" }} /></div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button onClick={doReturn} disabled={saving} style={{ flex: 1, padding: "9px 0", borderRadius: 7, fontWeight: 600, fontSize: 13, background: "#22c55e", color: "#fff", border: "none", cursor: "pointer" }}>
                {saving ? "Processing…" : "Confirm Return"}
              </button>
              <button onClick={() => setReturnModal(false)} style={{ flex: 1, padding: "9px 0", borderRadius: 7, fontWeight: 500, fontSize: 13, background: "transparent", border: "1px solid var(--c-border)", color: "var(--c-text2,var(--c-muted))", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AssetLayout>
  );
}
