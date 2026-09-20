// src/components/search/SearchBox.tsx
//
// Поиск по урокам в навбаре: инпут + выпадающий список результатов.
// Индекс уроков скачивается лениво (при фокусе/вводе) и кэшируется браузером.

import * as React from "react";
import { ArrowRight, Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SEARCH_PAGE_URL } from "@/lib/search/lessonSearch";
import Highlighted from "./Highlighted";
import { useLessonSearch } from "./useLessonSearch";

/** Сколько результатов показываем в выпадающем списке */
const RESULT_LIMIT = 8;

type Props = {
  /** "desktop" — компактный инпут в навбаре, "mobile" — на всю ширину в меню */
  variant?: "desktop" | "mobile";
  className?: string;
  /** Вызывается при переходе к результату (например, чтобы закрыть мобильное меню) */
  onNavigate?: () => void;
};

export default function SearchBox({ variant = "desktop", className, onNavigate }: Props) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);

  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const listId = React.useId();

  // enabled: индекс начинает подгружаться уже при фокусе — результаты появляются мгновенно
  const { result, loading, error } = useLessonSearch(query, {
    limit: RESULT_LIMIT,
    enabled: focused || open,
  });

  const results = result?.results ?? [];
  const tokens = result?.tokens ?? [];
  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;

  // Ctrl/Cmd+K — фокус на поиске (только для видимого инпута)
  React.useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;

      const input = inputRef.current;
      if (!input || input.offsetParent === null) return;

      event.preventDefault();
      input.focus();
      setOpen(true);
    };

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  // Клик вне компонента закрывает выпадающий список
  React.useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const wrapper = wrapperRef.current;
      if (wrapper && !wrapper.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [open]);

  React.useEffect(() => {
    setActiveIndex(-1);
  }, [query]);

  const goTo = (url: string) => {
    setOpen(false);
    onNavigate?.();
    window.location.assign(url);
  };

  const goToSearchPage = () => {
    if (!hasQuery) return;
    goTo(`${SEARCH_PAGE_URL}?q=${encodeURIComponent(trimmedQuery)}`);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      const active = results[activeIndex];
      if (active) {
        event.preventDefault();
        goTo(active.entry.u);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      if (open) {
        setOpen(false);
      } else if (query) {
        setQuery("");
      }
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "relative",
        variant === "desktop" ? "w-48 lg:w-72" : "w-full",
        className
      )}
    >
      <form
        role="search"
        className="relative"
        onSubmit={(event) => {
          event.preventDefault();
          goToSearchPage();
        }}
      >
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />

        <Input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setFocused(true);
            setOpen(true);
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="Поиск по урокам…"
          aria-label="Поиск по урокам"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          className="pl-9 pr-8"
        />

        {hasQuery && (
          <button
            type="button"
            aria-label="Очистить поиск"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label="Результаты поиска по урокам"
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border bg-popover text-popover-foreground shadow-xl sm:left-auto sm:right-0 sm:w-[26rem]"
        >
          {error ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">{error}</p>
          ) : loading ? (
            <p className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Загружаем индекс поиска…
            </p>
          ) : !hasQuery ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              Начните вводить название урока или тему
            </p>
          ) : results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              По запросу «{trimmedQuery}» уроки не найдены
            </p>
          ) : (
            <>
              <ul role="presentation" className="m-0 list-none p-0">
                {results.map((item, index) => (
                  <li
                    key={`${item.entry.u}|${item.entry.t}`}
                    role="presentation"
                    className="border-b border-border/60 last:border-b-0"
                  >
                    <a
                      role="option"
                      aria-selected={index === activeIndex}
                      href={item.entry.u}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => {
                        setOpen(false);
                        onNavigate?.();
                      }}
                      className={cn(
                        "block px-3 py-2 no-underline transition",
                        index === activeIndex && "bg-accent"
                      )}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <Highlighted
                          text={item.entry.t}
                          tokens={tokens}
                          className="text-sm font-medium leading-snug"
                        />
                        {item.entry.o != null && (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            урок {item.entry.o}
                          </span>
                        )}
                      </span>

                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {item.entry.st} · {item.entry.ct}
                      </span>

                      {item.snippet && (
                        <span className="mt-1 block line-clamp-2 text-xs text-muted-foreground">
                          <Highlighted text={item.snippet} tokens={tokens} />
                        </span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={goToSearchPage}
                className="flex w-full items-center justify-between gap-2 border-t border-border/60 px-3 py-2 text-left text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <span>
                  Показать все результаты
                  {result ? ` (${result.total})` : ""}
                </span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
