import React from "react";
import Table from "../../../../../components/ui/Table";
import Badge from "../../../../../components/ui/Badge";
import { formatDateTime, SYNC_STATUS_VARIANT } from "../constants";

// Presentational grid of exchange-rate sync attempts.
export default function SyncLogGrid({ rows, loading, onSort, sortKey, sortDir }) {
  const columns = [
    {
      key: "started_at",
      label: "Started",
      sortable: true,
      render: (v) => <span className="t-body">{formatDateTime(v)}</span>,
    },
    { key: "sync_source", label: "Source", render: (v) => v || "—" },
    {
      key: "sync_status",
      label: "Status",
      sortable: true,
      render: (v) => <Badge variant={SYNC_STATUS_VARIANT[v] || "default"} label={v} />,
    },
    { key: "currencies_updated", label: "Updated", width: 100 },
    {
      key: "error_message",
      label: "Detail",
      render: (v) =>
        v ? <span className="text-xs text-red-400">{v}</span> : <span className="t-muted">—</span>,
    },
    {
      key: "completed_at",
      label: "Completed",
      render: (v) => <span className="t-muted">{formatDateTime(v)}</span>,
    },
  ];

  return (
    <Table
      columns={columns}
      data={rows}
      loading={loading}
      emptyMessage="No sync attempts recorded yet."
      onSort={onSort}
      sortKey={sortKey}
      sortDir={sortDir}
    />
  );
}
