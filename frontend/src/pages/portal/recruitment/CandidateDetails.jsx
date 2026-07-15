import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalRecruitmentApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";

const Field = ({ label, value }) => (
  <div>
    <div className="portal-form-label" style={{ marginBottom: 2 }}>{label}</div>
    <div style={{ fontSize: 13 }} className="t-heading">{value || "—"}</div>
  </div>
);
const InfoCard = ({ title, children }) => <div className="portal-form-card" style={{ gap: 14 }}>{title && <div className="portal-form-title">{title}</div>}{children}</div>;
const Row = ({ children }) => <div className="portal-form-row">{children}</div>;

const ALL_STATUSES = ["Applied","Under Review","Shortlisted","Interview Scheduled","Selected","Offered","Joined","Rejected","Withdrawn"];

export default function CandidateDetails() {
  const { subdomain, candId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const [cand, setCand] = useState(null);
  const [docs, setDocs] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [statusModal, setStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusNotes, setStatusNotes] = useState("");
  const [acting, setActing] = useState("");
  const resumeRef = useRef();
  const docRef = useRef();
  const [docType, setDocType] = useState("Resume");

  // Confirm dialog
  const [confirmDlg, setConfirmDlg] = useState({ open: false, title: "", message: "", fn: null, loading: false });
  const askConfirm = (title, message, fn) => setConfirmDlg({ open: true, title, message, fn, loading: false });
  const closeConfirm = () => setConfirmDlg(d => ({ ...d, open: false, fn: null }));
  const runConfirm = async () => {
    if (!confirmDlg.fn) return;
    setConfirmDlg(d => ({ ...d, loading: true }));
    try { await confirmDlg.fn(); } finally { setConfirmDlg(d => ({ ...d, open: false, loading: false, fn: null })); }
  };

  const load = () => {
    setLoading(true);
    Promise.all([
      portalRecruitmentApi.getCandidate(subdomain, token, candId),
      portalRecruitmentApi.listCandidateDocs(subdomain, token, candId),
      portalRecruitmentApi.getCandidateActivities(subdomain, token, candId),
    ]).then(([cr, dr, ar]) => {
      setCand(cr.data?.data || null);
      setDocs(dr.data?.data || []);
      setActivities(ar.data?.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [candId]);

  const changeStatus = async () => {
    if (!newStatus) return;
    setActing("status");
    try {
      await portalRecruitmentApi.changeStatus(subdomain, token, candId, { status: newStatus, notes: statusNotes });
      setStatusModal(false); setNewStatus(""); setStatusNotes(""); load();
    } catch (e) { alert(e.response?.data?.message || "Failed."); } finally { setActing(""); }
  };

  const uploadResume = async e => {
    const file = e.target.files?.[0]; if (!file) return;
    const fd = new FormData(); fd.append("file", file);
    try { await portalRecruitmentApi.uploadResume(subdomain, token, candId, fd); load(); } catch (e) { alert("Upload failed."); }
    e.target.value = "";
  };

  const uploadDoc = async e => {
    const file = e.target.files?.[0]; if (!file) return;
    const fd = new FormData(); fd.append("file", file); fd.append("document_type", docType);
    try { await portalRecruitmentApi.uploadDoc(subdomain, token, candId, fd); load(); } catch (e) { alert("Upload failed."); }
    e.target.value = "";
  };

  const deleteDoc = (docId) => {
    askConfirm("Delete Document", "Delete this document? This cannot be undone.", async () => {
      try { await portalRecruitmentApi.deleteDoc(subdomain, token, candId, docId); load(); } catch (e) { alert("Failed to delete."); }
    });
  };

  const blobDownload = async (fn, fileName) => {
    try {
      const r = await fn();
      const url = URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement("a"); a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (e) { alert("Download failed."); }
  };

  if (loading) return <div className="t-muted" style={{ padding: 32 }}>Loading…</div>;
  if (!cand) return <div style={{ color: "#ef4444", padding: 32 }}>Candidate not found.</div>;

  const tabStyle = active => ({ padding: "8px 16px", fontSize: 12, fontWeight: active ? 700 : 400, background: "none", border: "none", borderBottom: active ? "2px solid var(--c-accent)" : "2px solid transparent", cursor: "pointer", color: active ? "var(--c-accent)" : "var(--c-muted)", whiteSpace: "nowrap" });

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Status Modal */}
      {statusModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card" style={{ width: 360, borderRadius: 12 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15 }} className="t-heading">Change Status</h3>
            <div style={{ marginBottom: 14 }}>
              <label className="portal-form-label">New Status</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="input-field">
                <option value="">Select…</option>
                {ALL_STATUSES.filter(s => s !== cand.status).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className="portal-form-label">Notes (optional)</label>
              <textarea value={statusNotes} onChange={e => setStatusNotes(e.target.value)} rows={2} className="input-field" style={{ resize: "vertical" }} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setStatusModal(false)} className="btn-secondary">Cancel</button>
              <button disabled={!newStatus || acting === "status"} onClick={changeStatus} className="btn-primary">{acting === "status" ? "…" : "Update"}</button>
            </div>
          </div>
        </div>
      )}

      <PageHeader
        title={cand.full_name}
        subtitle={`${cand.email} · ${cand.mobile_number} · ${cand.candidate_number}`}
        breadcrumbs={[{ label: "Candidates", path: `/portal/${subdomain}/recruitment/candidates` }, { label: cand.candidate_number }]}
        actions={<>
          <Badge status={cand.status} />
          <button onClick={() => navigate(`/portal/${subdomain}/recruitment/candidates/${candId}/edit`)} className="btn-secondary">Edit</button>
          <button onClick={() => setStatusModal(true)} className="btn-primary">Change Status</button>
          <button onClick={() => navigate(`/portal/${subdomain}/recruitment/offers/new?candidate_id=${candId}`)} className="btn-primary" style={{ background: "#10b981" }}>Create Offer</button>
        </>}
      />

      {/* Header card — status + key meta; stacks to column at ≤640px */}
      <div className="card detail-header-card" style={{ padding: "14px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div className="detail-header-meta" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Badge status={cand.status} />
            {cand.candidate_number && <span className="t-muted" style={{ fontSize: 12, fontFamily: "monospace" }}>{cand.candidate_number}</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {cand.current_company && (
            <div>
              <div style={{ fontSize: 11, color: "var(--c-muted)" }}>Current Company</div>
              <div style={{ fontSize: 13, fontWeight: 600 }} className="t-heading">{cand.current_company}</div>
            </div>
          )}
          {cand.source && (
            <div>
              <div style={{ fontSize: 11, color: "var(--c-muted)" }}>Source</div>
              <div style={{ fontSize: 13, fontWeight: 600 }} className="t-heading">{cand.source}</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid var(--c-border)", overflowX: "auto" }}>
        {[["overview","Overview"],["documents","Documents"],["activities","Activity"]].map(([key,label]) => (
          <button key={key} onClick={() => setTab(key)} style={tabStyle(tab === key)}>{label}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <InfoCard title="Personal Information">
            <Row>
              <Field label="First Name" value={cand.first_name} />
              <Field label="Last Name" value={cand.last_name} />
              <Field label="Email" value={cand.email} />
              <Field label="Mobile" value={cand.mobile_number} />
              <Field label="Date of Birth" value={cand.date_of_birth} />
              <Field label="Gender" value={cand.gender} />
            </Row>
          </InfoCard>
          <InfoCard title="Professional Information">
            <Row>
              <Field label="Total Experience" value={cand.total_experience} />
              <Field label="Relevant Experience" value={cand.relevant_experience} />
              <Field label="Notice Period" value={cand.notice_period} />
              <Field label="Current Company" value={cand.current_company} />
              <Field label="Current Designation" value={cand.current_designation} />
              <Field label="Current Salary" value={cand.current_salary ? `₹${Number(cand.current_salary).toLocaleString()}` : null} />
              <Field label="Expected Salary" value={cand.expected_salary ? `₹${Number(cand.expected_salary).toLocaleString()}` : null} />
            </Row>
          </InfoCard>
          <InfoCard title="Application Details">
            <Row>
              <Field label="Source" value={cand.source} />
              <Field label="Applied Position" value={cand.applied_position} />
              <Field label="Assigned Recruiter" value={cand.assigned_recruiter} />
            </Row>
          </InfoCard>
          <InfoCard title="Resume">
            {cand.has_resume ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13 }}>📄 {cand.resume_file_name || "Resume"}</span>
                <button onClick={() => blobDownload(() => portalRecruitmentApi.downloadResume(subdomain, token, candId), cand.resume_file_name || "resume")} className="t-accent" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Download</button>
              </div>
            ) : <div className="t-muted" style={{ fontSize: 13 }}>No resume uploaded.</div>}
            <input ref={resumeRef} type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }} onChange={uploadResume} />
            <button onClick={() => resumeRef.current?.click()} className="btn-secondary" style={{ alignSelf: "flex-start", padding: "6px 12px" }}>Upload Resume</button>
          </InfoCard>
        </div>
      )}

      {tab === "documents" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <select value={docType} onChange={e => setDocType(e.target.value)} className="input-field" style={{ maxWidth: 220 }}>
              {["Resume","Portfolio","Identity Proof","Educational Certificate","Experience Letter","Other"].map(t => <option key={t}>{t}</option>)}
            </select>
            <input ref={docRef} type="file" style={{ display: "none" }} onChange={uploadDoc} />
            <button onClick={() => docRef.current?.click()} className="btn-primary">Upload Document</button>
          </div>
          {docs.length === 0
            ? <div className="t-muted" style={{ fontSize: 13, padding: 20 }}>No documents uploaded.</div>
            : docs.map(doc => (
              <div key={doc.id} className="card" style={{ padding: "12px 16px", flexDirection: "row", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }} className="t-heading">{doc.file_name}</div>
                  <div className="t-muted" style={{ fontSize: 11 }}>{doc.document_type} · {doc.verification_status} · {doc.uploaded_by}</div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => blobDownload(() => portalRecruitmentApi.downloadDoc(subdomain, token, candId, doc.id), doc.file_name)} className="t-accent" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Download</button>
                  <button onClick={() => deleteDoc(doc.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 12 }}>Delete</button>
                </div>
              </div>
            ))}
        </div>
      )}

      {tab === "activities" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {activities.length === 0
            ? <div className="t-muted" style={{ fontSize: 13, padding: 20 }}>No activities recorded.</div>
            : activities.map(a => (
              <div key={a.id} className="card" style={{ padding: "12px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600 }} className="t-heading">{a.action}</span>
                    {a.actor && <span className="t-muted" style={{ fontSize: 12, marginLeft: 8 }}>by {a.actor}</span>}
                  </div>
                  <span className="t-muted" style={{ fontSize: 11 }}>{a.created_at ? new Date(a.created_at).toLocaleString() : ""}</span>
                </div>
                {(a.old_value || a.new_value) && <div className="t-muted" style={{ fontSize: 12, marginTop: 4 }}>{a.old_value && `${a.old_value} → `}{a.new_value}</div>}
                {a.notes && <div className="t-muted" style={{ fontSize: 12, marginTop: 2 }}>{a.notes}</div>}
              </div>
            ))}
        </div>
      )}
      <ConfirmDialog
        open={confirmDlg.open}
        title={confirmDlg.title}
        message={confirmDlg.message}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={confirmDlg.loading}
        onConfirm={runConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
}
