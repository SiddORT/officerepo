import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalRecruitmentApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";

const Field = ({ label, value }) => (
  <div>
    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{label}</div>
    <div style={{ fontSize: 13 }}>{value || "—"}</div>
  </div>
);
const Card = ({ title, children }) => <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: 20 }}>{title && <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid var(--c-border)" }}>{title}</div>}{children}</div>;
const Row = ({ children }) => <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>{children}</div>;

const STATUS_COLORS = {
  "Applied": "#9ca3af", "Screening": "#f59e0b", "Shortlisted": "#60a5fa",
  "Interview Scheduled": "#818cf8", "Selected": "#10b981", "Offered": "#f59e0b",
  "Joined": "#22c55e", "Rejected": "#ef4444", "Withdrawn": "#6b7280",
};

const ALL_STATUSES = ["Applied","Screening","Shortlisted","Interview Scheduled","Selected","Offered","Joined","Rejected","Withdrawn"];

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
      setStatusModal(false); setNewStatus(""); setStatusNotes("");
      load();
    } catch (e) { alert(e.response?.data?.message || "Failed."); } finally { setActing(""); }
  };

  const uploadResume = async e => {
    const file = e.target.files?.[0]; if (!file) return;
    const fd = new FormData(); fd.append("file", file);
    try { await portalRecruitmentApi.uploadResume(subdomain, token, candId, fd); load(); } catch (e) { alert(e.response?.data?.message || "Upload failed."); }
    e.target.value = "";
  };

  const uploadDoc = async e => {
    const file = e.target.files?.[0]; if (!file) return;
    const fd = new FormData(); fd.append("file", file); fd.append("document_type", docType);
    try { await portalRecruitmentApi.uploadDoc(subdomain, token, candId, fd); load(); } catch (e) { alert(e.response?.data?.message || "Upload failed."); }
    e.target.value = "";
  };

  const deleteDoc = async docId => {
    if (!window.confirm("Delete this document?")) return;
    try { await portalRecruitmentApi.deleteDoc(subdomain, token, candId, docId); load(); } catch (e) { alert("Failed to delete."); }
  };

  const downloadResume = async () => {
    try {
      const r = await portalRecruitmentApi.downloadResume(subdomain, token, candId);
      const url = URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement("a"); a.href = url; a.download = cand?.resume_file_name || "resume";
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (e) { alert("Download failed."); }
  };

  const downloadDoc = async (docId, fileName) => {
    try {
      const r = await portalRecruitmentApi.downloadDoc(subdomain, token, candId, docId);
      const url = URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement("a"); a.href = url; a.download = fileName || "document";
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (e) { alert("Download failed."); }
  };

  if (loading) return <div style={{ color: "var(--c-muted)", padding: 32 }}>Loading…</div>;
  if (!cand) return <div style={{ color: "#ef4444", padding: 32 }}>Candidate not found.</div>;

  const statusColor = STATUS_COLORS[cand.status] || "#9ca3af";
  const tabStyle = active => ({ padding: "8px 16px", fontSize: 12, fontWeight: active ? 700 : 400, background: "none", border: "none", borderBottom: active ? "2px solid var(--c-accent)" : "2px solid transparent", cursor: "pointer", color: active ? "var(--c-accent)" : "var(--c-muted)", whiteSpace: "nowrap" });

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Status Modal */}
      {statusModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--c-surface)", borderRadius: 12, padding: 24, width: 360, border: "1px solid var(--c-border)" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15 }}>Change Status</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--c-muted)", display: "block", marginBottom: 4 }}>NEW STATUS</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)} style={{ width: "100%", padding: "8px 10px", background: "var(--c-bg,var(--c-surface))", border: "1px solid var(--c-border)", borderRadius: 6, color: "var(--c-text)", fontSize: 13 }}>
                <option value="">Select…</option>
                {ALL_STATUSES.filter(s => s !== cand.status).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--c-muted)", display: "block", marginBottom: 4 }}>NOTES (optional)</label>
              <textarea value={statusNotes} onChange={e => setStatusNotes(e.target.value)} rows={2} style={{ width: "100%", padding: "8px 10px", background: "var(--c-bg,var(--c-surface))", border: "1px solid var(--c-border)", borderRadius: 6, color: "var(--c-text)", fontSize: 13, boxSizing: "border-box", resize: "vertical" }} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setStatusModal(false)} style={{ padding: "7px 16px", borderRadius: 7, border: "1px solid var(--c-border)", background: "none", color: "var(--c-text)", cursor: "pointer", fontSize: 12 }}>Cancel</button>
              <button disabled={!newStatus || acting === "status"} onClick={changeStatus} style={{ padding: "7px 16px", borderRadius: 7, background: "var(--c-accent)", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{acting === "status" ? "…" : "Update"}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, fontSize: 12, color: "var(--c-muted)" }}>
        <span onClick={() => navigate(`/portal/${subdomain}/recruitment/candidates`)} style={{ cursor: "pointer", color: "var(--c-accent)" }}>Candidates</span>
        <span>/</span><span>{cand.candidate_number}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{cand.full_name}</h2>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 10, background: `${statusColor}22`, color: statusColor }}>{cand.status}</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--c-muted)", marginTop: 4 }}>{cand.email} · {cand.mobile_number}</div>
          <div style={{ fontSize: 11, color: "var(--c-muted)", fontFamily: "monospace" }}>{cand.candidate_number}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => navigate(`/portal/${subdomain}/recruitment/candidates/${candId}/edit`)} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid var(--c-border)", background: "none", color: "var(--c-text)", cursor: "pointer", fontSize: 12 }}>Edit</button>
          <button onClick={() => setStatusModal(true)} style={{ padding: "7px 14px", borderRadius: 7, background: "var(--c-accent)", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Change Status</button>
          <button onClick={() => navigate(`/portal/${subdomain}/recruitment/offers/new?candidate_id=${candId}`)} style={{ padding: "7px 14px", borderRadius: 7, background: "#10b981", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Create Offer</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid var(--c-border)", overflowX: "auto" }}>
        {[["overview","Overview"],["documents","Documents"],["activities","Activity"]].map(([key,label]) => (
          <button key={key} onClick={() => setTab(key)} style={tabStyle(tab === key)}>{label}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card title="Personal Information">
            <Row>
              <Field label="First Name" value={cand.first_name} />
              <Field label="Last Name" value={cand.last_name} />
              <Field label="Email" value={cand.email} />
              <Field label="Mobile" value={cand.mobile_number} />
              <Field label="Date of Birth" value={cand.date_of_birth} />
              <Field label="Gender" value={cand.gender} />
            </Row>
          </Card>
          <Card title="Professional Information">
            <Row>
              <Field label="Total Experience" value={cand.total_experience} />
              <Field label="Relevant Experience" value={cand.relevant_experience} />
              <Field label="Notice Period" value={cand.notice_period} />
              <Field label="Current Company" value={cand.current_company} />
              <Field label="Current Designation" value={cand.current_designation} />
              <Field label="Current Salary" value={cand.current_salary ? `₹${Number(cand.current_salary).toLocaleString()}` : null} />
              <Field label="Expected Salary" value={cand.expected_salary ? `₹${Number(cand.expected_salary).toLocaleString()}` : null} />
            </Row>
          </Card>
          <Card title="Application Details">
            <Row>
              <Field label="Source" value={cand.source} />
              <Field label="Applied Position" value={cand.applied_position} />
              <Field label="Assigned Recruiter" value={cand.assigned_recruiter} />
              <Field label="Employee ID" value={cand.employee_id} />
            </Row>
          </Card>
          <Card title="Resume">
            {cand.has_resume ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 13 }}>📄 {cand.resume_file_name || "Resume"}</div>
                <button onClick={downloadResume} style={{ background: "none", border: "none", color: "var(--c-accent)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Download</button>
              </div>
            ) : <div style={{ fontSize: 13, color: "var(--c-muted)" }}>No resume uploaded.</div>}
            <input ref={resumeRef} type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }} onChange={uploadResume} />
            <button onClick={() => resumeRef.current?.click()} style={{ alignSelf: "flex-start", padding: "6px 12px", borderRadius: 7, border: "1px solid var(--c-border)", background: "none", color: "var(--c-text)", cursor: "pointer", fontSize: 12 }}>Upload Resume</button>
          </Card>
        </div>
      )}

      {tab === "documents" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <select value={docType} onChange={e => setDocType(e.target.value)} style={{ padding: "7px 10px", border: "1px solid var(--c-border)", borderRadius: 6, background: "var(--c-bg,var(--c-surface))", color: "var(--c-text)", fontSize: 13 }}>
              {["Resume","Portfolio","Identity Proof","Educational Certificate","Experience Letter","Other"].map(t => <option key={t}>{t}</option>)}
            </select>
            <input ref={docRef} type="file" style={{ display: "none" }} onChange={uploadDoc} />
            <button onClick={() => docRef.current?.click()} style={{ padding: "7px 14px", borderRadius: 7, background: "var(--c-accent)", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Upload Document</button>
          </div>
          {docs.length === 0 ? <div style={{ color: "var(--c-muted)", fontSize: 13, padding: 20 }}>No documents uploaded.</div> : docs.map(doc => (
            <div key={doc.id} style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 8, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{doc.file_name}</div>
                <div style={{ fontSize: 11, color: "var(--c-muted)" }}>{doc.document_type} · {doc.verification_status} · {doc.uploaded_by}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => downloadDoc(doc.id, doc.file_name)} style={{ background: "none", border: "none", color: "var(--c-accent)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Download</button>
                <button onClick={() => deleteDoc(doc.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 12 }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "activities" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {activities.length === 0 ? <div style={{ color: "var(--c-muted)", fontSize: 13, padding: 20 }}>No activities recorded.</div> : activities.map(a => (
            <div key={a.id} style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 8, padding: "12px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{a.action}</span>
                  {a.actor && <span style={{ fontSize: 12, color: "var(--c-muted)", marginLeft: 8 }}>by {a.actor}</span>}
                </div>
                <span style={{ fontSize: 11, color: "var(--c-muted)" }}>{a.created_at ? new Date(a.created_at).toLocaleString() : ""}</span>
              </div>
              {(a.old_value || a.new_value) && <div style={{ fontSize: 12, color: "var(--c-muted)", marginTop: 4 }}>{a.old_value && `${a.old_value} → `}{a.new_value}</div>}
              {a.notes && <div style={{ fontSize: 12, color: "var(--c-muted)", marginTop: 2 }}>{a.notes}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
