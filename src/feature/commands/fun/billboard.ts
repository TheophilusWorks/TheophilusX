import TXCommand from "../../../core/command/TXCommand.js";
import fs from "fs/promises";
import path from "path";
import { fitText } from "../../../utils/fitText.js";
import { ensurePath } from "../../../utils/ensurePath.js";
import { getDirname } from "../../../utils/path.js";
import { text, mention } from "../../../core/message/TXMessageBuilder.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";

const __dirname = getDirname(import.meta.url);
const CACHE_DIR = path.resolve(__dirname, "../../../../cache");

export default new TXCommand({
  name: "billboard",
  aliases: ["bb"],
  description: "Write something on the billboard.",
  usage: "billboard <msg>",
  minimumArguments: 1,
  cooldown: 5_000,
  minimumGroupedArguments: 0,
  minimumMentions: 0,
  execute: async (ctx, { adapter, args }) => {
    const txt = args.join(" ");
    const filepath = await makeBillboard(txt);

    try {
      await adapter.reply(ctx, {
        parts: [
          text("Here's your billboard, "),
          mention(ctx.author.id, ctx.author.displayName),
        ],
        attachments: [filepath],
      });
    } finally {
      await fs.unlink(filepath);
    }
  },
});

async function makeBillboard(text: string): Promise<string> {
  await ensurePath(CACHE_DIR);

  const filename = `billboard_${crypto.randomUUID()}.png`;
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
