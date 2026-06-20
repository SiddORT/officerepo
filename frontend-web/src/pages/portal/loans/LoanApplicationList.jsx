// @refresh reset
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PortalLayout from "../PortalLayout";
import { portalLoanApi } from "../../../services/apiClient";

const STATUS_COLORS = {
  Draft: "#94a3b8", Submitted: "#f59e0b", "Under Review": "#8b5cf6",
  Approved: "#3b82f6", Rejected: "#ef4444", Cancelled: "#6b7280",
  Disbursed: "#10b981", Closed: "#64748b",
};

const EMPTY = {
  employee_id: "", employee_name: "", employee_code: "",
  loan_type_id: "", requested_amount: "", requested_tenure: "",
  purpose: "", emi_start_date: "", notes: "",
};

export default function LoanApplicationList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [types, setTypes] = useState([]);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    portalLoanApi.listApplications(subdomain, token, {
      page, page_size: 20,
      ...(search && { search }),
      ...(statusFilter && { status: statusFilter }),
    }).then(r => {
      const d = r.data?.data || {};
      setItems(d.items || []);
      setTotal(d.total || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [subdomain, token, page, search, statusFilter]);

  useEffect(load, [load]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  useEffect(() => {
    portalLoanApi.listTypes(subdomain, token)
      .then(r => setTypes((r.data?.data || []).filter(t => t.is_active)))
      .catch(() => {});
  }, [subdomain, token]);

  const openCreate = () => setModal({ data: { ...EMPTY } });
  const closeModal = () => { setModal(null); setErr(""); };

  const save = async () => {
    setErr(""); setSaving(true);
    try {
      const d = { ...modal.data };
      d.requested_amount = Number(d.requested_amount);
      d.requested_tenure = Number(d.requested_tenure);
      if (!d.emi_start_date) delete d.emi_start_date;
      await portalLoanApi.createApplication(subdomain, token, d);
      closeModal(); load();
    } catch (e) {
      setErr(e?.response?.data?.message || "Save failed.");
    } finally { setSaving(false); }
  };

  const STATUSES = ["Draft","Submitted","Under Review","Approved","Rejected","Cancelled","Disbursed","Closed"];

  return (
    <PortalLayout title="Loan Applications">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--c-heading)" }}>Loan Applications</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--c-muted)" }}>{total} application{total !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={openCreate} className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: "linear-gradient(135deg,#00aeec,#0090cc)" }}>+ New Application</button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <input placeholder="Search employee / ref…" value={search} onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm outline-none flex-1 min-w-[180px]"
            style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", color: "var(--c-text)" }} />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}>
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--c-border)" }}>
          {loading ? (
            <div className="p-8 text-center text-sm" style={{ color: "var(--c-muted)" }}>Loading…</div>
          ) : !items.length ? (
            <div className="p-10 text-center text-sm" style={{ color: "var(--c-muted)" }}>No loan applications found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--c-surface)", borderBottom: "1px solid var(--c-border)" }}>
                  {["Ref #","Employee","Loan Type","Amount","Tenure","Status",""].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-xs" style={{ color: "var(--c-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((a, i) => (
                  <tr key={a.id}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ background: i % 2 === 0 ? "var(--c-surface)" : "transparent", borderBottom: "1px solid var(--c-border)" }}
                    onClick={() => navigate(`/portal/${subdomain}/hrms/loans/applications/${a.id}`)}>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--c-muted)" }}>{a.application_number}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium" style={{ color: "var(--c-heading)" }}>{a.employee_name || "—"}</div>
                      <div className="text-xs" style={{ color: "var(--c-muted)" }}>{a.employee_code}</div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--c-muted)" }}>{a.loan_type_name}</td>
                    <td className="px-4 py-3 font-medium">₹{a.requested_amount?.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-xs">{a.requested_tenure} mo</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ background: `${STATUS_COLORS[a.status] || "#94a3b8"}22`, color: STATUS_COLORS[a.status] || "#94a3b8" }}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs" style={{ color: "#00aeec" }}>View →</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div className="flex justify-center gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 rounded text-sm disabled:opacity-40" style={{ background: "var(--c-surface)", color: "var(--c-text)" }}>←</button>
            <span className="px-3 py-1 text-sm" style={{ color: "var(--c-muted)" }}>Page {page} of {Math.ceil(total / 20)}</span>
            <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 rounded text-sm disabled:opacity-40" style={{ background: "var(--c-surface)", color: "var(--c-text)" }}>→</button>
          </div>
        )}
      </div>

      {/* Create modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4 mt-10 mb-10" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
            <h2 className="text-base font-bold" style={{ color: "var(--c-heading)" }}>New Loan Application</h2>
            {err && <div className="p-3 rounded-lg text-sm text-red-400" style={{ background: "#ef444422" }}>{err}</div>}

            {[
              { k: "employee_id",    label: "Employee ID *" },
              { k: "employee_name",  label: "Employee Name" },
              { k: "employee_code",  label: "Employee Code" },
            ].map(({ k, label }) => (
              <div key={k}>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-muted)" }}>{label}</label>
                <input className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: "var(--c-input,var(--c-surface-2,#1e2533))", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                  value={modal.data[k] || ""}
                  onChange={e => setModal(m => ({ ...m, data: { ...m.data, [k]: e.target.value } }))} />
              </div>
            ))}

            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-muted)" }}>Loan Type *</label>
              <select className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "var(--c-input,var(--c-surface-2,#1e2533))", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                value={modal.data.loan_type_id}
                onChange={e => setModal(m => ({ ...m, data: { ...m.data, loan_type_id: e.target.value } }))}>
                <option value="">— Select —</option>
                {types.map(t => <option key={t.id} value={t.id}>{t.loan_type_name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-muted)" }}>Amount (₹) *</label>
                <input type="number" className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: "var(--c-input,var(--c-surface-2,#1e2533))", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                  value={modal.data.requested_amount}
                  onChange={e => setModal(m => ({ ...m, data: { ...m.data, requested_amount: e.target.value } }))} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-muted)" }}>Tenure (months) *</label>
                <input type="number" className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: "var(--c-input,var(--c-surface-2,#1e2533))", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                  value={modal.data.requested_tenure}
                  onChange={e => setModal(m => ({ ...m, data: { ...m.data, requested_tenure: e.target.value } }))} />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-muted)" }}>EMI Start Date</label>
              <input type="date" className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "var(--c-input,var(--c-surface-2,#1e2533))", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                value={modal.data.emi_start_date}
                onChange={e => setModal(m => ({ ...m, data: { ...m.data, emi_start_date: e.target.value } }))} />
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-muted)" }}>Purpose</label>
              <textarea rows={2} className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                style={{ background: "var(--c-input,var(--c-surface-2,#1e2533))", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                value={modal.data.purpose}
                onChange={e => setModal(m => ({ ...m, data: { ...m.data, purpose: e.target.value } }))} />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={closeModal} className="flex-1 px-4 py-2 rounded-lg text-sm" style={{ background: "var(--c-border)", color: "var(--c-text)" }}>Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#00aeec,#0090cc)" }}>{saving ? "Saving…" : "Submit"}</button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
