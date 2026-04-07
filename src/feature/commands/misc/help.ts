import TXCommand from "../../../core/command/TXCommand.js";
import instance from "../../../instance.js";

export default new TXCommand({
  name: "help",
  description: "Shows the help menu",
  usage: "help (--cmd=<command name>) (--page=<page number>)",
  minimumArguments: 0,
  cooldown: 5_000, // 5s
  minimumGroupedArguments: 0,
  execute: async ({ adapter, stringFlags, context }) => {
    let buffer: string;

    let cmdName: string | undefined = stringFlags?.["cmd"];
    if (cmdName) {
      let cmd = instance.getCommand(cmdName);
      if (!cmd) return adapter.reply(context, `Command "${cmdName}" not found.`);

      buffer = inspectCommand(cmd);
    } else {
      buffer = generateHelpMenu();
    }

    adapter.reply(context, buffer);
  },
});

function inspectCommand(cmd: TXCommand): string {
  let alias = "None";
  if (cmd.aliases && cmd.aliases.length > 0) {
    alias = cmd.aliases.join(" | ");
  }
  return `
╭┈─ ${cmd.name} ◌ೄˊˎ
┊ Description: ${cmd.description}
┊ Category: ${cmd.category || "Uncategorized"}
┊ Usage: ${cmd.usage}
┊ Aliases: ${alias}
┊ Cooldown: ${cmd.cooldown / 1000}s
╰──────┈➤ ❝ [ Info ]
╭┈─ min arguments ◌ೄˊˎ
┊ Arguments: ${cmd.minimumArguments}
┊ Grouped Arguments: ${cmd.minimumGroupedArguments}
╰──────┈➤ ❝ [ Arguments ]
╭┈─ available flags ◌ೄˊˎ
┊ String flags: ${cmd.usedStringFlags?.join(" | ") || "None"}
┊ Boolean flags: ${cmd.usedBooleanFlags?.join(" | ") || "None"}
╰──────┈➤ ❝ [ Flags ]
`;
}

function generateHelpMenu() {
  return `
‗   ↳ ❝ [ Commands ] ¡! ❞
ೃ⁀➷ Here are the list of all available commands:
         ◇─◇───◇─◇

${sortCommandsByCategory()}

𓆩⟡𓆪 Type \`help --cmd=<command name>\` to inspect a command
`.trim();
}

// NOTE: I think its ok to recalculate this everytime the help command is called
// since the number of commands is not likely to be very large. I
// it becomes a performance issue, we can consider caching the sorted commands
// and only recalculating when commands are added/removed.
// Plus we lowkey need a delay lol
function sortCommandsByCategory() {
  let categories: Record<string, TXCommand[]> = {};
  let buffer = "";

  for (const cmd of instance.getCommands().values()) {
    let category = cmd.category || "Uncategorized";

    if (!(category in categories)) {
      categories[category] = [];
    }

    categories[category].push(cmd);
  }

  for (const [category, value] of Object.entries(categories)) {
    buffer += `╭┈ ${category} : ̗̀➛\n`;
    for (let i = 0; i < value.length; i++) {
      let cmd = value[i];
      buffer += `┊ ${i + 1}. ${cmd.name}\n`;
    }
    buffer += `╰─────────┈➤\n`;
  }

  return buffer.trim();
}
