export type SubjectSlug =
| "adab" | "akida" | "tarih" | "fikh" | "sira" | "arabic" | "quran" | "tafsir" | "hadith";


export interface CourseMeta {
slug: string; // url-часть, например: course-1
title: string; // Заголовок курса
duration?: string; // Опционально
videoSrc?: string; // Можно подставить реальные ссылки позже
audioSrc?: string;
}


export interface Subject {
slug: SubjectSlug;
title: string; // Отображаемое имя предмета
emoji: string; // Для карточки
courses: CourseMeta[]; // Ровно 3 курса, как просили
}


const DEFAULT_VIDEO = "https://www.w3schools.com/html/mov_bbb.mp4";
const DEFAULT_AUDIO = "https://www.w3schools.com/html/horse.mp3";


export const subjects: Subject[] = [
{ slug: "adab", title: "Адаб", emoji: "📖", courses: [
{ slug: "course-1", title: "Основы адаба", videoSrc: DEFAULT_VIDEO, audioSrc: DEFAULT_AUDIO },
{ slug: "course-2", title: "Адаб в семье", videoSrc: DEFAULT_VIDEO, audioSrc: DEFAULT_AUDIO },
{ slug: "course-3", title: "Этика общения", videoSrc: DEFAULT_VIDEO, audioSrc: DEFAULT_AUDIO },
]},
{ slug: "akida", title: "Акида", emoji: "🕋", courses: [
{ slug: "course-1", title: "Введение в акиду", videoSrc: DEFAULT_VIDEO, audioSrc: DEFAULT_AUDIO },
{ slug: "course-2", title: "Имена и атрибуты", videoSrc: DEFAULT_VIDEO, audioSrc: DEFAULT_AUDIO },
{ slug: "course-3", title: "Воля и предопределение", videoSrc: DEFAULT_VIDEO, audioSrc: DEFAULT_AUDIO },
]},
{ slug: "tarih", title: "Тарих", emoji: "🏺", courses: [
{ slug: "course-1", title: "История ислама I", videoSrc: DEFAULT_VIDEO, audioSrc: DEFAULT_AUDIO },
{ slug: "course-2", title: "Халифаты", videoSrc: DEFAULT_VIDEO, audioSrc: DEFAULT_AUDIO },
{ slug: "course-3", title: "Новая история", videoSrc: DEFAULT_VIDEO, audioSrc: DEFAULT_AUDIO },
]},
{ slug: "fikh", title: "Фикх", emoji: "⚖️", courses: [
{ slug: "course-1", title: "Основы фикха", videoSrc: DEFAULT_VIDEO, audioSrc: DEFAULT_AUDIO },
{ slug: "course-2", title: "Ибадат", videoSrc: DEFAULT_VIDEO, audioSrc: DEFAULT_AUDIO },
{ slug: "course-3", title: "Муамалят", videoSrc: DEFAULT_VIDEO, audioSrc: DEFAULT_AUDIO },
]},
{ slug: "sira", title: "Сира", emoji: "🌙", courses: [
{ slug: "course-1", title: "Жизнь Пророка (с.а.с.) I", videoSrc: DEFAULT_VIDEO, audioSrc: DEFAULT_AUDIO },
{ slug: "course-2", title: "Жизнь Пророка (с.а.с.) II", videoSrc: DEFAULT_VIDEO, audioSrc: DEFAULT_AUDIO },
{ slug: "course-3", title: "Сподвижники", videoSrc: DEFAULT_VIDEO, audioSrc: DEFAULT_AUDIO },
]},
{ slug: "arabic", title: "Арабский язык", emoji: "🗣️", courses: [
{ slug: "course-1", title: "Алфавит и чтение", videoSrc: DEFAULT_VIDEO, audioSrc: DEFAULT_AUDIO },
{ slug: "course-2", title: "Грамматика A1", videoSrc: DEFAULT_VIDEO, audioSrc: DEFAULT_AUDIO },
{ slug: "course-3", title: "Разговорная практика", videoSrc: DEFAULT_VIDEO, audioSrc: DEFAULT_AUDIO },
]},
{ slug: "quran", title: "Коран", emoji: "📜", courses: [
{ slug: "course-1", title: "Таджвид основы", videoSrc: DEFAULT_VIDEO, audioSrc: DEFAULT_AUDIO },
{ slug: "course-2", title: "Чтение сурами", videoSrc: DEFAULT_VIDEO, audioSrc: DEFAULT_AUDIO },
{ slug: "course-3", title: "Памятование", videoSrc: DEFAULT_VIDEO, audioSrc: DEFAULT_AUDIO },
]},
];