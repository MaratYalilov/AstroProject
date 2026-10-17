import React from "react";
import { ArrowUp } from "lucide-react";

const MAX_WIDTH = 1280;

const ScrollToTop: React.FC = () => {
  const [visible, setVisible] = React.useState(false);
  const [leftPos, setLeftPos] = React.useState<number>(0);

  React.useEffect(() => {
    const updatePosition = () => {
      const screenWidth = window.innerWidth;
      const buttonSize = 48;

      if (screenWidth <= MAX_WIDTH) {
        setLeftPos(screenWidth / 2 - buttonSize / 2);
        return;
      }

      const containerWidth = MAX_WIDTH;
      const containerLeft = (screenWidth - containerWidth) / 2;
      const leftColWidth = containerWidth * (8 / 12);

      setLeftPos(containerLeft + leftColWidth / 2 - buttonSize / 2);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);

    return () => window.removeEventListener("resize", updatePosition);
  }, []);

  React.useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      style={{ left: leftPos }}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      aria-label="Наверх"
      className={[
        "fixed bottom-6 z-50 flex h-12 w-12 items-center justify-center rounded-full",
        "border border-border/60 bg-background/10 shadow-lg backdrop-blur",
        "transition-all duration-200 motion-reduce:transition-none",
        "hover:text-emerald-700 dark:hover:text-emerald-500",
        visible
          ? "translate-y-0 scale-100 opacity-100"
          : "pointer-events-none translate-y-5 scale-90 opacity-0",
      ].join(" ")}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
};

export default ScrollToTop;
