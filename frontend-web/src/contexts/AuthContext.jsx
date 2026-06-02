import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authApi } from "../services/apiClient";

const AuthContext = createContext({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
  hasPermission: () => false,
  refreshPermissions: async () => {},
});

const FULL_ACCESS = "*";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const storedUser = localStorage.getItem("user");
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const login = (userData, tokens) => {
    localStorage.setItem("access_token", tokens.access_token);
    localStorage.setItem("refresh_token", tokens.refresh_token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  // Refresh effective permissions from the server (resolved per-request, so a
  // revoked role takes effect on the next refresh). Called once after mount when
  // a session exists, keeping the cached permission set live.
  const refreshPermissions = useCallback(async () => {
    try {
      const { data } = await authApi.me();
      setUser((prev) => {
        const next = { ...(prev || {}), ...data };
        localStorage.setItem("user", JSON.stringify(next));
        return next;
      });
    } catch {
      // 401s are handled by the apiClient interceptor; ignore here.
    }
  }, []);

  useEffect(() => {
    if (!loading && localStorage.getItem("access_token")) {
      refreshPermissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const hasPermission = useCallback(
    (permission) => {
      const perms = user?.permissions || [];
      if (perms.includes(FULL_ACCESS)) return true;
      if (!permission) return true;
      return perms.includes(permission);
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{ user, login, logout, loading, hasPermission, refreshPermissions }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
