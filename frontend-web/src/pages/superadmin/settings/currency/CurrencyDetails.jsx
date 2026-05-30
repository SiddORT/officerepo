import React, { useCallback, useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { currencyApi } from "../../../../services/apiClient";
import { useAuth } from "../../../../contexts/AuthContext";
import Badge from "../../../../components/ui/Badge";
import Modal from "../../../../components/ui/Modal";
import RateModal from "./components/RateModal";
import RateHistoryGrid from "./components/RateHistoryGrid";
import { CURRENCY_PERMS, STATUS_VARIANT, formatRate, formatDateTime } from "./constants";

const unwrap = (res) => res?.data?.data ?? res?.data;

export default function CurrencyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [currency, setCurrency] = useState(null);
  const [meta, setMeta] = useState({ rate_sources: [] });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [rateOpen, setRateOpen] = useState(false);
  const [confirmBase, setConfirmBase] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    currencyApi.options().then((res) => setMeta(unwrap(res) || {})).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      currencyApi.get(id),
      hasPermission(CURRENCY_PERMS.viewHistory)
        ? currencyApi.rateHistory(id, { page: 1, page_size: 5 })
        : Promise.resolve(null),
    ])
      .then(([detailRes, histRes]) => {
        setCurrency(unwrap(detailRes));
        if (histRes) setHistory(unwrap(histRes)?.items ?? []);
      })
      .catch(() => setError("Failed to load currency."))
      .finally(() => setLoading(false));
  }, [id, hasPermission]);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = async () => {
    setActionLoading(true);
    setActionError("");
    try {
      const next = currency.status === "Active" ? "Inactive" : "Active";
      await currencyApi.setStatus(id, next);
      load();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to change status.");
    } finally {
      setActionLoading(false);
    }
  };

  const executeBase = async () => {
    setActionLoading(true);
    setActionError("");
    try {
      await currencyApi.setBase(id, true);
      setConfirmBase(false);
      load();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to set base currency.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="p-6 text-sm t-muted">Loading…</div>;
  if (error || !currency) return <div className="p-6 text-sm text-red-400">{error || "Not found."}</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link to="/superadmin/settings/currencies" className="text-xs t-muted hover:underline">
          ← Back to currencies
        </Link>
        <div className="flex items-start justify-between gap-3 mt-2 flex-wrap">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold t-heading">
              {currency.currency_symbol} {currency.currency_code}
            </h2>
            <Badge variant={STATUS_VARIANT[currency.status] || "default"} label={currency.status} />
            {currency.is_base_currency && <Badge variant="pending" label="Base currency" />}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {hasPermission(CURRENCY_PERMS.overrideRate) && (
              <button onClick={() => setRateOpen(true)} className="btn-secondary">Update Rate</button>
            )}
            {hasPermission(CURRENCY_PERMS.activate) && !currency.is_base_currency && (
              <button onClick={toggleStatus} disabled={actionLoading} className="btn-secondary">
                {currency.status === "Active" ? "Deactivate" : "Activate"}
              </button>
            )}
            {hasPermission(CURRENCY_PERMS.edit) && !currency.is_base_currency && (
              <button onClick={() => setConfirmBase(true)} className="btn-secondary">Set as base</button>
            )}
            {hasPermission(CURRENCY_PERMS.edit) && (
              <button onClick={() => navigate(`/superadmin/settings/currencies/${id}/edit`)} className="btn-primary">
                Edit
              </button>
            )}
          </div>
        </div>
        {actionError && <p className="text-xs text-red-400 mt-2">{actionError}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card title="Details">
          <Row label="Name" value={currency.currency_name} />
          <Row label="Country" value={currency.country} />
          <Row label="Symbol" value={currency.currency_symbol} />
          <Row label="Decimal places" value={currency.decimal_places} />
          <Row label="Created" value={formatDateTime(currency.created_at)} />
        </Card>
        <Card title="Current Exchange Rate">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold t-heading">{formatRate(currency.exchange_rate)}</span>
            {currency.is_manual_override && <Badge variant="trial" label="Manual override" />}
          </div>
          <div className="mt-3 space-y-2">
            <Row label="Source" value={currency.rate_source || "—"} />
            <Row label="Last updated" value={formatDateTime(currency.rate_last_updated_at)} />
          </div>
        </Card>
      </div>

      {hasPermission(CURRENCY_PERMS.viewHistory) && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold t-heading">Recent Rate Changes</h3>
            <Link to={`/superadmin/settings/currencies/${id}/history`} className="text-xs t-muted hover:underline">
              View full history →
            </Link>
          </div>
          <RateHistoryGrid rows={history} loading={false} />
        </div>
      )}

      {rateOpen && (
        <RateModal
          currency={currency}
          rateSources={meta.rate_sources || []}
          onClose={() => setRateOpen(false)}
          onSaved={() => { setRateOpen(false); load(); }}
        />
      )}

      <Modal
        open={confirmBase}
        onClose={() => setConfirmBase(false)}
        title="Set base currency"
        footer={
          <>
            <button onClick={() => setConfirmBase(false)} className="btn-secondary">Cancel</button>
            <button onClick={executeBase} disabled={actionLoading} className="btn-primary">
              {actionLoading ? "Saving…" : "Confirm"}
            </button>
          </>
        }
      >
        <p className="text-sm t-body">
          Make <strong>{currency.currency_code}</strong> the single platform base currency? The
          current base will be demoted. This change is audited.
        </p>
      </Modal>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="rounded-xl p-4" style={{ border: "1px solid var(--c-border)", background: "var(--c-surface2)" }}>
      <p className="text-xs font-semibold uppercase tracking-widest t-muted mb-3">{title}</p>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-sm t-muted">{label}</span>
      <span className="text-sm t-body font-medium">{value ?? "—"}</span>
    </div>
  );
}
