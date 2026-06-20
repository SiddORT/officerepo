import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalRecruitmentApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";

const inp = { padding: "8px 10px", background: "var(--c-bg,var(--c-surface))", border: "1px solid var(--c-border)", borderRadius: 6, fontSize: 13, color: "var(--c-text)", boxSizing: "border-box" };
const hdr = { padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--c-border)", background: "var(--c-surface-alt,var(--c-surface))", whiteSpace: "nowrap" };
const cell = { padding: "10px 12px", borderBottom: "1px solid var(--c-border)", fontSize: 13, verticalAlign: "middle" };

const STATUS_COLORS = {
  "Applied":            { bg: "rgba(156,163,175,0.15)", color: "#9ca3af" },
  "Screening":          { bg: "rgba(251,191,36,0.12)",  color: "#f59e0b" },
  "Shortlisted":        { bg: "rgba(59,130,246,0.12)",  color: "#60a5fa" },
  "Interview Scheduled":{ bg: "rgba(99,102,241,0.12)",  color: "#818cf8" },
  "Selected":           { bg: "rgba(16,185,129,0.12)",  color: "#10b981" },
  "Offered":            { bg: "rgba(245,158,11,0.12)",  color: "#f59e0b" },
  "Joined":             { bg: "rgba(34,197,94,0.12)",   color: "#22c55e" },
  "Rejected":           { bg: "rgba(239,68,68,0.12)",   color: "#ef4444" },
  "Withdrawn":          { bg: "rgba(156,163,175,0.1)",  color: "#6b7280" },
};

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS["Applied"];
  return <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: s.bg, color: s.color, whiteSpace: "nowrap" }}>{status}</span>;
}

const PAGE_SIZE = 20;

export default function CandidateList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalRecruitmentApi.metaOptions(subdomain, token).then(r => setMeta(r.data?.data || {})).catch(() => {});
  }, []);

  const load = () => {
    setLoading(true);
    portalRecruitmentApi.listCandidates(subdomain, token, { page, page_size: PAGE_SIZE, search: search || undefined, status: status || undefined, source: source || undefined })
      .then(r => { const d = r.data?.data || {}; setRows(d.items || []); setTotal(d.total || 0); })
      .catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, search, status, source]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Candidates</h2>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--c-muted)" }}>{total} candidates</p>
        </div>
        <button onClick={() => navigate(`/portal/${subdomain}/recruitment/candidates/new`)} style={{ padding: "8px 16px", borderRadius: 7, fontWeight: 600, fontSize: 13, background: "var(--c-accent)", color: "#fff", border: "none", cursor: "pointer" }}>+ Add Candidate</button>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search name, email, mobile, company…" style={{ ...inp, flex: 1, minWidth: 200 }} />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} style={{ ...inp, minWidth: 160 }}>
          <option value="">All Statuses</option>
          {(meta.candidate_statuses || []).map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={source} onChange={e => { setSource(e.target.value); setPage(1); }} style={{ ...inp, minWidth: 140 }}>
          <option value="">All Sources</option>
          {(meta.candidate_sources || []).map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={hdr}>Candidate</th><th style={hdr}>Applied For</th>
              <th style={hdr}>Experience</th><th style={hdr}>Current</th>
              <th style={hdr}>Source</th><th style={hdr}>Resume</th>
              <th style={hdr}>Status</th><th style={{ ...hdr, textAlign: "right" }}>Actions</th>
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8} style={{ ...cell, textAlign: "center", color: "var(--c-muted)", padding: 32 }}>Loading…</td></tr>
              : rows.length === 0 ? <tr><td colSpan={8} style={{ ...cell, textAlign: "center", color: "var(--c-muted)", padding: 40 }}>No candidates found.</td></tr>
              : rows.map(r => (
                <tr key={r.id} onClick={() => navigate(`/portal/${subdomain}/recruitment/candidates/${r.id}`)} style={{ cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--c-surface-alt,rgba(255,255,255,0.03))"}
                  onMouseLeave={e => e.currentTarget.style.background = ""}>
                  <td style={cell}>
                    <div style={{ fontWeight: 600 }}>{r.full_name}</div>
                    <div style={{ fontSize: 11, color: "var(--c-muted)" }}>{r.email}</div>
                    <div style={{ fontSize: 11, color: "var(--c-muted)", fontFamily: "monospace" }}>{r.candidate_number}</div>
                  </td>
                  <td style={{ ...cell, fontSize: 12 }}>{r.applied_position || "—"}</td>
                  <td style={{ ...cell, fontSize: 12 }}>{r.total_experience || "—"}</td>
                  <td style={cell}>
                    <div style={{ fontSize: 12 }}>{r.current_company || "—"}</div>
                    {r.current_designation && <div style={{ fontSize: 11, color: "var(--c-muted)" }}>{r.current_designation}</div>}
                  </td>
                  <td style={{ ...cell, fontSize: 12 }}>{r.source || "—"}</td>
                  <td style={{ ...cell, textAlign: "center" }}>{r.has_resume ? "✅" : "—"}</td>
                  <td style={cell}><StatusBadge status={r.status} /></td>
                  <td style={{ ...cell, textAlign: "right" }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => navigate(`/portal/${subdomain}/recruitment/candidates/${r.id}`)} style={{ background: "none", border: "none", color: "var(--c-accent)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > PAGE_SIZE && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderTop: "1px solid var(--c-border)" }}>
            <span style={{ fontSize: 12, color: "var(--c-muted)" }}>Page {page} of {totalPages}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--c-border)", background: "none", color: "var(--c-text)", cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.4 : 1 }}>←</button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--c-border)", background: "none", color: "var(--c-text)", cursor: page >= totalPages ? "not-allowed" : "pointer", opacity: page >= totalPages ? 0.4 : 1 }}>→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
