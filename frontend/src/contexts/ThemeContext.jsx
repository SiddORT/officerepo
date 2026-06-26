// @refresh reset
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({
  theme: "dark",
  setTheme: () => {},
  toggle: () => {},
  isDark: true,
});

function getSystemIsDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveIsDark(theme) {
  if (theme === "system") return getSystemIsDark();
  return theme === "dark";
}

function applyToDom(isDark) {
  const root = document.documentElement;
  if (isDark) {
    root.classList.add("theme-dark");
    root.classList.remove("theme-light");
  } else {
    root.classList.add("theme-light");
    root.classList.remove("theme-dark");
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(
    () => localStorage.getItem("or_theme") || "dark"
  );
  const [isDark, setIsDark] = useState(() =>
    resolveIsDark(localStorage.getItem("or_theme") || "dark")
  );

  const applyTheme = useCallback((t) => {
    const dark = resolveIsDark(t);
    setIsDark(dark);
    applyToDom(dark);
    localStorage.setItem("or_theme", t);
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme, applyTheme]);

  const setTheme = useCallback((t) => {
    setThemeState(t);
  }, []);

  const toggle = useCallback(() => {
    setThemeState((t) => {
      const dark = resolveIsDark(t);
      return dark ? "light" : "dark";
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
