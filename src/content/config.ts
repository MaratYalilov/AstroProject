import { defineCollection, z } from "astro:content";

const subjects = defineCollection({
  type: "data",
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    emoji: z.string().optional(),
    order: z.number().optional(),
    description: z.string().optional(),
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
  }),
});


export const collections = { subjects, courses, lessons };
