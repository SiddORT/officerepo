import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { currencyApi } from "../../../../services/apiClient";
import Input from "../../../../components/ui/Input";
import Select from "../../../../components/ui/Select";
import Checkbox from "../../../../components/ui/Checkbox";
import { toOptions } from "./constants";

const unwrap = (res) => res?.data?.data ?? res?.data;

const CODE_RE = /^[A-Z]{3}$/;

export default function CurrencyForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [meta, setMeta] = useState({ statuses: [], rate_sources: [], decimal_places: { min: 0, max: 6 } });
  const [form, setForm] = useState({
    currency_code: "",
    currency_name: "",
    currency_symbol: "",
    country: "",
    decimal_places: 2,
    status: "Active",
    is_base_currency: false,
    exchange_rate: "",
    rate_source: "Manual",
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErr, setFieldErr] = useState({});

  useEffect(() => {
    currencyApi.options().then((res) => setMeta(unwrap(res) || {})).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    currencyApi
      .get(id)
      .then((res) => {
        const d = unwrap(res);
        setForm({
          currency_code: d.currency_code || "",
          currency_name: d.currency_name || "",
          currency_symbol: d.currency_symbol || "",
          country: d.country || "",
          decimal_places: d.decimal_places ?? 2,
          status: d.status || "Active",
          is_base_currency: !!d.is_base_currency,
          exchange_rate: d.exchange_rate != null ? String(d.exchange_rate) : "",
          rate_source: d.rate_source || "Manual",
        });
      })
      .catch(() => setError("Failed to load currency."))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const set = (key) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const validate = () => {
    const errs = {};
    const code = form.currency_code.trim().toUpperCase();
    if (!CODE_RE.test(code)) errs.currency_code = "Must be a 3-letter ISO code (e.g. USD).";
    if (form.currency_name.trim().length < 2) errs.currency_name = "Name is required.";
    if (!form.currency_symbol.trim()) errs.currency_symbol = "Symbol is required.";
    if (form.country.trim().length < 2) errs.country = "Country is required.";
    const dp = Number(form.decimal_places);
    if (Number.isNaN(dp) || dp < 0 || dp > 6) errs.decimal_places = "Must be between 0 and 6.";
    if (!isEdit && !form.is_base_currency && form.exchange_rate !== "") {
      const r = Number(form.exchange_rate);
      if (Number.isNaN(r) || r <= 0) errs.exchange_rate = "Rate must be greater than 0.";
    }
    setFieldErr(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setError("");
    try {
      if (isEdit) {
        await currencyApi.update(id, {
          currency_name: form.currency_name.trim(),
          currency_symbol: form.currency_symbol.trim(),
          country: form.country.trim(),
          decimal_places: Number(form.decimal_places),
          status: form.status,
        });
        navigate(`/superadmin/settings/currencies/${id}`);
      } else {
        const payload = {
          currency_code: form.currency_code.trim().toUpperCase(),
          currency_name: form.currency_name.trim(),
          currency_symbol: form.currency_symbol.trim(),
          country: form.country.trim(),
          decimal_places: Number(form.decimal_places),
          status: form.status,
          is_base_currency: form.is_base_currency,
          rate_source: form.rate_source,
        };
        if (!form.is_base_currency && form.exchange_rate !== "") {
          payload.exchange_rate = Number(form.exchange_rate);
        }
        const res = await currencyApi.create(payload);
        const created = unwrap(res);
        navigate(`/superadmin/settings/currencies/${created.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save currency.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm t-muted">Loading…</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link to="/superadmin/settings/currencies" className="text-xs t-muted hover:underline">
          ← Back to currencies
        </Link>
        <h2 className="text-xl font-bold t-heading mt-2">{isEdit ? "Edit Currency" : "Add Currency"}</h2>
      </div>

      <form onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Currency code"
            required
            value={form.currency_code}
            onChange={set("currency_code")}
            disabled={isEdit}
            maxLength={3}
            placeholder="USD"
            error={fieldErr.currency_code}
            hint={isEdit ? "Code cannot be changed." : "3-letter ISO 4217 code."}
            inputClassName="uppercase"
          />
          <Input
            label="Symbol"
            required
            value={form.currency_symbol}
            onChange={set("currency_symbol")}
            maxLength={8}
            placeholder="$"
            error={fieldErr.currency_symbol}
          />
        </div>

        <Input
          label="Currency name"
          required
          value={form.currency_name}
          onChange={set("currency_name")}
          placeholder="US Dollar"
          error={fieldErr.currency_name}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Country"
            required
            value={form.country}
            onChange={set("country")}
            placeholder="United States"
            error={fieldErr.country}
          />
          <Input
            label="Decimal places"
            required
            type="number"
            min={meta.decimal_places?.min ?? 0}
            max={meta.decimal_places?.max ?? 6}
            value={form.decimal_places}
            onChange={set("decimal_places")}
            error={fieldErr.decimal_places}
          />
        </div>

        <Select
          label="Status"
          required
          value={form.status}
          onChange={set("status")}
          options={toOptions(meta.statuses || [])}
          placeholder="Select status"
        />

        {!isEdit && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Initial exchange rate"
                type="number"
                step="any"
                min="0"
                value={form.exchange_rate}
                onChange={set("exchange_rate")}
                disabled={form.is_base_currency}
                placeholder="1.0"
                error={fieldErr.exchange_rate}
                hint={form.is_base_currency ? "Base currency is always 1.0." : "Per 1 unit of base."}
              />
              <Select
                label="Rate source"
                value={form.rate_source}
                onChange={set("rate_source")}
                options={toOptions(meta.rate_sources || [])}
                placeholder="Select source"
                disabled={form.is_base_currency}
              />
            </div>
            <Checkbox
              label="Set as base currency"
              checked={form.is_base_currency}
              onChange={set("is_base_currency")}
              hint="Only one base currency is allowed; the existing base will be demoted."
            />
          </>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link to="/superadmin/settings/currencies" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Currency"}
          </button>
        </div>
      </form>
    </div>
  );
}
