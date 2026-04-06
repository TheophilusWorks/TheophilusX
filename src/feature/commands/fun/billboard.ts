import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import TXCommand from "../../../core/command/TXCommand";
import fs from "fs/promises";
import path from "path";

const CACHE_DIR = path.resolve(__dirname, "../../../../cache");

GlobalFonts.registerFromPath(
  path.resolve(__dirname, "../../../../assets/Montserrat-Bold.ttf"),
  "Montserrat",
);

async function makeBillboard(text: string): Promise<Buffer> {
  const filename = `billboard_${encodeURIComponent(text)}.png`;
  const filepath = path.join(CACHE_DIR, filename);

  const img = await loadImage(
    path.resolve(__dirname, "../../../../assets/billboard.png"),
  );
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");

  ctx.drawImage(img, 0, 0);

  const billboardX = img.width * 0.5;
  const billboardY = img.height * 0.37;
  const billboardW = img.width * 0.7;

  let fontSize = 120;
  while (fontSize > 20) {
    ctx.font = `bold ${fontSize}px Montserrat`;
    if (ctx.measureText(text).width <= billboardW) break;
    fontSize -= 2;
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "black";
  ctx.fillText(text, billboardX, billboardY);

  const buffer = canvas.toBuffer("image/png");
  await fs.writeFile(filepath, buffer);
  return buffer;
}

export default new TXCommand({
  name: "billboard",
  description: "Write something on the billboard.",
  usage: "billboard <msg>",
  minimumArguments: 1,
  cooldown: 5_000,
  minimumGroupedArguments: 0,
  execute: async ({ adapter, args }) => {
    const text = args.join(" ");
    const buffer = await makeBillboard(text);
    adapter.reply("Image created!");
  },
});
