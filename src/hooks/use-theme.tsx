import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "dark" | "light";
const Ctx = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({
  theme: "dark",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("theme")) as Theme | null;
    const initial = stored || "dark";
    setThemeState(initial);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(initial);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("theme", t);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(t);
  };

  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
