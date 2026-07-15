import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { portalInterviewApi, portalOrgApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";

const STATUS_COLOR = {
  Scheduled: "#3b82f6", Rescheduled: "#8b5cf6", Completed: "#10b981",
  Cancelled: "#6b7280", "No Show": "#f59e0b",
};
const RESULT_COLOR = {
  Pending: "#6b7280", Pass: "#22c55e", Fail: "#ef4444",
  Hold: "#f59e0b", Selected: "#10b981", Rejected: "#ef4444",
};
const REC_COLOR = {
  "Strong Hire": "#10b981", "Hire": "#22c55e", "Hold": "#f59e0b", "Reject": "#ef4444",
};

const TABS = ["Overview", "Panel", "Feedback", "Timeline"];

export default function InterviewDetails() {
  const { subdomain, interviewId } = useParams();
  const [searchParams] = useSearchParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const base = `/portal/${subdomain}/hrms/interviews`;

  const [tab, setTab]           = useState(searchParams.get("tab") || "Overview");
  const [iv, setIv]             = useState(null);
  const [panel, setPanel]       = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [meta, setMeta]         = useState({});
  const [loading, setLoading]   = useState(true);

  // Feedback form state
  const [showFbForm, setShowFbForm] = useState(false);
  const [fbForm, setFbForm] = useState({
    recommendation: "", overall_score: "", strengths: "", weaknesses: "", comments: "", is_private: false,
    scorecards: [
      { criteria: "Technical Skills", score: "", notes: "" },
      { criteria: "Communication",    score: "", notes: "" },
      { criteria: "Problem Solving",  score: "", notes: "" },
      { criteria: "Cultural Fit",     score: "", notes: "" },
      { criteria: "Experience Match", score: "", notes: "" },
    ],
  });
  const [fbSaving, setFbSaving] = useState(false);
  const [fbError,  setFbError]  = useState("");

  // Panel form state
  const [showPanelForm, setShowPanelForm] = useState(false);
  const [panelForm, setPanelForm]         = useState({ employee_id: "", employee_name: "", role: "Panel Member" });
  const [panelSaving, setPanelSaving]     = useState(false);
  const [employees, setEmployees]         = useState([]);

  // Confirm dialog
  const [confirmDlg, setConfirmDlg] = useState({ open: false, title: "", message: "", fn: null, loading: false });
  const askConfirm = (title, message, fn) => setConfirmDlg({ open: true, title, message, fn, loading: false });
  const closeConfirm = () => setConfirmDlg(d => ({ ...d, open: false, fn: null }));
  const runConfirm = async () => {
    if (!confirmDlg.fn) return;
    setConfirmDlg(d => ({ ...d, loading: true }));
    try { await confirmDlg.fn(); } finally { setConfirmDlg(d => ({ ...d, open: false, loading: false, fn: null })); }
  };

  const loadInterview = () => {
    setLoading(true);
    portalInterviewApi.get(subdomain, token, interviewId)
      .then(r => setIv(r.data?.data || null))
      .catch(() => navigate(base))
      .finally(() => setLoading(false));
  };

  const loadPanel   = () => portalInterviewApi.listPanel(subdomain, token, interviewId).then(r => setPanel(r.data?.data || [])).catch(() => {});
  const loadFeedback = () => portalInterviewApi.listFeedback(subdomain, token, interviewId).then(r => setFeedback(r.data?.data || [])).catch(() => {});
  const loadTimeline = () => portalInterviewApi.activities(subdomain, token, interviewId).then(r => setTimeline(r.data?.data || [])).catch(() => {});

  useEffect(() => {
    loadInterview();
    portalInterviewApi.metaOptions(subdomain, token).then(r => setMeta(r.data?.data || {})).catch(() => {});
  }, [interviewId, subdomain, token]);

  useEffect(() => {
    if (!iv) return;
    if (tab === "Panel") {
      loadPanel();
      if (employees.length === 0) {
        portalOrgApi.listActiveEmployees(subdomain, token, { page_size: 200 })
          .then(r => {
            const d = r.data?.data;
            setEmployees(Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : []);
          }).catch(() => {});
      }
    }
    if (tab === "Feedback") loadFeedback();
    if (tab === "Timeline") loadTimeline();
  }, [tab, iv]);

  const doAction = async (fn) => {
    try { await fn(); loadInterview(); } catch (e) { alert(e.response?.data?.message || "Action failed."); }
  };

  const submitFeedback = async e => {
    e.preventDefault();
    setFbSaving(true); setFbError("");
    try {
      const payload = {
        recommendation: fbForm.recommendation || null,
        overall_score: fbForm.overall_score ? parseFloat(fbForm.overall_score) : null,
        strengths: fbForm.strengths || null,
        weaknesses: fbForm.weaknesses || null,
        comments: fbForm.comments || null,
        is_private: fbForm.is_private,
        scorecards: fbForm.scorecards
          .filter(s => s.score !== "" && s.score !== null)
          .map(s => ({ criteria: s.criteria, score: parseInt(s.score), notes: s.notes || null })),
      };
      await portalInterviewApi.submitFeedback(subdomain, token, interviewId, payload);
      setShowFbForm(false);
      loadFeedback();
    } catch (err) {
      setFbError(err.response?.data?.message || "Failed to submit feedback.");
    } finally {
      setFbSaving(false);
    }
  };

  const addPanelMember = async e => {
    e.preventDefault();
    if (!panelForm.employee_name) return;
    setPanelSaving(true);
    const emp = employees.find(x => x.id === panelForm.employee_id);
    try {
      await portalInterviewApi.addPanel(subdomain, token, interviewId, {
        employee_name: panelForm.employee_name,
        employee_email: emp?.work_email || emp?.email || null,
        role: panelForm.role || "Panel Member",
        weightage: null,
      });
      setShowPanelForm(false);
      setPanelForm({ employee_id: "", employee_name: "", role: "Panel Member" });
      loadPanel();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add panel member.");
    } finally {
      setPanelSaving(false);
    }
  };

  if (loading) return <div className="t-muted" style={{ padding: 32 }}>Loading…</div>;
  if (!iv) return null;

  const isActive = iv.status === "Scheduled" || iv.status === "Rescheduled";

  const Row = ({ label, value, link }) => !value ? null : (
    <div style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--c-border)" }}>
      <div style={{ minWidth: 160, fontSize: 12, fontWeight: 600, color: "var(--c-muted)" }}>{label}</div>
      {link ? <a href={link} target="_blank" rel="noreferrer" className="t-accent" style={{ fontSize: 13 }}>{value}</a>
             : <div style={{ fontSize: 13 }}>{value}</div>}
    </div>
  );

  const SH = ({ label }) => (
    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "16px 0 8px" }}>
      {label}
    </div>
  );

  return (
    <div>
      <PageHeader
        title={iv.interview_number}
        subtitle={`${iv.round_type || iv.round_name || `Round ${iv.round_number}`} · ${iv.candidate_name || "—"}`}
        breadcrumbs={[
          { label: "Interview Management", path: base },
          { label: "All Interviews",       path: `${base}/list` },
          { label: iv.interview_number },
        ]}
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {isActive && <>
              <button onClick={() => navigate(`${base}/${iv.id}/edit`)} className="btn-secondary">Edit</button>
              <button onClick={() => navigate(`${base}/${iv.id}/reschedule`)} style={{ padding: "8px 16px", background: "none", border: "1px solid #8b5cf6", color: "#8b5cf6", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Reschedule</button>
              <button onClick={() => askConfirm("No Show", "Mark this interview as No Show?", () => doAction(() => portalInterviewApi.noShow(subdomain, token, iv.id)))}
                style={{ padding: "8px 16px", background: "none", border: "1px solid #f59e0b", color: "#f59e0b", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
                No Show
              </button>
              <button onClick={() => askConfirm("Cancel Interview", "Cancel this interview?", () => doAction(() => portalInterviewApi.cancel(subdomain, token, iv.id, {})))}
                style={{ padding: "8px 16px", background: "none", border: "1px solid #ef4444", color: "#ef4444", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
                Cancel
              </button>
            </>}
            {iv.status === "Completed" && iv.result === "Pending" && <>
              <button onClick={() => askConfirm("Select Candidate", "Mark candidate as Selected?", () => doAction(() => portalInterviewApi.select(subdomain, token, iv.id, {})))}
                style={{ padding: "8px 16px", background: "none", border: "1px solid #10b981", color: "#10b981", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
                ✓ Select
              </button>
              <button onClick={() => askConfirm("Reject Candidate", "Mark candidate as Rejected?", () => doAction(() => portalInterviewApi.reject(subdomain, token, iv.id, {})))}
                style={{ padding: "8px 16px", background: "none", border: "1px solid #ef4444", color: "#ef4444", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
                ✗ Reject
              </button>
            </>}
          </div>
        }
      />

      {/* Header card — status + key meta; stacks to column at ≤640px */}
      <div className="card detail-header-card" style={{ padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div className="detail-header-meta" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{
              background: `${STATUS_COLOR[iv.status] || "#6b7280"}22`, color: STATUS_COLOR[iv.status] || "#6b7280",
              padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
              border: `1px solid ${STATUS_COLOR[iv.status] || "#6b7280"}44`,
            }}>{iv.status}</span>
            {iv.result && iv.result !== "Pending" && (
              <span style={{
                background: `${RESULT_COLOR[iv.result] || "#6b7280"}22`, color: RESULT_COLOR[iv.result] || "#6b7280",
                padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                border: `1px solid ${RESULT_COLOR[iv.result] || "#6b7280"}44`,
              }}>{iv.result}</span>
            )}
            {iv.reschedule_count > 0 && (
              <span className="t-muted" style={{ fontSize: 12 }}>Rescheduled {iv.reschedule_count}×</span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {iv.interview_date && (
            <div>
              <div style={{ fontSize: 11, color: "var(--c-muted)" }}>Date</div>
              <div style={{ fontSize: 13, fontWeight: 600 }} className="t-heading">{iv.interview_date}</div>
            </div>
          )}
          {iv.mode && (
            <div>
              <div style={{ fontSize: 11, color: "var(--c-muted)" }}>Mode</div>
              <div style={{ fontSize: 13, fontWeight: 600 }} className="t-heading">{iv.mode}</div>
            </div>
          )}
          {iv.round_number && (
            <div>
              <div style={{ fontSize: 11, color: "var(--c-muted)" }}>Round</div>
              <div style={{ fontSize: 13, fontWeight: 600 }} className="t-heading">{iv.round_number}</div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--c-border)", marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: "10px 18px", fontSize: 13, fontWeight: 600,
              color: tab === t ? "var(--c-accent)" : "var(--c-muted)",
              borderBottom: tab === t ? "2px solid var(--c-accent)" : "2px solid transparent",
              marginBottom: -1,
            }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "Overview" && (
        <div className="form-grid-2" style={{ gap: 20 }}>
          <div className="card" style={{ padding: 20 }}>
            <SH label="Interview Details" />
            <Row label="Interview #"   value={iv.interview_number} />
            <Row label="Candidate"     value={iv.candidate_name} />
            <Row label="Job Opening"   value={iv.opening_title} />
            <Row label="Pipeline"      value={iv.pipeline_name} />
            <Row label="Round"         value={`Round ${iv.round_number}${iv.round_type ? ` — ${iv.round_type}` : ""}${iv.round_name ? ` (${iv.round_name})` : ""}`} />

            <SH label="Schedule" />
            <Row label="Date"          value={iv.interview_date} />
            <Row label="Time"          value={iv.start_time ? `${iv.start_time}${iv.end_time ? ` – ${iv.end_time}` : ""}` : null} />
            <Row label="Timezone"      value={iv.timezone} />
            <Row label="Duration"      value={iv.duration_minutes ? `${iv.duration_minutes} min` : null} />
            <Row label="Mode"          value={iv.mode} />
            <Row label="Location"      value={iv.location} />
            {iv.meeting_url && <Row label="Meeting URL" value={iv.meeting_url} link={iv.meeting_url} />}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {iv.instructions && (
              <div className="card" style={{ padding: 20 }}>
                <SH label="Instructions" />
                <p style={{ fontSize: 13, lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{iv.instructions}</p>
              </div>
            )}
            {iv.reschedule_reason && (
              <div className="card" style={{ padding: 20 }}>
                <SH label="Reschedule Reason" />
                <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>{iv.reschedule_reason}</p>
                {iv.original_date && <div className="t-muted" style={{ fontSize: 12, marginTop: 6 }}>Original date: {iv.original_date}</div>}
              </div>
            )}
            <div className="card" style={{ padding: 20 }}>
              <SH label="Record Info" />
              <Row label="Created By" value={iv.created_by} />
              <Row label="Created"    value={iv.created_at?.split("T")[0]} />
              <Row label="Updated"    value={iv.updated_at?.split("T")[0]} />
            </div>
          </div>
        </div>
      )}

      {/* ── PANEL ── */}
      {tab === "Panel" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }} className="t-heading">Interview Panel ({panel.length})</div>
            {isActive && (
              <button onClick={() => setShowPanelForm(v => !v)} className="btn-secondary">
                {showPanelForm ? "✕ Cancel" : "+ Add Member"}
              </button>
            )}
          </div>

          {showPanelForm && (
            <form onSubmit={addPanelMember} className="card" style={{ padding: 20, marginBottom: 16 }}>
              <div className="form-grid-2">
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--c-muted)" }}>Employee *</label>
                  <select
                    value={panelForm.employee_id}
                    onChange={e => {
                      const emp = employees.find(x => x.id === e.target.value);
                      setPanelForm(f => ({
                        ...f,
                        employee_id: e.target.value,
                        employee_name: emp ? `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.full_name || "" : "",
                      }));
                    }}
                    className="input-field"
                    required
                  >
                    <option value="">Select employee…</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.employee_code}
                        {emp.employee_code ? ` (${emp.employee_code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--c-muted)" }}>Role</label>
                  <select value={panelForm.role} onChange={e => setPanelForm(f => ({ ...f, role: e.target.value }))} className="input-field">
                    {(meta.panel_roles || ["Lead Interviewer", "Panel Member", "Observer"]).map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button type="submit" className="btn-primary" disabled={panelSaving || !panelForm.employee_id}>
                  {panelSaving ? "Adding…" : "Add to Panel"}
                </button>
              </div>
            </form>
          )}

          {panel.length === 0 ? (
            <div className="card" style={{ padding: 32, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
              <div className="t-muted" style={{ fontSize: 13 }}>No panel members assigned yet.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {panel.map(p => (
                <div key={p.id} className="card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.employee_name}</div>
                    {p.employee_email && <div className="t-muted" style={{ fontSize: 12 }}>{p.employee_email}</div>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 12, color: "var(--c-muted)" }}>{p.role}</span>
                    {p.weightage != null && <span style={{ fontSize: 12, color: "var(--c-accent)" }}>{p.weightage}%</span>}
                    {isActive && (
                      <button onClick={() => askConfirm("Remove Panel Member", "Remove this panel member from the interview?", async () => { await doAction(() => portalInterviewApi.removePanel(subdomain, token, iv.id, p.id)); loadPanel(); })}
                        style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 12 }}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FEEDBACK ── */}
      {tab === "Feedback" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }} className="t-heading">Feedback & Evaluation ({feedback.length})</div>
            <button onClick={() => setShowFbForm(v => !v)} className="btn-secondary">
              {showFbForm ? "✕ Cancel" : "+ Add Feedback"}
            </button>
          </div>

          {showFbForm && (
            <form onSubmit={submitFeedback} className="card" style={{ padding: 24, marginBottom: 20 }}>
              {fbError && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b", padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>{fbError}</div>}

              {/* Scorecard */}
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Scorecard (1–5 rating)</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                {fbForm.scorecards.map((sc, i) => (
                  <div key={sc.criteria} style={{ display: "grid", gridTemplateColumns: "180px auto 1fr", gap: 12, alignItems: "center" }}>
                    {/* Non-uniform scorecard row: fixed 180px label + auto rating buttons + 1fr notes — intentional */}
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{sc.criteria}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[1,2,3,4,5].map(n => (
                        <button key={n} type="button"
                          onClick={() => setFbForm(f => { const s = [...f.scorecards]; s[i] = { ...s[i], score: n }; return { ...f, scorecards: s }; })}
                          style={{
                            width: 34, height: 34, borderRadius: 6, border: "2px solid",
                            borderColor: sc.score === n ? "var(--c-accent)" : "var(--c-border)",
                            background: sc.score === n ? "var(--c-accent)22" : "transparent",
                            color: sc.score === n ? "var(--c-accent)" : "var(--c-fg)",
                            cursor: "pointer", fontWeight: 700, fontSize: 13,
                          }}>
                          {n}
                        </button>
                      ))}
                    </div>
                    <input
                      value={sc.notes} placeholder="Optional notes…"
                      onChange={e => setFbForm(f => { const s = [...f.scorecards]; s[i] = { ...s[i], notes: e.target.value }; return { ...f, scorecards: s }; })}
                      className="input-field" style={{ fontSize: 12 }}
                    />
                  </div>
                ))}
              </div>

              {/* Recommendation & overall score */}
              <div className="form-grid-2" style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--c-muted)" }}>Recommendation</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {(meta.recommendations || ["Strong Hire","Hire","Hold","Reject"]).map(r => (
                      <button key={r} type="button"
                        onClick={() => setFbForm(f => ({ ...f, recommendation: r }))}
                        style={{
                          padding: "6px 14px", borderRadius: 20, border: "2px solid",
                          borderColor: fbForm.recommendation === r ? REC_COLOR[r] || "var(--c-accent)" : "var(--c-border)",
                          background: fbForm.recommendation === r ? `${REC_COLOR[r] || "var(--c-accent)"}22` : "transparent",
                          color: fbForm.recommendation === r ? REC_COLOR[r] || "var(--c-accent)" : "var(--c-muted)",
                          cursor: "pointer", fontWeight: fbForm.recommendation === r ? 700 : 400, fontSize: 12,
                        }}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--c-muted)" }}>Overall Score (1–10)</label>
                  <input type="number" min={1} max={10} step={0.5} value={fbForm.overall_score}
                    onChange={e => setFbForm(f => ({ ...f, overall_score: e.target.value }))}
                    className="input-field" placeholder="e.g. 7.5" />
                </div>
              </div>

              <div className="form-grid-2" style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--c-muted)" }}>Strengths</label>
                  <textarea value={fbForm.strengths} onChange={e => setFbForm(f => ({ ...f, strengths: e.target.value }))} className="input-field" rows={3} style={{ resize: "vertical" }} placeholder="What stood out positively…" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--c-muted)" }}>Weaknesses / Areas to Improve</label>
                  <textarea value={fbForm.weaknesses} onChange={e => setFbForm(f => ({ ...f, weaknesses: e.target.value }))} className="input-field" rows={3} style={{ resize: "vertical" }} placeholder="Areas needing improvement…" />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--c-muted)", display: "block", marginBottom: 6 }}>Comments</label>
                <textarea value={fbForm.comments} onChange={e => setFbForm(f => ({ ...f, comments: e.target.value }))} className="input-field" rows={3} style={{ resize: "vertical", width: "100%", boxSizing: "border-box" }} placeholder="Additional comments…" />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", marginBottom: 16 }}>
                <input type="checkbox" checked={fbForm.is_private} onChange={e => setFbForm(f => ({ ...f, is_private: e.target.checked }))} />
                Private feedback (only visible to admins)
              </label>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="submit" className="btn-primary" disabled={fbSaving}>{fbSaving ? "Submitting…" : "Submit Feedback"}</button>
                <button type="button" className="btn-secondary" onClick={() => setShowFbForm(false)}>Cancel</button>
              </div>
            </form>
          )}

          {feedback.length === 0 ? (
            <div className="card" style={{ padding: 32, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
              <div className="t-muted" style={{ fontSize: 13 }}>No feedback submitted yet.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {feedback.map(f => (
                <div key={f.id} className="card" style={{ padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{f.evaluator_name || "Evaluator"}</div>
                      <div className="t-muted" style={{ fontSize: 12 }}>{f.created_at?.split("T")[0]}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {f.recommendation && (
                        <span style={{
                          background: `${REC_COLOR[f.recommendation] || "#6b7280"}22`,
                          color: REC_COLOR[f.recommendation] || "#6b7280",
                          padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                          border: `1px solid ${REC_COLOR[f.recommendation] || "#6b7280"}44`,
                        }}>{f.recommendation}</span>
                      )}
                      {f.overall_score != null && (
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--c-accent)" }}>
                          {f.overall_score}/10
                        </span>
                      )}
                      {f.is_private && <span className="t-muted" style={{ fontSize: 11 }}>🔒 Private</span>}
                    </div>
                  </div>

                  {/* Scorecards */}
                  {f.scorecards?.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, marginBottom: 14 }}>
                      {f.scorecards.map(sc => (
                        <div key={sc.id} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px 12px" }}>
                          <div className="t-muted" style={{ fontSize: 11, marginBottom: 4 }}>{sc.criteria}</div>
                          <div style={{ display: "flex", gap: 3 }}>
                            {[1,2,3,4,5].map(n => (
                              <div key={n} style={{
                                width: 16, height: 16, borderRadius: 3,
                                background: sc.score >= n ? "var(--c-accent)" : "rgba(255,255,255,0.08)",
                              }} />
                            ))}
                            <span style={{ fontSize: 12, fontWeight: 700, marginLeft: 4, color: "var(--c-accent)" }}>{sc.score}/5</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {f.strengths && <div style={{ marginBottom: 8 }}><span className="t-muted" style={{ fontSize: 12 }}>Strengths: </span><span style={{ fontSize: 13 }}>{f.strengths}</span></div>}
                  {f.weaknesses && <div style={{ marginBottom: 8 }}><span className="t-muted" style={{ fontSize: 12 }}>Weaknesses: </span><span style={{ fontSize: 13 }}>{f.weaknesses}</span></div>}
                  {f.comments && <div><span className="t-muted" style={{ fontSize: 12 }}>Comments: </span><span style={{ fontSize: 13 }}>{f.comments}</span></div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TIMELINE ── */}
      {tab === "Timeline" && (
        <div>
          {timeline.length === 0 ? (
            <div className="card" style={{ padding: 32, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📜</div>
              <div className="t-muted" style={{ fontSize: 13 }}>No activity recorded yet.</div>
            </div>
          ) : (
            <div style={{ position: "relative", paddingLeft: 24 }}>
              <div style={{ position: "absolute", left: 7, top: 0, bottom: 0, width: 2, background: "var(--c-border)" }} />
              {timeline.map((a, idx) => (
                <div key={a.id} style={{ position: "relative", marginBottom: 20 }}>
                  <div style={{ position: "absolute", left: -20, top: 4, width: 10, height: 10, borderRadius: "50%", background: "var(--c-accent)", border: "2px solid var(--c-bg)" }} />
                  <div className="card" style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{a.action}</div>
                        {a.actor && <div className="t-muted" style={{ fontSize: 12 }}>by {a.actor}</div>}
                        {a.notes && <div style={{ fontSize: 12, marginTop: 4 }}>{a.notes}</div>}
                        {(a.old_value || a.new_value) && (
                          <div className="t-muted" style={{ fontSize: 11, marginTop: 4 }}>
                            {a.old_value && <span>From: <strong>{a.old_value}</strong> → </span>}
                            {a.new_value && <span>To: <strong>{a.new_value}</strong></span>}
                          </div>
                        )}
                      </div>
                      <div className="t-muted" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                        {a.created_at ? new Date(a.created_at).toLocaleString() : ""}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirmDlg.open}
        title={confirmDlg.title}
        message={confirmDlg.message}
        confirmLabel="Confirm"
        confirmVariant="danger"
        loading={confirmDlg.loading}
        onConfirm={runConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
}
