// src/components/search/Highlighted.tsx
//
// Подсвечивает в тексте совпадения с поисковым запросом.

import * as React from "react";
import { splitByTokens } from "@/lib/search/lessonSearch";

export default function Highlighted({
  text,
  tokens,
  className,
}: {
  text: string;
  tokens: string[];
  className?: string;
}) {
  const parts = React.useMemo(() => splitByTokens(text, tokens), [text, tokens]);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.hit ? (
          <mark
            key={index}
            className="rounded bg-lime-200/80 px-0.5 text-foreground dark:bg-lime-500/30 dark:text-foreground"
          >
            {part.text}
          </mark>
        ) : (
          <React.Fragment key={index}>{part.text}</React.Fragment>
        )
      )}
    </span>
  );
}
