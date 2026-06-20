import React, { useEffect, useState } from "react";
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

const STATUS_COLORS = { "Draft": "#9ca3af", "Submitted": "#818cf8", "Approved": "#22c55e", "Rejected": "#ef4444", "Closed": "#6b7280" };

export default function RequisitionDetails() {
  const { subdomain, reqId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const [req, setReq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState("");

  const load = () => {
    setLoading(true);
    portalRecruitmentApi.getRequisition(subdomain, token, reqId).then(r => setReq(r.data?.data || null)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [reqId]);

  const doAction = async (fn, label) => {
    setActing(label);
    try { await fn(); load(); } catch (e) { alert(e.response?.data?.message || `${label} failed.`); } finally { setActing(""); }
  };

  if (loading) return <div style={{ color: "var(--c-muted)", padding: 32 }}>Loading…</div>;
  if (!req) return <div style={{ color: "#ef4444", padding: 32 }}>Requisition not found.</div>;

  const statusColor = STATUS_COLORS[req.status] || "#9ca3af";

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, fontSize: 12, color: "var(--c-muted)" }}>
        <span onClick={() => navigate(`/portal/${subdomain}/recruitment/requisitions`)} style={{ cursor: "pointer", color: "var(--c-accent)" }}>Job Requisitions</span>
        <span>/</span><span>{req.requisition_number}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{req.designation_name || "Requisition"}</h2>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 10, background: `${statusColor}22`, color: statusColor }}>{req.status}</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--c-muted)", marginTop: 4, fontFamily: "monospace" }}>{req.requisition_number}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {req.status === "Draft" && <>
            <button onClick={() => navigate(`/portal/${subdomain}/recruitment/requisitions/${reqId}/edit`)} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid var(--c-border)", background: "none", color: "var(--c-text)", cursor: "pointer", fontSize: 12 }}>Edit</button>
            <button disabled={acting === "Submit"} onClick={() => doAction(() => portalRecruitmentApi.submitRequisition(subdomain, token, reqId), "Submit")} style={{ padding: "7px 14px", borderRadius: 7, background: "#818cf8", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{acting === "Submit" ? "…" : "Submit"}</button>
          </>}
          {req.status === "Submitted" && <>
            <button disabled={acting === "Approve"} onClick={() => doAction(() => portalRecruitmentApi.approveRequisition(subdomain, token, reqId), "Approve")} style={{ padding: "7px 14px", borderRadius: 7, background: "#22c55e", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{acting === "Approve" ? "…" : "Approve"}</button>
            <button disabled={acting === "Reject"} onClick={() => { const r = window.prompt("Rejection reason:"); if (r !== null) doAction(() => portalRecruitmentApi.rejectRequisition(subdomain, token, reqId, { rejection_reason: r }), "Reject"); }} style={{ padding: "7px 14px", borderRadius: 7, background: "#ef4444", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Reject</button>
          </>}
          {req.status === "Approved" && <>
            <button onClick={() => navigate(`/portal/${subdomain}/recruitment/openings/new?requisition_id=${reqId}`)} style={{ padding: "7px 14px", borderRadius: 7, background: "var(--c-accent)", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Create Opening</button>
          </>}
          {req.status === "Rejected" && <>
            <button onClick={() => navigate(`/portal/${subdomain}/recruitment/requisitions/${reqId}/edit`)} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid var(--c-border)", background: "none", color: "var(--c-text)", cursor: "pointer", fontSize: 12 }}>Edit & Resubmit</button>
          </>}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Card title="Position Details">
          <Row>
            <Field label="Department" value={req.department_name} />
            <Field label="Designation" value={req.designation_name} />
            <Field label="Company" value={req.company_name} />
            <Field label="Branch" value={req.branch_name} />
            <Field label="Hiring Manager" value={req.hiring_manager} />
            <Field label="No. of Positions" value={req.number_of_positions} />
            <Field label="Employment Type" value={req.employment_type} />
            <Field label="Employee Category" value={req.employee_category} />
            <Field label="Reason for Hiring" value={req.reason_for_hiring} />
          </Row>
        </Card>
        <Card title="Budget & Timeline">
          <Row>
            <Field label="Budget Min" value={req.budget_min ? `₹${Number(req.budget_min).toLocaleString()}` : null} />
            <Field label="Budget Max" value={req.budget_max ? `₹${Number(req.budget_max).toLocaleString()}` : null} />
            <Field label="Target Joining Date" value={req.target_joining_date} />
          </Row>
        </Card>
        {req.job_description && <Card title="Job Description"><p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{req.job_description}</p></Card>}
        {req.skills_required && <Card title="Skills Required"><p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{req.skills_required}</p></Card>}
        {req.rejection_reason && <Card title="Rejection Reason"><p style={{ margin: 0, fontSize: 13, color: "#ef4444" }}>{req.rejection_reason}</p></Card>}
        <div style={{ fontSize: 11, color: "var(--c-muted)", paddingTop: 4 }}>
          Created by {req.created_by || "—"} • {req.created_at ? new Date(req.created_at).toLocaleString() : "—"}
        </div>
      </div>
    </div>
  );
}
