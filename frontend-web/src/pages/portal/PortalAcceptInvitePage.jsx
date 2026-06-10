import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { portalAuthApi } from "../../services/apiClient";
import { motion, AnimatePresence } from "framer-motion";

const EASE_CINEMA = [0.16, 1, 0.3, 1];
const ACCENT = "#00aeec";
const ORANGE = "#ff7a1a";

export default function PortalAcceptInvitePage() {
  const { subdomain } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") || "";

  const [status, setStatus] = useState("loading"); // loading | ready | invalid | done
  const [invite, setInvite] = useState(null);
  const [loadError, setLoadError] = useState("");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [fieldErr, setFieldErr] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!token) { setStatus("invalid"); setLoadError("This link is missing its token."); return; }
    portalAuthApi.validateInvite(subdomain, token)
      .then((res) => { if (!active) return; setInvite(res.data.data); setStatus("ready"); })
      .catch((err) => { if (!active) return; setLoadError(err.response?.data?.detail || "This invitation is invalid or has expired."); setStatus("invalid"); });
    return () => { active = false; };
  }, [token, subdomain]);

  const validate = () => {
    const errs = {};
    if (password.length < 8) errs.password = "Password must be at least 8 characters.";
    if (confirm !== password) errs.confirm = "Passwords do not match.";
    setFieldErr(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true); setError("");
    try {
      await portalAuthApi.acceptInvite(subdomain, token, password);
      setStatus("done");
      setTimeout(() => navigate(`/portal/${subdomain}`), 2200);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to set your password. The link may have expired.");
    } finally { setSubmitting(false); }
  };

  const workspaceName = invite?.workspace_name || (subdomain.charAt(0).toUpperCase() + subdomain.slice(1));

  const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.75)", marginBottom: 8 };
  const inputStyle = (invalid) => ({
    width: "100%", boxSizing: "border-box",
    background: "rgba(255,255,255,0.06)",
    border: `1px solid ${invalid ? "rgba(239,68,68,0.55)" : "rgba(255,255,255,0.14)"}`,
    borderRadius: 12, padding: "13px 44px 13px 14px",
    fontSize: 14, color: "#f1f5f9", outline: "none", transition: "all 0.25s",
  });

  return (
    <div style={{
      minHeight: "100vh", position: "relative", display: "flex",
      alignItems: "center", justifyContent: "center",
      padding: "clamp(48px,8vh,96px) clamp(20px,4vw,48px)",
      overflowX: "hidden", overflowY: "auto",
    }}>
      <img src="/admin-bg.png" alt="" aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(120% 120% at 50% 0%, rgba(0,40,80,0.45) 0%, rgba(2,6,23,0.82) 70%, rgba(2,6,23,0.96) 100%)",
      }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE_CINEMA }}
        style={{
          position: "relative", zIndex: 2, width: "100%", maxWidth: 440,
          borderRadius: 24, padding: "clamp(28px,4vw,44px)",
          background: "rgba(15,23,42,0.6)", backdropFilter: "blur(22px)",
          WebkitBackdropFilter: "blur(22px)", border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 40px 80px -20px rgba(0,0,0,0.7)", color: "#f1f5f9",
        }}
      >
        {/* Brand */}
        <div style={{ marginBottom: 26, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 38, height: 38, background: "linear-gradient(135deg, #00aeec, #ff7a1a)",
            borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 22px rgba(255,122,26,0.45)",
          }}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>{workspaceName}</div>
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.55)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 500 }}>
              Powered by Office Repo
            </div>
          </div>
        </div>

        {status === "loading" && (
          <div className="flex items-center gap-3 py-6">
            <motion.div style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.2)", borderTopColor: ACCENT, borderRadius: "50%" }}
              animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }} />
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>Verifying your invitation…</span>
          </div>
        )}

        {status === "invalid" && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", margin: 0, color: "#fff" }}>
              Invitation unavailable
            </h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", margin: "10px 0 24px" }}>{loadError}</p>
            <button onClick={() => navigate(`/portal/${subdomain}`)} className="btn-primary" style={{ width: "100%" }}>
              Go to Sign In
            </button>
          </div>
        )}

        {status === "done" && (
          <div>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🎉</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", margin: 0, color: "#fff" }}>
              You're all set!
            </h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", margin: "10px 0 0" }}>
              Your password has been set. Redirecting you to sign in…
            </p>
          </div>
        )}

        {status === "ready" && (
          <>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", margin: 0, color: "#fff" }}>
                Set your password
              </h1>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", margin: "8px 0 0" }}>
                Welcome{invite?.name ? `, ${invite.name}` : ""}! Create a password for{" "}
                <span style={{ color: ACCENT, fontWeight: 600 }}>{invite?.email}</span> to access{" "}
                <span style={{ color: "rgba(255,255,255,0.85)" }}>{workspaceName}</span>.
              </p>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  role="alert"
                  style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#fca5a5", marginBottom: 18 }}>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>
                  New password <span style={{ color: ORANGE }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <input type={showPass ? "text" : "password"} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters" autoComplete="new-password"
                    style={inputStyle(!!fieldErr.password)} />
                  <button type="button" onClick={() => setShowPass((s) => !s)}
                    aria-label={showPass ? "Hide password" : "Show password"}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: showPass ? "#00aeec" : "rgba(255,255,255,0.55)", padding: 4, display: "flex", alignItems: "center", transition: "color 0.2s" }}>
                    {showPass ? (
                      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {fieldErr.password && <p style={{ fontSize: 12, color: "#fca5a5", margin: "6px 0 0" }}>{fieldErr.password}</p>}
              </div>

              <div style={{ marginBottom: 26 }}>
                <label style={labelStyle}>
                  Confirm password <span style={{ color: ORANGE }}>*</span>
                </label>
                <input type={showPass ? "text" : "password"} value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter your password" autoComplete="new-password"
                  style={{ ...inputStyle(!!fieldErr.confirm), padding: "13px 14px" }} />
                {fieldErr.confirm && <p style={{ fontSize: 12, color: "#fca5a5", margin: "6px 0 0" }}>{fieldErr.confirm}</p>}
              </div>

              <motion.button type="submit" disabled={submitting}
                whileHover={!submitting ? { scale: 1.02 } : {}} whileTap={!submitting ? { scale: 0.98 } : {}}
                style={{
                  width: "100%",
                  background: submitting ? "#0a6f93" : "linear-gradient(135deg, #00aeec, #ff7a1a)",
                  color: "#fff", border: "none", borderRadius: 12, padding: "13px 24px",
                  fontSize: 15, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer",
                  boxShadow: "0 12px 28px rgba(255,122,26,0.4)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                }}>
                {submitting ? (
                  <>
                    <motion.div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%" }}
                      animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
                    Activating…
                  </>
                ) : "Activate account"}
              </motion.button>
            </form>
          </>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginTop: 28, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>by</span>
            <span style={{ fontSize: 15, fontWeight: 800, fontFamily: "monospace", letterSpacing: "0.06em", background: "linear-gradient(135deg, #ff7a1a, #00aeec)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>ort_</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
