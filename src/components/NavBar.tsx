import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ThemeToggle from "@/components/ThemeToggle";
import { Menu, X } from "lucide-react";

type NavItem = { label: string; href: string; match: (path: string) => boolean };

const NAV: NavItem[] = [
  { label: "Главная", href: "/", match: (p) => p === "/" },
  { label: "Предметы", href: "/", match: (p) => p === "/" || /^\/[a-z]/i.test(p) },
  // можно добавить свои пункты:
  // { label: "О нас", href: "/about", match: (p) => p.startsWith("/about") },
];

export default function NavBar({ currentPath = "/" }: { currentPath?: string }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
      {/* Logo */}
      <a href="/" className="flex items-center gap-2">
        <img src="/s5_logo.png" alt="Hutba.org" className="h-11 w-auto" />
      </a>

      {/* Desktop nav */}
      <nav className="hidden items-center gap-2 sm:flex">
        {NAV.map((item, index) => {
          const active = item.match(currentPath);
          return (
            <a
              key={`${item.href}-${index}`}
              href={item.href}
              className={[
                "rounded-lg border border-transparent px-3 py-1.5 text-sm transition",
                active
                  ? "bg-muted font-medium"
                  : "hover:border-lime-200 hover:bg-lime-50 dark:hover:border-transparent dark:hover:bg-muted"
              ].join(" ")}
            >
              {item.label}
            </a>
          );
        })}
        <div className="ml-2 hidden md:flex items-center gap-2">
          <Input placeholder="Поиск…" className="w-48" />
          <ThemeToggle />
        </div>
      </nav>

      {/* Mobile */}
      <div className="flex items-center gap-2 sm:hidden">
        <ThemeToggle />
        <Button variant="ghost" size="icon" onClick={() => setOpen((v) => !v)} aria-label="Меню">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <div className="absolute left-0 right-0 top-[64px] border-b bg-background sm:hidden">
          <div className="mx-auto max-w-7xl px-4 py-3 space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Поиск…" />
            </div>
            <div className="flex flex-col">
              {NAV.map((item, index) => {
                const active = item.match(currentPath);
                return (
                  <a
                    key={`${item.href}-${index}`}
                    href={item.href}
                    className={[
                      "rounded-lg border border-transparent px-3 py-2 text-sm transition",
                      active
                        ? "bg-muted font-medium"
                        : "hover:border-lime-200 hover:bg-lime-50 dark:hover:border-transparent dark:hover:bg-muted"
                    ].join(" ")}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
