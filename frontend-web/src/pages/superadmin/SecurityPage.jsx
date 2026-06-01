import React, { useState, useEffect } from "react";
import { secretsApi, corsRejectionsApi } from "../../services/apiClient";

function formatRemaining(ms) {
  if (ms <= 0) return "expired";
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(" ");
}

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-xs t-accent font-medium transition-colors hover:underline whitespace-nowrap"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function SecretRow({ label, value }) {
  return (
    <div>
      <label className="block text-xs t-muted mb-1 uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-3">
        <code className="flex-1 input-field font-mono text-xs break-all py-2">{value}</code>
        <CopyButton value={value} />
      </div>
    </div>
  );
}

function formatTimestamp(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function CorsRejectionsPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await corsRejectionsApi.list();
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to load blocked origins.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const items = data?.items || [];

  return (
    <div className="card mt-6">
      <div className="flex items-start justify-between gap-6 mb-4">
        <div>
          <h3 className="font-semibold t-heading">Blocked Origins (CORS)</h3>
          <p className="text-sm t-muted mt-1">
            Browser requests rejected by the CORS policy. A recurring entry here
            usually means a typo'd subdomain or a missing{" "}
            <span className="font-mono">ALLOWED_ORIGINS</span> entry.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="btn-secondary whitespace-nowrap"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {data && (
        <div className="flex gap-6 mb-4">
          <div>
            <p className="text-xs t-muted uppercase tracking-wider">Distinct origins</p>
            <p className="t-heading text-xl font-bold">{data.distinct_origins}</p>
          </div>
          <div>
            <p className="text-xs t-muted uppercase tracking-wider">Total blocks</p>
            <p className="t-heading text-xl font-bold">{data.total_hits}</p>
          </div>
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {!error && !loading && items.length === 0 && (
        <div
          className="rounded-lg p-4 text-sm t-muted"
          style={{ background: "var(--c-surface2)" }}
        >
          No blocked origins recorded. Cross-origin requests are being accepted as
          configured.
        </div>
      )}

      {items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left t-muted text-xs uppercase tracking-wider">
                <th className="py-2 pr-4 font-medium">Origin</th>
                <th className="py-2 pr-4 font-medium">Blocks</th>
                <th className="py-2 pr-4 font-medium">Last request</th>
                <th className="py-2 pr-4 font-medium">Last seen</th>
                <th className="py-2 font-medium">First seen</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, i) => (
                <tr
                  key={`${row.origin}-${i}`}
                  className="border-t"
                  style={{ borderColor: "var(--c-border)" }}
                >
                  <td className="py-2 pr-4">
                    <code className="font-mono text-xs break-all">{row.origin}</code>
                  </td>
                  <td className="py-2 pr-4">
                    <span className="badge-warning">{row.hit_count}</span>
                  </td>
                  <td className="py-2 pr-4 t-body">
                    {row.last_method ? (
                      <span>
                        <span className="font-mono text-xs">{row.last_method}</span>{" "}
                        <span className="t-muted break-all">{row.last_path || ""}</span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2 pr-4 t-body whitespace-nowrap">
                    {formatTimestamp(row.last_seen_at)}
                  </td>
                  <td className="py-2 t-body whitespace-nowrap">
                    {formatTimestamp(row.first_seen_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function SecurityPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleRotate = async () => {
    setConfirmOpen(false);
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await secretsApi.rotate();
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to rotate secrets.");
    } finally {
      setLoading(false);
    }
  };

  const expiresAt = result?.grace_period_expires_at
    ? new Date(result.grace_period_expires_at)
    : null;
  const remainingMs = expiresAt ? expiresAt.getTime() - now : null;
  const isProduction = result && result.rotated === false;

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold t-heading">Secret Rotation</h2>
        <p className="t-muted mt-1">
          Rotate the JWT and refresh-token signing secrets. The previous secrets stay
          valid during a grace period so active sessions are not interrupted.
        </p>
      </div>

      {/* Action card */}
      <div className="card mb-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h3 className="font-semibold t-heading">Rotate Secrets</h3>
            <p className="text-sm t-muted mt-1">
              Promotes the current secrets to <span className="font-mono">PREVIOUS_*</span>,
              generates new ones, and starts the grace-period clock.
            </p>
          </div>
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={loading}
            className="btn-primary whitespace-nowrap"
          >
            {loading ? "Rotating..." : "Rotate Secrets"}
          </button>
        </div>
      </div>

      {error && (
        <div className="card mb-6 border" style={{ borderColor: "rgba(239,68,68,0.4)" }}>
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="card space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold t-heading">
              {result.rotated ? "Rotation Complete" : "Manual Rotation Required"}
            </h3>
            {result.rotated ? (
              <span className="badge-active">rotated</span>
            ) : (
              <span className="badge-warning">{result.environment}</span>
            )}
          </div>

          <p className="text-sm t-body">{result.message}</p>

          {/* Grace period countdown */}
          {expiresAt && (
            <div className="rounded-lg p-4" style={{ background: "var(--c-surface2)" }}>
              <p className="text-xs t-muted uppercase tracking-wider mb-1">
                Grace period expires
              </p>
              <p className="t-heading font-semibold">
                {expiresAt.toLocaleString()}
              </p>
              <p className="text-sm t-accent mt-1">
                {remainingMs > 0
                  ? `${formatRemaining(remainingMs)} remaining`
                  : "Grace period has expired"}
              </p>
              {result.grace_period_hours != null && (
                <p className="text-xs t-muted mt-1">
                  Grace window: {result.grace_period_hours} hours
                </p>
              )}
            </div>
          )}

          {/* New secret values — one-time display (development) */}
          {result.rotated && result.new_jwt_secret && (
            <div className="space-y-4">
              <div
                className="rounded-lg p-3 text-xs"
                style={{
                  background: "rgba(245,158,11,0.10)",
                  border: "1px solid rgba(245,158,11,0.30)",
                  color: "#f59e0b",
                }}
              >
                These values are shown only once. Copy them into your secrets manager now
                and redeploy — you will not be able to retrieve them again.
              </div>
              <SecretRow label="New JWT Secret" value={result.new_jwt_secret} />
              <SecretRow label="New Refresh Secret" value={result.new_refresh_secret} />
              {result.previous_jwt_secret_kid && (
                <p className="text-xs t-muted">
                  Previous JWT key id:{" "}
                  <span className="font-mono">{result.previous_jwt_secret_kid}</span>
                  {result.previous_refresh_secret_kid && (
                    <>
                      {" · "}Previous refresh key id:{" "}
                      <span className="font-mono">
                        {result.previous_refresh_secret_kid}
                      </span>
                    </>
                  )}
                </p>
              )}
            </div>
          )}

          {/* Instructions */}
          {result.instructions && result.instructions.length > 0 && (
            <div>
              <p className="text-xs t-muted uppercase tracking-wider mb-2">
                {isProduction ? "Manual rotation steps" : "Next steps"}
              </p>
              <ol className="space-y-1.5">
                {result.instructions.map((step, i) => (
                  <li key={step} className="text-sm t-body flex gap-2">
                    <span className="t-muted">{i + 1}.</span>
                    <span>{step.replace(/^\d+\.\s*/, "")}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Blocked origins (CORS) panel */}
      <CorsRejectionsPanel />

      {/* Confirm dialog */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold t-heading mb-2">Rotate secrets?</h3>
            <p className="text-sm t-muted mb-6">
              This generates new signing secrets immediately. Make sure you can copy the
              new values into your secrets manager and redeploy. Existing sessions keep
              working during the grace period.
            </p>
            <div className="flex gap-3">
              <button onClick={handleRotate} className="btn-primary flex-1">
                Yes, rotate
              </button>
              <button
                onClick={() => setConfirmOpen(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
