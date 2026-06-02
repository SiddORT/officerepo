// @refresh reset
import React, { createContext, useContext, useState, useCallback } from "react";

const PortalAuthContext = createContext(null);

function storageKey(subdomain) {
  return `portal_auth_${subdomain}`;
}

function readSession(subdomain) {
  try {
    const raw = sessionStorage.getItem(storageKey(subdomain));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function PortalAuthProvider({ subdomain, children }) {
  const [user, setUser] = useState(() => readSession(subdomain));

  const login = useCallback((userData, token) => {
    const session = { ...userData, token, loggedAt: Date.now() };
    sessionStorage.setItem(storageKey(subdomain), JSON.stringify(session));
    setUser(session);
  }, [subdomain]);

  const logout = useCallback(() => {
    sessionStorage.removeItem(storageKey(subdomain));
    setUser(null);
  }, [subdomain]);

  return (
    <PortalAuthContext.Provider value={{ user, login, logout, subdomain }}>
      {children}
    </PortalAuthContext.Provider>
  );
}

export function usePortalAuth() {
  const ctx = useContext(PortalAuthContext);
  if (!ctx) throw new Error("usePortalAuth must be used inside PortalAuthProvider");
  return ctx;
}
