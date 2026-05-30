import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { currencyApi } from "../../../../services/apiClient";
import { useAuth } from "../../../../contexts/AuthContext";
import Pagination from "../../../../components/ui/Pagination";
import SyncLogGrid from "./components/SyncLogGrid";
import { CURRENCY_PERMS } from "./constants";

const unwrap = (res) => res?.data?.data ?? res?.data;
const PAGE_SIZE = 20;

export default function SyncLogs() {
  const { hasPermission } = useAuth();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState("started_at");
  const [sortDir, setSortDir] = useState("desc");

  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    currencyApi
      .syncLogs({ page, page_size: PAGE_SIZE, sort_by: sortKey, sort_dir: sortDir })
      .then((res) => {
        const d = unwrap(res);
        setRows(d?.items ?? []);
        setTotal(d?.total ?? 0);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [page, sortKey, sortDir]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const runSync = async () => {
    setSyncing(true);
    setNotice("");
    try {
      const res = await currencyApi.runSync("Manual");
      const d = unwrap(res);
      setNotice(
        d?.sync_status === "Failed"
          ? `Sync failed: ${d?.error_message || "no live provider configured."}`
          : `Sync ${d?.sync_status?.toLowerCase() || "completed"}.`
      );
      load();
    } catch (err) {
      setNotice(err.response?.data?.message || "Sync request failed.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link to="/superadmin/settings/currencies" className="text-xs t-muted hover:underline">
            ← Back to currencies
          </Link>
          <h2 className="text-xl font-bold t-heading mt-2">Currency Sync Logs</h2>
          <p className="text-sm t-muted mt-1">
            History of exchange-rate sync attempts. No live provider is configured — manual syncs are
            recorded as failed by design.
          </p>
        </div>
        {hasPermission(CURRENCY_PERMS.overrideRate) && (
          <button onClick={runSync} disabled={syncing} className="btn-primary">
            {syncing ? "Syncing…" : "Run Sync Now"}
          </button>
        )}
      </div>

      {notice && (
        <div
          className="mb-4 rounded-lg px-4 py-2.5 text-sm t-body"
          style={{ border: "1px solid var(--c-border)", background: "var(--c-surface2)" }}
        >
          {notice}
        </div>
      )}

      <SyncLogGrid
        rows={rows}
        loading={loading}
        onSort={handleSort}
        sortKey={sortKey}
        sortDir={sortDir}
      />

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} total={total} />
      )}
    </div>
  );
}
