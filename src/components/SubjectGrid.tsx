// src/components/SubjectGrid.tsx
import React from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export interface SubjectSummary {
  slug: string;
  title: string;
  emoji?: string;
  icon?: string;
  iconClass?: string;
  coursesCount: number;
}

interface SubjectGridProps {
  items: SubjectSummary[];
}

const SubjectGrid: React.FC<SubjectGridProps> = ({ items }) => {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">Предметы не найдены.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((s) => (
        <motion.a
          key={s.slug}
          href={`/${s.slug}`}
          whileHover={{ y: -6, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="block h-full no-underline"
        >
          <Card className="group relative h-full min-h-[180px] cursor-pointer overflow-hidden border border-border/70 bg-gradient-to-br from-white to-gray-50/50 transition-all duration-300 hover:border-lime-300/50 hover:shadow-lg hover:shadow-lime-100/50 dark:from-gray-900/50 dark:to-gray-800/30 dark:hover:border-lime-800/50 dark:hover:shadow-lime-900/20">
            {/* Фоновая иконка на всю высоту карточки */}
            {s.icon && (
              <div className="absolute inset-0">
                {/* Основная фоновая иконка */}
                <div 
                  className="absolute right-0 top-1/2 h-full w-full -translate-y-1/2 opacity-[0.04] transition-all duration-500 group-hover:opacity-[0.06] group-hover:scale-105"
                  style={{
                    backgroundImage: `url(${s.icon})`,
                    backgroundSize: 'auto 100%', // 70% от высоты карточки
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right center',
                    backgroundOrigin: 'content-box',
                    paddingRight: '0px',
                  }}
                />
                {/* Градиент для лучшей читаемости текста */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/50 to-transparent dark:from-gray-900/90" />
              </div>
            )}
            
            {/* Контент карточки */}
            <div className="relative z-10 h-full p-6 flex flex-col">
              {/* Верхняя часть с иконкой и заголовком */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-4">
                  {/* Основная иконка предмета */}
                  <div className="relative flex-shrink-0">
                    {s.icon ? (
                      <div className="relative">
                        <img
                          src={s.icon}
                          alt={`Иконка предмета ${s.title}`}
                          className={`h-12 w-12 ${s.iconClass || ""}`}
                          width={48}
                          height={48}
                          loading="lazy"
                          style={{
                            backgroundColor: 'rgba(163, 230, 53, 0.1)',
                          }}
                        />
                        {/* Акцентная рамка при наведении */}
                        {/* <div className="absolute inset-0 rounded-xl border-2 border-transparent transition-colors duration-300 group-hover:border-lime-400/30" /> */}
                      </div>
                      
                    ) : s.emoji ? (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 text-2xl transition-all duration-300 group-hover:scale-110 group-hover:from-lime-50 group-hover:to-lime-100 dark:from-gray-800 dark:to-gray-700">
                        {s.emoji}
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 text-lg font-medium transition-all duration-300 group-hover:scale-110 dark:from-gray-800 dark:to-gray-700">
                        {s.title.charAt(0)}
                      </div>
                    )
                    }
                  </div>
                  
                  {/* Заголовок и информация */}
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold leading-tight text-gray-900 dark:text-gray-100">
                      {s.title}
                    </CardTitle>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs font-medium text-lime-600 dark:text-lime-400">
                        {s.coursesCount} {s.coursesCount === 1 ? 'курс' : s.coursesCount < 5 ? 'курса' : 'курсов'}
                      </span>
                      {s.coursesCount > 0 && (
                        <div className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        Изучается
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Стрелочка для перехода
                <div className="transition-transform duration-300 group-hover:translate-x-1">
                  <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-lime-500" />
                </div> */}

              </div>
              
              {/* Нижняя часть с кнопкой */}
              <div className="mt-auto flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {/* Здесь можно добавить краткое описание предмета, если нужно */}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="group/btn h-8 gap-1 text-xs transition-all duration-300 hover:bg-lime-500/10 hover:text-lime-700 dark:hover:text-lime-400"
                >
                  <span>Перейти</span>
                  <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover/btn:translate-x-1" />
                </Button>
              </div>
            </div>
            
            {/* Анимационная полоска снизу */}
            <div className="absolute bottom-0 left-0 z-20 h-1 w-0 bg-gradient-to-r from-lime-400 to-emerald-400 transition-all duration-500 group-hover:w-full" />
          </Card>
        </motion.a>
      ))}
    </div>
  );
};

export default SubjectGrid;