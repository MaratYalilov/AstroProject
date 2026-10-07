// src/components/NavBar.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import SearchBox from "@/components/search/SearchBox";
import ThemeToggle from "@/components/ThemeToggle";
import SocialLinks from "@/components/SocialLinks";
import { Menu, X } from "lucide-react";
import hutbaLogo from "@/assets/hutba-logo.svg?url";

type NavItem = { label: string; href: string; match: (path: string) => boolean };

const NAV: NavItem[] = [
  { label: "Предметы", href: "/", match: (p) => p === "/" || (/^\/[a-z]/i.test(p) && !/^\/(about|glossary|search)(\/|$)/.test(p)) },
  { label: "Словарь", href: "/glossary", match: (p) => p === "/glossary" || p.startsWith("/glossary/") },
  { label: "О проекте", href: "/about", match: (p) => p === "/about" || p.startsWith("/about/") },
];

export default function NavBar({ currentPath = "/" }: { currentPath?: string }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
      {/* Logo */}
      <a href="/" className="flex items-center gap-2">
        <img src={hutbaLogo} alt="Hutba.org" width={420} height={160} className="h-11 w-auto" />
      </a>

      {/* Desktop nav */}
      <nav className="hidden items-center gap-2 sm:flex">
        {NAV.map((item, index) => {
          const active = item.match(currentPath);
          return (
            <a
              key={`${item.href}-${index}`}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={[
                "rounded-lg border border-transparent px-2 py-1.5 text-sm transition lg:px-3",
                active
                  ? "bg-muted font-medium"
                  : "hover:border-lime-200 hover:bg-lime-50 dark:hover:border-transparent dark:hover:bg-muted"
              ].join(" ")}
            >
              {item.label}
            </a>
          );
        })}
        <div className="ml-1 flex items-center gap-1 lg:ml-2 lg:gap-2">
          <div className="hidden md:block">
            <SearchBox className="w-40 lg:w-72" />
          </div>
          <SocialLinks />
          <ThemeToggle />
        </div>
      </nav>

      {/* Mobile */}
      <div className="flex items-center gap-2 sm:hidden">
        <ThemeToggle />
        <Button variant="ghost" size="icon" onClick={() => setOpen((v) => !v)} aria-label="Меню" aria-expanded={open} aria-controls="mobile-menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <div id="mobile-menu" className="absolute left-0 right-0 top-full border-b bg-background sm:hidden">
          <div className="mx-auto max-w-7xl px-4 py-3 space-y-3">
            <div className="flex gap-2">
              <SearchBox variant="mobile" onNavigate={() => setOpen(false)} />
            </div>
            <div className="flex flex-col">
              {NAV.map((item, index) => {
                const active = item.match(currentPath);
                return (
                  <a
                    key={`${item.href}-${index}`}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
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
            <div className="border-t pt-3">
              <p className="mb-1 px-3 text-xs text-muted-foreground">HUTBA в соцсетях</p>
              <SocialLinks showLabels onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
