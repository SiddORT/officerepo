import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { leadsApi, rbacApi } from "../../../services/apiClient";
import Modal from "../../../components/ui/Modal";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import Textarea from "../../../components/ui/Textarea";
import { EditIconBtn, DeleteIconBtn } from "../../../components/ui/ActionIcons";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import { StageBadge, StatusBadge } from "./components/StageBadge";
import ScoreBadge from "./components/ScoreBadge";
import Timeline from "./components/Timeline";
import {
  toOptions, formatCurrency, formatDate, formatDateTime, toInputDateTime, STAGE_ORDER,
} from "./constants";

const TABS = [
  "Overview", "Spokespersons", "Activities", "Demos", "Follow-ups",
  "Notes", "Documents", "Proposals", "Negotiations", "Conversions", "Timeline",
];

async function saveBlob(promise, fallbackName) {
  const res = await promise;
  const blob = new Blob([res.data]);
  const cd = res.headers?.["content-disposition"] || "";
  const match = /filename\*?=(?:UTF-8'')?["']?([^"';]+)/i.exec(cd);
  const name = match ? decodeURIComponent(match[1]) : fallbackName;
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  window.URL.revokeObjectURL(url);
}

export default function LeadDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("Overview");
  const [options, setOptions] = useState({});
  const [banner, setBanner] = useState("");
  const [users, setUsers] = useState([]);

  const loadLead = useCallback(async () => {
    try {
      const res = await leadsApi.get(id);
      setLead(res.data?.data ?? res.data);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to load lead.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadLead();
    leadsApi.options().then((res) => setOptions((res.data?.data ?? res.data) || {})).catch(() => {});
    rbacApi.listUsers()
      .then((res) => {
        const list = res.data?.data ?? res.data ?? [];
        setUsers(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
  }, [loadLead]);

  const flash = (msg) => { setBanner(msg); setTimeout(() => setBanner(""), 3000); };

  if (loading) return <div className="p-6 text-sm t-muted">Loading…</div>;
  if (error) return (
    <div className="p-6">
      <div className="rounded-lg px-4 py-3 text-sm text-red-400" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>{error}</div>
    </div>
  );
  if (!lead) return null;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button onClick={() => navigate("/superadmin/leads")} className="text-xs t-muted hover:t-accent mb-1 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to leads
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold t-heading">{lead.company_name}</h1>
            <StageBadge stage={lead.current_stage} />
            <StatusBadge status={lead.status} />
            <ScoreBadge score={lead.lead_score} label={lead.lead_score_label} />
            <ScoreOverride lead={lead} options={options} onChange={() => { loadLead(); flash("Score updated."); }} />
          </div>
          <p className="text-sm t-muted mt-1">
            {lead.contact_name}{lead.designation ? ` · ${lead.designation}` : ""} · <code className="font-mono text-xs">{lead.lead_number}</code>
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs t-muted">Owner</span>
            <AssignControl lead={lead} users={users} onAssigned={() => { loadLead(); flash("Lead assigned."); }} />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => navigate(`/superadmin/leads/${id}/edit`)} className="btn-secondary">Edit</button>
        </div>
      </div>

      {banner && (
        <div className="rounded-lg px-4 py-3 text-sm" style={{ backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#10b981" }}>{banner}</div>
      )}

      <StageManager lead={lead} options={options} onChange={() => { loadLead(); flash("Stage updated."); }} onConverted={() => { loadLead(); flash("Lead converted to client."); }} />

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap border-b" style={{ borderColor: "var(--c-border)" }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="px-3.5 py-2 text-sm font-medium transition-all relative"
            style={{ color: tab === t ? "var(--c-accent)" : "var(--c-muted)" }}>
            {t}
            {tab === t && <span className="absolute left-0 right-0 -bottom-px h-0.5" style={{ background: "linear-gradient(90deg,#00aeec,#ff7a1a)" }} />}
          </button>
        ))}
      </div>

      <div>
        {tab === "Overview" && <Overview lead={lead} />}
        {tab === "Spokespersons" && <SpokespersonsTab leadId={id} />}
        {tab === "Activities" && <ActivitiesTab leadId={id} options={options} onMutate={loadLead} />}
        {tab === "Demos" && <DemosTab leadId={id} options={options} onMutate={loadLead} />}
        {tab === "Follow-ups" && <FollowupsTab leadId={id} options={options} />}
        {tab === "Notes" && <NotesTab leadId={id} />}
        {tab === "Documents" && <DocumentsTab leadId={id} options={options} />}
        {tab === "Proposals" && <ProposalsTab leadId={id} options={options} onMutate={loadLead} />}
        {tab === "Negotiations" && <NegotiationsTab leadId={id} options={options} onMutate={loadLead} />}
        {tab === "Conversions" && <ConversionsTab leadId={id} />}
        {tab === "Timeline" && <TimelineTab leadId={id} />}
      </div>
    </div>
  );
}

/* ── Stage manager + conversion ──────────────────────────────────────────── */
function StageManager({ lead, options, onChange, onConverted }) {
  const [stage, setStage] = useState(lead.current_stage);
  const [saving, setSaving] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);

  useEffect(() => { setStage(lead.current_stage); }, [lead.current_stage]);

  const apply = async (newStage) => {
    if (newStage === "Lost") { setLostOpen(true); return; }
    setSaving(true);
    try {
      await leadsApi.setStage(lead.id, newStage);
      onChange();
    } catch (e) {
      alert(e.response?.data?.detail || "Failed to update stage.");
    } finally {
      setSaving(false);
    }
  };

  const currentIdx = STAGE_ORDER.indexOf(lead.current_stage);

  return (
    <div className="rounded-xl p-4" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
      {/* Pipeline progress */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STAGE_ORDER.filter((s) => s !== "Lost").map((s, i) => {
          const done = STAGE_ORDER.indexOf(s) <= currentIdx && lead.status !== "Lost";
          return (
            <React.Fragment key={s}>
              {i > 0 && <span className="h-px w-4 flex-shrink-0" style={{ background: done ? "#10b981" : "var(--c-border)" }} />}
              <button onClick={() => apply(s)} disabled={saving || lead.converted_to_client}
                className="text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap transition-all"
                style={{
                  background: s === lead.current_stage ? "linear-gradient(135deg,#00aeec,#ff7a1a)" : done ? "rgba(16,185,129,0.12)" : "var(--c-surface2)",
                  color: s === lead.current_stage ? "#fff" : done ? "#10b981" : "var(--c-muted)",
                  border: "1px solid " + (done ? "rgba(16,185,129,0.25)" : "var(--c-border)"),
                  cursor: lead.converted_to_client ? "not-allowed" : "pointer",
                }}>
                {s}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      <div className="flex items-center gap-3 flex-wrap mt-3 pt-3" style={{ borderTop: "1px solid var(--c-border)" }}>
        <div className="flex items-center gap-2">
          <Select value={stage} onChange={(e) => setStage(e.target.value)} options={toOptions(options.stages || STAGE_ORDER)} placeholder="Stage" selectClassName="text-sm" className="w-44" />
          <button className="btn-secondary text-sm" disabled={saving || stage === lead.current_stage} onClick={() => apply(stage)}>Update Stage</button>
        </div>
        <div className="flex-1" />
        {lead.status !== "Lost" && !lead.converted_to_client && (
          <button className="btn-danger text-sm" onClick={() => setLostOpen(true)}>Mark Lost</button>
        )}
        {lead.current_stage === "Won" && !lead.converted_to_client && (
          <button className="btn-primary text-sm" onClick={() => setConvertOpen(true)}>Convert to Client</button>
        )}
        {lead.converted_to_client && (
          <span className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" }}>
            ✓ Converted to client
          </span>
        )}
      </div>

      <MarkLostModal open={lostOpen} onClose={() => setLostOpen(false)} leadId={lead.id} options={options} onDone={() => { setLostOpen(false); onChange(); }} />
      <ConvertModal open={convertOpen} onClose={() => setConvertOpen(false)} leadId={lead.id} onDone={() => { setConvertOpen(false); onConverted(); }} />
    </div>
  );
}

function MarkLostModal({ open, onClose, leadId, options, onDone }) {
  const [form, setForm] = useState({ loss_reason: "", competitor_name: "", remarks: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!form.loss_reason) { setErr("Please choose a loss reason."); return; }
    setSaving(true);
    try {
      await leadsApi.markLost(leadId, form);
      onDone();
    } catch (e) {
      setErr(e.response?.data?.detail || "Failed to mark lost.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Mark Lead as Lost" size="md"
      footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-danger" disabled={saving} onClick={submit}>{saving ? "Saving..." : "Mark Lost"}</button></>}>
      <div className="space-y-4">
        {err && <p className="text-xs text-red-400">{err}</p>}
        <Select label="Loss Reason" required value={form.loss_reason} onChange={(e) => setForm((f) => ({ ...f, loss_reason: e.target.value }))} options={toOptions(options.loss_reasons)} placeholder="Select reason" />
        <Input label="Competitor Name" value={form.competitor_name} onChange={(e) => setForm((f) => ({ ...f, competitor_name: e.target.value }))} placeholder="If lost to a competitor" />
        <Textarea label="Remarks" value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} rows={3} placeholder="What happened?" />
      </div>
    </Modal>
  );
}

function ConvertModal({ open, onClose, leadId, onDone }) {
  const [form, setForm] = useState({ client_name: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setSaving(true); setErr("");
    try {
      const payload = {};
      if (form.client_name.trim()) payload.client_name = form.client_name.trim();
      await leadsApi.convertToClient(leadId, payload);
      onDone();
    } catch (e) {
      setErr(e.response?.data?.detail || "Conversion failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Convert Lead to Client" size="md"
      footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={saving} onClick={submit}>{saving ? "Converting..." : "Convert"}</button></>}>
      <div className="space-y-4">
        {err && <p className="text-xs text-red-400">{err}</p>}
        <p className="text-sm t-body">This marks the lead as converted and records the conversion with sales-cycle metrics.</p>
        <Input label="Client Name (optional)" value={form.client_name} onChange={(e) => setForm({ client_name: e.target.value })} placeholder="defaults to company name" hint="Leave blank to use the lead's company name." />
      </div>
    </Modal>
  );
}

/* ── Overview ────────────────────────────────────────────────────────────── */
function Overview({ lead }) {
  const m = lead.metrics || {};
  const phoneDisplay = lead.phone
    ? `${lead.country_code ? `${lead.country_code} ` : ""}${lead.phone}`
    : "";
  const rows = [
    ["Assigned To", lead.lead_owner_name || (lead.lead_owner_id ? `User #${lead.lead_owner_id}` : null)],
    ["Email", lead.email], ["Phone", phoneDisplay], ["Website", lead.website],
    ["Industry", lead.industry], ["Country", lead.country], ["Company Size", lead.company_size],
    ["Expected Users", lead.expected_user_count], ["Expected Revenue", formatCurrency(lead.expected_revenue)],
    ["Interested Modules", lead.interested_modules], ["Source", lead.lead_source],
    ["Expected Go-Live", formatDate(lead.expected_go_live_date)],
    ["First Contact", formatDate(lead.first_contact_date)], ["Demo Date", formatDate(lead.demo_date)],
    ["Proposal Date", formatDate(lead.proposal_date)], ["Won Date", formatDate(lead.won_date)],
    ["Conversion Date", formatDate(lead.conversion_date)], ["Created", formatDateTime(lead.created_at)],
  ];
  const metrics = [
    ["Lead Age", m.lead_age_days], ["Sales Cycle", m.sales_cycle_days],
    ["Time to Demo", m.time_to_demo_days], ["Time to Proposal", m.time_to_proposal_days],
    ["Time to Conversion", m.time_to_conversion_days],
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 rounded-xl p-5" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
        <h3 className="text-sm font-semibold t-heading mb-4">Lead Information</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {rows.map(([k, v]) => (
            <div key={k} className="flex flex-col">
              <dt className="text-xs t-muted">{k}</dt>
              <dd className="text-sm t-body break-words">{v || "—"}</dd>
            </div>
          ))}
        </dl>
        {lead.source_enquiry && <SourceEnquiry enquiry={lead.source_enquiry} />}
        {lead.status === "Lost" && (
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--c-border)" }}>
            <h4 className="text-xs font-semibold text-red-400 mb-2">Loss Analysis</h4>
            <p className="text-sm t-body">Reason: {lead.loss_reason || "—"}{lead.competitor_name ? ` · Competitor: ${lead.competitor_name}` : ""}</p>
            {lead.loss_remarks && <p className="text-sm t-muted mt-1">{lead.loss_remarks}</p>}
          </div>
        )}
      </div>
      <div className="rounded-xl p-5" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
        <h3 className="text-sm font-semibold t-heading mb-4">Conversion Metrics</h3>
        <div className="space-y-3">
          {metrics.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between">
              <span className="text-xs t-muted">{k}</span>
              <span className="text-sm font-semibold t-body tabular-nums">{v != null ? `${v} days` : "—"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Source enquiry (reverse traceability: Website Enquiry → Lead) ───────── */
function SourceEnquiry({ enquiry }) {
  const navigate = useNavigate();
  return (
    <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--c-border)" }}>
      <h4 className="text-xs font-semibold t-heading mb-2">Source Enquiry</h4>
      <button
        onClick={() => navigate(`/superadmin/enquiries/${enquiry.id}`)}
        className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all"
        style={{ background: "rgba(139,92,246,0.1)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.25)" }}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <code className="font-mono text-xs">{enquiry.enquiry_number}</code>
        {enquiry.source && <span className="t-muted text-xs">· {enquiry.source}</span>}
        <span className="t-muted text-xs">· {formatDate(enquiry.created_at)}</span>
      </button>
    </div>
  );
}

/* ── Inline assign control ───────────────────────────────────────────────── */
function AssignControl({ lead, users, onAssigned }) {
  const [editing, setEditing] = useState(false);
  const [sel, setSel] = useState(lead.lead_owner_id ? String(lead.lead_owner_id) : "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSel(lead.lead_owner_id ? String(lead.lead_owner_id) : "");
  }, [lead.lead_owner_id]);

  const save = async () => {
    setSaving(true);
    try {
      await leadsApi.assign(lead.id, sel ? Number(sel) : null);
      setEditing(false);
      onAssigned();
    } catch (e) {
      alert(e.response?.data?.detail || "Failed to assign lead.");
    } finally {
      setSaving(false);
    }
  };

  const displayName = lead.lead_owner_name
    || (lead.lead_owner_id ? `User #${lead.lead_owner_id}` : "Unassigned");

  if (!editing) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="text-xs px-2.5 py-0.5 rounded-full"
          style={{
            background: lead.lead_owner_id ? "rgba(0,174,236,0.1)" : "var(--c-surface2)",
            color: lead.lead_owner_id ? "var(--c-accent)" : "var(--c-muted)",
            border: `1px solid ${lead.lead_owner_id ? "rgba(0,174,236,0.25)" : "var(--c-border)"}`,
          }}>
          {displayName}
        </span>
        <button onClick={() => setEditing(true)} className="text-xs t-muted hover:t-accent transition-colors">
          Reassign
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <select value={sel} onChange={(e) => setSel(e.target.value)}
        style={{ fontSize: 12, padding: "3px 8px", borderRadius: 6, background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)", cursor: "pointer" }}>
        <option value="">Unassigned</option>
        {users.map(u => (
          <option key={u.id} value={String(u.id)}>{u.name || u.email}</option>
        ))}
      </select>
      <button onClick={save} disabled={saving} className="btn-primary" style={{ fontSize: 12, padding: "3px 10px" }}>
        {saving ? "Saving…" : "Save"}
      </button>
      <button
        onClick={() => { setEditing(false); setSel(lead.lead_owner_id ? String(lead.lead_owner_id) : ""); }}
        className="text-xs t-muted hover:t-accent">
        Cancel
      </button>
    </span>
  );
}

/* ── Score override (manual Hot/Warm/Cold) ───────────────────────────────── */
function ScoreOverride({ lead, options, onChange }) {
  const [saving, setSaving] = useState(false);
  const labels = options.score_labels || ["Hot", "Warm", "Cold"];

  const apply = async (value) => {
    setSaving(true);
    try {
      await leadsApi.setScoreLabel(lead.id, value === "auto" ? null : value);
      onChange();
    } catch (e) {
      alert(e.response?.data?.detail || "Failed to update score.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <Select
        value={lead.score_label_override || "auto"}
        onChange={(e) => apply(e.target.value)}
        options={[{ value: "auto", label: "Auto score" }, ...toOptions(labels)]}
        selectClassName="text-xs py-1"
        className="w-32"
        disabled={saving}
      />
      {lead.score_label_override && (
        <span className="text-[10px] uppercase tracking-wide t-muted">manual</span>
      )}
    </span>
  );
}

/* ── Generic list helpers ────────────────────────────────────────────────── */
function TabShell({ title, onAdd, addLabel = "Add", children }) {
  return (
    <div className="rounded-xl p-5" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold t-heading">{title}</h3>
        {onAdd && <button onClick={onAdd} className="btn-primary text-sm">{addLabel}</button>}
      </div>
      {children}
    </div>
  );
}

function Empty({ text }) {
  return <p className="text-sm t-muted py-6 text-center">{text}</p>;
}

function useList(fetcher, deps = []) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(() => {
    setLoading(true);
    fetcher()
      .then((res) => setItems((res.data?.data ?? res.data) || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, [reload]);
  return [items, loading, reload];
}

/* ── Spokespersons ───────────────────────────────────────────────────────── */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_RE = /^\+?[0-9]{1,4}$/;

function SpokespersonsTab({ leadId }) {
  const [items, loading, reload] = useList(() => leadsApi.spokespersons(leadId), [leadId]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const EMPTY_FORM = { name: "", designation: "", email: "", country_code: "", phone: "", is_primary: false };
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setErrors({}); setErr(""); setOpen(true); };
  const openEdit = (s) => {
    setEditing(s);
    setForm({
      name: s.name || "", designation: s.designation || "", email: s.email || "",
      country_code: s.country_code || "", phone: s.phone || "", is_primary: !!s.is_primary,
    });
    setErrors({}); setErr(""); setOpen(true);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required.";
    else if (form.name.trim().length > 120) e.name = "Must be under 120 characters.";
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) e.email = "Enter a valid email address.";
    if (form.country_code.trim() && !CODE_RE.test(form.country_code.trim().replace(/\s/g, "")))
      e.country_code = "Use a dialing code like +1 or +44.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true); setErr("");
    const trim = (v) => (typeof v === "string" ? v.trim() : v);
    const payload = {
      name: trim(form.name),
      designation: trim(form.designation) || undefined,
      email: trim(form.email) || undefined,
      country_code: trim(form.country_code) || undefined,
      phone: trim(form.phone) || undefined,
      is_primary: form.is_primary,
    };
    try {
      if (editing) await leadsApi.updateSpokesperson(leadId, editing.id, payload);
      else await leadsApi.addSpokesperson(leadId, payload);
      setOpen(false); reload();
    } catch (e) { setErr(e.response?.data?.detail || "Failed."); } finally { setSaving(false); }
  };

  const [confirmSpk, setConfirmSpk] = useState({ open: false, id: null });
  const remove = (sid) => setConfirmSpk({ open: true, id: sid });
  const confirmRemove = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await leadsApi.deleteSpokesperson(leadId, confirmSpk.id);
      setConfirmSpk({ open: false, id: null }); reload();
    } finally { setDeleting(false); }
  };

  const setField = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  return (
    <TabShell title="Spokespersons" addLabel="Add Spokesperson" onAdd={openCreate}>
      {loading ? <Empty text="Loading…" /> : items.length === 0 ? <Empty text="No spokespersons added yet." /> : (
        <ul className="space-y-2">
          {items.map((s) => (
            <li key={s.id} className="flex items-start justify-between gap-3 p-3 rounded-lg" style={{ background: "var(--c-surface2)", border: "1px solid var(--c-border)" }}>
              <div>
                <p className="text-sm font-medium t-heading flex items-center gap-2">
                  {s.name}
                  {s.designation && <span className="text-xs t-muted font-normal">· {s.designation}</span>}
                  {s.is_primary && (
                    <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ background: "rgba(0,174,236,0.12)", color: "#00aeec", border: "1px solid rgba(0,174,236,0.25)" }}>Primary</span>
                  )}
                </p>
                <p className="text-xs t-muted mt-0.5">
                  {s.email || "—"}
                  {s.phone ? ` · ${s.country_code ? `${s.country_code} ` : ""}${s.phone}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <EditIconBtn onClick={() => openEdit(s)} title="Edit spokesperson" />
                <DeleteIconBtn onClick={() => remove(s.id)} title="Delete spokesperson" disabled={deleting} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={confirmSpk.open}
        title="Delete Spokesperson"
        message="Are you sure you want to delete this spokesperson? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmRemove}
        onCancel={() => setConfirmSpk({ open: false, id: null })}
        loading={deleting}
      />
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit Spokesperson" : "Add Spokesperson"} size="md"
        footer={<><button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" disabled={saving} onClick={submit}>{saving ? "Saving..." : "Save"}</button></>}>
        <div className="space-y-4">
          {err && <p className="text-xs text-red-400">{err}</p>}
          <Input label="Name" required value={form.name} onChange={(e) => setField("name", e.target.value)} error={errors.name} placeholder="Jane Doe" maxLength={120} />
          <Input label="Designation" value={form.designation} onChange={(e) => setField("designation", e.target.value)} placeholder="VP of Operations" maxLength={120} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} error={errors.email} placeholder="jane@acme.com" />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Code" value={form.country_code} onChange={(e) => setField("country_code", e.target.value)} error={errors.country_code} placeholder="+1" maxLength={8} />
            <div className="col-span-2">
              <Input label="Phone" value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="555 000 0000" maxLength={30} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm t-body cursor-pointer">
            <input type="checkbox" checked={form.is_primary} onChange={(e) => setField("is_primary", e.target.checked)} />
            Primary spokesperson
          </label>
        </div>
      </Modal>
    </TabShell>
  );
}

/* ── Activities ──────────────────────────────────────────────────────────── */
function ActivitiesTab({ leadId, options, onMutate }) {
  const [items, loading, reload] = useList(() => leadsApi.activities(leadId), [leadId]);
  const [open, setOpen] = useState(false);
  const EMPTY_FORM = { activity_type: "", activity_date: "", remarks: "", next_action: "", next_action_date: "" };
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [deleting, setDeleting] = useState(false);

  const submit = async () => {
    if (!form.activity_type) { setErr("Activity type is required."); return; }
    setSaving(true); setErr("");
    try {
      await leadsApi.addActivity(leadId, {
        activity_type: form.activity_type,
        activity_date: form.activity_date || undefined,
        remarks: form.remarks || undefined,
        next_action: form.next_action || undefined,
        next_action_date: form.next_action_date || undefined,
      });
      setOpen(false); setForm(EMPTY_FORM);
      reload(); onMutate?.();
    } catch (e) { setErr(e.response?.data?.detail || "Failed."); } finally { setSaving(false); }
  };

  const [confirmAct, setConfirmAct] = useState({ open: false, id: null });
  const remove = (aid) => setConfirmAct({ open: true, id: aid });
  const confirmRemove = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await leadsApi.deleteActivity(leadId, confirmAct.id);
      setConfirmAct({ open: false, id: null }); reload();
    } finally { setDeleting(false); }
  };

  return (
    <TabShell title="Activities" addLabel="Log Activity" onAdd={() => setOpen(true)}>
      {loading ? <Empty text="Loading…" /> : items.length === 0 ? <Empty text="No activities logged yet." /> : (
        <ul className="space-y-2">
          {items.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 p-3 rounded-lg" style={{ background: "var(--c-surface2)", border: "1px solid var(--c-border)" }}>
              <div>
                <p className="text-sm font-medium t-heading">{a.activity_type} <span className="text-xs t-muted font-normal">· {formatDateTime(a.activity_date)}</span></p>
                {a.remarks && <p className="text-sm t-body mt-0.5">{a.remarks}</p>}
                {(a.next_action || a.next_action_date) && (
                  <p className="text-xs t-muted mt-0.5">
                    Next action{a.next_action ? `: ${a.next_action}` : ""}{a.next_action_date ? ` (${formatDate(a.next_action_date)})` : ""}
                  </p>
                )}
              </div>
              <DeleteIconBtn onClick={() => remove(a.id)} title="Delete activity" disabled={deleting} />
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={confirmAct.open}
        title="Delete Activity"
        message="Are you sure you want to delete this activity? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmRemove}
        onCancel={() => setConfirmAct({ open: false, id: null })}
        loading={deleting}
      />
      <Modal open={open} onClose={() => setOpen(false)} title="Log Activity" size="md"
        footer={<><button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" disabled={saving} onClick={submit}>{saving ? "Saving..." : "Save"}</button></>}>
        <div className="space-y-4">
          {err && <p className="text-xs text-red-400">{err}</p>}
          <Select label="Activity Type" required value={form.activity_type} onChange={(e) => setForm((f) => ({ ...f, activity_type: e.target.value }))} options={toOptions(options.activity_types)} placeholder="Select type" />
          <Input label="Activity Date" type="datetime-local" value={form.activity_date} onChange={(e) => setForm((f) => ({ ...f, activity_date: e.target.value }))} />
          <Textarea label="Remarks" value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} rows={3} />
          <Textarea label="Next Action" value={form.next_action} onChange={(e) => setForm((f) => ({ ...f, next_action: e.target.value }))} rows={2} placeholder="What needs to happen next? e.g. Send pricing breakdown to procurement" />
          <Input label="Next Action Date" type="date" value={form.next_action_date} onChange={(e) => setForm((f) => ({ ...f, next_action_date: e.target.value }))} />
        </div>
      </Modal>
    </TabShell>
  );
}

/* ── Demos ───────────────────────────────────────────────────────────────── */
function DemosTab({ leadId, options, onMutate }) {
  const [items, loading, reload] = useList(() => leadsApi.demos(leadId), [leadId]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ demo_date: "", demo_type: "", conducted_by: "", status: "Scheduled", feedback: "", interested_modules: "", expected_users: "", next_steps: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!form.demo_date) { setErr("Demo date is required."); return; }
    setSaving(true); setErr("");
    try {
      await leadsApi.addDemo(leadId, {
        demo_date: form.demo_date,
        demo_type: form.demo_type || undefined,
        conducted_by: form.conducted_by || undefined,
        status: form.status || undefined,
        feedback: form.feedback || undefined,
        interested_modules: form.interested_modules || undefined,
        expected_users: form.expected_users !== "" ? Number(form.expected_users) : undefined,
        next_steps: form.next_steps || undefined,
      });
      setOpen(false);
      setForm({ demo_date: "", demo_type: "", conducted_by: "", status: "Scheduled", feedback: "", interested_modules: "", expected_users: "", next_steps: "" });
      reload(); onMutate?.();
    } catch (e) { setErr(e.response?.data?.detail || "Failed."); } finally { setSaving(false); }
  };

  const setStatus = async (demo, status) => {
    await leadsApi.updateDemo(leadId, demo.id, { status }); reload(); onMutate?.();
  };

  return (
    <TabShell title="Demos" addLabel="Schedule Demo" onAdd={() => setOpen(true)}>
      {loading ? <Empty text="Loading…" /> : items.length === 0 ? <Empty text="No demos scheduled yet." /> : (
        <ul className="space-y-2">
          {items.map((d) => (
            <li key={d.id} className="p-3 rounded-lg" style={{ background: "var(--c-surface2)", border: "1px solid var(--c-border)" }}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium t-heading">{formatDateTime(d.demo_date)} <span className="text-xs t-muted font-normal">· {d.demo_type || "—"}{d.conducted_by ? ` · ${d.conducted_by}` : ""}</span></p>
                <Select value={d.status} onChange={(e) => setStatus(d, e.target.value)} options={toOptions(options.demo_statuses)} placeholder="Status" selectClassName="text-xs py-1" className="w-36" />
              </div>
              {d.feedback && <p className="text-sm t-body mt-1">{d.feedback}</p>}
              {d.next_steps && <p className="text-xs t-muted mt-0.5">Next: {d.next_steps}</p>}
            </li>
          ))}
        </ul>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Schedule Demo" size="lg"
        footer={<><button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" disabled={saving} onClick={submit}>{saving ? "Saving..." : "Save"}</button></>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {err && <p className="text-xs text-red-400 sm:col-span-2">{err}</p>}
          <Input label="Demo Date" type="datetime-local" required value={form.demo_date} onChange={(e) => setForm((f) => ({ ...f, demo_date: e.target.value }))} />
          <Select label="Demo Type" value={form.demo_type} onChange={(e) => setForm((f) => ({ ...f, demo_type: e.target.value }))} options={toOptions(options.demo_types)} placeholder="Select type" />
          <Input label="Conducted By" value={form.conducted_by} onChange={(e) => setForm((f) => ({ ...f, conducted_by: e.target.value }))} />
          <Select label="Status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} options={toOptions(options.demo_statuses)} placeholder="Status" />
          <Input label="Expected Users" type="number" min="0" value={form.expected_users} onChange={(e) => setForm((f) => ({ ...f, expected_users: e.target.value }))} />
          <Input label="Interested Modules" value={form.interested_modules} onChange={(e) => setForm((f) => ({ ...f, interested_modules: e.target.value }))} />
          <Textarea label="Feedback" value={form.feedback} onChange={(e) => setForm((f) => ({ ...f, feedback: e.target.value }))} rows={2} className="sm:col-span-2" />
          <Textarea label="Next Steps" value={form.next_steps} onChange={(e) => setForm((f) => ({ ...f, next_steps: e.target.value }))} rows={2} className="sm:col-span-2" />
        </div>
      </Modal>
    </TabShell>
  );
}

/* ── Follow-ups ──────────────────────────────────────────────────────────── */
function FollowupsTab({ leadId, options }) {
  const [items, loading, reload] = useList(() => leadsApi.followups(leadId), [leadId]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ followup_date: "", followup_type: "", priority: "Medium", remarks: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [deleting, setDeleting] = useState(false);

  const submit = async () => {
    if (!form.followup_date) { setErr("Follow-up date is required."); return; }
    setSaving(true); setErr("");
    try {
      await leadsApi.addFollowup(leadId, {
        followup_date: form.followup_date,
        followup_type: form.followup_type || undefined,
        priority: form.priority || undefined,
        remarks: form.remarks || undefined,
      });
      setOpen(false); setForm({ followup_date: "", followup_type: "", priority: "Medium", remarks: "" });
      reload();
    } catch (e) { setErr(e.response?.data?.detail || "Failed."); } finally { setSaving(false); }
  };

  const [confirmFup, setConfirmFup] = useState({ open: false, id: null });
  const complete = async (f) => { await leadsApi.updateFollowup(leadId, f.id, { status: "Completed" }); reload(); };
  const remove = (f) => setConfirmFup({ open: true, id: f.id });
  const confirmRemove = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await leadsApi.deleteFollowup(leadId, confirmFup.id);
      setConfirmFup({ open: false, id: null }); reload();
    } finally { setDeleting(false); }
  };

  const statusColor = (s) => s === "Completed" ? "#10b981" : s === "Overdue" ? "#ef4444" : "#f59e0b";

  return (
    <TabShell title="Follow-ups" addLabel="Add Follow-up" onAdd={() => setOpen(true)}>
      {loading ? <Empty text="Loading…" /> : items.length === 0 ? <Empty text="No follow-ups scheduled." /> : (
        <ul className="space-y-2">
          {items.map((f) => (
            <li key={f.id} className="flex items-start justify-between gap-3 p-3 rounded-lg" style={{ background: "var(--c-surface2)", border: "1px solid var(--c-border)" }}>
              <div>
                <p className="text-sm font-medium t-heading flex items-center gap-2">
                  {formatDateTime(f.followup_date)}
                  <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: `${statusColor(f.status)}1f`, color: statusColor(f.status), border: `1px solid ${statusColor(f.status)}40` }}>{f.status}</span>
                </p>
                <p className="text-xs t-muted mt-0.5">{f.followup_type || "—"} · {f.priority} priority</p>
                {f.remarks && <p className="text-sm t-body mt-1">{f.remarks}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {f.status !== "Completed" && <button onClick={() => complete(f)} className="text-xs t-accent hover:underline">Complete</button>}
                <DeleteIconBtn onClick={() => remove(f)} title="Delete follow-up" disabled={deleting} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={confirmFup.open}
        title="Delete Follow-up"
        message="Are you sure you want to delete this follow-up? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmRemove}
        onCancel={() => setConfirmFup({ open: false, id: null })}
        loading={deleting}
      />
      <Modal open={open} onClose={() => setOpen(false)} title="Add Follow-up" size="md"
        footer={<><button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" disabled={saving} onClick={submit}>{saving ? "Saving..." : "Save"}</button></>}>
        <div className="space-y-4">
          {err && <p className="text-xs text-red-400">{err}</p>}
          <Input label="Follow-up Date" type="datetime-local" required value={form.followup_date} onChange={(e) => setForm((f) => ({ ...f, followup_date: e.target.value }))} />
          <Select label="Type" value={form.followup_type} onChange={(e) => setForm((f) => ({ ...f, followup_type: e.target.value }))} options={toOptions(options.followup_types)} placeholder="Select type" />
          <Select label="Priority" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} options={toOptions(options.followup_priorities)} placeholder="Priority" />
          <Textarea label="Remarks" value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} rows={3} />
        </div>
      </Modal>
    </TabShell>
  );
}

/* ── Notes ───────────────────────────────────────────────────────────────── */
function NotesTab({ leadId }) {
  const [items, loading, reload] = useList(() => leadsApi.notes(leadId), [leadId]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const submit = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try { await leadsApi.addNote(leadId, { note: note.trim() }); setNote(""); reload(); }
    finally { setSaving(false); }
  };
  const [confirmNote, setConfirmNote] = useState({ open: false, id: null });
  const remove = (n) => setConfirmNote({ open: true, id: n.id });
  const confirmRemove = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await leadsApi.deleteNote(leadId, confirmNote.id);
      setConfirmNote({ open: false, id: null }); reload();
    } finally { setDeleting(false); }
  };

  return (
    <TabShell title="Notes">
      <div className="flex gap-2 mb-4">
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Write an internal note…" className="input-field flex-1"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }} />
        <button onClick={submit} disabled={saving || !note.trim()} className="btn-primary">Add</button>
      </div>
      {loading ? <Empty text="Loading…" /> : items.length === 0 ? <Empty text="No notes yet." /> : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id} className="flex items-start justify-between gap-3 p-3 rounded-lg" style={{ background: "var(--c-surface2)", border: "1px solid var(--c-border)" }}>
              <div>
                <p className="text-sm t-body whitespace-pre-wrap break-words">{n.note}</p>
                <p className="text-xs t-muted mt-1">{formatDateTime(n.created_at)}</p>
              </div>
              <DeleteIconBtn onClick={() => remove(n)} title="Delete note" disabled={deleting} />
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={confirmNote.open}
        title="Delete Note"
        message="Are you sure you want to delete this note? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmRemove}
        onCancel={() => setConfirmNote({ open: false, id: null })}
        loading={deleting}
      />
    </TabShell>
  );
}

/* ── Documents ───────────────────────────────────────────────────────────── */
function DocumentsTab({ leadId, options }) {
  const [items, loading, reload] = useList(() => leadsApi.documents(leadId), [leadId]);
  const [file, setFile] = useState(null);
  const [docTypeId, setDocTypeId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const [replacing, setReplacing] = useState(null);
  const [replaceFile, setReplaceFile] = useState(null);
  const [replaceErr, setReplaceErr] = useState("");
  const [replaceSaving, setReplaceSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteErr, setDeleteErr] = useState("");
  const [deleting, setDeleting] = useState(false);

  const docTypeMaster = options?.document_type_master || [];

  const upload = async () => {
    if (!file) { setErr("Choose a file first."); return; }
    setUploading(true); setErr("");
    try {
      const selected = docTypeMaster.find((t) => t.id === docTypeId);
      await leadsApi.uploadDocument(leadId, file, docTypeId || null, selected?.name || "Other");
      setFile(null); setDocTypeId("");
      reload();
    } catch (er) { setErr(er.response?.data?.detail || "Upload failed."); }
    finally { setUploading(false); }
  };

  const download = async (d) => {
    try { await saveBlob(leadsApi.downloadDocument(leadId, d.id), d.file_name); }
    catch (e) { alert(e.response?.data?.detail || "Download failed."); }
  };

  const openReplace = (d) => { setReplacing(d); setReplaceFile(null); setReplaceErr(""); };

  const doReplace = async () => {
    if (!replaceFile) { setReplaceErr("Choose a replacement file first."); return; }
    setReplaceSaving(true); setReplaceErr("");
    try {
      await leadsApi.replaceDocument(leadId, replacing.id, replaceFile);
      setReplacing(null);
      reload();
    } catch (e) { setReplaceErr(e.response?.data?.detail || "Replace failed."); }
    finally { setReplaceSaving(false); }
  };

  const confirmDelete = (d) => { setDeleteTarget(d); setDeleteErr(""); };

  const doDelete = async () => {
    if (deleting || !deleteTarget) return;
    setDeleting(true);
    try {
      await leadsApi.deleteDocument(leadId, deleteTarget.id);
      setDeleteTarget(null);
      reload();
    } catch (e) { setDeleteErr(e.response?.data?.detail || "Delete failed."); }
    finally { setDeleting(false); }
  };

  return (
    <TabShell title="Documents">
      {/* Upload form */}
      <div className="flex flex-wrap items-end gap-3 mb-4 pb-4" style={{ borderBottom: "1px solid var(--c-border)" }}>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium t-muted">Document Type</label>
          <select
            value={docTypeId}
            onChange={(e) => setDocTypeId(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm w-48"
            style={{ background: "var(--c-surface2)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
          >
            <option value="">— Select type —</option>
            {docTypeMaster.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium t-muted">File</label>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)}
                 className="text-sm t-body file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[var(--c-accent)] file:text-white" />
        </div>
        <button onClick={upload} disabled={uploading} className="btn-primary text-sm">
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </div>
      {err && <div className="rounded-lg px-3 py-2 text-sm text-red-400 mb-3" style={{ background: "rgba(239,68,68,0.08)" }}>{err}</div>}

      {loading ? <Empty text="Loading…" /> : items.length === 0 ? <Empty text="No documents uploaded." /> : (
        <ul className="space-y-2">
          {items.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 p-3 rounded-lg" style={{ background: "var(--c-surface2)", border: "1px solid var(--c-border)" }}>
              <div className="min-w-0">
                <p className="text-sm font-medium t-heading truncate">{d.file_name}</p>
                <p className="text-xs t-muted">{d.document_type || "—"} · {formatDateTime(d.created_at)}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {d.has_file && <button onClick={() => download(d)} className="text-xs t-muted hover:text-[var(--c-accent)]">Download</button>}
                <button onClick={() => openReplace(d)} className="text-xs t-muted hover:text-[var(--c-accent)]">Replace</button>
                <button onClick={() => confirmDelete(d)} disabled={deleting} className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Replace modal */}
      {replacing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-xl p-6 w-full max-w-md" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
            <h3 className="text-base font-semibold t-heading mb-1">Replace File</h3>
            <p className="text-sm t-muted mb-4">Replacing: <span className="font-medium t-body">{replacing.file_name}</span>. The document type and metadata will be kept.</p>
            <input type="file" onChange={(e) => setReplaceFile(e.target.files?.[0] || null)}
                   className="text-sm t-body file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[var(--c-accent)] file:text-white mb-3 w-full" />
            {replaceErr && <p className="text-xs text-red-400 mb-3">{replaceErr}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setReplacing(null)} className="btn-ghost text-sm">Cancel</button>
              <button onClick={doReplace} disabled={replaceSaving} className="btn-primary text-sm">
                {replaceSaving ? "Replacing…" : "Replace File"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-xl p-6 w-full max-w-sm" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
            <h3 className="text-base font-semibold t-heading mb-2">Delete Document?</h3>
            <p className="text-sm t-muted mb-4">
              "<span className="font-medium t-body">{deleteTarget.file_name}</span>" will be permanently removed.
            </p>
            {deleteErr && <p className="text-xs text-red-400 mb-3">{deleteErr}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="btn-ghost text-sm disabled:opacity-50">Cancel</button>
              <button onClick={doDelete} disabled={deleting} className="text-sm px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </TabShell>
  );
}

/* ── Proposals ───────────────────────────────────────────────────────────── */
function ProposalsTab({ leadId, options, onMutate }) {
  const [items, loading, reload] = useList(() => leadsApi.proposals(leadId), [leadId]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ proposalDate: "", quotedAmount: "", modulesIncluded: "", status: "Draft", file: null });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setSaving(true); setErr("");
    try {
      await leadsApi.addProposal(leadId, {
        proposalDate: form.proposalDate ? new Date(form.proposalDate).toISOString() : undefined,
        quotedAmount: form.quotedAmount,
        modulesIncluded: form.modulesIncluded,
        status: form.status,
        file: form.file,
      });
      setOpen(false); setForm({ proposalDate: "", quotedAmount: "", modulesIncluded: "", status: "Draft", file: null });
      reload(); onMutate?.();
    } catch (e) { setErr(e.response?.data?.detail || "Failed."); } finally { setSaving(false); }
  };

  const setStatus = async (p, status) => { await leadsApi.updateProposal(leadId, p.id, { status }); reload(); onMutate?.(); };

  return (
    <TabShell title="Proposals" addLabel="New Proposal" onAdd={() => setOpen(true)}>
      {loading ? <Empty text="Loading…" /> : items.length === 0 ? <Empty text="No proposals yet." /> : (
        <ul className="space-y-2">
          {items.map((p) => (
            <li key={p.id} className="p-3 rounded-lg" style={{ background: "var(--c-surface2)", border: "1px solid var(--c-border)" }}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium t-heading">v{p.proposal_version} · {formatCurrency(p.quoted_amount)} <span className="text-xs t-muted font-normal">· {formatDate(p.proposal_date)}</span></p>
                <Select value={p.status} onChange={(e) => setStatus(p, e.target.value)} options={toOptions(options.proposal_statuses)} placeholder="Status" selectClassName="text-xs py-1" className="w-32" />
              </div>
              {p.modules_included && <p className="text-sm t-body mt-1">{p.modules_included}</p>}
              {p.has_file && <button onClick={() => saveBlob(leadsApi.downloadProposal(leadId, p.id), `proposal-v${p.proposal_version}`)} className="text-xs t-accent hover:underline mt-1 inline-block">Download document</button>}
            </li>
          ))}
        </ul>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="New Proposal" size="md"
        footer={<><button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" disabled={saving} onClick={submit}>{saving ? "Saving..." : "Save"}</button></>}>
        <div className="space-y-4">
          {err && <p className="text-xs text-red-400">{err}</p>}
          <Input label="Proposal Date" type="date" value={form.proposalDate} onChange={(e) => setForm((f) => ({ ...f, proposalDate: e.target.value }))} />
          <Input label="Quoted Amount (USD)" type="number" min="0" step="0.01" value={form.quotedAmount} onChange={(e) => setForm((f) => ({ ...f, quotedAmount: e.target.value }))} />
          <Textarea label="Modules Included" value={form.modulesIncluded} onChange={(e) => setForm((f) => ({ ...f, modulesIncluded: e.target.value }))} rows={2} />
          <Select label="Status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} options={toOptions(options.proposal_statuses)} placeholder="Status" />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium t-body">Proposal Document</label>
            <input type="file" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0] || null }))} className="text-sm t-body" />
          </div>
        </div>
      </Modal>
    </TabShell>
  );
}

/* ── Negotiations ────────────────────────────────────────────────────────── */
function NegotiationsTab({ leadId, options, onMutate }) {
  const [items, loading, reload] = useList(() => leadsApi.negotiations(leadId), [leadId]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ discussion_date: "", discussion_notes: "", expected_closure_date: "", status: "Ongoing" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!form.discussion_notes.trim()) { setErr("Discussion notes are required."); return; }
    setSaving(true); setErr("");
    try {
      await leadsApi.addNegotiation(leadId, {
        discussion_date: form.discussion_date || undefined,
        discussion_notes: form.discussion_notes,
        expected_closure_date: form.expected_closure_date || undefined,
        status: form.status || undefined,
      });
      setOpen(false); setForm({ discussion_date: "", discussion_notes: "", expected_closure_date: "", status: "Ongoing" });
      reload(); onMutate?.();
    } catch (e) { setErr(e.response?.data?.detail || "Failed."); } finally { setSaving(false); }
  };

  return (
    <TabShell title="Negotiations" addLabel="Add Discussion" onAdd={() => setOpen(true)}>
      {loading ? <Empty text="Loading…" /> : items.length === 0 ? <Empty text="No negotiation records yet." /> : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id} className="p-3 rounded-lg" style={{ background: "var(--c-surface2)", border: "1px solid var(--c-border)" }}>
              <p className="text-sm font-medium t-heading">{formatDate(n.discussion_date)} <span className="text-xs t-muted font-normal">· {n.status}</span></p>
              <p className="text-sm t-body mt-1 whitespace-pre-wrap break-words">{n.discussion_notes}</p>
              {n.expected_closure_date && <p className="text-xs t-muted mt-0.5">Expected closure: {formatDate(n.expected_closure_date)}</p>}
            </li>
          ))}
        </ul>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Add Negotiation" size="md"
        footer={<><button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" disabled={saving} onClick={submit}>{saving ? "Saving..." : "Save"}</button></>}>
        <div className="space-y-4">
          {err && <p className="text-xs text-red-400">{err}</p>}
          <Input label="Discussion Date" type="date" value={form.discussion_date} onChange={(e) => setForm((f) => ({ ...f, discussion_date: e.target.value }))} />
          <Textarea label="Discussion Notes" required value={form.discussion_notes} onChange={(e) => setForm((f) => ({ ...f, discussion_notes: e.target.value }))} rows={3} />
          <Input label="Expected Closure Date" type="date" value={form.expected_closure_date} onChange={(e) => setForm((f) => ({ ...f, expected_closure_date: e.target.value }))} />
          <Select label="Status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} options={toOptions(options.negotiation_statuses)} placeholder="Status" />
        </div>
      </Modal>
    </TabShell>
  );
}

/* ── Conversions ─────────────────────────────────────────────────────────── */
function ConversionsTab({ leadId }) {
  const [items, loading] = useList(() => leadsApi.conversions(leadId), [leadId]);
  const metricRow = (cv) => ([
    ["Lead Age", cv.lead_age_days], ["Sales Cycle", cv.sales_cycle_days],
    ["Time to Demo", cv.time_to_demo_days], ["Time to Proposal", cv.time_to_proposal_days],
    ["Time to Conversion", cv.time_to_conversion_days],
  ]);
  return (
    <TabShell title="Conversion History">
      {loading ? <Empty text="Loading…" /> : items.length === 0 ? <Empty text="This lead has not been converted to a client yet." /> : (
        <ul className="space-y-3">
          {items.map((cv) => (
            <li key={cv.id} className="p-4 rounded-lg" style={{ background: "var(--c-surface2)", border: "1px solid var(--c-border)" }}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm font-semibold t-heading">→ {cv.client_name || "Client"} <span className="text-xs t-muted font-normal">· {formatDateTime(cv.created_at)}</span></p>
                <span className="text-xs t-muted">Client #{cv.client_id} · Subscription #{cv.subscription_id}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3">
                {metricRow(cv).map(([k, v]) => (
                  <div key={k} className="flex flex-col">
                    <span className="text-xs t-muted">{k}</span>
                    <span className="text-sm font-semibold t-body tabular-nums">{v != null ? `${v}d` : "—"}</span>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </TabShell>
  );
}

/* ── Timeline ────────────────────────────────────────────────────────────── */
function TimelineTab({ leadId }) {
  const [events, loading] = useList(() => leadsApi.timeline(leadId), [leadId]);
  return (
    <TabShell title="Activity Timeline">
      {loading ? <Empty text="Loading…" /> : <Timeline events={events} />}
    </TabShell>
  );
}
