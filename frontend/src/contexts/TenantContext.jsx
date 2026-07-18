// @refresh reset
import React, { createContext, useContext, useMemo } from "react";

const TenantContext = createContext({ tenant: null, mode: "path", baseDomain: "" });

const BASE_DOMAIN = (import.meta.env.VITE_BASE_DOMAIN || "").trim();

function detectTenant() {
  if (!BASE_DOMAIN) return { tenant: null, mode: "path" };
  const hostname = window.location.hostname;
  if (hostname === BASE_DOMAIN) return { tenant: null, mode: "path" };
  if (hostname.endsWith("." + BASE_DOMAIN)) {
    const tenant = hostname.slice(0, hostname.length - BASE_DOMAIN.length - 1);
    if (tenant) return { tenant, mode: "hostname" };
  }
  return { tenant: null, mode: "path" };
}

const DETECTED = detectTenant();

export function TenantProvider({ children }) {
  const value = useMemo(() => ({ ...DETECTED, baseDomain: BASE_DOMAIN }), []);
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  return useContext(TenantContext);
}
