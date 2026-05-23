import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob, file } from 'astro/loaders';

// Для subjects (данные из папки с YAML файлами)
const subjects = defineCollection({
  loader: glob({ pattern: "**/*.yml", base: "./src/content/subjects" }),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    emoji: z.string().optional(),
    order: z.number().optional(),
    description: z.string().optional(),
    icon: z.string().optional(),
    iconClass: z.string().optional(),
  }),
});

// Для courses (данные из папки с подпапками и YAML файлами)
const courses = defineCollection({
  loader: glob({ pattern: "**/*.yml", base: "./src/content/courses" }),
  schema: z.object({
    subject: z.string(),
    slug: z.string(),
    title: z.string(),
    author: z.string().optional(),
    description: z.string().optional(),
    lessonsCount: z.number().optional(),
    layout: z.enum(["tabs", "blog"]).optional().default("tabs"),
    type: z.string().optional().default("standard"),
    order: z.number().optional().default(999),
  }),
});

// Для lessons (Markdown файлы)
const lessons = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/lessons" }),
  schema: z.object({
    title: z.string(),
    order: z.number().optional(),
    hasAudio: z.boolean().default(false),
    hasVideo: z.boolean().default(false),
    audio: z.string().optional(),
    video: z.string().optional(),
    audioRel: z.string().optional(),
    videoRel: z.string().optional(),
    group: z.union([z.string(), z.number()]).optional(),
    groupOrder: z.number().optional(),
  }),
});

// Для glossary (Markdown файлы)
const glossary = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/glossary" }),
  schema: z.object({
    term: z.string(),
    url_slug: z.string(),
    letter: z.string(),
    category: z.string(),
    tags: z.array(z.string()).default([]),
    aliases: z.array(z.string()).default([]),
    related: z.array(z.string()).default([]),
    used_in: z.array(z.any()).default([]),
    description: z.string().optional(),
  }),
});

// НОВАЯ КОЛЛЕКЦИЯ: Арабские уроки Абу Ахмада
const arabicAbuAkhmad = defineCollection({
  loader: glob({ 
    pattern: "*.md", 
    base: "./src/content/lessons/arabic/arabskij-yazyk-abu-akhmad" 
  }),
  schema: z.object({
    title: z.string(),
    order: z.number(),
    hasAudio: z.boolean().default(false),
    hasVideo: z.boolean().default(false),
    audio: z.string().optional(),
    audioRel: z.string().optional(),
    video: z.string().optional(),
    videoRel: z.string().optional(),
    layout: z.string().optional(),
  }),
});

export const collections = { subjects, courses, lessons, glossary,'arabic-abu-akhmad': arabicAbuAkhmad, };