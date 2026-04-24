import TXAdapterBuilder from "../../core/adapter/TXAdapterBuilder.js";
import { TXIContext, TXPlatform } from "../../core/context/TXContext.js";
import TXEventBuilder from "../../core/event/TXEventBuilder.js";

const MESSAGES = [
  "He's busy, call my owner later ;)",
  "What do you want from my handsome owner? Do you wanna suck his dick or something?",
  "Hey, thats my owner! :)",
  "Don't call my owner, he's probably fixing a bug right now",
  "Ahhh yes, THE BIG DICK THEOPHILUS!!",
  "Yep, that's my handsome owner right there :⁫3",
  "You better not talk shit about my hot and handsome owner!",
];

const THEO_TRIGGERS = ["theophilus", "theo"];

const COOLDOWN_SERVERS = new Map<string, number>();
const COOLDOWN_DURATION = 20_000;

export default new TXEventBuilder(
  "messageCreate",
  async (ctx: TXIContext, adapter: TXAdapterBuilder) => {
    if (!isTheoTrigger(ctx.content)) return;

    const key = `${ctx.platform}:${ctx.serverId}:${ctx.channelId}`;
    const cd = COOLDOWN_SERVERS.get(key) ?? 0;
    if (cd > Date.now()) return;

    const randomMsg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
    await adapter.reply(ctx, randomMsg);

    COOLDOWN_SERVERS.set(key, Date.now() + COOLDOWN_DURATION);
    setTimeout(() => COOLDOWN_SERVERS.delete(key), COOLDOWN_DURATION);
  },
);

function isTheoTrigger(msg: string): boolean {
  const words = msg.toLowerCase().split(/\s+/);
  return words.some((word) =>
    THEO_TRIGGERS.some((trigger) => word.startsWith(trigger)),
  );
}
