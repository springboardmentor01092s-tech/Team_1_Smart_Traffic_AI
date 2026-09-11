import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { injectCardTokens } from "../components/Card";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const getInitialThemeState = () => {
    if (typeof window === "undefined") {
      return { theme: "light", isManual: false };
    }

    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      return { theme: savedTheme, isManual: true };
    }

    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    return {
      theme: prefersDark ? "dark" : "light",
      isManual: false,
    };
  };

  const [themeState, setThemeState] = useState(getInitialThemeState);
  const { theme, isManual } = themeState;

  // Apply theme tokens whenever theme changes
  useEffect(() => {
    injectCardTokens(theme);
  }, [theme]);

  // Listen for live OS theme changes if user hasn't set a manual preference
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e) => {
      // Only follow OS theme if user has not manually set a preference in localStorage
      if (!localStorage.getItem("theme")) {
        const newTheme = e.matches ? "dark" : "light";
        setThemeState({ theme: newTheme, isManual: false });
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleChange);
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem("theme", nextTheme);
    } catch (e) {
      console.warn("Could not save theme to localStorage", e);
    }
    setThemeState({ theme: nextTheme, isManual: true });
  }, [theme]);

  const setTheme = useCallback((newTheme) => {
    if (newTheme !== "dark" && newTheme !== "light") return;
    try {
      localStorage.setItem("theme", newTheme);
    } catch (e) {
      console.warn("Could not save theme to localStorage", e);
    }
    setThemeState({ theme: newTheme, isManual: true });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, isManual, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    // Return safe fallback if rendered outside provider
    return {
      theme: "light",
      isManual: false,
      toggleTheme: () => {},
      setTheme: () => {},
    };
  }
  return context;
}
