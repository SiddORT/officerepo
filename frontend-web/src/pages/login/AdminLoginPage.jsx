import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { authApi } from "../../services/apiClient";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
} from "framer-motion";

/* ── Animation configs ─────────────────────────────────────────────────── */
const EASE_CINEMA = [0.16, 1, 0.3, 1];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.35 } },
};

const fadeSlide = {
  hidden: { opacity: 0, x: -18, filter: "blur(6px)" },
  show:   { opacity: 1, x: 0,   filter: "blur(0px)", transition: { duration: 0.5, ease: EASE_CINEMA } },
};

/* ── Particles ─────────────────────────────────────────────────────────── */
const PARTICLES = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 2 + 1,
  dur: Math.random() * 12 + 10,
  delay: Math.random() * 8,
  opacity: Math.random() * 0.3 + 0.05,
  color: i % 3 === 0 ? "#00aeec" : i % 3 === 1 ? "#ff7a1a" : "#ffffff",
}));

function ParticleField() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, backgroundColor: p.color, opacity: p.opacity }}
          animate={{ y: [0, -28, 0], x: [0, Math.random() * 12 - 6, 0], opacity: [p.opacity, p.opacity * 1.6, p.opacity] }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

/* ── Dot grid ──────────────────────────────────────────────────────────── */
function DotGrid() {
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)",
        backgroundSize: "40px 40px",
      }}
    />
  );
}

/* ── Ambient orbs ──────────────────────────────────────────────────────── */
function AmbientOrbs() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <motion.div
        style={{ position: "absolute", top: "-20%", right: "-10%", width: 650, height: 650, background: "radial-gradient(circle, rgba(0,174,236,0.11) 0%, transparent 70%)", borderRadius: "50%", filter: "blur(40px)" }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        style={{ position: "absolute", bottom: "-15%", left: "-10%", width: 580, height: 580, background: "radial-gradient(circle, rgba(255,122,26,0.09) 0%, transparent 70%)", borderRadius: "50%", filter: "blur(40px)" }}
        animate={{ scale: [1, 1.14, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      <motion.div
        style={{ position: "absolute", top: "40%", left: "30%", width: 380, height: 380, background: "radial-gradient(circle, rgba(0,174,236,0.05) 0%, transparent 70%)", borderRadius: "50%", filter: "blur(60px)" }}
        animate={{ x: [0, 28, 0], y: [0, -18, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 4 }}
      />
    </div>
  );
}

/* ── Spotlight cursor ──────────────────────────────────────────────────── */
function SpotlightCursor() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 80, damping: 25 });
  const springY = useSpring(mouseY, { stiffness: 80, damping: 25 });

  useEffect(() => {
    const move = (e) => { mouseX.set(e.clientX); mouseY.set(e.clientY); };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      className="fixed pointer-events-none z-10"
      style={{
        x: springX, y: springY,
        translateX: "-50%", translateY: "-50%",
        width: 300, height: 300,
        background: "radial-gradient(circle, rgba(0,174,236,0.055) 0%, transparent 70%)",
        borderRadius: "50%",
      }}
    />
  );
}

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
    if (!email || !password) { setError("Please fill in all fields."); return; }
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

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#081018", color: "#f8fafc", overflowX: "hidden", position: "relative" }}>

      {/* Background layers */}
      <AmbientOrbs />
      <DotGrid />
      <ParticleField />
      <SpotlightCursor />

      {/* Centered layout */}
      <div className="relative z-20 flex flex-col items-center justify-center min-h-screen px-6">

        {/* Back to home */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease: EASE_CINEMA }}
          onClick={() => navigate("/")}
          className="fixed top-6 left-6 z-50 flex items-center gap-2"
          style={{ color: "#475569", fontSize: 13, fontWeight: 500, background: "none", border: "none", cursor: "pointer", transition: "color 0.2s" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#94a3b8")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Home
        </motion.button>

        {/* Wordmark */}
        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0,  filter: "blur(0px)" }}
          transition={{ delay: 0.1, duration: 0.7, ease: EASE_CINEMA }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-2.5 mb-2">
            <div style={{ width: 34, height: 34, background: "linear-gradient(135deg, #00aeec, #ff7a1a)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px rgba(0,174,236,0.45)" }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span style={{ fontSize: 20, fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.02em" }}>Office Repo</span>
          </div>
          <p style={{ fontSize: 12, color: "#334155", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 500 }}>
            Unified Workplace Management
          </p>
        </motion.div>

        {/* Card wrapper — glow ring + card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 32, filter: "blur(12px)" }}
          animate={{ opacity: 1, scale: 1,    y: 0,  filter: "blur(0px)" }}
          transition={{ delay: 0.2, duration: 0.9, ease: EASE_CINEMA }}
          style={{ position: "relative", width: "100%", maxWidth: 420 }}
        >
          {/* Pulsing glow ring behind card */}
          <motion.div
            style={{ position: "absolute", inset: -1, borderRadius: 25, zIndex: 0 }}
            animate={{
              boxShadow: [
                "0 0 0 1px rgba(0,174,236,0.18), 0 0 40px rgba(0,174,236,0.07)",
                "0 0 0 1px rgba(0,174,236,0.45), 0 0 70px rgba(0,174,236,0.16)",
                "0 0 0 1px rgba(0,174,236,0.18), 0 0 40px rgba(0,174,236,0.07)",
              ],
            }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />

          {/* Glass card */}
          <div
            style={{
              position: "relative", zIndex: 1,
              background: "rgba(17,24,39,0.78)",
              borderRadius: 24,
              backdropFilter: "blur(32px)",
              WebkitBackdropFilter: "blur(32px)",
              border: "1px solid rgba(255,255,255,0.07)",
              overflow: "hidden",
              boxShadow: "0 32px 64px rgba(0,0,0,0.55)",
            }}
          >
            {/* Top accent bar */}
            <div style={{ height: 2, background: "linear-gradient(90deg, transparent, #00aeec, #ff7a1a, transparent)" }} />

            <div style={{ padding: "36px 36px 32px" }}>
              {/* Form content with stagger */}
              <motion.div variants={stagger} initial="hidden" animate="show">

                {/* Title */}
                <motion.div variants={fadeSlide} style={{ marginBottom: 28 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
                    <div style={{ width: 3, height: 22, background: "linear-gradient(to bottom, #00aeec, #ff7a1a)", borderRadius: 2 }} />
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.02em", margin: 0 }}>Admin Access</h1>
                  </div>
                  <p style={{ fontSize: 13, color: "#475569", marginLeft: 13, margin: "4px 0 0 13px" }}>
                    Authenticate to continue into OfficeRepo
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
                      style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#f87171", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}
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
                  <motion.div variants={fadeSlide} style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8 }}>
                      Email
                    </label>
                    <div style={{ position: "relative" }}>
                      <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: focusedField === "email" ? "#00aeec" : "#1e3040", transition: "color 0.2s" }}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
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
                        style={{
                          width: "100%", boxSizing: "border-box",
                          background: focusedField === "email" ? "rgba(0,174,236,0.06)" : "rgba(255,255,255,0.03)",
                          border: focusedField === "email" ? "1px solid rgba(0,174,236,0.45)" : "1px solid rgba(255,255,255,0.07)",
                          borderRadius: 12, padding: "12px 14px 12px 44px",
                          fontSize: 14, color: "#f8fafc", outline: "none",
                          transition: "all 0.25s",
                          boxShadow: focusedField === "email" ? "0 0 0 3px rgba(0,174,236,0.1)" : "none",
                        }}
                      />
                    </div>
                  </motion.div>

                  {/* Password */}
                  <motion.div variants={fadeSlide} style={{ marginBottom: 24 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8 }}>
                      Password
                    </label>
                    <div style={{ position: "relative" }}>
                      <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: focusedField === "password" ? "#00aeec" : "#1e3040", transition: "color 0.2s" }}>
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
                        style={{
                          width: "100%", boxSizing: "border-box",
                          background: focusedField === "password" ? "rgba(0,174,236,0.06)" : "rgba(255,255,255,0.03)",
                          border: focusedField === "password" ? "1px solid rgba(0,174,236,0.45)" : "1px solid rgba(255,255,255,0.07)",
                          borderRadius: 12, padding: "12px 44px 12px 44px",
                          fontSize: 14, color: "#f8fafc", outline: "none",
                          transition: "all 0.25s",
                          boxShadow: focusedField === "password" ? "0 0 0 3px rgba(0,174,236,0.1)" : "none",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass((s) => !s)}
                        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#1e3040", padding: 4, transition: "color 0.2s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#64748b")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#1e3040")}
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
                      whileHover={!loading ? { scale: 1.02, boxShadow: "0 0 44px rgba(0,174,236,0.55)" } : {}}
                      whileTap={!loading ? { scale: 0.98 } : {}}
                      style={{
                        width: "100%",
                        background: loading ? "rgba(0,174,236,0.45)" : "linear-gradient(135deg, #00aeec, #0090c8)",
                        color: "#fff", border: "none", borderRadius: 12,
                        padding: "13px 24px", fontSize: 15, fontWeight: 700,
                        cursor: loading ? "not-allowed" : "pointer",
                        letterSpacing: "-0.01em",
                        boxShadow: "0 0 24px rgba(0,174,236,0.28)",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                        transition: "background 0.2s",
                      }}
                    >
                      {loading ? (
                        <>
                          <motion.div
                            style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }}
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
            <div style={{ padding: "18px 36px 26px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#475569", letterSpacing: "0.04em" }}>Restricted access</span>

              {/* Animated ORT brand */}
              <motion.div
                style={{ display: "flex", alignItems: "center", gap: 7 }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1, duration: 0.6, ease: EASE_CINEMA }}
              >
                <span style={{ fontSize: 12, color: "#334155", letterSpacing: "0.04em" }}>by</span>
                <motion.div
                  style={{ position: "relative", display: "flex", alignItems: "center" }}
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  {/* Glow behind text */}
                  <motion.div
                    style={{
                      position: "absolute", inset: "-4px -8px",
                      borderRadius: 6,
                      background: "radial-gradient(ellipse, rgba(0,174,236,0.18) 0%, transparent 70%)",
                    }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                  />
                  {/* Shimmer sweep */}
                  <motion.div
                    style={{
                      position: "absolute", inset: 0, borderRadius: 4,
                      background: "linear-gradient(105deg, transparent 30%, rgba(0,174,236,0.35) 50%, transparent 70%)",
                      opacity: 0,
                    }}
                    animate={{ opacity: [0, 1, 0], x: ["-80%", "80%"] }}
                    transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 2.5, ease: "easeInOut" }}
                  />
                  <span
                    style={{
                      position: "relative",
                      fontSize: 15,
                      fontWeight: 800,
                      fontFamily: "monospace",
                      letterSpacing: "0.06em",
                      background: "linear-gradient(135deg, #00aeec, #ff7a1a)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    ort_
                  </span>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
