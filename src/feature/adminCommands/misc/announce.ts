import TXCommand from "../../../core/command/TXCommand.js";

export default new TXCommand({
  name: "announce",
  description: "announces your message",
  usage: "announce <message> {--tag=<tag>}",
  minimumArguments: 1,
  cooldown: 5_000, // 5s
  minimumGroupedArguments: 0,
  usedStringFlags: ["tag"],
  minimumMentions: 0,
  execute: async (ctx, { adapter, stringFlags, args }) => {
    let tag = stringFlags?.["tag"] ? stringFlags["tag"] : "admin";

    let msg = createAnnouncementMsg(args.join(" "), tag);
    await adapter.announce(ctx, msg);
  },
});

function createAnnouncementMsg(content: string, tag: string) {
  let buffer = content
    .split("\n")
    .map((c) => `┊ ${c}`)
    .join("\n");

  return `
╭┈─ 📢 Announcement ◌ೄˊˎ
${buffer}
╰──────┈➤ ❝ [ ${tag} ]
`.trim();
}
