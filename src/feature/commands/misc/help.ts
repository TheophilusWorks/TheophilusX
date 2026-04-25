import TXCommand from "../../../core/command/TXCommand.js";
import { TXIContext } from "../../../core/context/TXContext.js";
import instance from "../../../instance.js";
import { initializeUser } from "../../utils/database/initializeUser.js";
import Users, { queryUser } from "../../../core/database/model/Users.js";
import TXItemInventory from "../../../core/item-manager/TXItemInventory.js";

const COMMANDS_PER_PAGE = 10;
const DOT_WINDOW = 5;
const DOT_THRESHOLD = 6; // use windowed dots when total pages exceed this

// typed tokens — same idea as eof/sentinel tokens in a parser,
// lets us avoid stringly-typed hacks like "__CAT__" prefixes
type HelpLine =
  | { kind: "header"; category: string }
  | { kind: "command"; text: string };

export default new TXCommand({
  name: "help",
  description: "Shows the help menu",
  usage: "help (page index) (--cmd=<command name>) (--page=<page number>)",
  minimumArguments: 0,
  cooldown: 10_000, // 10s
  minimumGroupedArguments: 0,
  aliases: ["h"],
  usedStringFlags: ["cmd", "page"],
  minimumMentions: 0,
  execute: async (ctx, { adapter, args, stringFlags }) => {
    await initializeUser(ctx);
    let userData = await Users.findOne(queryUser(ctx.platform, ctx.author.id));

    // unreachable if initializeUser works correctly, but just in case
    if (!userData) return;

    let buffer: string;
    let cmdName = stringFlags?.["cmd"];
    if (cmdName) {
      let cmd = instance.getCommand(cmdName);
      if (!cmd || cmd.blacklistedPlatform?.includes(ctx.platform)) {
        adapter.reply(ctx, `Command "${cmdName}" not found.`);
        return;
      }
      let isOwned = userData.inventory.commands.includes(cmd.name) ?? false;
      buffer = inspectCommand(cmd, isOwned);
    } else {
      // --page flag takes priority over positional arg
      const rawPage = stringFlags?.["page"] ?? args?.[0];
      const parsed = rawPage ? parseInt(rawPage, 10) : 1;
      const page = isNaN(parsed) || parsed < 1 ? 1 : parsed;

      let inventory = TXItemInventory.hydrateInventory(userData.inventory);
      buffer = generateHelpMenu(ctx, page, inventory);
    }

    adapter.reply(ctx, buffer);
  },
});

function inspectCommand(cmd: TXCommand, isOwned: boolean): string {
  let alias = "None";
  if (cmd.aliases && cmd.aliases.length > 0) {
    alias = cmd.aliases.join(" | ");
  }
  let msg = `
╭┈─ ${cmd.name} ◌ೄˊˎ
┊ Description: ${cmd.description}
┊ Category: ${cmd.category || "Uncategorized"}
┊ Usage: ${cmd.usage}
┊ Is Owned: ${isOwned ? "Yes" : "No"}
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

  if (!isOwned) {
    msg += `

𓆩⟡𓆪 Type \`/shop commands ${cmd.name}\` to buy and unlock this command
`;
  }
  return msg.trim();
}

function generateHelpMenu(
  ctx: TXIContext,
  page: number,
  inventory: TXItemInventory,
): string {
  const { pages, totalPages } = paginateCommands(ctx, inventory);

  // clamp to valid range
  if (page > totalPages) page = totalPages;

  const pageContent = pages[page - 1] ?? "";
  const pageIndicator = formatPageIndicator(page, totalPages);

  return `
‗   ↳ ❝ [ Commands ] ¡! ❞
ೃ⁀➷ Here are the list of all available commands:
         ◇─◇───◇─◇

${pageContent}
┊
${pageIndicator}

𓆩⟡𓆪 Type \`%help <page>\` to turn pages or \`%help --cmd=<name>\` to inspect a command
𓆩⟡𓆪 Type \`%shop commands <command name>\` to buy and unlock a command
`.trim();
}

function formatPageIndicator(current: number, total: number): string {
  let dots: string;

  if (total <= DOT_THRESHOLD) {
    // show all dots when pages are few enough
    dots = Array.from({ length: total }, (_, i) =>
      i + 1 === current ? "◆" : "◇",
    ).join(" ");
  } else {
    // windowed mode — 5 dots centered around current page
    const half = Math.floor(DOT_WINDOW / 2);
    let start = Math.max(1, current - half);
    let end = start + DOT_WINDOW - 1;

    // clamp end, then shift start back if we overshot
    if (end > total) {
      end = total;
      start = Math.max(1, end - DOT_WINDOW + 1);
    }

    const dotRow = Array.from({ length: end - start + 1 }, (_, i) =>
      start + i === current ? "◆" : "◇",
    ).join(" ");

    const leftLabel = start > 1 ? `${start} ` : "";
    const rightLabel = end < total ? ` ${end}` : "";
    dots = `${leftLabel}${dotRow}${rightLabel}`;
  }

  return `├┈ page navigation ◌ೄˊˎ\n┊ ${dots}\n╰──────┈➤ ❝ [ Page ${current} ]`;
}

// NOTE: I think its ok to recalculate this everytime the help command is called
// since the number of commands is not likely to be very large. if
// it becomes a performance issue, we can consider caching the sorted commands
// and only recalculating when commands are added/removed.
// plus we lowkey need a delay lol
function paginateCommands(
  ctx: TXIContext,
  inventory: TXItemInventory,
): {
  pages: string[];
  totalPages: number;
} {
  const categories: Record<string, TXCommand[]> = {};

  for (const cmd of instance.getCommands().values()) {
    if (cmd.blacklistedPlatform?.includes(ctx.platform)) continue;

    const category = cmd.category || "Uncategorized";

    if (!(category in categories)) {
      categories[category] = [];
    }

    categories[category].push(cmd);
  }

  // flatten into typed tokens
  const tokens: HelpLine[] = [];
  for (const [category, cmds] of Object.entries(categories)) {
    tokens.push({ kind: "header", category });
    for (let i = 0; i < cmds.length; i++) {
      let text = `┊ ${i + 1}. ${cmds[i].name}`;
      let isCmdForSale = cmds[i].shopInfo;
      if (isCmdForSale && !inventory.hasCommand(cmds[i].name)) {
        text += " <locked>";
      }
      tokens.push({ kind: "command", text });
    }
  }

  const pages: string[] = [];
  let current: string[] = [];
  let cmdCount = 0;
  let pendingHeader: string | null = null;
  let isFirstHeaderOnPage = true; // tracks whether to use ╭ or ├

  for (const token of tokens) {
    if (token.kind === "header") {
      pendingHeader = token.category;
    } else {
      if (pendingHeader) {
        const cap = isFirstHeaderOnPage ? "╭" : "├";
        current.push(`${cap}┈ ${pendingHeader} : ̗̀➛`);
        pendingHeader = null;
        isFirstHeaderOnPage = false;
      }
      current.push(token.text);
      cmdCount++;

      if (cmdCount >= COMMANDS_PER_PAGE) {
        pages.push(current.join("\n"));
        current = [];
        cmdCount = 0;
        isFirstHeaderOnPage = true; // reset for the next page
      }
    }
  }

  if (current.length > 0) pages.push(current.join("\n"));

  return { pages, totalPages: pages.length };
}
