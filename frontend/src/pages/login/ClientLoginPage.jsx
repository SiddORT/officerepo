import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { portalLookupApi } from "../../services/apiClient";
import { useTenant } from "../../contexts/TenantContext";

const ACCENT = "#00aeec";
const ORANGE = "#ff7a1a";
const EASE_CINEMA = [0.16, 1, 0.3, 1];

const ORBS = [
  { color: "rgba(255,122,26,0.55)", size: 460, top: "-12%",  left: "-8%",   dur: 16, move: [0, 60, -30, 0],  moveY: [0, -40, 30, 0]  },
  { color: "rgba(0,174,236,0.45)",  size: 520, bottom: "-16%", right: "-10%", dur: 20, move: [0, -50, 40, 0], moveY: [0, 40, -30, 0]  },
  { color: "rgba(255,122,26,0.32)", size: 300, top: "45%",   right: "18%",  dur: 14, move: [0, 40, -40, 0],  moveY: [0, -30, 30, 0]  },
  { color: "rgba(0,174,236,0.30)",  size: 260, bottom: "10%", left: "12%",  dur: 18, move: [0, -30, 50, 0],  moveY: [0, 30, -40, 0]  },
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
            top: o.top, left: o.left, right: o.right, bottom: o.bottom,
            width: o.size, height: o.size,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${o.color} 0%, transparent 70%)`,
            filter: "blur(40px)",
          }}
        />
      ))}
    </div>
  );
}

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } } };
const fadeSlide = {
  hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
  show:   { opacity: 1, y: 0,  filter: "blur(0px)", transition: { duration: 0.5, ease: EASE_CINEMA } },
};

export default function ClientLoginPage() {
  const navigate = useNavigate();
  const { mode, baseDomain } = useTenant();
  const reduced  = useReducedMotion();

  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [focused, setFocused] = useState(false);

  const cardRef = useRef(null);
  const mvX = useMotionValue(0);
  const mvY = useMotionValue(0);
  const rotateX  = useSpring(useTransform(mvY, [-0.5, 0.5], [8,  -8]),  { stiffness: 150, damping: 18 });
  const rotateY  = useSpring(useTransform(mvX, [-0.5, 0.5], [-8, 8]),   { stiffness: 150, damping: 18 });
  const glareX   = useTransform(mvX, [-0.5, 0.5], ["0%",   "100%"]);
  const glareY   = useTransform(mvY, [-0.5, 0.5], ["0%",   "100%"]);

  function handleMouseMove(e) {
    if (reduced) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    mvX.set((e.clientX - rect.left) / rect.width  - 0.5);
    mvY.set((e.clientY - rect.top)  / rect.height - 0.5);
  }
  function handleMouseLeave() { mvX.set(0); mvY.set(0); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) { setError("Please enter your email address."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await portalLookupApi.lookupWorkspace(email.trim());
      const { subdomain } = res.data.data;
      if (mode === "hostname" && baseDomain) {
        window.location.href = `${window.location.protocol}//${subdomain}.${baseDomain}/login?email=${encodeURIComponent(email.trim())}`;
      } else {
        navigate(`/portal/${subdomain}/login?email=${encodeURIComponent(email.trim())}`);
      }
    } catch (err) {
      if (err?.response?.status === 404) {
        setError("No workspace found for this email. Check the email or contact your admin.");
      } else {
        setError(err?.response?.data?.detail || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", position: "relative", display: "flex",
      alignItems: "center", justifyContent: "center",
      padding: "clamp(72px,8vh,96px) clamp(20px,4vw,48px)",
      overflowX: "hidden", overflowY: "auto", perspective: 1200,
    }}>
      {/* Background image */}
      <img src="/admin-bg.png" alt="" aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />

      {/* Dark overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(120% 120% at 50% 0%, rgba(0,40,80,0.45) 0%, rgba(2,6,23,0.78) 70%, rgba(2,6,23,0.92) 100%)",
      }} />

      <AnimatedBackground reduced={reduced} />

      {/* Card */}
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        initial={{ opacity: 0, y: 30, rotateX: 12 }}
        animate={{ opacity: 1, y: 0,  rotateX: 0  }}
        transition={{ duration: 0.7, ease: EASE_CINEMA }}
        style={{
          position: "relative", zIndex: 2,
          width: "100%", maxWidth: 420,
          rotateX: reduced ? 0 : rotateX,
          rotateY: reduced ? 0 : rotateY,
          transformStyle: "preserve-3d",
          borderRadius: 24, padding: "clamp(28px,4vw,44px)",
          background: "rgba(15,23,42,0.55)", backdropFilter: "blur(22px)",
          WebkitBackdropFilter: "blur(22px)", border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 40px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 1px 0 rgba(255,255,255,0.15) inset",
          color: "#f1f5f9",
        }}
      >
        {/* Moving glare */}
        <motion.div
          style={{
            position: "absolute", inset: 0, borderRadius: 24, pointerEvents: "none",
            background: useTransform([glareX, glareY], ([x, y]) =>
              `radial-gradient(500px circle at ${x} ${y}, rgba(255,122,26,0.22), rgba(0,174,236,0.16) 40%, transparent 60%)`),
          }}
        />

        <motion.div variants={stagger} initial="hidden" animate="show" style={{ transform: "translateZ(40px)" }}>

          {/* Wordmark */}
          <motion.div variants={fadeSlide} style={{ marginBottom: 30, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 38, height: 38,
              background: "linear-gradient(135deg, #00aeec, #ff7a1a)",
              borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 22px rgba(255,122,26,0.45)",
            }}>
              <svg width="20" height="20" fill="none" stroke="white" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>Office Repo</div>
              <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.55)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 500 }}>
                Client Portal
              </div>
            </div>
          </motion.div>

          {/* Title */}
          <motion.div variants={fadeSlide} style={{ marginBottom: 26 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", margin: 0, color: "#fff" }}>
              Welcome back
            </h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", margin: "6px 0 0" }}>
              Enter your work email and we'll find your workspace.
            </p>
          </motion.div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.25 }}
                role="alert"
                style={{
                  background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)",
                  borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#fca5a5",
                  marginBottom: 18, display: "flex", alignItems: "center", gap: 8,
                }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <motion.div variants={fadeSlide} style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.75)", marginBottom: 8 }}>
                Work Email <span style={{ color: ORANGE }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <div style={{
                  position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                  color: focused ? ACCENT : "rgba(255,255,255,0.4)", transition: "color 0.2s", pointerEvents: "none",
                }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: focused ? "rgba(0,174,236,0.10)" : "rgba(255,255,255,0.06)",
                    border: focused ? `1px solid ${ACCENT}` : "1px solid rgba(255,255,255,0.14)",
                    borderRadius: 12, padding: "13px 14px 13px 44px",
                    fontSize: 14, color: "#f1f5f9", outline: "none", transition: "all 0.25s",
                    boxShadow: focused ? "0 0 0 3px rgba(0,174,236,0.18)" : "none",
                  }}
                />
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
                  background: loading
                    ? "#0a6f93"
                    : "linear-gradient(135deg, #00aeec, #ff7a1a)",
                  color: "#fff", border: "none", borderRadius: 12,
                  padding: "13px 24px", fontSize: 15, fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  letterSpacing: "-0.01em",
                  boxShadow: "0 12px 28px rgba(255,122,26,0.4)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  transition: "background 0.2s",
                }}
              >
                {loading ? (
                  <>
                    <motion.div
                      style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%" }}
                      animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    />
                    Finding workspace…
                  </>
                ) : (
                  <>
                    Continue
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </motion.button>
            </motion.div>
          </form>

          {/* Footer */}
          <motion.div variants={fadeSlide} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginTop: 28, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.1)",
          }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
              Admin access?{" "}
              <a href="/admin"
                style={{ color: "rgba(0,174,236,0.7)", textDecoration: "none" }}
                onMouseEnter={e => e.target.style.color = ACCENT}
                onMouseLeave={e => e.target.style.color = "rgba(0,174,236,0.7)"}>
                Sign in here
              </a>
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>by</span>
              <span style={{
                fontSize: 15, fontWeight: 800, fontFamily: "monospace", letterSpacing: "0.06em",
                background: "linear-gradient(135deg, #ff7a1a, #00aeec)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>ort_</span>
            </div>
          </motion.div>

        </motion.div>
      </motion.div>
    </div>
  );
}
