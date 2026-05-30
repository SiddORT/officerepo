/**
 * Reusable client-side validation helpers.
 * Mirrors the backend Pydantic rules so users get instant inline feedback.
 */

export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const PHONE_RE = /^\+?[\d\s\-()]{7,20}$/;
export const NAME_RE = /^[A-Za-z][A-Za-z\s.\-']*$/;
// Blocks angle brackets / common XSS markers in free-text fields.
export const XSS_RE = /<|>|javascript:|on\w+\s*=/i;

export const trim = (v) => (typeof v === "string" ? v.trim() : v);

export const required = (v, label = "This field") => {
  if (!trim(v)) return `${label} is required.`;
  return "";
};

export const minLen = (v, min, label = "This field") => {
  if (trim(v).length < min) return `${label} must be at least ${min} characters.`;
  return "";
};

export const maxLen = (v, max, label = "This field") => {
  if (trim(v).length > max) return `${label} must be at most ${max} characters.`;
  return "";
};

export const isEmail = (v, label = "Email") => {
  const val = trim(v);
  if (!EMAIL_RE.test(val) || val.length > 255) return `Enter a valid ${label.toLowerCase()}.`;
  return "";
};

export const isPhone = (v, label = "Phone number") => {
  if (!PHONE_RE.test(trim(v))) return `Enter a valid ${label.toLowerCase()}.`;
  return "";
};

export const isName = (v, label = "Name") => {
  if (!NAME_RE.test(trim(v)))
    return `${label} may only contain letters, spaces, hyphens, periods and apostrophes.`;
  return "";
};

export const noXss = (v, label = "This field") => {
  if (XSS_RE.test(v || "")) return `${label} contains invalid or unsafe characters.`;
  return "";
};

/**
 * Run a list of validator fns; return the first error message (or "").
 * Each validator returns "" when valid.
 */
export const firstError = (...checks) => {
  for (const c of checks) {
    if (c) return c;
  }
  return "";
};
