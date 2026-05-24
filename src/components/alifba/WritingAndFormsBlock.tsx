import { motion } from "framer-motion";

type FormItem = {
  position: "isolated" | "final" | "middle" | "initial";
  label: string;
  image: string;
};

type Animation = {
  format: "gif" | "svg" | "lottie";
  src: string;
};

type Props = {
  title: string;
  arabname?: string;
  animation: Animation;
  forms: FormItem[];
};

export default function WritingAndFormsBlock({
  title,
  arabname,
  animation,
  forms,
}: Props) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-lg shadow-gray-200/60 dark:border-white/10 dark:bg-white/5 dark:shadow-2xl dark:shadow-black/20">
      <h2 className="mb-8 text-3xl font-bold text-gray-950 dark:text-white">
        {title}
      </h2>

      <div className="grid grid-cols-2 gap-6 lg:grid-cols-5">
        {/* Animation — в том же стиле, что и формы */}
        <div className="col-span-2 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm shadow-gray-200/70 dark:border-white/10 dark:bg-slate-900/60 dark:shadow-none lg:col-span-1">
          {arabname && (
            <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-transparent">
              <div className="arab whitespace-nowrap text-center text-sm font-semibold text-gray-900 dark:text-slate-200 lg:text-base xl:text-xl">
                {arabname}
              </div>
            </div>
          )}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex h-[220px] items-center justify-center bg-white"
          >
            {animation.format === "gif" && (
              <img
                src={animation.src}
                alt=""
                className="h-full w-full object-contain"
              />
            )}

            {animation.format === "svg" && (
              <img
                src={animation.src}
                alt=""
                className="h-full w-full object-contain"
              />
            )}
          </motion.div>
        </div>

        {/* Формы */}
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
              <div className="whitespace-nowrap text-center text-sm font-semibold text-gray-900 dark:text-slate-200 lg:text-base xl:text-xl">
                {form.label}
              </div>
            </div>

            <div className="flex h-[220px] items-center justify-center bg-white">
              <img
                src={form.image}
                alt={form.label}
                className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
              />
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
