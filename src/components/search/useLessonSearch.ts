// src/components/search/useLessonSearch.ts
//
// React-хук поиска по урокам: ленивая загрузка статического индекса
// (/api/search-index.json) и поиск по нему на клиенте.
//
// Индекс скачивается один раз на браузерную сессию: промис держится в модуле,
// поэтому все экземпляры компонентов поиска переиспользуют один и тот же запрос.

import * as React from "react";
import {
  prepareIndex,
  searchLessonIndex,
  SEARCH_INDEX_URL,
  type LessonSearchIndex,
  type LessonSearchOutput,
  type PreparedLessonIndex,
} from "@/lib/search/lessonSearch";

export type UseLessonSearchOptions = {
  /** Сколько результатов вернуть (первые — самые релевантные) */
  limit?: number;
  /** Начинать загрузку индекса, даже если запрос ещё пустой (префетч при фокусе) */
  enabled?: boolean;
};

export type LessonSearchState = {
  result: LessonSearchOutput | null;
  loading: boolean;
  error: string | null;
};

let preparedIndex: PreparedLessonIndex | null = null;
let indexRequest: Promise<PreparedLessonIndex> | null = null;

async function loadPreparedIndex(): Promise<PreparedLessonIndex> {
  if (preparedIndex) return preparedIndex;

  if (!indexRequest) {
    indexRequest = fetch(SEARCH_INDEX_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<LessonSearchIndex>;
      })
      .then((data) => {
        preparedIndex = prepareIndex(Array.isArray(data?.entries) ? data.entries : []);
        return preparedIndex;
      })
      .catch((error) => {
        // Позволяем повторить попытку при следующем вводе
        indexRequest = null;
        throw error;
      });
  }

  return indexRequest;
}

export function useLessonSearch(
  query: string,
  options: UseLessonSearchOptions = {}
): LessonSearchState {
  const { limit = 8, enabled = false } = options;

  const [index, setIndex] = React.useState<PreparedLessonIndex | null>(preparedIndex);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const wantsIndex = enabled || query.trim().length > 0;

  React.useEffect(() => {
    if (!wantsIndex || index) return;

    let cancelled = false;
    setLoading(true);

    loadPreparedIndex()
      .then((value) => {
        if (cancelled) return;
        setIndex(value);
        setError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Не удалось загрузить поисковый индекс");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [wantsIndex, index]);

  const result = React.useMemo(
    () => (index && query.trim() ? searchLessonIndex(index, query, limit) : null),
    [index, query, limit]
  );

  return {
    result,
    loading: loading || (wantsIndex && !index && !error),
    error,
  };
}
