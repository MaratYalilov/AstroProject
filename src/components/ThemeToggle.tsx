import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

type Theme = "dark" | "light";

const THEME_CHANGE_EVENT = "hutba:theme-change";

function subscribeTheme(onChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange);
}

function readTheme(): Theme {
  // Base already applies the saved or system theme before the first paint.
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function serverTheme(): Theme {
  // Keep the first React render identical to the server-rendered button.
  return "dark";
}

function toggleTheme() {
  const theme: Theme = readTheme() === "dark" ? "light" : "dark";
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // Switching still works when the browser blocks storage.
  }
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export default function ThemeToggle() {
  const theme = React.useSyncExternalStore(subscribeTheme, readTheme, serverTheme);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      title="Переключить тему"
      aria-label="Переключить тему"
    >
      {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}
