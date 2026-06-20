import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalEmpDocApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PortalLayout from "../PortalLayout";

const cell = { padding: "10px 14px", borderBottom: "1px solid var(--c-border)", fontSize: 13 };
const hdr = { padding: "8px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--c-border)", background: "var(--c-surface-alt,var(--c-surface))" };

const STATUS_COLORS = {
  "Pending Upload": { bg: "rgba(251,191,36,0.12)", color: "#f59e0b" },
  "Uploaded":       { bg: "rgba(99,102,241,0.12)", color: "#818cf8" },
  "Under Review":   { bg: "rgba(59,130,246,0.12)", color: "#60a5fa" },
  "Verified":       { bg: "rgba(34,197,94,0.12)",  color: "#22c55e" },
  "Rejected":       { bg: "rgba(239,68,68,0.12)",  color: "#ef4444" },
  "Expired":        { bg: "rgba(156,163,175,0.12)", color: "#9ca3af" },
};

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || { bg: "rgba(156,163,175,0.12)", color: "#9ca3af" };
  return <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 10, background: s.bg, color: s.color }}>{status}</span>;
}

function Field({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: value ? "var(--c-text)" : "var(--c-muted)" }}>{value || "—"}</div>
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

  const doAction = async (fn, successMsg) => {
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
      if (tab === "Versions") portalEmpDocApi.listVersions(subdomain, token, docId).then(r => setVersions(r.data?.data?.items || []));
    } catch (e) { setActError(e.response?.data?.message || "Replace failed."); } finally { setActing(false); }
  };

  const doDelete = async () => {
    if (!window.confirm("Delete this document? This cannot be undone.")) return;
    await doAction(() => portalEmpDocApi.remove(subdomain, token, docId));
    navigate(`/portal/${subdomain}/employee-documents`);
  };

  if (loading) return <PortalLayout title="Document"><p style={{ color: "var(--c-muted)", padding: 32 }}>Loading…</p></PortalLayout>;
  if (!doc) return <PortalLayout title="Document"><p style={{ color: "var(--c-muted)", padding: 32 }}>Document not found.</p></PortalLayout>;

  const canSubmit = doc.status === "Uploaded" || doc.status === "Rejected";
  const canVerify = doc.status === "Under Review";
  const canReplace = doc.has_file || doc.status === "Pending Upload";

  return (
    <PortalLayout title="Document Details">
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, fontSize: 12, color: "var(--c-muted)" }}>
        <span onClick={() => navigate(`/portal/${subdomain}/employee-documents`)} style={{ cursor: "pointer", color: "var(--c-accent)" }}>Employee Documents</span>
        <span>/</span>
        <span>{doc.document_type_name}</span>
      </div>

      {actError && <div style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{actError}</div>}

      {/* Header Card */}
      <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--c-text)" }}>{doc.document_type_name}</div>
            <div style={{ fontSize: 13, color: "var(--c-muted)", marginTop: 3 }}>{doc.employee_name}{doc.employee_code ? ` · ${doc.employee_code}` : ""}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
              <StatusBadge status={doc.status} />
              {doc.version_number > 0 && <span style={{ fontSize: 11, color: "var(--c-muted)" }}>v{doc.version_number}</span>}
              {doc.category && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "var(--c-surface-alt,rgba(255,255,255,0.05))", color: "var(--c-muted)" }}>{doc.category}</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {doc.has_file && (
              <button onClick={() => downloadFile()} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid var(--c-border)", background: "none", color: "var(--c-text)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>⬇ Download</button>
            )}
            <button onClick={() => navigate(`/portal/${subdomain}/employee-documents/${docId}/edit`)} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid var(--c-border)", background: "none", color: "var(--c-text)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Edit</button>
            <button onClick={() => setShowReplace(true)} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid var(--c-accent)", color: "var(--c-accent)", background: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Replace File</button>
            {canSubmit && <button disabled={acting} onClick={() => doAction(() => portalEmpDocApi.submit(subdomain, token, docId))} style={{ padding: "7px 14px", borderRadius: 7, background: "#60a5fa", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Submit for Review</button>}
            {canVerify && <button disabled={acting} onClick={() => doAction(() => portalEmpDocApi.verify(subdomain, token, docId, {}))} style={{ padding: "7px 14px", borderRadius: 7, background: "#22c55e", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>✓ Verify</button>}
            {canVerify && <button disabled={acting} onClick={() => setShowReject(true)} style={{ padding: "7px 14px", borderRadius: 7, background: "#ef4444", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>✗ Reject</button>}
            <button onClick={doDelete} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid #ef4444", color: "#ef4444", background: "none", cursor: "pointer", fontSize: 12 }}>Delete</button>
          </div>
        </div>
      </div>

      {/* Rejection reason notice */}
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

      {/* Overview Tab */}
      {tab === "Overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
          <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, borderBottom: "1px solid var(--c-border)", paddingBottom: 8 }}>Document Details</div>
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
          <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, borderBottom: "1px solid var(--c-border)", paddingBottom: 8 }}>File Information</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Field label="File Name" value={doc.file_name} />
              <Field label="File Type" value={doc.file_type?.toUpperCase()} />
              <Field label="File Size" value={doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : null} />
              <Field label="Version" value={doc.version_number > 0 ? `v${doc.version_number}` : null} />
            </div>
          </div>
          {(doc.status === "Verified" || doc.verified_by_name) && (
            <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, borderBottom: "1px solid var(--c-border)", paddingBottom: 8 }}>Verification</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Field label="Verified By" value={doc.verified_by_name} />
                <Field label="Verified At" value={doc.verified_at ? new Date(doc.verified_at).toLocaleString() : null} />
              </div>
            </div>
          )}
          <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, borderBottom: "1px solid var(--c-border)", paddingBottom: 8 }}>Meta</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Field label="Created By" value={doc.created_by} />
              <Field label="Created At" value={doc.created_at ? new Date(doc.created_at).toLocaleString() : null} />
              <Field label="Updated At" value={doc.updated_at ? new Date(doc.updated_at).toLocaleString() : null} />
            </div>
          </div>
        </div>
      )}

      {/* Versions Tab */}
      {tab === "Versions" && (
        <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, overflow: "hidden" }}>
          {versions.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--c-muted)", padding: 32, margin: 0 }}>No versions recorded.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <th style={hdr}>Version</th><th style={hdr}>File Name</th>
                <th style={hdr}>Type</th><th style={hdr}>Size</th>
                <th style={hdr}>Change Notes</th><th style={hdr}>Uploaded By</th>
                <th style={hdr}>Uploaded At</th><th style={{ ...hdr, textAlign: "right" }}>Actions</th>
              </tr></thead>
              <tbody>{versions.map(v => (
                <tr key={v.id}>
                  <td style={{ ...cell, fontWeight: 700, color: "var(--c-accent)" }}>v{v.version_number}</td>
                  <td style={{ ...cell, fontSize: 12 }}>{v.file_name}</td>
                  <td style={{ ...cell, fontSize: 12 }}>{v.file_type?.toUpperCase()}</td>
                  <td style={{ ...cell, fontSize: 12 }}>{v.file_size ? `${(v.file_size / 1024).toFixed(1)} KB` : "—"}</td>
                  <td style={{ ...cell, fontSize: 12, color: "var(--c-muted)" }}>{v.change_notes || "—"}</td>
                  <td style={{ ...cell, fontSize: 12 }}>{v.uploaded_by}</td>
                  <td style={{ ...cell, fontSize: 12 }}>{v.uploaded_at ? new Date(v.uploaded_at).toLocaleString() : "—"}</td>
                  <td style={{ ...cell, textAlign: "right" }}>
                    <button onClick={() => downloadFile(v.version_number)} style={{ background: "none", border: "none", color: "var(--c-accent)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>⬇ Download</button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      )}

      {/* Activities Tab */}
      {tab === "Activities" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {activities.length === 0 ? (
            <p style={{ color: "var(--c-muted)", fontSize: 13 }}>No activities recorded.</p>
          ) : activities.map(a => (
            <div key={a.id} style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 8, padding: "12px 16px", display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(99,102,241,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>📋</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{a.action}</div>
                {a.actor && <div style={{ fontSize: 12, color: "var(--c-muted)" }}>by {a.actor}</div>}
                {a.notes && <div style={{ fontSize: 12, color: "var(--c-text)", marginTop: 4 }}>{a.notes}</div>}
              </div>
              <div style={{ fontSize: 11, color: "var(--c-muted)", whiteSpace: "nowrap" }}>{a.created_at ? new Date(a.created_at).toLocaleString() : ""}</div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {showReject && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 12, padding: 28, width: 440, maxWidth: "95vw" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Reject Document</h3>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--c-muted)", marginBottom: 6, textTransform: "uppercase" }}>Rejection Reason *</label>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder="Explain why the document is being rejected…" style={{ padding: "8px 10px", background: "var(--c-bg,var(--c-surface))", border: "1px solid var(--c-border)", borderRadius: 6, fontSize: 13, color: "var(--c-text)", width: "100%", boxSizing: "border-box", resize: "vertical" }} />
            <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
              <button onClick={() => setShowReject(false)} style={{ padding: "8px 18px", borderRadius: 7, border: "1px solid var(--c-border)", background: "none", color: "var(--c-text)", cursor: "pointer", fontSize: 13 }}>Cancel</button>
              <button disabled={acting || !rejectReason.trim()} onClick={() => doAction(() => portalEmpDocApi.reject(subdomain, token, docId, { rejection_reason: rejectReason })).then(() => setShowReject(false))} style={{ padding: "8px 18px", borderRadius: 7, background: "#ef4444", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* Replace File Modal */}
      {showReplace && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 12, padding: 28, width: 440, maxWidth: "95vw" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Replace File (New Version)</h3>
            {actError && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 10 }}>{actError}</div>}
            <div style={{ border: "2px dashed var(--c-border)", borderRadius: 8, padding: 20, textAlign: "center", cursor: "pointer", marginBottom: 12 }} onClick={() => document.getElementById("replace-file-input")?.click()}>
              <input id="replace-file-input" type="file" accept=".pdf,.jpg,.jpeg,.png,.docx" style={{ display: "none" }} onChange={e => setReplaceFile(e.target.files[0])} />
              {replaceFile ? <div><div style={{ fontWeight: 600, fontSize: 13 }}>{replaceFile.name}</div><div style={{ fontSize: 11, color: "var(--c-muted)" }}>{(replaceFile.size / 1024).toFixed(1)} KB</div></div>
                : <div style={{ color: "var(--c-muted)", fontSize: 13 }}>Click to select file (PDF, JPG, PNG, DOCX)</div>}
            </div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--c-muted)", marginBottom: 4, textTransform: "uppercase" }}>Change Notes</label>
            <input value={replaceNotes} onChange={e => setReplaceNotes(e.target.value)} placeholder="What changed in this version?" style={{ padding: "8px 10px", background: "var(--c-bg,var(--c-surface))", border: "1px solid var(--c-border)", borderRadius: 6, fontSize: 13, color: "var(--c-text)", width: "100%", boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowReplace(false); setReplaceFile(null); setReplaceNotes(""); }} style={{ padding: "8px 18px", borderRadius: 7, border: "1px solid var(--c-border)", background: "none", color: "var(--c-text)", cursor: "pointer", fontSize: 13 }}>Cancel</button>
              <button disabled={acting || !replaceFile} onClick={doReplace} style={{ padding: "8px 18px", borderRadius: 7, background: "var(--c-accent)", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, opacity: acting || !replaceFile ? 0.7 : 1 }}>Upload New Version</button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
