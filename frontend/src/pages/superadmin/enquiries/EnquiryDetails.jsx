import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { enquiryInboxApi, rbacApi } from "../../../services/apiClient";
import { useAuth } from "../../../contexts/AuthContext";
import Modal from "../../../components/ui/Modal";
import Select from "../../../components/ui/Select";
import Textarea from "../../../components/ui/Textarea";
import { DeleteIconBtn } from "../../../components/ui/ActionIcons";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import {
  STATUS_COLORS, ACTIVITY_COLORS, toOptions, formatDate, formatDateTime, activityLabel,
} from "./constants";

const TABS = ["Overview", "Notes", "Timeline"];

function StatusPill({ status }) {
  if (!status) return <span className="t-muted">—</span>;
  const color = STATUS_COLORS[status] || "#64748b";
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: `${color}1f`, color, border: `1px solid ${color}40` }}>
      {status}
    </span>
  );
}

export default function EnquiryDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [enquiry, setEnquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("Overview");
  const [options, setOptions] = useState({ statuses: [] });
  const [banner, setBanner] = useState("");
  const [confirmConvert, setConfirmConvert] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [users, setUsers] = useState([]);

  const load = useCallback(async () => {
    try {
      const res = await enquiryInboxApi.get(id);
      setEnquiry(res.data?.data ?? res.data);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to load enquiry.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    enquiryInboxApi.options().then((res) => setOptions((res.data?.data ?? res.data) || {})).catch(() => {});
    rbacApi.listUsers()
      .then((res) => {
        const list = res.data?.data ?? res.data ?? [];
        setUsers(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
  }, [load]);

  const flash = (msg) => { setBanner(msg); setTimeout(() => setBanner(""), 3000); };

  const onError = (e, fallback) => alert(e.response?.data?.detail || fallback);

  const isTerminal = enquiry?.status === "Converted";
  const isConverted = !!enquiry?.converted_lead_id;

  const handleStatus = async (newStatus) => {
    if (!newStatus || newStatus === enquiry.status) return;
    try {
      const res = await enquiryInboxApi.setStatus(id, newStatus);
      setEnquiry(res.data?.data ?? res.data);
      flash("Status updated.");
    } catch (e) { onError(e, "Failed to update status."); }
  };

  const handleSpam = async (value) => {
    try {
      const res = await enquiryInboxApi.setSpam(id, value);
      setEnquiry(res.data?.data ?? res.data);
      flash(value ? "Marked as spam." : "Unmarked as spam.");
    } catch (e) { onError(e, "Failed to update spam flag."); }
  };

  const handleAssign = async (assigneeId) => {
    try {
      const res = await enquiryInboxApi.assign(id, assigneeId);
      setEnquiry(res.data?.data ?? res.data);
      flash(assigneeId ? "Enquiry assigned." : "Enquiry unassigned.");
    } catch (e) { onError(e, "Failed to update assignment."); }
  };

  const executeConvert = async () => {
    setActionLoading(true);
    try {
      const res = await enquiryInboxApi.convertToLead(id, {});
      const data = res.data?.data ?? res.data;
      setConfirmConvert(false);
      flash("Enquiry converted to lead.");
      const leadId = data?.lead?.id || data?.enquiry?.converted_lead_id;
      if (leadId) navigate(`/superadmin/leads/${leadId}`);
      else load();
    } catch (e) {
      onError(e, "Conversion failed.");
      setConfirmConvert(false);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="p-6 text-sm t-muted">Loading…</div>;
  if (error) return (
    <div className="p-6">
      <div className="rounded-lg px-4 py-3 text-sm text-red-400" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>{error}</div>
    </div>
  );
  if (!enquiry) return null;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button onClick={() => navigate("/superadmin/enquiries")} className="text-xs t-muted hover:t-accent mb-1 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to inbox
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold t-heading">{enquiry.company_name || enquiry.full_name}</h1>
            <StatusPill status={enquiry.status} />
            {enquiry.is_spam && (
              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded"
                style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}>Spam</span>
            )}
          </div>
          <p className="text-sm t-muted mt-1">
            {enquiry.full_name} · <code className="font-mono text-xs">{enquiry.enquiry_number}</code>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!isConverted && !enquiry.is_spam && (
            <button onClick={() => setConfirmConvert(true)} className="btn-primary">Convert to Lead</button>
          )}
          {!isTerminal && (
            enquiry.is_spam ? (
              <button onClick={() => handleSpam(false)} className="btn-secondary">Unmark Spam</button>
            ) : (
              <button onClick={() => handleSpam(true)} className="btn-secondary">Mark Spam</button>
            )
          )}
        </div>
      </div>

      {banner && (
        <div className="rounded-lg px-4 py-3 text-sm" style={{ backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#10b981" }}>{banner}</div>
      )}

      {/* Status + traceability bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl px-4 py-3"
        style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
        <div className="flex items-center gap-2">
          <span className="text-xs t-muted">Status</span>
          <Select
            value={enquiry.status}
            disabled={isTerminal}
            onChange={(e) => handleStatus(e.target.value)}
            options={toOptions(options.statuses)}
            placeholder="Set status"
            selectClassName="text-sm"
            className="w-44"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs t-muted">Assigned</span>
          {isTerminal ? (
            enquiry.assigned_to ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{ background: "rgba(0,174,236,0.1)", color: "var(--c-accent)", border: "1px solid rgba(0,174,236,0.25)" }}>
                {users.find(u => u.id === enquiry.assigned_to)?.name
                  || users.find(u => u.id === enquiry.assigned_to)?.email
                  || `User #${enquiry.assigned_to}`}
                {enquiry.assigned_to === user?.user_id ? " (you)" : ""}
              </span>
            ) : (
              <span className="text-xs t-muted">Unassigned</span>
            )
          ) : (
            <select
              value={enquiry.assigned_to || ""}
              onChange={(e) => handleAssign(e.target.value ? Number(e.target.value) : null)}
              style={{ fontSize: 12, padding: "3px 8px", borderRadius: 6, background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)", cursor: "pointer" }}
            >
              <option value="">Unassigned</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email}{u.id === user?.user_id ? " (you)" : ""}
                </option>
              ))}
            </select>
          )}
        </div>
        {isConverted && enquiry.lead && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs t-muted">Converted to</span>
            <button
              onClick={() => navigate(`/superadmin/leads/${enquiry.lead.lead_id}`)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium transition-all"
              style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" }}
            >
              <code className="font-mono text-xs">{enquiry.lead.lead_number}</code>
              <span className="t-muted text-xs">· {enquiry.lead.current_stage}</span>
              {enquiry.lead.converted_to_client && enquiry.lead.client_name && (
                <span className="text-xs">→ {enquiry.lead.client_name}</span>
              )}
            </button>
          </div>
        )}
      </div>

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
        {tab === "Overview" && <Overview enquiry={enquiry} />}
        {tab === "Notes" && <NotesTab enquiry={enquiry} onMutate={load} />}
        {tab === "Timeline" && <TimelineTab timeline={enquiry.timeline} />}
      </div>

      {/* Convert confirmation */}
      <Modal
        open={confirmConvert}
        onClose={() => setConfirmConvert(false)}
        title="Convert Enquiry to Lead"
        size="sm"
        footer={
          <>
            <button onClick={() => setConfirmConvert(false)} className="btn-secondary">Cancel</button>
            <button onClick={executeConvert} disabled={actionLoading} className="btn-primary">
              {actionLoading ? "Converting…" : "Convert"}
            </button>
          </>
        }
      >
        <p className="t-body text-sm">
          Create a new lead from <span className="font-semibold t-heading">{enquiry.company_name || enquiry.full_name}</span>?
          The enquiry will be marked <span className="font-semibold">Converted</span> and linked to the new lead for full traceability.
        </p>
      </Modal>
    </div>
  );
}

function Field({ label, value, mono }) {
  return (
    <div>
      <p className="text-xs t-muted mb-0.5">{label}</p>
      {value ? (
        <p className={`text-sm t-body break-words ${mono ? "font-mono" : ""}`}>{value}</p>
      ) : (
        <p className="text-sm t-muted">—</p>
      )}
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="rounded-xl p-5" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
      <h3 className="text-sm font-semibold t-heading mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Overview({ enquiry }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card title="Contact">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Full Name" value={enquiry.full_name} />
          <Field label="Company" value={enquiry.company_name} />
          <Field label="Email" value={enquiry.email} />
          <Field label="Phone" value={enquiry.phone} />
          <Field label="Interested Module" value={enquiry.interested_module} />
          <Field label="Source" value={enquiry.source} />
        </div>
      </Card>

      <Card title="Message">
        <p className="text-sm t-body whitespace-pre-wrap break-words">{enquiry.message || "—"}</p>
      </Card>

      <Card title="Workflow">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Status" value={enquiry.status} />
          <Field label="Assigned To" value={enquiry.assigned_to ? `User #${enquiry.assigned_to}` : null} />
          <Field label="Assigned At" value={formatDateTime(enquiry.assigned_at)} />
          <Field label="Spam" value={enquiry.is_spam ? "Yes" : "No"} />
          <Field label="Received" value={formatDateTime(enquiry.created_at)} />
          <Field label="Converted At" value={formatDateTime(enquiry.converted_at)} />
        </div>
      </Card>

      <Card title="Consent & Compliance">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Consent Given" value={enquiry.consent_given ? "Yes" : "No"} />
          <Field label="Consent Timestamp" value={formatDateTime(enquiry.consent_timestamp)} />
          <Field label="Marketing Consent" value={enquiry.marketing_consent ? "Yes" : "No"} />
          <Field label="Privacy Policy" value={enquiry.privacy_policy_version} />
          <Field label="IP Address" value={enquiry.ip_address} mono />
          <Field label="Referrer" value={enquiry.referrer_url} />
        </div>
      </Card>
    </div>
  );
}

function NotesTab({ enquiry, onMutate }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteErr, setDeleteErr] = useState("");
  const [deleting, setDeleting] = useState(false);
  const notes = enquiry.notes || [];

  const add = async () => {
    const trimmed = note.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await enquiryInboxApi.addNote(enquiry.id, trimmed);
      setNote("");
      onMutate();
    } catch (e) {
      alert(e.response?.data?.detail || "Failed to add note.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (n) => { setDeleteTarget(n); setDeleteErr(""); };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await enquiryInboxApi.deleteNote(enquiry.id, deleteTarget.id);
      setDeleteTarget(null);
      onMutate();
    } catch (e) {
      setDeleteErr(e.response?.data?.detail || "Failed to delete note.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-5 space-y-3" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
        <Textarea
          label="Add a note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={2000}
          showCount
          placeholder="Internal note about this enquiry…"
        />
        <div className="flex justify-end">
          <button onClick={add} disabled={saving || !note.trim()} className="btn-primary">
            {saving ? "Saving…" : "Add Note"}
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="rounded-xl p-8 text-center text-sm t-muted" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
          No notes yet.
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <div key={n.id} className="rounded-xl px-4 py-3 flex items-start justify-between gap-3"
              style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
              <div className="min-w-0">
                <p className="text-sm t-body whitespace-pre-wrap break-words">{n.note}</p>
                <p className="text-xs t-muted mt-1">User #{n.created_by} · {formatDateTime(n.created_at)}</p>
              </div>
              <DeleteIconBtn onClick={() => confirmDelete(n)} title="Delete note" />
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Note"
        message="Delete this note? This cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={doDelete}
        onCancel={() => { setDeleteTarget(null); setDeleteErr(""); }}
        loading={deleting}
        error={deleteErr}
      />
    </div>
  );
}

function TimelineTab({ timeline = [] }) {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="rounded-xl p-8 text-center text-sm t-muted" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
        No activity yet.
      </div>
    );
  }
  return (
    <div className="rounded-xl p-5" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
      <ol className="space-y-4">
        {timeline.map((a) => {
          const color = ACTIVITY_COLORS[a.activity_type] || "#64748b";
          return (
            <li key={a.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="flex-1 w-px mt-1" style={{ background: "var(--c-border)" }} />
              </div>
              <div className="pb-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium t-heading">{activityLabel(a.activity_type)}</span>
                  <span className="text-xs t-muted">{formatDateTime(a.created_at)}</span>
                </div>
                {a.description && <p className="text-sm t-body mt-0.5 break-words">{a.description}</p>}
                {a.created_by != null && <p className="text-xs t-muted mt-0.5">User #{a.created_by}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
