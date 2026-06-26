import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalRecruitmentApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";

const Field = ({ label, value }) => (
  <div>
    <div className="portal-form-label" style={{ marginBottom: 2 }}>{label}</div>
    <div style={{ fontSize: 13 }} className="t-heading">{value || "—"}</div>
  </div>
);
const InfoCard = ({ title, children }) => (
  <div className="portal-form-card">
    {title && <div className="portal-form-title">{title}</div>}
    {children}
  </div>
);
const Row = ({ children }) => <div className="portal-form-row">{children}</div>;

export default function RequisitionDetails() {
  const { subdomain, reqId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const [req, setReq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState("");

  const load = () => {
    setLoading(true);
    portalRecruitmentApi.getRequisition(subdomain, token, reqId)
      .then(r => setReq(r.data?.data || null)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [reqId]);

  const doAction = async (fn, label) => {
    setActing(label);
    try { await fn(); load(); } catch (e) { alert(e.response?.data?.message || `${label} failed.`); } finally { setActing(""); }
  };

  if (loading) return <div className="t-muted" style={{ padding: 32 }}>Loading…</div>;
  if (!req) return <div style={{ color: "#ef4444", padding: 32 }}>Requisition not found.</div>;

  return (
    <div style={{ maxWidth: 800 }}>
      <PageHeader
        title={req.designation_name || "Requisition"}
        subtitle={req.requisition_number}
        breadcrumbs={[{ label: "Requisitions", path: `/portal/${subdomain}/recruitment/requisitions` }, { label: req.requisition_number }]}
        actions={<>
          <Badge status={req.status} />
          {req.status === "Draft" && <>
            <button onClick={() => navigate(`/portal/${subdomain}/recruitment/requisitions/${reqId}/edit`)} className="btn-secondary">Edit</button>
            <button disabled={acting === "Submit"} onClick={() => doAction(() => portalRecruitmentApi.submitRequisition(subdomain, token, reqId), "Submit")} className="btn-primary">{acting === "Submit" ? "…" : "Submit"}</button>
          </>}
          {req.status === "Submitted" && <>
            <button disabled={acting === "Approve"} onClick={() => doAction(() => portalRecruitmentApi.approveRequisition(subdomain, token, reqId), "Approve")} className="btn-primary" style={{ background: "#22c55e" }}>{acting === "Approve" ? "…" : "Approve"}</button>
            <button disabled={acting === "Reject"} onClick={() => { const r = window.prompt("Rejection reason:"); if (r !== null) doAction(() => portalRecruitmentApi.rejectRequisition(subdomain, token, reqId, { rejection_reason: r }), "Reject"); }} className="btn-danger">Reject</button>
          </>}
          {req.status === "Approved" && <button onClick={() => navigate(`/portal/${subdomain}/recruitment/openings/new?requisition_id=${reqId}`)} className="btn-primary">Create Opening</button>}
          {req.status === "Rejected" && <button onClick={() => navigate(`/portal/${subdomain}/recruitment/requisitions/${reqId}/edit`)} className="btn-secondary">Edit & Resubmit</button>}
        </>}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <InfoCard title="Position Details">
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
        </InfoCard>
        <InfoCard title="Budget & Timeline">
          <Row>
            <Field label="Budget Min" value={req.budget_min ? `₹${Number(req.budget_min).toLocaleString()}` : null} />
            <Field label="Budget Max" value={req.budget_max ? `₹${Number(req.budget_max).toLocaleString()}` : null} />
            <Field label="Target Joining Date" value={req.target_joining_date} />
          </Row>
        </InfoCard>
        {req.job_description && <InfoCard title="Job Description"><p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }} className="t-body">{req.job_description}</p></InfoCard>}
        {req.skills_required && <InfoCard title="Skills Required"><p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }} className="t-body">{req.skills_required}</p></InfoCard>}
        {req.rejection_reason && <InfoCard title="Rejection Reason"><p style={{ margin: 0, fontSize: 13, color: "#ef4444" }}>{req.rejection_reason}</p></InfoCard>}
        <div className="t-muted" style={{ fontSize: 11, paddingTop: 4 }}>Created by {req.created_by || "—"} · {req.created_at ? new Date(req.created_at).toLocaleString() : "—"}</div>
      </div>
    </div>
  );
}
