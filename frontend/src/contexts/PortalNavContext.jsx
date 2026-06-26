// @refresh reset
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { usePortalAuth } from "./PortalAuthContext";
import { portalNavigationApi } from "../services/apiClient";

const PortalNavContext = createContext({
  navModules: [],
  workspaceName: "",
  navLoaded: false,
  reloadNav: () => {},
});

export function PortalNavProvider({ children }) {
  const { token } = usePortalAuth();
  const { subdomain } = useParams();
  const [navModules, setNavModules] = useState([]);
  const [workspaceName, setWorkspaceName] = useState(
    subdomain ? subdomain.charAt(0).toUpperCase() + subdomain.slice(1) : ""
  );
  const [navLoaded, setNavLoaded] = useState(false);

  const reloadNav = useCallback(async () => {
    if (!token || !subdomain) return;
    try {
      const res = await portalNavigationApi.getNavigation(subdomain, token);
      const payload = res.data?.data || res.data || {};
      setNavModules(payload.modules || []);
      if (payload.workspace_name) setWorkspaceName(payload.workspace_name);
    } catch {
      setNavModules([]);
    } finally {
      setNavLoaded(true);
    }
  }, [token, subdomain]);

  useEffect(() => { reloadNav(); }, [reloadNav]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") reloadNav();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [reloadNav]);

  return (
    <PortalNavContext.Provider value={{ navModules, workspaceName, navLoaded, reloadNav }}>
      {children}
    </PortalNavContext.Provider>
  );
}

export const usePortalNav = () => useContext(PortalNavContext);
