export const FORM_THEME = {
  initial: {
    text: "text-forest-500 dark:text-forest-400",
    dot: "bg-forest-500 dark:bg-forest-400 shadow-forest-500/30",
  },

  middle: {
    text: "text-terracotta-500 dark:text-terracotta-400",
    dot: "bg-terracotta-500 dark:bg-terracotta-400 shadow-terracotta-500/30",
  },

  final: {
    text: "text-eggplant-500 dark:text-eggplant-400",
    dot: "bg-eggplant-500 dark:bg-eggplant-400 shadow-eggplant-500/30",
  },

  isolated: {
    text: "text-fjord-500 dark:text-fjord-400",
    dot: "bg-fjord-500 dark:bg-fjord-400 shadow-fjord-500/30",
  },
} as const;

export type FormName = keyof typeof FORM_THEME;
