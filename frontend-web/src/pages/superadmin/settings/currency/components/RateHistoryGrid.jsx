import React from "react";
import Table from "../../../../../components/ui/Table";
import Badge from "../../../../../components/ui/Badge";
import { formatDateTime, formatRate } from "../constants";

// Presentational grid of rate-change history rows.
export default function RateHistoryGrid({ rows, loading, onSort, sortKey, sortDir }) {
  const columns = [
    {
      key: "changed_at",
      label: "Changed At",
      sortable: true,
      render: (v) => <span className="t-body">{formatDateTime(v)}</span>,
    },
    {
      key: "old_rate",
      label: "Old Rate",
      sortable: true,
      render: (v) => <span className="t-muted">{v == null ? "—" : formatRate(v)}</span>,
    },
    {
      key: "new_rate",
      label: "New Rate",
      sortable: true,
      render: (v) => <span className="font-medium t-body">{formatRate(v)}</span>,
    },
    { key: "rate_source", label: "Source", render: (v) => v || "—" },
    {
      key: "is_manual_override",
      label: "Override",
      render: (v) =>
        v ? <Badge variant="trial" label="Manual" /> : <span className="t-muted">—</span>,
    },
  ];

  return (
    <Table
      columns={columns}
      data={rows}
      loading={loading}
      emptyMessage="No rate changes recorded yet."
      onSort={onSort}
      sortKey={sortKey}
      sortDir={sortDir}
    />
  );
}
