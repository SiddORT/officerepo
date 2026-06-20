// @refresh reset
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PortalLayout from "../PortalLayout";
import { portalLoanApi } from "../../../services/apiClient";

const INST_COLORS = {
  Pending: "#f59e0b", Deducted: "#3b82f6", Paid: "#10b981",
  Skipped: "#94a3b8", Waived: "#8b5cf6",
};
const fmt = (n) => n != null ? Number(n).toLocaleString("en-IN") : "—";

export default function LoanRepaymentList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    portalLoanApi.listApplications(subdomain, token, {
      status: "Disbursed", page, page_size: 20,
    }).then(r => {
      const d = r.data?.data || {};
      setItems(d.items || []);
      setTotal(d.total || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [subdomain, token, page]);

  useEffect(load, [load]);

  return (
    <PortalLayout title="Repayments">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--c-heading)" }}>Repayments</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--c-muted)" }}>Active disbursed loans with repayment schedules</p>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--c-border)" }}>
          {loading ? (
            <div className="p-8 text-center text-sm" style={{ color: "var(--c-muted)" }}>Loading…</div>
          ) : !items.length ? (
            <div className="p-8 text-center text-sm" style={{ color: "var(--c-muted)" }}>No active loans with repayment schedules.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--c-surface)", borderBottom: "1px solid var(--c-border)" }}>
                  {["Employee","Loan Type","Approved Amount","Outstanding","EMI","Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-xs" style={{ color: "var(--c-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((a, i) => (
                  <tr key={a.id} style={{ background: i % 2 === 0 ? "var(--c-surface)" : "transparent", borderBottom: "1px solid var(--c-border)" }}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm" style={{ color: "var(--c-heading)" }}>{a.employee_name || "—"}</div>
                      <div className="text-xs" style={{ color: "var(--c-muted)" }}>{a.employee_code}</div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--c-muted)" }}>{a.loan_type_name}</td>
                    <td className="px-4 py-3 text-sm font-medium">₹{fmt(a.approved_amount)}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-red-400">₹{fmt(a.principal_outstanding)}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">₹{fmt(a.emi_amount)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/portal/${subdomain}/hrms/loans/applications/${a.id}`)}
                        className="text-xs px-3 py-1 rounded-lg"
                        style={{ background: "var(--c-border)", color: "var(--c-text)" }}>
                        View Schedule
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

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
    </PortalLayout>
  );
}
