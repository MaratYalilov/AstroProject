import React from "react";
import { ArrowUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ReducedMotionProvider } from "./motion/ReducedMotionProvider";

const MAX_WIDTH = 1280;

const ScrollToTop: React.FC = () => {
  const [visible, setVisible] = React.useState(false);
  const [leftPos, setLeftPos] = React.useState<number>(0);

  React.useEffect(() => {
    const updatePosition = () => {
      const screenWidth = window.innerWidth;
      const buttonSize = 48;

      // Если экран маленький — просто центр экрана
      if (screenWidth <= MAX_WIDTH) {
        setLeftPos(screenWidth / 2 - buttonSize / 2);
        return;
      }

      // Если экран большой — центр левой колонки (8/12 контейнера)
      const containerWidth = MAX_WIDTH;
      const containerLeft = (screenWidth - containerWidth) / 2;
      const leftColWidth = containerWidth * (8 / 12);

      const centerLeftCol =
        containerLeft + leftColWidth / 2 - buttonSize / 2;

      setLeftPos(centerLeftCol);
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
    <ReducedMotionProvider>
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 20 }}
          transition={{ duration: 0.2 }}
          style={{ left: leftPos }}
          className="
            fixed
            bottom-6
            z-50
            flex
            h-12
            w-12
            items-center
            justify-center
            rounded-full
            border
            border-border/60
            bg-background/10
            backdrop-blur
            shadow-lg
            transition
            hover:text-emerald-700
            dark:hover:text-emerald-500
          "
          aria-label="Наверх"
        >
          <ArrowUp className="h-5 w-5" />
        </motion.button>
      )}
    </AnimatePresence>
    </ReducedMotionProvider>
  );
};

export default ScrollToTop;
