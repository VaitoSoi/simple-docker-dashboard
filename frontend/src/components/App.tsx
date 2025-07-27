import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import Navigation from "./Navigation/Navigation";
import "../index.css";
import { Toaster } from "@/components/ui/sonner";

export function WithNavigationBar({ children }: PropsWithChildren) {
    return (
        <div className="flex h-screen">
            <Navigation />
            {children}
        </div>
    );
}

export function WithToast({ children }: PropsWithChildren) {
    return <>
        {children}
        <Toaster />
    </>;
}

export function Combine({ children }: PropsWithChildren) {
    return <div className="flex h-screen">
        <Navigation />
        <Toaster />
        {children}
    </div>;
}

type Theme = "light" | "dark" | "system";
type ThemeProviderProps = { children: React.ReactNode; defaultTheme?: Theme; storageKey?: string };

const ThemeContext = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({
    theme: "system",
    setTheme: () => { }
});

export function ThemeProvider({ children, defaultTheme = "dark", storageKey = "ui-theme" }: ThemeProviderProps) {
    const [theme, setThemeState] = useState<Theme>(() => (localStorage.getItem(storageKey) as Theme) || defaultTheme);

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");

        let applied = theme;
        if (theme === "system")
            applied = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        
        root.classList.add(applied);
    }, [theme]);

    const setTheme = (t: Theme) => {
        localStorage.setItem(storageKey, t);
        setThemeState(t);
    };

    return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
    return ctx;
};


