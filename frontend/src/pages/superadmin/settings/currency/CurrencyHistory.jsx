import React, { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { currencyApi } from "../../../../services/apiClient";
import Pagination from "../../../../components/ui/Pagination";
import RateHistoryGrid from "./components/RateHistoryGrid";

const unwrap = (res) => res?.data?.data ?? res?.data;
const PAGE_SIZE = 20;

export default function CurrencyHistory() {
  const { id } = useParams();

  const [currency, setCurrency] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState("changed_at");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    currencyApi.get(id).then((res) => setCurrency(unwrap(res))).catch(() => {});
  }, [id]);

  const load = useCallback(() => {
    setLoading(true);
    currencyApi
      .rateHistory(id, { page, page_size: PAGE_SIZE, sort_by: sortKey, sort_dir: sortDir })
      .then((res) => {
        const d = unwrap(res);
        setRows(d?.items ?? []);
        setTotal(d?.total ?? 0);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [id, page, sortKey, sortDir]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link to={`/superadmin/settings/currencies/${id}`} className="text-xs t-muted hover:underline">
          ← Back to currency
        </Link>
        <h2 className="text-xl font-bold t-heading mt-2">
          Rate History{currency ? ` — ${currency.currency_code}` : ""}
        </h2>
        <p className="text-sm t-muted mt-1">Every exchange-rate change, including manual overrides.</p>
      </div>

      <RateHistoryGrid
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
