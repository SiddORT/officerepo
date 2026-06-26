// @refresh reset
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PortalLayout from "../PortalLayout";
import { portalLoanApi } from "../../../services/apiClient";

const MODAL_DEFAULTS = { loan_type_code: "", loan_type_name: "", description: "", interest_applicable: false, is_active: true };

export default function LoanTypeList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | {mode:"create"|"edit", data}
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = () => {
    setLoading(true);
    portalLoanApi.listTypes(subdomain, token)
      .then(r => setItems(r.data?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, [subdomain, token]);

  const openCreate = () => setModal({ mode: "create", data: { ...MODAL_DEFAULTS } });
  const openEdit   = (t) => setModal({ mode: "edit", data: { ...t } });
  const closeModal = () => { setModal(null); setErr(""); };

  const save = async () => {
    setErr(""); setSaving(true);
    try {
      if (modal.mode === "create") {
        await portalLoanApi.createType(subdomain, token, modal.data);
      } else {
        await portalLoanApi.updateType(subdomain, token, modal.data.id, modal.data);
      }
      closeModal(); load();
    } catch (e) {
      setErr(e?.response?.data?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const del = async (id) => {
    if (!confirm("Delete this loan type?")) return;
    await portalLoanApi.deleteType(subdomain, token, id).catch(() => {});
    load();
  };

  return (
    <PortalLayout title="Loan Types">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--c-heading)" }}>Loan Types</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--c-muted)" }}>Configure loan categories available to employees</p>
          </div>
          <button onClick={openCreate} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "linear-gradient(135deg,#00aeec,#0090cc)" }}>+ Add Type</button>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--c-border)" }}>
          {loading ? (
            <div className="p-8 text-center text-sm" style={{ color: "var(--c-muted)" }}>Loading…</div>
          ) : !items.length ? (
            <div className="p-8 text-center text-sm" style={{ color: "var(--c-muted)" }}>No loan types yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--c-surface-2, var(--c-surface))", borderBottom: "1px solid var(--c-border)" }}>
                  {["Code", "Name", "Interest", "Status", "System", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-xs" style={{ color: "var(--c-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((t, i) => (
                  <tr key={t.id} style={{ background: i % 2 === 0 ? "var(--c-surface)" : "var(--c-surface-alt, var(--c-surface))", borderBottom: "1px solid var(--c-border)" }}>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--c-muted)" }}>{t.loan_type_code}</td>
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--c-heading)" }}>{t.loan_type_name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.interest_applicable ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                        {t.interest_applicable ? "Yes" : "Interest Free"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-500/10 text-slate-400"}`}>
                        {t.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--c-muted)" }}>{t.is_system ? "Yes" : "—"}</td>
                    <td className="px-4 py-3 flex gap-2 justify-end">
                      <button onClick={() => openEdit(t)} className="text-xs px-3 py-1 rounded-lg" style={{ background: "var(--c-surface-2,var(--c-border))", color: "var(--c-text)" }}>Edit</button>
                      {!t.is_system && (
                        <button onClick={() => del(t.id)} className="text-xs px-3 py-1 rounded-lg text-red-400" style={{ background: "#ef444422" }}>Del</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
            <h2 className="text-base font-bold" style={{ color: "var(--c-heading)" }}>{modal.mode === "create" ? "Add Loan Type" : "Edit Loan Type"}</h2>
            {err && <div className="p-3 rounded-lg text-sm text-red-400" style={{ background: "#ef444422" }}>{err}</div>}

            {[
              { key: "loan_type_code", label: "Type Code *", disabled: modal.data.is_system },
              { key: "loan_type_name", label: "Type Name *" },
              { key: "description",   label: "Description", type: "textarea" },
            ].map(({ key, label, type, disabled }) => (
              <div key={key}>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-muted)" }}>{label}</label>
                {type === "textarea" ? (
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                    style={{ background: "var(--c-input,var(--c-surface-2,#1e2533))", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                    value={modal.data[key] || ""}
                    onChange={e => setModal(m => ({ ...m, data: { ...m.data, [key]: e.target.value } }))}
                  />
                ) : (
                  <input
                    disabled={disabled}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none disabled:opacity-50"
                    style={{ background: "var(--c-input,var(--c-surface-2,#1e2533))", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                    value={modal.data[key] || ""}
                    onChange={e => setModal(m => ({ ...m, data: { ...m.data, [key]: e.target.value } }))}
                  />
                )}
              </div>
            ))}

            <div className="flex gap-4">
              {[
                { key: "interest_applicable", label: "Interest Applicable" },
                { key: "is_active", label: "Active" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--c-text)" }}>
                  <input type="checkbox" checked={!!modal.data[key]} onChange={e => setModal(m => ({ ...m, data: { ...m.data, [key]: e.target.checked } }))} />
                  {label}
                </label>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={closeModal} className="flex-1 px-4 py-2 rounded-lg text-sm" style={{ background: "var(--c-border)", color: "var(--c-text)" }}>Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#00aeec,#0090cc)" }}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
