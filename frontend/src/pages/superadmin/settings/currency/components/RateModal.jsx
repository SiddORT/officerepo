import React, { useState } from "react";
import Modal from "../../../../../components/ui/Modal";
import Input from "../../../../../components/ui/Input";
import Select from "../../../../../components/ui/Select";
import Checkbox from "../../../../../components/ui/Checkbox";
import { currencyApi } from "../../../../../services/apiClient";
import { toOptions } from "../constants";

// Update / manually-override the current exchange rate for a currency.
export default function RateModal({ currency, rateSources = [], onClose, onSaved }) {
  const [rate, setRate] = useState(
    currency?.exchange_rate != null ? String(currency.exchange_rate) : ""
  );
  const [source, setSource] = useState(currency?.rate_source || "Manual");
  const [override, setOverride] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErr, setFieldErr] = useState({});

  const submit = async () => {
    const errs = {};
    const num = Number(rate);
    if (rate === "" || Number.isNaN(num)) errs.rate = "Enter a valid number.";
    else if (num <= 0) errs.rate = "Exchange rate must be greater than 0.";
    if (!source) errs.source = "Select a rate source.";
    setFieldErr(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    setError("");
    try {
      await currencyApi.updateRate(currency.id, {
        exchange_rate: num,
        rate_source: source,
        is_manual_override: override,
      });
      onSaved?.();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update the exchange rate.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Update Rate — ${currency?.currency_code}`}
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save Rate"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs t-muted">
          Rate expressed per <strong>1 unit of the base currency</strong>. Every change is
          journaled to the rate history and audit log.
        </p>
        <Input
          label="Exchange rate"
          required
          type="number"
          step="any"
          min="0"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          error={fieldErr.rate}
          placeholder="e.g. 0.92"
        />
        <Select
          label="Rate source"
          required
          value={source}
          onChange={(e) => setSource(e.target.value)}
          options={toOptions(rateSources)}
          placeholder="Select source"
          error={fieldErr.source}
        />
        <Checkbox
          label="Flag as manual override"
          checked={override}
          onChange={(e) => setOverride(e.target.checked)}
          hint="Records this change as a deliberate manual override (flagged in history)."
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    </Modal>
  );
}
