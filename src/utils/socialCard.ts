import sharp, { type OverlayOptions } from "sharp";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fontUrl from "../assets/social/NotoSans-Bold.ttf?url";
import logoSvg from "../assets/social/hutba-logo.svg?raw";

const icons = import.meta.glob<string>("/public/subject-icons/*.svg", {
  eager: true,
  query: "?raw",
  import: "default",
});

function findFont(): string {
  const directories = [process.cwd()];
  let directory = path.dirname(fileURLToPath(import.meta.url));
  // Also locate client assets when the server starts outside the project root.
  for (let i = 0; i < 4; i++) {
    directories.push(directory);
    directory = path.dirname(directory);
  }
  for (const root of directories) {
    for (const assets of ["", "dist/client", "client"]) {
      const font = path.resolve(root, assets, `.${fontUrl}`);
      if (existsSync(font)) return font;
    }
  }
  throw new Error("Social preview font NotoSans-Bold.ttf is missing from bundled assets");
}

let fontFile: string | undefined;
let logoPng: Promise<Buffer> | undefined;

function brandLogo(): Promise<Buffer> {
  return logoPng ??= sharp(Buffer.from(logoSvg), { density: 144 })
    .resize({ width: 420, height: 100, fit: "inside" })
    .png().toBuffer();
}
function escapeMarkup(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function textLayer(text: string, size: number, width: number, color: string) {
  fontFile ??= findFont();
  return sharp({
    text: {
      text: `<span foreground="${color}">${escapeMarkup(text)}</span>`,
      font: `Noto Sans Bold ${size}`,
      fontfile: fontFile,
      width,
      wrap: "word-char",
      spacing: 8,
      rgba: true,
      dpi: 72,
    },
  }).png().toBuffer({ resolveWithObject: true });
}

export interface SocialCard {
  title: string;
  subtitle: string;
  subject: string;
}

export async function renderSocialCard({ title, subtitle, subject }: SocialCard): Promise<Buffer> {
  const icon = icons[`/public/subject-icons/${subject}.svg`];
  const textWidth = icon ? 760 : 1040;
  let heading = await textLayer(title, 60, textWidth, "#17251b");
  for (const size of [52, 44, 36, 30, 24, 20]) {
    if (heading.info.height <= 260) break;
    heading = await textLayer(title, size, textWidth, "#17251b");
  }
  const brand = await brandLogo();
  let label = await textLayer(subtitle || "С 2010 года", 24, textWidth, "#65806b");
  for (const size of [22, 20, 18]) {
    if (label.info.height <= 60) break;
    label = await textLayer(subtitle, size, textWidth, "#65806b");
  }
  const footer = await textLayer("Ислам · Арабский язык · Коран", 22, 1000, "#65806b");
  const layers: OverlayOptions[] = [
    { input: brand, left: 80, top: 56 },
    { input: label.data, left: 80, top: 170 },
    { input: heading.data, left: 80, top: 240 },
    { input: footer.data, left: 80, top: 555 },
  ];
  if (icon) {
    const png = await sharp(Buffer.from(icon)).resize(176, 176, { fit: "contain" }).png().toBuffer();
    layers.push({ input: png, left: 944, top: 257 });
  }
  const background = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <rect width="1200" height="630" fill="#f7faf5"/>
    <rect width="1200" height="8" fill="#73b843"/>
    <path d="M80 525H1120" stroke="#dce8d5" stroke-width="2"/>
    ${icon ? '<rect x="912" y="225" width="240" height="240" rx="48" fill="#edf3e7"/>' : ''}
  </svg>`);
  return sharp(background).composite(layers).png().toBuffer();
}
