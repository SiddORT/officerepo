import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
} from "framer-motion";
import { authApi } from "../../services/apiClient";

/* ══════════════════════════════════════════════════════════════════════════
   ANIMATION CONFIGS — reusable motion presets
══════════════════════════════════════════════════════════════════════════ */
const EASE_CINEMA = [0.16, 1, 0.3, 1];
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 32, filter: "blur(8px)" },
  show:   { opacity: 1, y: 0,  filter: "blur(0px)", transition: { duration: 0.7, ease: EASE_CINEMA } },
  exit:   { opacity: 0, y: -20, filter: "blur(12px)", transition: { duration: 0.4, ease: "easeIn" } },
};

const staggerContainer = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
  exit:   { transition: { staggerChildren: 0.04 } },
};

const loginFieldVariant = {
  hidden: { opacity: 0, x: -20, filter: "blur(6px)" },
  show:   { opacity: 1, x: 0,   filter: "blur(0px)", transition: { duration: 0.5, ease: EASE_CINEMA } },
};

/* ══════════════════════════════════════════════════════════════════════════
   PARTICLES — subtle floating dots
══════════════════════════════════════════════════════════════════════════ */
const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 2 + 1,
  dur: Math.random() * 12 + 10,
  delay: Math.random() * 8,
  opacity: Math.random() * 0.35 + 0.05,
}));

function ParticleField() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.id % 3 === 0 ? "#00aeec" : p.id % 3 === 1 ? "#8b5cf6" : "#ffffff",
            opacity: p.opacity,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, Math.random() * 14 - 7, 0],
            opacity: [p.opacity, p.opacity * 1.6, p.opacity],
          }}
          transition={{
            duration: p.dur,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ANIMATED GRID — subtle dot-grid background
══════════════════════════════════════════════════════════════════════════ */
function AnimatedGrid() {
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        backgroundImage: `
          radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)
        `,
        backgroundSize: "40px 40px",
      }}
    />
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   AMBIENT ORBS — background lighting
══════════════════════════════════════════════════════════════════════════ */
function AmbientOrbs({ zoomed }) {
  return (
    <motion.div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      animate={{ scale: zoomed ? 1.08 : 1 }}
      transition={{ duration: 1.6, ease: EASE_CINEMA }}
    >
      <motion.div
        className="absolute"
        style={{
          top: "-20%", right: "-10%",
          width: 700, height: 700,
          background: "radial-gradient(circle, rgba(0,174,236,0.12) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(40px)",
        }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute"
        style={{
          bottom: "-10%", left: "-10%",
          width: 600, height: 600,
          background: "radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(40px)",
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      <motion.div
        className="absolute"
        style={{
          top: "40%", left: "40%",
          width: 400, height: 400,
          background: "radial-gradient(circle, rgba(0,174,236,0.06) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(60px)",
        }}
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 4 }}
      />
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SPOTLIGHT CURSOR — subtle cursor glow
══════════════════════════════════════════════════════════════════════════ */
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
        x: springX,
        y: springY,
        translateX: "-50%",
        translateY: "-50%",
        width: 320,
        height: 320,
        background: "radial-gradient(circle, rgba(0,174,236,0.06) 0%, transparent 70%)",
        borderRadius: "50%",
      }}
    />
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   LIGHT SWEEP — cinematic transition sweep
══════════════════════════════════════════════════════════════════════════ */
function LightSweep({ onDone }) {
  return (
    <motion.div
      className="fixed inset-0 z-40 pointer-events-none"
      initial={{ x: "-100%" }}
      animate={{ x: "100%" }}
      transition={{ duration: 0.75, ease: EASE_OUT_EXPO }}
      onAnimationComplete={onDone}
      style={{
        background: "linear-gradient(105deg, transparent 30%, rgba(0,174,236,0.18) 50%, transparent 70%)",
      }}
    />
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   FLOATING WIDGET CARDS — bento-style hero widgets
══════════════════════════════════════════════════════════════════════════ */
const WIDGETS = [
  {
    label: "Active Tenants", value: "24", delta: "+3 this week",
    color: "#00aeec", icon: "🏢",
    pos: { top: "12%", right: "6%", rotate: 3 },
  },
  {
    label: "Auth Response", value: "48ms", delta: "↓ 12ms faster",
    color: "#8b5cf6", icon: "⚡",
    pos: { bottom: "22%", left: "4%", rotate: -2 },
  },
  {
    label: "Feature Flags", value: "12", delta: "4 newly added",
    color: "#10b981", icon: "🚩",
    pos: { top: "55%", right: "3%", rotate: 1.5 },
  },
];

function FloatingWidgets() {
  return (
    <>
      {WIDGETS.map((w, i) => (
        <motion.div
          key={w.label}
          className="absolute hidden lg:block"
          style={{ ...w.pos, rotate: w.pos.rotate }}
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 + i * 0.15, ease: EASE_CINEMA }}
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut", delay: i * 1.3 }}
            whileHover={{ scale: 1.04, y: -4 }}
            className="cursor-default"
            style={{
              background: "rgba(17,24,39,0.72)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: "16px 20px",
              backdropFilter: "blur(20px)",
              boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04), 0 0 20px ${w.color}18`,
              minWidth: 160,
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span style={{ fontSize: 16 }}>{w.icon}</span>
              <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                {w.label}
              </span>
            </div>
            <p style={{ fontSize: 26, fontWeight: 800, color: "#f8fafc", lineHeight: 1 }}>{w.value}</p>
            <p style={{ fontSize: 11, color: w.color, marginTop: 4 }}>{w.delta}</p>
          </motion.div>
        </motion.div>
      ))}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   LANDING HERO — main landing content
══════════════════════════════════════════════════════════════════════════ */
function LandingHero({ onEnter, user }) {
  const navigate = useNavigate();

  return (
    <motion.div
      key="landing-hero"
      className="relative z-20 flex flex-col items-center justify-center min-h-screen px-6 text-center"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      exit="exit"
    >
      {/* Nav */}
      <motion.div
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 h-16"
        style={{ background: "rgba(8,16,24,0.7)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        variants={fadeUp}
      >
        <div className="flex items-center gap-2.5">
          <div style={{ width: 30, height: 30, background: "linear-gradient(135deg, #00aeec, #8b5cf6)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 12px rgba(0,174,236,0.4)" }}>
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#f8fafc", letterSpacing: "-0.01em" }}>Office Repo</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm" style={{ color: "#64748b" }}>
          <a href="#features" style={{ transition: "color 0.15s" }} onMouseEnter={e => e.target.style.color="#f8fafc"} onMouseLeave={e => e.target.style.color="#64748b"}>Features</a>
          <a href="#platform" style={{ transition: "color 0.15s" }} onMouseEnter={e => e.target.style.color="#f8fafc"} onMouseLeave={e => e.target.style.color="#64748b"}>Platform</a>
        </nav>
        {user ? (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/dashboard")}
            style={{ background: "linear-gradient(135deg, #00aeec, #0090c8)", color: "#fff", border: "none", borderRadius: 10, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 0 16px rgba(0,174,236,0.35)" }}
          >
            Dashboard
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onEnter}
            style={{ background: "rgba(0,174,236,0.12)", color: "#00aeec", border: "1px solid rgba(0,174,236,0.3)", borderRadius: 10, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Sign in
          </motion.button>
        )}
      </motion.div>

      {/* Floating widgets */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <FloatingWidgets />
      </div>

      {/* Badge */}
      <motion.div
        variants={fadeUp}
        className="inline-flex items-center gap-2 mb-8"
        style={{
          background: "rgba(0,174,236,0.08)",
          border: "1px solid rgba(0,174,236,0.2)",
          borderRadius: 100,
          padding: "6px 16px",
        }}
      >
        <motion.span
          style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#00aeec", display: "inline-block" }}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <span style={{ fontSize: 12, fontWeight: 500, color: "#00aeec", letterSpacing: "0.04em" }}>
          Production-Ready Multi-Tenant SaaS
        </span>
      </motion.div>

      {/* Headline */}
      <motion.h1
        variants={fadeUp}
        style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)", fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 24, maxWidth: 820 }}
      >
        The Operating System{" "}
        <span
          style={{
            backgroundImage: "linear-gradient(135deg, #00aeec 0%, #8b5cf6 50%, #67e8f9 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          for Modern Teams
        </span>
      </motion.h1>

      {/* Subhead */}
      <motion.p
        variants={fadeUp}
        style={{ fontSize: 18, color: "#94a3b8", maxWidth: 560, lineHeight: 1.7, marginBottom: 48 }}
      >
        Fully-isolated multi-tenant architecture with JWT auth, role-based access,
        feature flags, and enterprise HR modules — built to scale.
      </motion.p>

      {/* CTA */}
      <motion.div variants={fadeUp}>
        {user ? (
          <motion.button
            whileHover={{ scale: 1.04, boxShadow: "0 0 50px rgba(0,174,236,0.5)" }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/dashboard")}
            style={{
              background: "linear-gradient(135deg, #00aeec, #0090c8)",
              color: "#fff", border: "none", borderRadius: 14,
              padding: "16px 40px", fontSize: 16, fontWeight: 700,
              cursor: "pointer", letterSpacing: "-0.01em",
              boxShadow: "0 0 30px rgba(0,174,236,0.35), 0 8px 32px rgba(0,0,0,0.3)",
              transition: "box-shadow 0.3s",
            }}
          >
            Open Dashboard →
          </motion.button>
        ) : (
          <motion.button
            layoutId="workspace-cta"
            whileHover={{ scale: 1.04, boxShadow: "0 0 60px rgba(0,174,236,0.6)" }}
            whileTap={{ scale: 0.97 }}
            onClick={onEnter}
            style={{
              background: "linear-gradient(135deg, #00aeec, #0090c8)",
              color: "#fff", border: "none", borderRadius: 14,
              padding: "16px 40px", fontSize: 16, fontWeight: 700,
              cursor: "pointer", letterSpacing: "-0.01em",
              boxShadow: "0 0 30px rgba(0,174,236,0.35), 0 8px 32px rgba(0,0,0,0.3)",
              display: "flex", alignItems: "center", gap: 10,
            }}
          >
            Enter Workspace
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </motion.button>
        )}
      </motion.div>

      {/* Scroll hint */}
      <motion.div
        variants={fadeUp}
        className="mt-8"
        style={{ color: "#334155", fontSize: 12, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
      >
        <motion.div
          style={{ width: 1, height: 40, background: "linear-gradient(to bottom, transparent, rgba(0,174,236,0.4))" }}
          animate={{ scaleY: [0.5, 1, 0.5], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <span>Scroll to explore</span>
      </motion.div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   LOGIN PANEL — glassmorphism auth form
══════════════════════════════════════════════════════════════════════════ */
function LoginPanel({ onBack }) {
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
      const res = await authApi.superadminLogin({ email, password });
      login(res.data.access_token, res.data.refresh_token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      key="login-panel"
      className="relative z-20 flex flex-col items-center justify-center min-h-screen px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.7, duration: 0.5, ease: EASE_CINEMA }}
        onClick={onBack}
        className="fixed top-6 left-6 z-50 flex items-center gap-2"
        style={{ color: "#64748b", fontSize: 13, fontWeight: 500, background: "none", border: "none", cursor: "pointer", transition: "color 0.2s" }}
        onMouseEnter={e => e.currentTarget.style.color = "#94a3b8"}
        onMouseLeave={e => e.currentTarget.style.color = "#64748b"}
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </motion.button>

      {/* Wordmark above card */}
      <motion.div
        initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ delay: 0.55, duration: 0.7, ease: EASE_CINEMA }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center gap-2.5 mb-2">
          <div style={{ width: 34, height: 34, background: "linear-gradient(135deg, #00aeec, #8b5cf6)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px rgba(0,174,236,0.45)" }}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.02em" }}>Office Repo</span>
        </div>
        <p style={{ fontSize: 13, color: "#475569", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 500 }}>
          Unified Workplace Management
        </p>
      </motion.div>

      {/* Glow ring — separate from card so no animation conflict */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.35, duration: 0.9, ease: EASE_CINEMA }}
        style={{ position: "relative", width: "100%", maxWidth: 420 }}
      >
        {/* Animated glow behind card */}
        <motion.div
          style={{
            position: "absolute", inset: -1, borderRadius: 25, zIndex: 0,
            background: "transparent",
            boxShadow: "0 0 0 1px rgba(0,174,236,0.25)",
          }}
          animate={{
            boxShadow: [
              "0 0 0 1px rgba(0,174,236,0.2), 0 0 40px rgba(0,174,236,0.08)",
              "0 0 0 1px rgba(0,174,236,0.5), 0 0 70px rgba(0,174,236,0.18)",
              "0 0 0 1px rgba(0,174,236,0.2), 0 0 40px rgba(0,174,236,0.08)",
            ],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />

        {/* Glass card */}
        <motion.div
          layoutId="workspace-cta"
          initial={{ opacity: 0, scale: 0.85, y: 30, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1,    y: 0,  filter: "blur(0px)" }}
          transition={{ delay: 0.35, duration: 0.9, ease: EASE_CINEMA }}
          style={{
            position: "relative", zIndex: 1,
            width: "100%",
            background: "rgba(17,24,39,0.78)",
            borderRadius: 24,
            backdropFilter: "blur(32px)",
            WebkitBackdropFilter: "blur(32px)",
            border: "1px solid rgba(255,255,255,0.07)",
            overflow: "hidden",
            boxShadow: "0 32px 64px rgba(0,0,0,0.6)",
          }}
        >
        {/* Card top accent bar */}
        <div style={{ height: 2, background: "linear-gradient(90deg, transparent, #00aeec, #8b5cf6, transparent)" }} />

        <div style={{ padding: "36px 36px 32px" }}>
          {/* Title */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={loginFieldVariant}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div style={{ width: 3, height: 22, background: "linear-gradient(to bottom, #00aeec, #8b5cf6)", borderRadius: 2 }} />
                <h2 style={{ fontSize: 22, fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.02em" }}>Admin Access</h2>
              </div>
              <p style={{ fontSize: 14, color: "#475569", marginBottom: 28, marginLeft: 13 }}>
                Authenticate to continue into OfficeRepo
              </p>
            </motion.div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0,  scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: 10, padding: "10px 14px",
                    fontSize: 13, color: "#f87171",
                    marginBottom: 16,
                    display: "flex", alignItems: "center", gap: 8,
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
              <motion.div variants={loginFieldVariant} style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                  Email
                </label>
                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: focusedField === "email" ? "#00aeec" : "#334155", transition: "color 0.2s" }}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="admin@officerepo.io"
                    autoComplete="email"
                    style={{
                      width: "100%", boxSizing: "border-box",
                      background: focusedField === "email" ? "rgba(0,174,236,0.06)" : "rgba(255,255,255,0.03)",
                      border: focusedField === "email" ? "1px solid rgba(0,174,236,0.45)" : "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 12, padding: "12px 14px 12px 44px",
                      fontSize: 14, color: "#f8fafc",
                      outline: "none",
                      transition: "all 0.25s",
                      boxShadow: focusedField === "email" ? "0 0 0 3px rgba(0,174,236,0.12), inset 0 1px 0 rgba(255,255,255,0.03)" : "inset 0 1px 0 rgba(255,255,255,0.03)",
                    }}
                  />
                </div>
              </motion.div>

              {/* Password */}
              <motion.div variants={loginFieldVariant} style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: focusedField === "password" ? "#00aeec" : "#334155", transition: "color 0.2s" }}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    style={{
                      width: "100%", boxSizing: "border-box",
                      background: focusedField === "password" ? "rgba(0,174,236,0.06)" : "rgba(255,255,255,0.03)",
                      border: focusedField === "password" ? "1px solid rgba(0,174,236,0.45)" : "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 12, padding: "12px 44px 12px 44px",
                      fontSize: 14, color: "#f8fafc",
                      outline: "none",
                      transition: "all 0.25s",
                      boxShadow: focusedField === "password" ? "0 0 0 3px rgba(0,174,236,0.12), inset 0 1px 0 rgba(255,255,255,0.03)" : "inset 0 1px 0 rgba(255,255,255,0.03)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#334155", padding: 4 }}
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

              {/* Submit button */}
              <motion.div variants={loginFieldVariant}>
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={!loading ? { scale: 1.02, boxShadow: "0 0 40px rgba(0,174,236,0.55)" } : {}}
                  whileTap={!loading ? { scale: 0.98 } : {}}
                  style={{
                    width: "100%",
                    background: loading ? "rgba(0,174,236,0.5)" : "linear-gradient(135deg, #00aeec, #0090c8)",
                    color: "#fff", border: "none", borderRadius: 12,
                    padding: "13px 24px", fontSize: 15, fontWeight: 700,
                    cursor: loading ? "not-allowed" : "pointer",
                    letterSpacing: "-0.01em",
                    boxShadow: "0 0 24px rgba(0,174,236,0.3)",
                    transition: "background 0.2s, box-shadow 0.2s",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
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

        {/* Card footer */}
        <div style={{ padding: "14px 36px 20px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#1e2d45" }}>Restricted access</span>
          <span style={{ fontSize: 12, color: "#334155", fontFamily: "monospace", letterSpacing: "0.05em" }}>by <span style={{ color: "#00aeec" }}>ort_</span></span>
        </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN LANDING PAGE — orchestrates everything
══════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState("landing"); // "landing" | "sweeping" | "login"

  // If already logged in, go to dashboard
  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const handleEnterWorkspace = useCallback(() => {
    setPhase("sweeping");
    // After sweep, show login
    setTimeout(() => setPhase("login"), 700);
  }, []);

  const handleBack = useCallback(() => {
    setPhase("landing");
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#081018",
        color: "#f8fafc",
        overflowX: "hidden",
        position: "relative",
      }}
    >
      {/* Always-present background layers */}
      <AmbientOrbs zoomed={phase === "login"} />
      <AnimatedGrid />
      <ParticleField />
      <SpotlightCursor />

      {/* Cinematic sweep overlay */}
      <AnimatePresence>
        {phase === "sweeping" && <LightSweep key="sweep" />}
      </AnimatePresence>

      {/* Main content — landing or login */}
      <AnimatePresence mode="wait">
        {phase !== "login" ? (
          <LandingHero key="landing" onEnter={handleEnterWorkspace} user={user} />
        ) : (
          <LoginPanel key="login" onBack={handleBack} />
        )}
      </AnimatePresence>
    </div>
  );
}
