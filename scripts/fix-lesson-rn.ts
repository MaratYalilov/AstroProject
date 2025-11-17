import fs from "fs/promises";
import path from "path";
import fg from "fast-glob";

const LESSONS_ROOT = "src/content/lessons";

type Args = { dry: boolean; verbose: boolean };

function parseArgs(): Args {
  const args: Args = { dry: false, verbose: false };
  for (const arg of process.argv.slice(2)) {
    if (arg === "--dry") args.dry = true;
    else if (arg === "--verbose" || arg === "-v") args.verbose = true;
  }
  return args;
}

const boundary = "[^0-9A-Za-z_-]";
const trailingPattern = new RegExp(`(^|${boundary})rn(?=\\r?\\n)`, "g");
const betweenPattern = new RegExp(
  `(^|${boundary})((?:rn)+)(?=$|${boundary})`,
  "g",
);

const blockKeyPattern = /^([ \t]*)([A-Za-z0-9_-]+):(.*)$/;

function computeIndent(str: string, offset: number) {
  const lastNewline = str.lastIndexOf("\n", offset - 1);
  const lineStart = lastNewline >= 0 ? lastNewline + 1 : 0;
  const line = str.slice(lineStart, offset);
  const match = line.match(/^[ \t]*/);
  return match ? match[0] : "";
}

function normalizeFrontMatterIndent(source: string) {
  const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
  const match = source.match(fmRegex);
  if (!match) return { content: source, changed: false };

  const body = match[1];
  const lines = body.split(/\r?\n/);
  let inScalar: { baseIndent: number } | null = null;
  let changed = false;

  const fixedLines = lines.map((line) => {
    const keyMatch = line.match(blockKeyPattern);
    if (keyMatch) {
      const [, indentStr, , rest] = keyMatch;
      const indentLength = indentStr.length;
      if (inScalar && indentLength > inScalar.baseIndent) {
        // treat as scalar content, fallthrough below
      } else {
        const trimmedRest = rest.trimStart();
        if (trimmedRest.startsWith("|") || trimmedRest.startsWith(">")) {
          inScalar = { baseIndent: indentLength };
        } else {
          inScalar = null;
        }
        return line;
      }
    }

    if (!inScalar) {
      return line;
    }

    const neededIndent = " ".repeat(inScalar.baseIndent + 2);
    const trimmed = line.replace(/^[ \t]*/, "");
    const nextLine = trimmed ? neededIndent + trimmed : neededIndent;
    if (nextLine !== line) changed = true;
    return nextLine;
  });

  if (!changed) {
    return { content: source, changed: false };
  }

  const newFrontMatter = `---\n${fixedLines.join("\n")}\n---`;
  const updated = source.replace(fmRegex, newFrontMatter);
  return { content: updated, changed: true };
}

function fixContent(source: string) {
  let changed = false;
  let next = source.replace(trailingPattern, (_, prefix: string) => {
    changed = true;
    return prefix;
  });

  next = next.replace(
    betweenPattern,
    (
      _: string,
      prefix: string,
      seq: string,
      offset: number,
      full: string,
    ) => {
      changed = true;
      const newlineCount = Math.max(1, Math.floor(seq.length / 2));
      const indent = computeIndent(full, offset);
      const newlineChunk = `\n${indent}`;
      return `${prefix}${newlineChunk.repeat(newlineCount)}`;
    },
  );

  const fmResult = normalizeFrontMatterIndent(next);
  if (fmResult.changed) {
    next = fmResult.content;
    changed = true;
  }

  return { content: next, changed };
}

async function main() {
  const { dry, verbose } = parseArgs();

  const files = await fg(`${LESSONS_ROOT}/**/*.md`, {
    dot: false,
    caseSensitiveMatch: false,
  });

  if (!files.length) {
    console.log("Не найдены файлы уроков для обработки.");
    return;
  }

  let touched = 0;

  for (const file of files) {
    const abs = path.resolve(file);
    const original = await fs.readFile(abs, "utf8");
    const { content, changed } = fixContent(original);
    if (!changed) continue;

    touched++;
    if (verbose) {
      console.log(
        `${dry ? "[dry] " : ""}чистим ${path.relative(process.cwd(), abs)}`,
      );
    }
    if (!dry) {
      await fs.writeFile(abs, content, "utf8");
    }
  }

  console.log(
    `Готово. Затронуто файлов: ${touched}${dry ? " (только просмотр)" : ""}.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
