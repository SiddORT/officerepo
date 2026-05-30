import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { authApi } from "../../services/apiClient";
import { motion, AnimatePresence } from "framer-motion";

/* ── Animation configs ─────────────────────────────────────────────────── */
const EASE_CINEMA = [0.16, 1, 0.3, 1];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
};

const fadeSlide = {
  hidden: { opacity: 0, y: 16, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: EASE_CINEMA } },
};

/* ── Main page ─────────────────────────────────────────────────────────── */
export default function AdminLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await authApi.superAdminLogin(email, password);
      const data = res.data;
      login(
        { email, role: data.role, tenant_id: data.tenant_id, user_id: data.user_id },
        { access_token: data.access_token, refresh_token: data.refresh_token }
      );
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const ACCENT = "#ff7a1a";

  const inputStyle = (name, hasLeftIcon = true, hasRightIcon = false) => ({
    width: "100%",
    boxSizing: "border-box",
    background: focusedField === name ? "rgba(255,122,26,0.05)" : "#ffffff",
    border:
      focusedField === name
        ? `1px solid ${ACCENT}`
        : "1px solid #e2e8f0",
    borderRadius: 12,
    padding: `12px ${hasRightIcon ? "44px" : "14px"} 12px ${hasLeftIcon ? "44px" : "14px"}`,
    fontSize: 14,
    color: "#0f172a",
    outline: "none",
    transition: "all 0.25s",
    boxShadow: focusedField === name ? "0 0 0 3px rgba(255,122,26,0.12)" : "none",
  });

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#ffffff", color: "#0f172a" }}>
      {/* ── LEFT: Login form ─────────────────────────────────────────── */}
      <div
        style={{
          flex: "1 1 50%",
          display: "flex",
          flexDirection: "column",
          padding: "clamp(28px, 5vw, 64px)",
          position: "relative",
        }}
      >
        {/* Back to home */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2"
          style={{
            color: "#94a3b8",
            fontSize: 13,
            fontWeight: 500,
            background: "none",
            border: "none",
            cursor: "pointer",
            transition: "color 0.2s",
            alignSelf: "flex-start",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#475569")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Home
        </button>

        {/* Centered form block */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            style={{ width: "100%", maxWidth: 400, margin: "0 auto" }}
          >
            {/* Wordmark */}
            <motion.div variants={fadeSlide} style={{ marginBottom: 40 }}>
              <div className="flex items-center gap-2.5">
                <div
                  style={{
                    width: 36,
                    height: 36,
                    background: "linear-gradient(135deg, #ff7a1a, #ff9d4d)",
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 6px 18px rgba(255,122,26,0.35)",
                  }}
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>Office Repo</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 500 }}>
                    Unified Workplace Management
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Title */}
            <motion.div variants={fadeSlide} style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>
                Admin Access
              </h1>
              <p style={{ fontSize: 14, color: "#64748b", margin: "6px 0 0" }}>
                Sign in to your Office Repo workspace.
              </p>
            </motion.div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    background: "rgba(239,68,68,0.06)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    fontSize: 13,
                    color: "#dc2626",
                    marginBottom: 18,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit}>
              {/* Email */}
              <motion.div variants={fadeSlide} style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                  Email <span style={{ color: ACCENT }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: 14,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: focusedField === "email" ? ACCENT : "#cbd5e1",
                      transition: "color 0.2s",
                    }}
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="admin@officerepo.io"
                    autoComplete="email"
                    required
                    style={inputStyle("email")}
                  />
                </div>
              </motion.div>

              {/* Password */}
              <motion.div variants={fadeSlide} style={{ marginBottom: 26 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                  Password <span style={{ color: ACCENT }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: 14,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: focusedField === "password" ? ACCENT : "#cbd5e1",
                      transition: "color 0.2s",
                    }}
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    style={inputStyle("password", true, true)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#cbd5e1",
                      padding: 4,
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#64748b")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#cbd5e1")}
                  >
                    {showPass ? (
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </motion.div>

              {/* Submit */}
              <motion.div variants={fadeSlide}>
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={!loading ? { scale: 1.01 } : {}}
                  whileTap={!loading ? { scale: 0.99 } : {}}
                  style={{
                    width: "100%",
                    background: loading ? "#fbbf85" : "linear-gradient(135deg, #ff7a1a, #f4640a)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 12,
                    padding: "13px 24px",
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: loading ? "not-allowed" : "pointer",
                    letterSpacing: "-0.01em",
                    boxShadow: "0 8px 20px rgba(255,122,26,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    transition: "background 0.2s",
                  }}
                >
                  {loading ? (
                    <>
                      <motion.div
                        style={{
                          width: 16,
                          height: 16,
                          border: "2px solid rgba(255,255,255,0.4)",
                          borderTopColor: "#fff",
                          borderRadius: "50%",
                        }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      Access Workspace
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </motion.button>
              </motion.div>
            </form>
          </motion.div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 400, width: "100%", margin: "0 auto" }}>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>Restricted access</span>
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: 12, color: "#cbd5e1" }}>by</span>
            <span
              style={{
                fontSize: 15,
                fontWeight: 800,
                fontFamily: "monospace",
                letterSpacing: "0.06em",
                background: "linear-gradient(135deg, #ff7a1a, #00aeec)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              ort_
            </span>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Office image with orange overlay ──────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: EASE_CINEMA }}
        className="hidden lg:block"
        style={{
          flex: "1 1 50%",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Photo */}
        <img
          src="/office-login.png"
          alt="Modern Office Repo workspace"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
        {/* Orange overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, rgba(255,122,26,0.82) 0%, rgba(244,100,10,0.7) 45%, rgba(180,60,0,0.78) 100%)",
            mixBlendMode: "multiply",
          }}
        />
        {/* Subtle darken for text legibility */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.35), transparent 55%)",
          }}
        />

        {/* Overlay copy */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "clamp(36px, 5vw, 72px)",
            color: "#fff",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7, ease: EASE_CINEMA }}
          >
            <h2 style={{ fontSize: "clamp(28px, 3vw, 40px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", margin: 0, maxWidth: 480 }}>
              Manage your entire workplace from one roof.
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.6, marginTop: 18, maxWidth: 440, color: "rgba(255,255,255,0.9)" }}>
              Multi-tenant control, secure access, and unified modules — everything
              your organization needs, in one platform.
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
