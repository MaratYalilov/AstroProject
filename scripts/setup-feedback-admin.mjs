import { mkdir, readFile, rename, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { emitKeypressEvents } from 'node:readline';
import { createCredentials } from '../src/lib/feedback/credentials.mjs';
import { feedbackDataDir } from '../src/lib/feedback/paths.mjs';

if (process.argv.includes('--help')) {
  console.log('Usage: npm run admin:setup [-- --reset]\nSet FEEDBACK_DATA_DIR to the same private directory used by the server.');
  process.exit(0);
}
async function password(prompt) {
  if (!process.stdin.isTTY) throw new Error('Run this command in an interactive terminal. Passwords are not accepted in arguments.');
  process.stdout.write(prompt);
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    function end(error) {
      process.stdin.off('keypress', input);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write('\n');
      if (error) reject(error); else resolve(value);
    }
    function input(text, key) {
      if (key?.name === 'return' || key?.name === 'enter') { end(); return; }
      if (key?.ctrl && key.name === 'c') { end(new Error('Cancelled')); return; }
      if (key?.name === 'backspace') {
        if (value) { value = Array.from(value).slice(0,-1).join(''); process.stdout.write('\b \b'); }
      } else if (text && !key?.ctrl && !key?.meta && !/[\x00-\x1f\x7f]/.test(text)) {
        value += text; process.stdout.write('*'.repeat(Array.from(text).length));
      }
    }
    process.stdin.on('keypress', input);
  });
}
try {
  if (process.argv.slice(2).some(arg => arg !== '--reset')) throw new Error('Unknown option. Use --help.');
  const dir = feedbackDataDir(), file = path.join(dir, 'admin.json');
  console.log('Каталог данных: ' + dir);
  let exists = false;
  try { await readFile(file); exists = true; } catch (e) { if (e.code !== 'ENOENT') throw e; }
  if (exists && !process.argv.includes('--reset')) throw new Error('Administrator already exists. Use --reset to change the password and invalidate sessions.');
  const first = await password('Новый пароль (12-256 символов): ');
  const second = await password('Повторите пароль: ');
  if (first !== second) throw new Error('Passwords do not match');
  const credentials = await createCredentials(first);
  await mkdir(dir, {recursive:true,mode:0o700});
  const temp = file + '.' + randomUUID() + '.tmp';
  try { await writeFile(temp, JSON.stringify(credentials) + '\n', {mode:0o600,flag:'wx'}); await rename(temp,file); }
  finally { await unlink(temp).catch(()=>{}); }
  console.log('Пароль сохранён. Вход: /admin/feedback. Предыдущие сессии недействительны.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
