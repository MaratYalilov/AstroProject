// src/components/lesson/LetterForms.tsx

import { motion } from "framer-motion";

type FormItem = {
  position: "isolated" | "final" | "middle" | "initial";
  label: string;
  image: string;
};

type Props = {
  title: string;
  forms: FormItem[];
};

export default function LetterForms({
  title,
  forms,
}: Props) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-lg shadow-gray-200/60 dark:border-white/10 dark:bg-white/5 dark:shadow-2xl dark:shadow-black/20">
      <h2 className="mb-8 text-3xl font-bold text-gray-950 dark:text-white">
        {title}
      </h2>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {forms.map((form, index) => (
          <motion.div
            key={index}
            whileHover={{
              y: -6,
              scale: 1.02,
            }}
            className="group overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm shadow-gray-200/70 dark:border-white/10 dark:bg-slate-900/60 dark:shadow-none"
          >
            <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-transparent">
              <div className="text-center text-xl font-semibold text-gray-900 dark:text-slate-200">
                {form.label}
              </div>
            </div>

            <div className="flex min-h-[240px] items-center justify-center bg-white p-6">
              <img
                src={form.image}
                alt={form.label}
                className="max-h-[180px] object-contain transition duration-300 group-hover:scale-105"
              />
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
