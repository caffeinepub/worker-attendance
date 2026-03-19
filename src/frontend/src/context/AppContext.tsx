import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import type { Work } from "../backend";

type Theme = "dark" | "light";

interface AppContextValue {
  isAdmin: boolean;
  setIsAdmin: (v: boolean) => void;
  selectedWork: Work | null;
  setSelectedWork: (w: Work | null) => void;
  theme: Theme;
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextValue>({
  isAdmin: false,
  setIsAdmin: () => {},
  selectedWork: null,
  setSelectedWork: () => {},
  theme: "dark",
  toggleTheme: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("attendanceTheme");
    return saved === "light" ? "light" : "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light-theme");
    } else {
      root.classList.remove("light-theme");
    }
    localStorage.setItem("attendanceTheme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  return (
    <AppContext.Provider
      value={{
        isAdmin,
        setIsAdmin,
        selectedWork,
        setSelectedWork,
        theme,
        toggleTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
