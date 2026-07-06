import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Оборачивает островной React-компонент, чтобы все вложенные framer-motion
 * анимации уважали системную настройку «уменьшить движение»
 * (prefers-reduced-motion). Помогает доступности и заметно снижает нагрузку
 * на слабые GPU. Контекст MotionConfig не пересекает границы Astro-островов,
 * поэтому провайдер нужно ставить в КОРНЕ каждого client:* компонента.
 */
export function ReducedMotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
