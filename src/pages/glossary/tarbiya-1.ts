import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = ({ redirect }) =>
  redirect('/glossary/tarbiya', 301);
