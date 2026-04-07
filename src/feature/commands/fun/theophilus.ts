import fs from "fs/promises";
import path from "path";
import TXCommand from "../../../core/command/TXCommand";
import { ensurePath } from "../../../utils/ensurePath";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { fitText } from "../../../utils/fitText";

const CACHE_DIR = path.resolve(__dirname, "../../../../cache/");

export default new TXCommand({
  name: "theophiluspost",
  aliases: ["tp", "theopost"],
  description: "Set the caption for theophilus's post.",
  usage: "theophilus <msg>",
  minimumArguments: 1,
  cooldown: 5_000,
  minimumGroupedArguments: 0,
  execute: async ({ adapter, args }) => {
    let text = args.join(" ");
    
    if(text.length > 450) {
      adapter.reply("caption is too long! Max 450 characters.");
      return
    }

    let filepath = await makeTheophilusPost(text);
    adapter.reply("Post generated!");
  },
});

async function makeTheophilusPost(text: string): Promise<string> {
  await ensurePath(CACHE_DIR);

  let filename = `theophilus_.png`;
  let filepath = path.join(CACHE_DIR, filename);

  // try {
  //   await fs.access(filepath);
  //   return filepath;
  // } catch {}

  const img = await loadImage(
    path.resolve(__dirname, "../../../../assets/theophilus-post.png"),
  );
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");

  ctx.drawImage(img, 0, 0);

  const postX = 20;
  const postY = img.height * 0.58; // where text starts vertically
  const postW = img.width * 0.88; // almost full width
  const postH = img.height * 0.1; // the actual available height in the post box

  const { lines, fontSize, lineHeight } = fitText({
    ctx,
    text,
    maxWidth: postW,
    maxHeight: postH,
    font: "{size}px Montserrat",
    minFontSize: 22,
    maxFontSize: 48,
  });

  ctx.font = `${fontSize}px Montserrat`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "black";

  const totalHeight = lines.length * lineHeight;
  const startY = postY - totalHeight / 2 + lineHeight / 2;

  lines.forEach((line, i) => {
    ctx.fillText(line, postX, startY + i * lineHeight);
  });

  const buffer = canvas.toBuffer("image/png");
  await fs.writeFile(filepath, buffer);
  return filepath;
}
