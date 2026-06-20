// @refresh reset
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PortalLayout from "../PortalLayout";
import { portalLoanApi } from "../../../services/apiClient";

const EMPTY = {
  policy_name: "", loan_type_id: "", employee_category: "",
  min_service_months: "", min_amount: "", max_amount: "", max_tenure_months: "",
  interest_type: "Interest Free", interest_rate: "", processing_fee: "",
  repayment_method: "EMI", require_guarantor: false, require_documents: false,
  max_active_loans: 1, is_active: true,
};

export default function LoanPolicyList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const [items, setItems] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = () => {
    setLoading(true);
    Promise.all([
      portalLoanApi.listPolicies(subdomain, token),
      portalLoanApi.listTypes(subdomain, token),
    ]).then(([pr, tr]) => {
      setItems(pr.data?.data || []);
      setTypes((tr.data?.data || []).filter(t => t.is_active));
    }).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, [subdomain, token]);

  const openCreate = () => setModal({ mode: "create", data: { ...EMPTY } });
  const openEdit   = (p) => setModal({ mode: "edit", data: { ...p } });
  const closeModal = () => { setModal(null); setErr(""); };

  const save = async () => {
    setErr(""); setSaving(true);
    try {
      const d = { ...modal.data };
      ["min_service_months", "min_amount", "max_amount", "max_tenure_months", "interest_rate", "processing_fee", "max_active_loans"]
        .forEach(k => { if (d[k] === "") d[k] = null; else if (d[k] !== null) d[k] = Number(d[k]); });
      if (modal.mode === "create") await portalLoanApi.createPolicy(subdomain, token, d);
      else await portalLoanApi.updatePolicy(subdomain, token, d.id, d);
      closeModal(); load();
    } catch (e) {
      setErr(e?.response?.data?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const del = async (id) => {
    if (!confirm("Delete this policy?")) return;
    await portalLoanApi.deletePolicy(subdomain, token, id).catch(() => {});
    load();
  };

  const Field = ({ k, label, type = "text", options }) => (
    <div>
      <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-muted)" }}>{label}</label>
      {options ? (
        <select className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: "var(--c-input,var(--c-surface-2,#1e2533))", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
          value={modal.data[k] || ""}
          onChange={e => setModal(m => ({ ...m, data: { ...m.data, [k]: e.target.value } }))}>
          <option value="">— Select —</option>
          {options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
        </select>
      ) : (
        <input type={type} className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: "var(--c-input,var(--c-surface-2,#1e2533))", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
          value={modal.data[k] ?? ""}
          onChange={e => setModal(m => ({ ...m, data: { ...m.data, [k]: e.target.value } }))} />
      )}
    </div>
  );

  return (
    <PortalLayout title="Loan Policies">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--c-heading)" }}>Loan Policies</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--c-muted)" }}>Define eligibility rules, limits and interest terms</p>
          </div>
          <button onClick={openCreate} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "linear-gradient(135deg,#00aeec,#0090cc)" }}>+ Add Policy</button>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--c-border)" }}>
          {loading ? (
            <div className="p-8 text-center text-sm" style={{ color: "var(--c-muted)" }}>Loading…</div>
          ) : !items.length ? (
            <div className="p-8 text-center text-sm" style={{ color: "var(--c-muted)" }}>No policies yet. Add one to set eligibility rules.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--c-surface)", borderBottom: "1px solid var(--c-border)" }}>
                  {["Policy Name", "Loan Type", "Max Amount", "Max Tenure", "Interest", "Status", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-xs" style={{ color: "var(--c-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((p, i) => (
                  <tr key={p.id} style={{ background: i % 2 === 0 ? "var(--c-surface)" : "transparent", borderBottom: "1px solid var(--c-border)" }}>
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--c-heading)" }}>{p.policy_name}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--c-muted)" }}>{p.loan_type_name || "—"}</td>
                    <td className="px-4 py-3 text-xs">{p.max_amount ? `₹${p.max_amount.toLocaleString("en-IN")}` : "—"}</td>
                    <td className="px-4 py-3 text-xs">{p.max_tenure_months ? `${p.max_tenure_months} mo` : "—"}</td>
                    <td className="px-4 py-3 text-xs">{p.interest_type || "—"}{p.interest_rate ? ` (${p.interest_rate}%)` : ""}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-500/10 text-slate-400"}`}>
                        {p.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex gap-2 justify-end">
                      <button onClick={() => openEdit(p)} className="text-xs px-3 py-1 rounded-lg" style={{ background: "var(--c-border)", color: "var(--c-text)" }}>Edit</button>
                      <button onClick={() => del(p.id)} className="text-xs px-3 py-1 rounded-lg text-red-400" style={{ background: "#ef444422" }}>Del</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-4 mt-10 mb-10" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
            <h2 className="text-base font-bold" style={{ color: "var(--c-heading)" }}>{modal.mode === "create" ? "New Policy" : "Edit Policy"}</h2>
            {err && <div className="p-3 rounded-lg text-sm text-red-400" style={{ background: "#ef444422" }}>{err}</div>}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Field k="policy_name" label="Policy Name *" /></div>
              <Field k="loan_type_id" label="Loan Type *" options={types.map(t => ({ value: t.id, label: t.loan_type_name }))} />
              <Field k="employee_category" label="Employee Category" options={["Permanent","Contract","Consultant","Intern","Trainee"]} />
              <Field k="min_service_months" label="Min Service (months)" type="number" />
              <Field k="max_active_loans" label="Max Active Loans" type="number" />
              <Field k="min_amount" label="Min Amount (₹)" type="number" />
              <Field k="max_amount" label="Max Amount (₹)" type="number" />
              <Field k="max_tenure_months" label="Max Tenure (months)" type="number" />
              <Field k="processing_fee" label="Processing Fee (₹)" type="number" />
              <Field k="interest_type" label="Interest Type" options={["Interest Free","Flat","Reducing Balance"]} />
              <Field k="interest_rate" label="Interest Rate (% p.a.)" type="number" />
              <Field k="repayment_method" label="Repayment Method" options={["EMI","Fixed Principal","Bullet"]} />
            </div>

            <div className="flex flex-wrap gap-4">
              {[["require_guarantor","Require Guarantor"],["require_documents","Require Documents"],["is_active","Active"]].map(([k,l]) => (
                <label key={k} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--c-text)" }}>
                  <input type="checkbox" checked={!!modal.data[k]} onChange={e => setModal(m => ({ ...m, data: { ...m.data, [k]: e.target.checked } }))} />
                  {l}
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
