import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { App as AntApp, ConfigProvider, theme } from "antd";

type ThemeContextValue = {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

type ThemeProviderProps = {
  children: ReactNode;
};

const DARK_KEY = "necs-theme-dark";
const COMPACT_KEY = "necs-theme-compact"; // legacy; kept for cleanup

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  // Compact mode removed; maintain cleanup of legacy localStorage key.

  useEffect(() => {
    const darkSaved = localStorage.getItem(DARK_KEY);
    if (darkSaved != null) setIsDarkMode(darkSaved === "1");
    // Clean up old compact key if present
    localStorage.removeItem(COMPACT_KEY);
  }, []);

  useEffect(() => {
    localStorage.setItem(DARK_KEY, isDarkMode ? "1" : "0");
  }, [isDarkMode]);

  // compact persistence removed

  const toggleDarkMode = useCallback(() => setIsDarkMode((v) => !v), []);
  // compact toggle removed

  const algorithms = useMemo(() => {
    return [isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm];
  }, [isDarkMode]);

  const ctxValue = useMemo(
    () => ({ isDarkMode, toggleDarkMode }),
    [isDarkMode, toggleDarkMode]
  );

  return (
    <ThemeContext.Provider value={ctxValue}>
      <ConfigProvider
        theme={{
          algorithm: algorithms,
          token: {
            colorPrimary: "#ef4444",
            colorBgLayout: isDarkMode ? "#0b0b0b" : "#f7f7f7",
            colorBgContainer: isDarkMode ? "#141414" : "#ffffff",
            colorBorder: isDarkMode ? "#303030" : "#f0f0f0",
            borderRadius: 6,
          },
        }}
      >
        <AntApp>{children}</AntApp>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}

export function useThemeController() {
  const ctx = useContext(ThemeContext);
  if (!ctx)
    throw new Error("useThemeController must be used within ThemeProvider");
  return ctx;
}
