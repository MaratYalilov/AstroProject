import { defineCollection, z } from "astro:content";

const subjects = defineCollection({
  type: "data",
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    emoji: z.string().optional(),
    order: z.number().optional(),
    description: z.string().optional(),
    icon: z.string().optional(), // путь к иконке
    iconClass: z.string().optional(), // дополнительные классы CSS
  }),
});

const courses = defineCollection({
  type: "data",
  schema: z.object({
    subject: z.string(),   // fiqh, akida ...
    slug: z.string(),      // mishkat-namaz
    title: z.string(),
    author: z.string().optional(),
    description: z.string().optional(),
    lessonsCount: z.number().optional(),
    layout: z.enum(["tabs", "blog"]).optional().default("tabs"),
    order: z.number().optional().default(999),
  }),
});

const lessons = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    order: z.number().optional(),

    hasAudio: z.boolean().default(false),
    hasVideo: z.boolean().default(false),

    // полные пути (как у новых уроков)
    audio: z.string().optional(),
    video: z.string().optional(),

    // относительные пути (как у старых мигрированных уроков)
    audioRel: z.string().optional(),
    videoRel: z.string().optional(),

    group: z.union([z.string(), z.number()]).optional(),
    groupOrder: z.number().optional(),
  }),
});

const glossary = defineCollection({
    type: 'content',
    schema: z.object({
      term: z.string(),
      url_slug: z.string(),
      letter: z.string(),      // "А", "Б", ...
      category: z.string(),    // можно = letter
      tags: z.array(z.string()).default([]),
      aliases: z.array(z.string()).default([]),
      related: z.array(z.string()).default([]),
      used_in: z.array(z.any()).default([]),
      description: z.string().optional(),
    }),
  });

export const collections = { subjects, courses, lessons, glossary };

