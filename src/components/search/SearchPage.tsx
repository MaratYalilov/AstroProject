// src/components/search/SearchPage.tsx
//
// Страница /search: все результаты поиска по урокам (тот же индекс, что и в навбаре).

import * as React from "react";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import Highlighted from "./Highlighted";
import { useLessonSearch } from "./useLessonSearch";

/** Сколько результатов показываем на странице */
const RESULT_LIMIT = 60;

export default function SearchPage() {
  const [query, setQuery] = React.useState("");
  const [ready, setReady] = React.useState(false);

  // Страница статическая, поэтому запрос читаем из ?q=… уже на клиенте
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQuery(params.get("q") ?? "");
    setReady(true);
  }, []);

  const { result, loading, error } = useLessonSearch(query, {
    limit: RESULT_LIMIT,
    enabled: true,
  });

  // Держим адрес актуальным — ссылкой на поиск можно поделиться
  React.useEffect(() => {
    if (!ready) return;

    const trimmed = query.trim();
    const nextUrl = trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search";
    window.history.replaceState(null, "", nextUrl);
  }, [query, ready]);

  const results = result?.results ?? [];
  const tokens = result?.tokens ?? [];
  const trimmedQuery = query.trim();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="mb-4 text-2xl font-semibold">Поиск по урокам</h1>

      <div className="relative mb-6">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Название урока или тема: таяммум, идгам, намаз…"
          aria-label="Поиск по урокам"
          autoComplete="off"
          className="h-11 pl-9 text-base"
        />
      </div>

      {error ? (
        <p className="text-sm text-muted-foreground">{error}</p>
      ) : loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Загружаем индекс поиска…
        </p>
      ) : !trimmedQuery ? (
        <p className="text-sm text-muted-foreground">
          Введите запрос — поиск идёт по названиям уроков, курсам и содержанию уроков.
        </p>
      ) : results.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          По запросу «{trimmedQuery}» уроки не найдены.
        </p>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            Найдено уроков: {result?.total ?? 0}
            {result && result.total > results.length ? ` (показано ${results.length})` : ""}
          </p>

          <ul className="m-0 list-none space-y-3 p-0">
            {results.map((item) => (
              <li key={`${item.entry.u}|${item.entry.t}`}>
                <a
                  href={item.entry.u}
                  className="block rounded-xl border border-border/70 bg-card px-4 py-3 no-underline transition hover:border-lime-300/60 hover:bg-muted/60"
                >
                  <span className="flex items-start justify-between gap-3">
                    <Highlighted
                      text={item.entry.t}
                      tokens={tokens}
                      className="text-base font-medium leading-snug"
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
                    <span className="mt-1.5 block text-sm leading-6 text-muted-foreground">
                      <Highlighted text={item.snippet} tokens={tokens} />
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
