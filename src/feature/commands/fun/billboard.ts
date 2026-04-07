import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import TXCommand from "../../../core/command/TXCommand";
import fs from "fs/promises";
import path from "path";
import { fitText } from "../../../utils/fitText";
import { ensurePath } from "../../../utils/ensurePath";

const CACHE_DIR = path.resolve(__dirname, "../../../../cache");

export default new TXCommand({
  name: "billboard",
  description: "Write something on the billboard.",
  usage: "billboard <msg>",
  minimumArguments: 1,
  cooldown: 5_000,
  minimumGroupedArguments: 0,
  execute: async ({ adapter, args }) => {
    const text = args.join(" ");
    const filepath = await makeBillboard(text);
    adapter.reply(filepath);
  },
});

GlobalFonts.registerFromPath(
  path.resolve(__dirname, "../../../../assets/Montserrat-Bold.ttf"),
  "Montserrat",
);

async function makeBillboard(text: string): Promise<string> {
  await ensurePath(CACHE_DIR);

  const filename = `billboard_${encodeURIComponent(text)}.png`;
  const filepath = path.join(CACHE_DIR, filename);

  try {
    await fs.access(filepath);
    return filepath;
  } catch {}

  const img = await loadImage(
    path.resolve(__dirname, "../../../../assets/billboard.png"),
  );
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");

  ctx.drawImage(img, 0, 0);

  const billboardX = img.width * 0.5;
  const billboardY = img.height * 0.5;
  const billboardW = img.width * 0.6;
  const billboardH = img.height * 0.35;

  const { lines, fontSize, lineHeight } = fitText({
    ctx,
    text,
    maxWidth: billboardW,
    maxHeight: billboardH,
    font: "bold {size}px Montserrat",
  });

  ctx.font = `bold ${fontSize}px Montserrat`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "black";

  const totalHeight = lines.length * lineHeight;
  const startY = billboardY - totalHeight / 2 + lineHeight / 2;

  lines.forEach((line, i) => {
    ctx.fillText(line, billboardX, startY + i * lineHeight);
  });

  const buffer = canvas.toBuffer("image/png");
  await fs.writeFile(filepath, buffer);
  return filepath;
}
