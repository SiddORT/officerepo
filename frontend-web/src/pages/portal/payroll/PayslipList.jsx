import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalPayrollApi } from "../../../services/apiClient";
import PageHeader from "../shared/PageHeader";
import Pagination from "../shared/Pagination";

export default function PayslipList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await portalPayrollApi.listPayslips(subdomain, token, {
        year: yearFilter || undefined, page, page_size: PAGE_SIZE,
      });
      const d = r.data?.data;
      setItems(d?.data || []); setTotal(d?.total || 0);
    } catch { /* ignore */ }
    setLoading(false);
  }, [subdomain, token, yearFilter, page]);

  useEffect(() => { load(); }, [load]);

  const loadDetail = async (id) => {
    try {
      const r = await portalPayrollApi.getPayslip(subdomain, token, id);
      setSelected(r.data?.data || null);
    } catch { /* ignore */ }
  };

  const years = [];
  for (let y = new Date().getFullYear(); y >= 2020; y--) years.push(y);

  const formatCurrency = (v) => v != null ? `₹${v.toLocaleString()}` : "—";

  return (
    <>
      <PageHeader title="Payslips" subtitle={`${total} payslip${total !== 1 ? "s" : ""}`} />

      <div style={{ display:"flex",gap:10,marginBottom:16,flexWrap:"wrap" }}>
        <select value={yearFilter} onChange={e => { setYearFilter(e.target.value); setPage(1); }}
          className="input-field" style={{ width:"auto",minWidth:120 }}>
          <option value="">All years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="portal-table-wrap">
        <table className="portal-table">
          <thead>
            <tr>
              <th style={{ width:40 }}>#</th>
              <th>Employee</th>
              <th>Period</th>
              <th>Gross</th>
              <th>Deductions</th>
              <th>Net Pay</th>
              <th>Generated</th>
              <th style={{ textAlign:"right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding:40,textAlign:"center" }} className="t-muted">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} style={{ padding:50,textAlign:"center" }}>
                <div style={{ fontSize:28,marginBottom:8 }}>📄</div>
                <div className="t-muted" style={{ fontSize:13 }}>No payslips found. Process a payroll run to generate them.</div>
              </td></tr>
            ) : items.map((item, i) => (
              <tr key={item.id}>
                <td style={{ textAlign:"center" }} className="t-muted">{(page-1)*PAGE_SIZE+i+1}</td>
                <td>
                  <div style={{ fontWeight:600,fontSize:13 }}>{item.employee_name}</div>
                  {item.employee_code && <div style={{ fontSize:11 }} className="t-muted">{item.employee_code}</div>}
                </td>
                <td style={{ fontWeight:500 }}>{item.period_label}</td>
                <td style={{ fontSize:12 }}>{formatCurrency(item.gross_salary)}</td>
                <td style={{ fontSize:12,color:"#EF4444" }}>{formatCurrency(item.total_deductions)}</td>
                <td style={{ fontSize:12,fontWeight:700,color:"var(--c-accent)" }}>{formatCurrency(item.net_salary)}</td>
                <td style={{ fontSize:11 }} className="t-muted">
                  {item.generated_at ? new Date(item.generated_at).toLocaleDateString() : "—"}
                </td>
                <td style={{ textAlign:"right" }}>
                  <button onClick={() => loadDetail(item.id)}
                    className="btn-secondary" style={{ padding:"4px 10px",fontSize:11 }}>View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} totalPages={Math.ceil(total/PAGE_SIZE)||1} onPage={setPage} total={total} pageSize={PAGE_SIZE} />
      </div>

      {/* Payslip detail modal */}
      {selected && (
        <div style={{ position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"auto",padding:20 }}
          onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="card" style={{ width:"100%",maxWidth:600,display:"flex",flexDirection:"column",gap:0,maxHeight:"90vh",overflow:"auto" }}>
            {/* Header */}
            <div style={{ padding:"18px 20px",borderBottom:"1px solid var(--c-border)",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div>
                <div style={{ fontSize:16,fontWeight:700,color:"var(--c-heading)" }}>Payslip — {selected.period_label}</div>
                <div style={{ fontSize:12,color:"var(--c-muted)" }}>{selected.employee_name} · {selected.employee_code}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:22,color:"var(--c-muted)" }}>×</button>
            </div>

            <div style={{ padding:"16px 20px",display:"flex",flexDirection:"column",gap:16 }}>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label:"Gross Salary",   value: formatCurrency(selected.gross_salary),    color:"#F59E0B" },
                  { label:"Deductions",     value: formatCurrency(selected.total_deductions), color:"#EF4444" },
                  { label:"Net Pay",        value: formatCurrency(selected.net_salary),       color:"#10B981" },
                ].map(c => (
                  <div key={c.label} style={{ padding:12,borderRadius:10,background:"var(--c-surface2)",border:"1px solid var(--c-border)",textAlign:"center" }}>
                    <div style={{ fontSize:16,fontWeight:700,color:c.color }}>{c.value}</div>
                    <div style={{ fontSize:11,color:"var(--c-muted)" }}>{c.label}</div>
                  </div>
                ))}
              </div>

              {/* Earnings */}
              {selected.slip_data?.earnings?.length > 0 && (
                <div>
                  <div style={{ fontSize:13,fontWeight:600,color:"#10B981",marginBottom:8 }}>Earnings</div>
                  {selected.slip_data.earnings.map((e, i) => (
                    <div key={i} style={{ display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid var(--c-border)",fontSize:13 }}>
                      <span style={{ color:"var(--c-text)" }}>{e.name}</span>
                      <span style={{ fontWeight:600,color:"var(--c-text)" }}>₹{(e.amount||0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Deductions */}
              {selected.slip_data?.deductions?.length > 0 && (
                <div>
                  <div style={{ fontSize:13,fontWeight:600,color:"#EF4444",marginBottom:8 }}>Deductions</div>
                  {selected.slip_data.deductions.map((d, i) => (
                    <div key={i} style={{ display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid var(--c-border)",fontSize:13 }}>
                      <span style={{ color:"var(--c-text)" }}>{d.name}</span>
                      <span style={{ fontWeight:600,color:"#EF4444" }}>₹{(d.amount||0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Net Pay */}
              <div style={{ display:"flex",justifyContent:"space-between",padding:"12px 16px",borderRadius:10,
                background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.25)",fontWeight:700,fontSize:15 }}>
                <span style={{ color:"var(--c-heading)" }}>Net Pay</span>
                <span style={{ color:"#4ade80" }}>{formatCurrency(selected.net_salary)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
