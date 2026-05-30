import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { authApi } from "../../services/apiClient";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";

/* ── Animation configs ─────────────────────────────────────────────────── */
const EASE_CINEMA = [0.16, 1, 0.3, 1];
const ACCENT = "#00aeec";
const ORANGE = "#ff7a1a";

/* ── Animated background orbs ───────────────────────────────────────────── */
const ORBS = [
  { color: "rgba(255,122,26,0.55)", size: 460, top: "-12%", left: "-8%", dur: 16, move: [0, 60, -30, 0], moveY: [0, -40, 30, 0] },
  { color: "rgba(0,174,236,0.45)", size: 520, bottom: "-16%", right: "-10%", dur: 20, move: [0, -50, 40, 0], moveY: [0, 40, -30, 0] },
  { color: "rgba(255,122,26,0.32)", size: 300, top: "45%", right: "18%", dur: 14, move: [0, 40, -40, 0], moveY: [0, -30, 30, 0] },
  { color: "rgba(0,174,236,0.30)", size: 260, bottom: "10%", left: "12%", dur: 18, move: [0, -30, 50, 0], moveY: [0, 30, -40, 0] },
];

function AnimatedBackground({ reduced }) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {ORBS.map((o, i) => (
        <motion.div
          key={i}
          aria-hidden="true"
          animate={reduced ? {} : { x: o.move, y: o.moveY, scale: [1, 1.12, 0.95, 1] }}
          transition={reduced ? {} : { duration: o.dur, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            top: o.top,
            left: o.left,
            right: o.right,
            bottom: o.bottom,
            width: o.size,
            height: o.size,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${o.color} 0%, transparent 70%)`,
            filter: "blur(40px)",
          }}
        />
      ))}
    </div>
  );
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
};

const fadeSlide = {
  hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
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

  /* ── 3D tilt (mouse-driven) ──────────────────────────────────────────── */
  const prefersReducedMotion = useReducedMotion();
  const cardRef = useRef(null);
  const mvX = useMotionValue(0);
  const mvY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mvY, [-0.5, 0.5], [8, -8]), { stiffness: 150, damping: 18 });
  const rotateY = useSpring(useTransform(mvX, [-0.5, 0.5], [-8, 8]), { stiffness: 150, damping: 18 });
  const glareX = useTransform(mvX, [-0.5, 0.5], ["0%", "100%"]);
  const glareY = useTransform(mvY, [-0.5, 0.5], ["0%", "100%"]);

  const handleMouseMove = (e) => {
    if (prefersReducedMotion) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    mvX.set((e.clientX - rect.left) / rect.width - 0.5);
    mvY.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const handleMouseLeave = () => {
    mvX.set(0);
    mvY.set(0);
  };

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

  const inputStyle = (name, hasLeftIcon = true, hasRightIcon = false) => ({
    width: "100%",
    boxSizing: "border-box",
    background: focusedField === name ? "rgba(0,174,236,0.10)" : "rgba(255,255,255,0.06)",
    border: focusedField === name ? `1px solid ${ACCENT}` : "1px solid rgba(255,255,255,0.14)",
    borderRadius: 12,
    padding: `13px ${hasRightIcon ? "44px" : "14px"} 13px ${hasLeftIcon ? "44px" : "14px"}`,
    fontSize: 14,
    color: "#f1f5f9",
    outline: "none",
    transition: "all 0.25s",
    boxShadow: focusedField === name ? "0 0 0 3px rgba(0,174,236,0.18)" : "none",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(72px, 8vh, 96px) clamp(20px, 4vw, 48px)",
        overflowX: "hidden",
        overflowY: "auto",
        perspective: 1200,
      }}
    >
      {/* ── Background image ─────────────────────────────────────────── */}
      <img
        src="/admin-bg.png"
        alt=""
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
      {/* Darkening + color wash for contrast and 3D depth */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(120% 120% at 50% 0%, rgba(0,40,80,0.45) 0%, rgba(2,6,23,0.78) 70%, rgba(2,6,23,0.92) 100%)",
        }}
      />

      {/* Animated drifting orbs (orange + cyan) */}
      <AnimatedBackground reduced={prefersReducedMotion} />

      {/* Back to home */}
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-2"
        style={{
          position: "absolute",
          top: "clamp(20px, 4vw, 36px)",
          left: "clamp(20px, 4vw, 36px)",
          zIndex: 5,
          color: "rgba(255,255,255,0.6)",
          fontSize: 13,
          fontWeight: 500,
          background: "none",
          border: "none",
          cursor: "pointer",
          transition: "color 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Home
      </button>

      {/* ── Floating 3D card ─────────────────────────────────────────── */}
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        initial={{ opacity: 0, y: 30, rotateX: 12 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.7, ease: EASE_CINEMA }}
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: 420,
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          borderRadius: 24,
          padding: "clamp(28px, 4vw, 44px)",
          background: "rgba(15, 23, 42, 0.55)",
          backdropFilter: "blur(22px)",
          WebkitBackdropFilter: "blur(22px)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow:
            "0 40px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 1px 0 rgba(255,255,255,0.15) inset",
          color: "#f1f5f9",
        }}
      >
        {/* Moving glare highlight for 3D feel */}
        <motion.div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 24,
            pointerEvents: "none",
            background: useTransform(
              [glareX, glareY],
              ([x, y]) =>
                `radial-gradient(500px circle at ${x} ${y}, rgba(255,122,26,0.22), rgba(0,174,236,0.16) 40%, transparent 60%)`
            ),
          }}
        />

        <motion.div variants={stagger} initial="hidden" animate="show" style={{ transform: "translateZ(40px)" }}>
          {/* Wordmark */}
          <motion.div variants={fadeSlide} style={{ marginBottom: 30, display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                background: "linear-gradient(135deg, #00aeec, #ff7a1a)",
                borderRadius: 11,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 22px rgba(255,122,26,0.45)",
              }}
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>Office Repo</div>
              <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.55)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 500 }}>
                Unified Workplace Management
              </div>
            </div>
          </motion.div>

          {/* Title */}
          <motion.div variants={fadeSlide} style={{ marginBottom: 26 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", margin: 0, color: "#fff" }}>
              Admin Access
            </h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", margin: "6px 0 0" }}>
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
                role="alert"
                aria-live="assertive"
                style={{
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.35)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 13,
                  color: "#fca5a5",
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
              <label htmlFor="admin-email" style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.75)", marginBottom: 8 }}>
                Email <span style={{ color: ORANGE }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: focusedField === "email" ? ACCENT : "rgba(255,255,255,0.4)",
                    transition: "color 0.2s",
                  }}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="admin@officerepo.com"
                  autoComplete="email"
                  required
                  style={inputStyle("email")}
                />
              </div>
            </motion.div>

            {/* Password */}
            <motion.div variants={fadeSlide} style={{ marginBottom: 26 }}>
              <label htmlFor="admin-password" style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.75)", marginBottom: 8 }}>
                Password <span style={{ color: ORANGE }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: focusedField === "password" ? ACCENT : "rgba(255,255,255,0.4)",
                    transition: "color 0.2s",
                  }}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="admin-password"
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
                  aria-label={showPass ? "Hide password" : "Show password"}
                  aria-pressed={showPass}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "rgba(255,255,255,0.4)",
                    padding: 4,
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
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
                whileHover={!loading ? { scale: 1.02 } : {}}
                whileTap={!loading ? { scale: 0.98 } : {}}
                style={{
                  width: "100%",
                  background: loading ? "#0a6f93" : "linear-gradient(135deg, #00aeec, #ff7a1a)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  padding: "13px 24px",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  letterSpacing: "-0.01em",
                  boxShadow: "0 12px 28px rgba(255,122,26,0.4)",
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

          {/* Footer */}
          <motion.div
            variants={fadeSlide}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 28,
              paddingTop: 20,
              borderTop: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Restricted access</span>
            <div className="flex items-center gap-1.5">
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>by</span>
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
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
