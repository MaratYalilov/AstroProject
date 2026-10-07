import { statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
function publicRoots(): string[] {
  const directories = [process.cwd()];
  let directory = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 4; i++) {
    directories.push(directory);
    directory = path.dirname(directory);
  }
  return [...new Set(directories.flatMap(root =>
    ["public", "dist/client", "client"].map(assets => path.resolve(root, assets)),
  ))];
}

function mediaRoots(): string[] {
  const serverMedia = process.env.HUTBA_MEDIA_ROOT
    || (process.platform === "linux" ? "/srv/hutba/assets/media" : undefined);
  return [...new Set([
    ...(serverMedia && path.isAbsolute(serverMedia) ? [path.resolve(serverMedia)] : []),
    ...publicRoots().map(root => path.join(root, "media")),
  ])];
}

function existingThumbnail(video?: string | null): string | undefined {
  if (!video?.startsWith("/media/")) return undefined;
  let pathname: string;
  try {
    pathname = decodeURIComponent(new URL(video, "https://hutba.org").pathname);
  } catch {
    return undefined;
  }
  if (!pathname.startsWith("/media/") || pathname.includes("\\")) return undefined;
  const thumbnail = pathname.replace(/\/video\/([^/]+)\.(mp4|webm|mov)$/i, "/thumbs/$1.jpg");
  if (thumbnail === pathname) return undefined;

  for (const root of mediaRoots()) {
    const file = path.resolve(root, thumbnail.slice("/media/".length));
    if (!file.startsWith(`${root}${path.sep}`)) continue;
    try {
      if (statSync(file).isFile()) return thumbnail;
    } catch {
      // No poster in this asset directory; try another root or use the fallback.
    }
  }
  return undefined;
}

export function getLessonPreviewImage(
  image: string | undefined,
  video: string | null | undefined,
  fallback?: string,
): string | undefined {
  return image ?? existingThumbnail(video) ?? fallback;
}
