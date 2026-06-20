import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { portalEmpDocApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PortalLayout from "../PortalLayout";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";

function Field({ label, value }) {
  return (
    <div>
      <div className="portal-form-label" style={{ marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13 }} className={value ? "t-body" : "t-muted"}>{value || "—"}</div>
    </div>
  );
}

const TABS = ["Overview", "Versions", "Activities"];

export default function EmployeeDocDetails() {
  const { subdomain, docId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();

  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Overview");
  const [versions, setVersions] = useState([]);
  const [activities, setActivities] = useState([]);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showReplace, setShowReplace] = useState(false);
  const [replaceFile, setReplaceFile] = useState(null);
  const [replaceNotes, setReplaceNotes] = useState("");
  const [acting, setActing] = useState(false);
  const [actError, setActError] = useState("");

  const load = () => {
    portalEmpDocApi.get(subdomain, token, docId).then(r => setDoc(r.data?.data || null)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (tab === "Versions") portalEmpDocApi.listVersions(subdomain, token, docId).then(r => setVersions(r.data?.data?.items || [])).catch(() => {});
    if (tab === "Activities") portalEmpDocApi.listActivities(subdomain, token, docId).then(r => setActivities(r.data?.data?.items || [])).catch(() => {});
  }, [tab]);

  const doAction = async (fn) => {
    setActing(true); setActError("");
    try { await fn(); load(); } catch (e) { setActError(e.response?.data?.message || "Action failed."); } finally { setActing(false); }
  };

  const downloadFile = async (version = null) => {
    const url = portalEmpDocApi.downloadUrl(subdomain, docId, version);
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!resp.ok) return;
    const blob = await resp.blob();
    const cd = resp.headers.get("content-disposition") || "";
    const fn = cd.match(/filename="?([^"]+)"?/)?.[1] || doc?.file_name || "document";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fn;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const doReplace = async () => {
    if (!replaceFile) { setActError("Please select a file."); return; }
    setActing(true); setActError("");
    try {
      const fd = new FormData();
      fd.append("file", replaceFile);
      if (replaceNotes) fd.append("change_notes", replaceNotes);
      await portalEmpDocApi.replace(subdomain, token, docId, fd);
      setShowReplace(false); setReplaceFile(null); setReplaceNotes("");
      load();
    } catch (e) { setActError(e.response?.data?.message || "Replace failed."); } finally { setActing(false); }
  };

  const doDelete = async () => {
    if (!window.confirm("Delete this document? This cannot be undone.")) return;
    await doAction(() => portalEmpDocApi.remove(subdomain, token, docId));
    navigate(`/portal/${subdomain}/employee-documents`);
  };

  if (loading) return <PortalLayout title="Document"><p className="t-muted" style={{ padding: 32 }}>Loading…</p></PortalLayout>;
  if (!doc) return <PortalLayout title="Document"><p className="t-muted" style={{ padding: 32 }}>Document not found.</p></PortalLayout>;

  const canSubmit = doc.status === "Uploaded" || doc.status === "Rejected";
  const canVerify = doc.status === "Under Review";

  return (
    <PortalLayout title="Document Details">
      <PageHeader
        title={doc.document_type_name}
        subtitle={`${doc.employee_name}${doc.employee_code ? ` · ${doc.employee_code}` : ""}`}
        breadcrumbs={[
          { label: "Employee Documents", path: `/portal/${subdomain}/employee-documents` },
          { label: "Details" }
        ]}
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {doc.has_file && (
              <button onClick={() => downloadFile()} className="btn-secondary">⬇ Download</button>
            )}
            <button onClick={() => navigate(`/portal/${subdomain}/employee-documents/${docId}/edit`)} className="btn-secondary">Edit</button>
            <button onClick={() => setShowReplace(true)} className="btn-secondary">Replace File</button>
            {canSubmit && <button disabled={acting} onClick={() => doAction(() => portalEmpDocApi.submit(subdomain, token, docId))} className="btn-primary">Submit for Review</button>}
            {canVerify && <button disabled={acting} onClick={() => doAction(() => portalEmpDocApi.verify(subdomain, token, docId, {}))} className="btn-primary" style={{backgroundColor:"#22c55e",backgroundImage:"none"}}>✓ Verify</button>}
            {canVerify && <button disabled={acting} onClick={() => setShowReject(true)} className="btn-danger">✗ Reject</button>}
            <button onClick={doDelete} className="btn-danger" style={{backgroundColor:"transparent",border:"1px solid #ef4444",color:"#ef4444"}}>Delete</button>
          </div>
        }
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <Badge status={doc.status} />
        {doc.version_number > 0 && <span className="t-muted" style={{ fontSize: 11 }}>v{doc.version_number}</span>}
        {doc.category && <Badge status="neutral" label={doc.category} />}
      </div>

      {actError && <div style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{actError}</div>}

      {doc.status === "Rejected" && doc.rejection_reason && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#ef4444" }}>
          <strong>Rejection reason:</strong> {doc.rejection_reason}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--c-border)", marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "8px 18px", border: "none", borderBottom: `2px solid ${tab === t ? "var(--c-accent)" : "transparent"}`, background: "none", color: tab === t ? "var(--c-accent)" : "var(--c-muted)", fontWeight: tab === t ? 700 : 400, fontSize: 13, cursor: "pointer" }}>{t}</button>
        ))}
      </div>

      {tab === "Overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
          <div className="portal-form-card">
            <div className="portal-form-title">Document Details</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Field label="Document Number" value={doc.document_number} />
              <Field label="Issuing Authority" value={doc.issuing_authority} />
              <Field label="Issue Date" value={doc.issue_date} />
              <Field label="Expiry Date" value={doc.expiry_date
                ? `${doc.expiry_date}${doc.days_remaining != null ? ` (${doc.days_remaining < 0 ? Math.abs(doc.days_remaining) + "d overdue" : doc.days_remaining + "d left"})` : ""}`
                : null} />
              <Field label="Remarks" value={doc.remarks} />
            </div>
          </div>
          <div className="portal-form-card">
            <div className="portal-form-title">File Information</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Field label="File Name" value={doc.file_name} />
              <Field label="File Type" value={doc.file_type?.toUpperCase()} />
              <Field label="File Size" value={doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : null} />
              <Field label="Version" value={doc.version_number > 0 ? `v${doc.version_number}` : null} />
            </div>
          </div>
          {(doc.status === "Verified" || doc.verified_by_name) && (
            <div className="portal-form-card">
              <div className="portal-form-title">Verification</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Field label="Verified By" value={doc.verified_by_name} />
                <Field label="Verified At" value={doc.verified_at ? new Date(doc.verified_at).toLocaleString() : null} />
              </div>
            </div>
          )}
          <div className="portal-form-card">
            <div className="portal-form-title">Meta</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Field label="Created By" value={doc.created_by} />
              <Field label="Created At" value={doc.created_at ? new Date(doc.created_at).toLocaleString() : null} />
              <Field label="Updated At" value={doc.updated_at ? new Date(doc.updated_at).toLocaleString() : null} />
            </div>
          </div>
        </div>
      )}

      {tab === "Versions" && (
        <div className="portal-table-wrap">
          {versions.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--c-muted)", padding: 32, margin: 0 }}>No versions recorded.</p>
          ) : (
            <table className="portal-table">
              <thead><tr>
                <th>Version</th><th>File Name</th>
                <th>Type</th><th>Size</th>
                <th>Change Notes</th><th>Uploaded By</th>
                <th>Uploaded At</th><th style={{ textAlign: "right" }}>Actions</th>
              </tr></thead>
              <tbody>{versions.map(v => (
                <tr key={v.id}>
                  <td style={{ fontWeight: 700 }} className="t-accent">v{v.version_number}</td>
                  <td style={{ fontSize: 12 }}>{v.file_name}</td>
                  <td style={{ fontSize: 12 }}>{v.file_type?.toUpperCase()}</td>
                  <td style={{ fontSize: 12 }}>{v.file_size ? `${(v.file_size / 1024).toFixed(1)} KB` : "—"}</td>
                  <td style={{ fontSize: 12 }} className="t-muted">{v.change_notes || "—"}</td>
                  <td style={{ fontSize: 12 }}>{v.uploaded_by}</td>
                  <td style={{ fontSize: 12 }}>{v.uploaded_at ? new Date(v.uploaded_at).toLocaleString() : "—"}</td>
                  <td style={{ textAlign: "right" }}>
                    <button onClick={() => downloadFile(v.version_number)} className="t-accent" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>⬇ Download</button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      )}

      {tab === "Activities" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {activities.length === 0 ? (
            <p className="t-muted" style={{ fontSize: 13 }}>No activities recorded.</p>
          ) : activities.map(a => (
            <div key={a.id} className="card" style={{ padding: "12px 16px", display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(99,102,241,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>📋</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{a.action}</div>
                {a.actor && <div style={{ fontSize: 12 }} className="t-muted">by {a.actor}</div>}
                {a.notes && <div style={{ fontSize: 12, marginTop: 4 }}>{a.notes}</div>}
              </div>
              <div style={{ fontSize: 11, whiteSpace: "nowrap" }} className="t-muted">{a.created_at ? new Date(a.created_at).toLocaleString() : ""}</div>
            </div>
          ))}
        </div>
      )}

      {showReject && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="portal-form-card" style={{ width: 440, maxWidth: "95vw" }}>
            <h3 style={{ margin: 0 }} className="portal-form-title">Reject Document</h3>
            <label className="portal-form-label">Rejection Reason *</label>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder="Explain why the document is being rejected…" className="input-field" style={{ resize: "vertical" }} />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowReject(false)} className="btn-secondary">Cancel</button>
              <button disabled={acting || !rejectReason.trim()} onClick={() => doAction(() => portalEmpDocApi.reject(subdomain, token, docId, { rejection_reason: rejectReason })).then(() => setShowReject(false))} className="btn-danger">Reject</button>
            </div>
          </div>
        </div>
      )}

      {showReplace && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="portal-form-card" style={{ width: 440, maxWidth: "95vw" }}>
            <h3 style={{ margin: 0 }} className="portal-form-title">Replace File (New Version)</h3>
            {actError && <div style={{ color: "#ef4444", fontSize: 12 }}>{actError}</div>}
            <div style={{ border: "2px dashed var(--c-border)", borderRadius: 8, padding: 20, textAlign: "center", cursor: "pointer" }} onClick={() => document.getElementById("replace-file-input")?.click()}>
              <input id="replace-file-input" type="file" accept=".pdf,.jpg,.jpeg,.png,.docx" style={{ display: "none" }} onChange={e => setReplaceFile(e.target.files[0])} />
              {replaceFile ? <div><div style={{ fontWeight: 600, fontSize: 13 }}>{replaceFile.name}</div><div style={{ fontSize: 11 }} className="t-muted">{(replaceFile.size / 1024).toFixed(1)} KB</div></div>
                : <div className="t-muted" style={{ fontSize: 13 }}>Click to select file (PDF, JPG, PNG, DOCX)</div>}
            </div>
            <label className="portal-form-label">Change Notes</label>
            <input value={replaceNotes} onChange={e => setReplaceNotes(e.target.value)} placeholder="What changed in this version?" className="input-field" />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowReplace(false); setReplaceFile(null); setReplaceNotes(""); }} className="btn-secondary">Cancel</button>
              <button disabled={acting || !replaceFile} onClick={doReplace} className="btn-primary">Upload New Version</button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
