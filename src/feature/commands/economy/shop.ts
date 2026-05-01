import TXCommand from "../../../core/command/TXCommand.js";
import instance from "../../../instance.js";
import Users, { queryUser } from "../../../core/database/model/Users.js";
import { initializeUser } from "../../utils/database/initializeUser.js";
import TXItemInventory from "../../../core/item-manager/TXItemInventory.js";
import { TXIContext } from "../../../core/context/TXContext.js";
import TXAdapterBuilder from "../../../core/adapter/TXAdapterBuilder.js";
import { TXIItemDependency } from "../../../types/TXICommand.js";
import mongoose from "mongoose";

const COMMANDS_PER_PAGE = 4;
const ITEMS_PER_PAGE = 4;
const DOT_WINDOW = 5;
const DOT_THRESHOLD = 6;

interface ShopEntry {
  name: string;
  description: string;
  price?: number;
  requiredLevel?: number;
  requiredTotalExp?: number;
  itemDependency?: Array<TXIItemDependency>;
}

export default new TXCommand({
  name: "shop",
  description: "Buy items and commands from the shop",
  usage: "shop <commands | items> (--page=<page number>)",
  aliases: ["store", "buy"],
  cooldown: 5_000,
  minimumArguments: 1,
  minimumGroupedArguments: 0,
  minimumMentions: 0,
  usedStringFlags: ["page"],
  execute: async (ctx, { adapter, args, stringFlags }) => {
    const category = args[0].toLowerCase();
    const name = args[1];

    const parsePage = () => {
      const raw = stringFlags?.["page"];
      const parsed = raw ? parseInt(raw, 10) : NaN;
      return !isNaN(parsed) && parsed >= 1 ? parsed : 1;
    };

    switch (category) {
      case "commands":
        await (name
          ? buyCommand(ctx, adapter, name)
          : adapter.reply(ctx, generateShopMenu("commands", parsePage())));
        break;

      case "items":
        // TODO: add a better way to store items
        await adapter.reply(
          ctx,
          "⚒️ Item shop is under construction — Wait for the next update 🚧",
        );
        return;
      // await (name
      //   ? buyItem(ctx, adapter, name)
      //   : adapter.reply(ctx, generateShopMenu("items", parsePage())));
      // break;

      default:
        await adapter.reply(
          ctx,
          "❓ Unknown category. Try `/shop commands` or `/shop items`.",
        );
    }
  },
});

async function buyItem(
  ctx: TXIContext,
  adapter: TXAdapterBuilder,
  name: string,
): Promise<void> {
  const item = instance.getItemManager().getItem(name);

  if (!item) {
    await adapter.reply(ctx, `❌ Item \`${name}\` wasn't found in the shop.`);
    return;
  }

  await runPurchase(ctx, adapter, name, "item", item);
}

async function buyCommand(
  ctx: TXIContext,
  adapter: TXAdapterBuilder,
  name: string,
): Promise<void> {
  const cmd = instance.getItemManager().getCommand(name);

  if (!cmd?.shopInfo) {
    await adapter.reply(
      ctx,
      `❌ Command \`${name}\` wasn't found in the shop.`,
    );
    return;
  }

  const { price, itemDependency, requiredLevel, requiredTotalExp } =
    cmd.shopInfo!;
  await runPurchase(ctx, adapter, name, "command", {
    name: cmd.name,
    description: cmd.description,
    price,
    itemDependency,
    requiredLevel,
    requiredTotalExp,
  });
}

async function runPurchase(
  ctx: TXIContext,
  adapter: TXAdapterBuilder,
  name: string,
  kind: "item" | "command",
  entry: ShopEntry,
): Promise<void> {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      await initializeUser(ctx);

      const userData = await Users.findOne(
        queryUser(ctx.platform, ctx.author.id),
      ).session(session);

      if (!userData?.economy) return;

      const {
        price = 0,
        requiredLevel = 0,
        requiredTotalExp = 0,
        itemDependency = [],
      } = entry;

      const { economy } = userData;
      const inventory = TXItemInventory.hydrateInventory(userData.inventory);

      if (kind === "command" && inventory.hasCommand(name)) {
        await adapter.reply(ctx, `✅ You already own the \`${name}\` command!`);
        return;
      }

      if (economy.coins < price) {
        await adapter.reply(
          ctx,
          `🪙 You need ${price} coins to buy \`${name}\`, but you only have ${economy.coins}.\nEarn more coins and come back!`,
        );
        return;
      }

      if (economy.level < requiredLevel) {
        await adapter.reply(
          ctx,
          `📈 \`${name}\` requires Level ${requiredLevel}, but you're only Level ${economy.level}.\nKeep leveling up!`,
        );
        return;
      }

      if (economy.totalExp < requiredTotalExp) {
        await adapter.reply(
          ctx,
          `⭐ \`${name}\` requires ${requiredTotalExp} EXP, but you only have ${economy.totalExp}.\nKeep grinding!`,
        );
        return;
      }

      if (itemDependency.length > 0) {
        const unmetCommands = itemDependency
          .filter(
            (dep): dep is { commandName: string } =>
              "commandName" in dep &&
              !inventory.hasCommand(
                (dep as { commandName: string }).commandName,
              ),
          )
          .map((dep) => dep.commandName);

        const unmetItems = itemDependency
          .filter(
            (dep): dep is { itemName: string } =>
              "itemName" in dep &&
              !inventory.hasItem((dep as { itemName: string }).itemName),
          )
          .map((dep) => dep.itemName);

        if (unmetCommands.length > 0 || unmetItems.length > 0) {
          await adapter.reply(
            ctx,
            formatDependencyError(name, unmetCommands, unmetItems),
          );
          return;
        }
      }

      const confirmation = await adapter.reply(
        ctx,
        formatPurchaseConfirmation(name, price, kind),
      );
      const response = await confirmation.waitReply({
        filter: (msg) => msg.author.id === ctx.author.id,
        timeout: 60_000,
      });

      if (!response || response.context.content.toLowerCase() !== "yes") {
        if (response) {
          await adapter.reply(
            ctx,
            "🚫 Purchase cancelled. No coins were spent.",
          );
        }
        return;
      }

      economy.coins -= price;
      kind === "item" ? inventory.addItem(name) : inventory.addCommand(name);
      await userData.save({ session });

      const successLabel = kind === "item" ? "item" : "command";
      const successSuffix =
        kind === "item" ? "Enjoy your new item." : "Enjoy your new power.";
      await adapter.reply(
        ctx,
        `🎉 You unlocked the \`${name}\` ${successLabel}! ${successSuffix}`,
      );
    });
  } finally {
    session.endSession();
  }
}

function generateShopMenu(
  category: "commands" | "items",
  page: number,
): string {
  const { pages, totalPages } =
    category === "commands" ? paginateShopCommands() : paginateShopItems();

  const label = category === "commands" ? "Commands" : "Items";
  const clampedPage = Math.min(Math.max(page, 1), totalPages);
  const pageContent =
    pages[clampedPage - 1] ??
    `No ${category} are available for sale right now.`;

  return [
    `‗   ↳ ❝ [ Shop: ${label} ] ¡! ❞`,
    `ೃ⁀➷ Browse and unlock new ${category} below`,
    "         ◇─◇───◇─◇",
    "",
    pageContent,
    "",
    formatPageIndicator(clampedPage, totalPages),
    "",
    `𓆩⟡𓆪 \`/shop ${category} <name>\` to buy`,
    `𓆩⟡𓆪 \`/shop ${category} --page=<number>\` to browse`,
  ].join("\n");
}

function paginateEntries(
  entries: ShopEntry[],
  perPage: number,
  listLabel: string,
): { pages: string[]; totalPages: number } {
  const pages: string[] = [];
  let current: string[] = [];

  entries.forEach((entry, i) => {
    const {
      price = 0,
      requiredLevel = 0,
      requiredTotalExp = 0,
      itemDependency = [],
    } = entry;

    if (current.length === 0) current.push(`╭┈ ${listLabel} : ̗̀➛`);

    const meta = [
      `🪙 ${price}`,
      requiredLevel > 0 ? `Lv${requiredLevel}+` : null,
      requiredTotalExp > 0 ? `${requiredTotalExp} EXP` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    current.push(`┊ ${i + 1}. ${entry.name} — ${meta}`);
    current.push(`┊    ↳ ${entry.description}`);

    if (itemDependency.length > 0) {
      const deps = itemDependency
        .map((dep) =>
          "commandName" in dep
            ? `cmd:${dep.commandName}`
            : `item:${dep.itemName}`,
        )
        .join(", ");
      current.push(`┊    needs: ${deps}`);
    }

    const isPageFull = (i + 1) % perPage === 0;
    const isLast = i === entries.length - 1;

    if ((isPageFull && !isLast) || isLast) {
      current.push("╰─────────┈➤");
      pages.push(current.join("\n"));
      current = [];
    } else {
      current.push("┊ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄");
    }
  });

  return { pages, totalPages: pages.length };
}

function paginateShopItems() {
  const items = instance.getItemManager().getAllSellableItems();
  return paginateEntries(items, ITEMS_PER_PAGE, "available items");
}

function paginateShopCommands() {
  const cmds = instance.getItemManager().getAllSellableCommands();
  const entries: ShopEntry[] = cmds.map((cmd) => ({
    name: cmd.name,
    description: cmd.description,
    ...cmd.shopInfo,
  }));
  return paginateEntries(entries, COMMANDS_PER_PAGE, "available commands");
}

function formatPageIndicator(current: number, total: number): string {
  return `┊ ${buildDots(current, total)}  [ ${current} / ${total} ]`;
}

function buildDots(current: number, total: number): string {
  if (total <= DOT_THRESHOLD) {
    return Array.from({ length: total }, (_, i) =>
      i + 1 === current ? "◆" : "◇",
    ).join(" ");
  }

  const half = Math.floor(DOT_WINDOW / 2);
  let start = Math.max(1, current - half);
  let end = start + DOT_WINDOW - 1;

  if (end > total) {
    end = total;
    start = Math.max(1, end - DOT_WINDOW + 1);
  }

  const dotRow = Array.from({ length: end - start + 1 }, (_, i) =>
    start + i === current ? "◆" : "◇",
  ).join(" ");

  const leftLabel = start > 1 ? `${start} ` : "";
  const rightLabel = end < total ? ` ${end}` : "";

  return `${leftLabel}${dotRow}${rightLabel}`;
}

function formatPurchaseConfirmation(
  name: string,
  price: number,
  kind: "item" | "command",
): string {
  const label = kind === "item" ? "Item    " : "Command";
  return [
    `‗   ↳ ❝ [ Shop: Confirm Purchase ] ¡! ❞`,
    `ೃ⁀➷ You're about to buy the following ${kind}`,
    "         ◇─◇───◇─◇",
    "",
    "╭┈ purchase details : ̗̀➛",
    `┊ ${label}  ›  ${name}`,
    `┊ Price    ›  🪙 ${price} coins`,
    "╰─────────┈➤",
    "",
    "𓆩⟡𓆪 Reply `yes` to confirm, or anything else to cancel",
  ].join("\n");
}

function formatDependencyError(
  name: string,
  unmetCommands: string[],
  unmetItems: string[],
): string {
  const rows: string[] = ["╭┈ missing dependencies : ̗̀➛"];

  if (unmetCommands.length > 0)
    rows.push(`┊ commands: ${unmetCommands.map((c) => `'${c}'`).join(", ")}`);

  if (unmetItems.length > 0)
    rows.push(`┊ items: ${unmetItems.map((i) => `'${i}'`).join(", ")}`);

  rows.push("╰─────────┈➤");

  const allMissing = [
    ...unmetCommands.map((c) => `\`${c}\``),
    ...unmetItems.map((i) => `\`${i}\``),
  ].join(", ");

  return [
    "‗   ↳ ❝ [ Shop: Missing Requirements ] ¡! ❞",
    `ೃ⁀➷ You can't buy \`${name}\` yet!`,
    "         ◇─◇───◇─◇",
    "",
    rows.join("\n"),
    "",
    `𓆩⟡𓆪 Purchase ${allMissing} first`,
  ].join("\n");
}
