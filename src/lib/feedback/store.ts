import { mkdir, readFile, readdir, rename, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { feedbackDataDir } from './paths.mjs';
import { validCredentials, type AdminCredentials } from './credentials.mjs';
import { FeedbackError, isFeedbackStatus, type FeedbackStatus } from './validation';

export type FeedbackReport = {
  id: string; pageUrl: string; pageTitle: string; message: string;
  createdAt: string; updatedAt: string; status: FeedbackStatus; version: number;
  notes: Array<{text: string; at: string}>;
};
const idPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
function reportFile(id: string) { return path.join(feedbackDataDir(), 'reports', id + '.json'); }
async function atomicWrite(file: string, value: unknown) {
  await mkdir(path.dirname(file), {recursive: true, mode: 0o700});
  const temp = file + '.' + randomUUID() + '.tmp';
  try {
    await writeFile(temp, JSON.stringify(value, null, 2) + '\n', {flag: 'wx', mode: 0o600});
    await rename(temp, file);
  } finally { await unlink(temp).catch(() => {}); }
}
export async function readAdminCredentials(): Promise<AdminCredentials | null> {
  try {
    const data: unknown = JSON.parse(await readFile(path.join(feedbackDataDir(), 'admin.json'), 'utf8'));
    if (!validCredentials(data)) throw new Error('Invalid administrator credentials file');
    return data;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}
export async function createFeedback(input: Pick<FeedbackReport, 'pageUrl' | 'pageTitle' | 'message'>): Promise<FeedbackReport> {
  const now = new Date().toISOString();
  const report: FeedbackReport = {...input, id: randomUUID(), createdAt: now, updatedAt: now, status: 'new', version: 1, notes: []};
  await atomicWrite(reportFile(report.id), report);
  return report;
}
export async function getFeedback(id: string): Promise<FeedbackReport | null> {
  if (!idPattern.test(id)) return null;
  try {
    const data = JSON.parse(await readFile(reportFile(id), 'utf8')) as FeedbackReport;
    if (data.id !== id || !isFeedbackStatus(data.status) || typeof data.message !== 'string' || !Array.isArray(data.notes)) {
      throw new Error('Invalid feedback report');
    }
    return data;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}
export async function listFeedback(): Promise<FeedbackReport[]> {
  let names: string[];
  try { names = await readdir(path.join(feedbackDataDir(), 'reports')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
  const reports: FeedbackReport[] = [];
  let next = 0;
  await Promise.all(Array.from({length: Math.min(8, names.length)}, async () => {
    while (next < names.length) {
      const name = names[next++];
      if (!name.endsWith('.json') || !idPattern.test(name.slice(0, -5))) continue;
      const report = await getFeedback(name.slice(0, -5));
      if (report) reports.push(report);
    }
  }));
  return reports.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
let updateQueue = Promise.resolve();
export async function updateFeedback(id: string, status: FeedbackStatus, note: string, version: number) {
  let release!: () => void;
  const previous = updateQueue;
  updateQueue = new Promise<void>(resolve => { release = resolve; });
  await previous;
  try {
    const report = await getFeedback(id);
    if (!report) throw new FeedbackError('Сообщение не найдено.', 404);
    if (report.version !== version) throw new FeedbackError('Сообщение уже изменено. Проверьте текущий статус и сохраните ещё раз.', 409);
    if (!isFeedbackStatus(status) || note.length > 4000) throw new FeedbackError('Проверьте статус и длину заметки (до 4000 символов).');
    report.status = status;
    report.updatedAt = new Date().toISOString();
    report.version++;
    if (note.trim()) report.notes.push({text: note.trim(), at: report.updatedAt});
    await atomicWrite(reportFile(id), report);
    return report;
  } finally { release(); }
}
