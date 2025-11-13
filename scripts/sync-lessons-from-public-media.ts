import fs from "fs/promises";
import path from "path";
import fg from "fast-glob";
import matter from "gray-matter";

const PUBLIC_MEDIA_ROOT = "public/media";
const CONTENT_LESSONS_ROOT = "src/content/lessons";

const AUDIO_EXTS = [".mp3", ".m4a", ".ogg", ".wav"];
const VIDEO_EXTS = [".mp4", ".webm", ".mkv", ".mov"];

type Args = { dry: boolean; verbose: boolean; subject?: string; course?: string };
function parseArgs(): Args {
  const a: Args = { dry: false, verbose: false };
  for (const arg of process.argv.slice(2)) {
    if (arg === "--dry") a.dry = true;
    else if (arg === "--verbose" || arg === "-v") a.verbose = true;
    else if (arg.startsWith("--subject=")) a.subject = arg.split("=")[1];
    else if (arg.startsWith("--course=")) a.course = arg.split("=")[1];
  }
  return a;
}

const toPosix = (p: string) => p.replace(/\\/g, "/");
const stripPublic = (p: string) => "/" + toPosix(p).replace(/^public\//, "");
const nameOf = (p: string) => toPosix(p).split("/").pop()!;

function normalizeBase(s: string) {
  return s
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .trim()
    .replace(/[\s_.,;:+=()[\]{}|\\/"'`~?!@#$%^&*<>«»]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
function humanizeTitle(norm: string) {
  const s = norm.replace(/^\d+\s*-\s*/, "").replace(/-/g, " ").trim();
  return s ? s[0].toUpperCase() + s.slice(1) : norm;
}
function parseOrder(norm: string) {
  const m = norm.match(/^(\d+)/);
  return m ? Number(m[1]) : undefined;
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}
async function safeStat(dir: string) {
  try { return await fs.stat(dir); } catch { return null; }
}

type MediaIdxEntry = { url: string; rel: string; ext: string };

async function indexMedia(dirFs: string, exts: string[], verbose = false) {
  const dir = toPosix(dirFs); // важно для Windows
  const patterns = exts.map((e) => `${dir}/**/*${e}`);
  const files = await fg(patterns, { dot: false, caseSensitiveMatch: false });
  const map = new Map<string, MediaIdxEntry>(); // base -> {url, rel, ext}
  for (const f of files) {
    const base = normalizeBase(path.basename(f));
    const url = stripPublic(f); // "/media/…"
    // rel от папки курса: audio/filename.ext или video/filename.ext
    const rel = toPosix(path.relative(dir, f)); // e.g. "01-xxx.mp3"
    const sub = dir.endsWith("/audio") ? "audio" : "video";
    map.set(base, { url, rel: `${sub}/${rel}`, ext: path.extname(f).toLowerCase() });
  }
  if (verbose) {
    console.log(`  · indexMedia(${nameOf(dir)}): ${files.length} files`);
    if (files.length === 0) console.log(`    pattern sample: ${patterns[0]}`);
  }
  return map;
}

async function syncCourse(subject: string, course: string, dry = false, verbose = false) {
  const mediaRoot   = path.join(PUBLIC_MEDIA_ROOT, subject, course);
  const lessonsRoot = path.join(CONTENT_LESSONS_ROOT, subject, course);

  const audioDir = path.join(mediaRoot, "audio");
  const videoDir = path.join(mediaRoot, "video");

  const audioExists = Boolean(await safeStat(audioDir));
  const videoExists = Boolean(await safeStat(videoDir));

  if (verbose) {
    console.log(`\n[scan] ${subject}/${course}`);
    console.log(`  paths: ${toPosix(audioDir)} | ${toPosix(videoDir)}`);
    console.log(`  exists: audio=${audioExists} video=${videoExists}`);
  }

  if (!audioExists && !videoExists) {
    if (verbose) console.log("  skip: no audio/ no video");
    return { created: 0, updated: 0, skipped: 0, audioCount: 0, videoCount: 0 };
  }

  const audioIdx = audioExists ? await indexMedia(audioDir, AUDIO_EXTS, verbose) : new Map<string, MediaIdxEntry>();
  const videoIdx = videoExists ? await indexMedia(videoDir, VIDEO_EXTS, verbose) : new Map<string, MediaIdxEntry>();

  await ensureDir(lessonsRoot);

  const mdFiles = await fg(toPosix(`${lessonsRoot}/*.md`), { caseSensitiveMatch: false });
  const mdByBase = new Map<string, string>(); // base -> md path
  for (const f of mdFiles) {
    mdByBase.set(normalizeBase(path.basename(f)), f);
  }

  const keys = new Set<string>([...audioIdx.keys(), ...videoIdx.keys(), ...mdByBase.keys()]);

  let created = 0, updated = 0, skipped = 0;

  for (const key of keys) {
    const a = audioIdx.get(key) || null;
    const v = videoIdx.get(key) || null;
    const hasAudio = Boolean(a);
    const hasVideo = Boolean(v);
    const mdPath = mdByBase.get(key);

    if (!mdPath) {
      const order = parseOrder(key) ?? 1;
      const title = humanizeTitle(key);
      const data: Record<string, any> = {
        title,
        order,
        hasAudio,
        hasVideo,
      };
      if (a) { data.audio = a.url; data.audioRel = a.rel; }
      if (v) { data.video = v.url; data.videoRel = v.rel; }

      const content = `# ${title}\n\nКонспекта урока не существует.`;
      const out = matter.stringify(content, data);
      const outPath = path.join(lessonsRoot, `${key}.md`);
      if (verbose) console.log(`  + create ${toPosix(path.relative(process.cwd(), outPath))}`);
      if (!dry) await fs.writeFile(outPath, out, "utf8");
      created++;
      continue;
    }

    const raw = await fs.readFile(mdPath, "utf8");
    const parsed = matter(raw);
    let changed = false;

    // title/order
    if (parsed.data.order == null) { const o = parseOrder(key); if (o != null) { parsed.data.order = o; changed = true; } }
    if (!parsed.data.title) { parsed.data.title = humanizeTitle(key); changed = true; }

    // hasAudio / hasVideo (всегда приводим к актуальному состоянию)
    if (parsed.data.hasAudio !== hasAudio) { parsed.data.hasAudio = hasAudio; changed = true; }
    if (parsed.data.hasVideo !== hasVideo) { parsed.data.hasVideo = hasVideo; changed = true; }

    // абсолютные URL и относительные пути (если есть файлы)
    if (a) {
      if (parsed.data.audio !== a.url)     { parsed.data.audio = a.url; changed = true; }
      if (parsed.data.audioRel !== a.rel)  { parsed.data.audioRel = a.rel; changed = true; }
    } else {
      // при отсутствии файла оставляем старые audio/audioRel как есть или чистим? обычно лучше **не трогать**,
      // но если хочешь чистить — раскомментируй:
      // if (parsed.data.audio)    { delete parsed.data.audio; changed = true; }
      // if (parsed.data.audioRel) { delete parsed.data.audioRel; changed = true; }
    }
    if (v) {
      if (parsed.data.video !== v.url)     { parsed.data.video = v.url; changed = true; }
      if (parsed.data.videoRel !== v.rel)  { parsed.data.videoRel = v.rel; changed = true; }
    } else {
      // см. комментарий выше
      // if (parsed.data.video)    { delete parsed.data.video; changed = true; }
      // if (parsed.data.videoRel) { delete parsed.data.videoRel; changed = true; }
    }

    if (changed) {
      const out = matter.stringify(parsed.content, parsed.data);
      if (verbose) console.log(`  ~ update ${toPosix(path.relative(process.cwd(), mdPath))}`);
      if (!dry) await fs.writeFile(mdPath, out, "utf8");
      updated++;
    } else {
      skipped++;
    }
  }

  return { created, updated, skipped, audioCount: audioIdx.size, videoCount: videoIdx.size };
}

async function main() {
  const { dry, verbose, subject: onlySubject, course: onlyCourse } = parseArgs();

  const pairDirs = await fg(toPosix(`${PUBLIC_MEDIA_ROOT}/*/*`), {
    onlyDirectories: true, deep: 2, caseSensitiveMatch: false
  });
  const pairs = pairDirs
    .map((p) => toPosix(p).split("/").slice(-2)) // [subject, course]
    .filter(([s, c]) => (!onlySubject || s === onlySubject) && (!onlyCourse || c === onlyCourse));

  if (!pairs.length) {
    console.log("Не найдены public/media/<subject>/<course>. Запусти из корня проекта и проверь пути.");
    return;
  }

  console.log(`Курсов найдено: ${pairs.length}${dry ? " (dry-run)" : ""}${verbose ? " [verbose]" : ""}`);

  let C=0, U=0, S=0, A=0, V=0;
  for (const [subject, course] of pairs) {
    const res = await syncCourse(subject, course, dry, verbose);
    C += res.created; U += res.updated; S += res.skipped; A += res.audioCount; V += res.videoCount;
    console.log(`[OK] ${subject}/${course}: audio=${res.audioCount}, video=${res.videoCount} → +${res.created}, ~${res.updated}, =${res.skipped}`);
  }

  console.log(`\nSummary${dry ? " (dry-run)" : ""}:
  Audio files seen: ${A}
  Video files seen: ${V}
  Created .md:      ${C}
  Updated .md:      ${U}
  Unchanged .md:    ${S}
  `);
}

main().catch((e) => { console.error(e); process.exit(1); });
