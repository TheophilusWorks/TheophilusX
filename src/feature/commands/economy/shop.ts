import TXCommand from "../../../core/command/TXCommand.js";
import instance from "../../../instance.js";
import Users, { queryUser } from "../../../core/database/model/Users.js";
import { initializeUser } from "../../utils/database/initializeUser.js";
import TXItemInventory from "../../../core/item-manager/TXItemInventory.js";
import { TXIContext } from "../../../core/context/TXContext.js";
import TXAdapterBuilder from "../../../core/adapter/TXAdapterBuilder.js";
import mongoose from "mongoose";

const COMMANDS_PER_PAGE = 4;
const DOT_WINDOW = 5;
const DOT_THRESHOLD = 6;

export default new TXCommand({
  name: "shop",
  description: "Buy items and commands from the shop",
  usage: "shop <commands | items> (name) (--page=<page number>)",
  aliases: ["store", "buy"],
  cooldown: 5_000,
  minimumArguments: 1,
  minimumGroupedArguments: 0,
  minimumMentions: 0,
  usedStringFlags: ["page"],
  execute: async (ctx, { adapter, args, stringFlags }) => {
    const category = args[0].toLowerCase();
    const name = args[1];

    switch (category) {
      case "commands": {
        if (!name) {
          const rawPage = stringFlags?.["page"];
          const parsed = rawPage ? parseInt(rawPage, 10) : NaN;
          const page = !isNaN(parsed) && parsed >= 1 ? parsed : 1;
          await adapter.reply(ctx, generateShopMenu(page));
        } else {
          await buyCommand(ctx, adapter, name);
        }
        break;
      }

      case "items": {
        await adapter.reply(
          ctx,
          "🔨 The item shop is under construction — check back in the next update!",
        );
        break;
      }

      default: {
        await adapter.reply(
          ctx,
          "❓ Unknown category. Try `/shop commands` or `/shop items`.",
        );
      }
    }
  },
});

async function buyCommand(
  ctx: TXIContext,
  adapter: TXAdapterBuilder,
  name: string,
): Promise<void> {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      await initializeUser(ctx);

      const userData = await Users.findOne(
        queryUser(ctx.platform, ctx.author.id),
      ).session(session);

      if (!userData?.economy) return;

      const cmd = instance.getItemManager().getCommand(name);

      if (!cmd?.shopInfo) {
        await adapter.reply(
          ctx,
          `❌ Command \`${name}\` wasn't found in the shop.`,
        );
        return;
      }

      const inventory = TXItemInventory.hydrateInventory(userData.inventory);

      if (inventory.hasCommand(name)) {
        await adapter.reply(ctx, `✅ You already own the \`${name}\` command!`);
        return;
      }

      const {
        price = 0,
        requiredLevel = 0,
        requiredTotalExp = 0,
        itemDependency = [],
      } = cmd.shopInfo;

      const { economy } = userData;

      if (economy.coins < price) {
        await adapter.reply(
          ctx,
          `🪙 You need **${price} coins** to buy \`${name}\`, but you only have **${economy.coins}**.\nEarn more coins and come back!`,
        );
        return;
      }

      if (economy.level < requiredLevel) {
        await adapter.reply(
          ctx,
          `📈 \`${name}\` requires **Level ${requiredLevel}**, but you're only **Level ${economy.level}**.\nKeep leveling up!`,
        );
        return;
      }

      if (economy.totalExp < requiredTotalExp) {
        await adapter.reply(
          ctx,
          `⭐ \`${name}\` requires **${requiredTotalExp} EXP**, but you only have **${economy.totalExp}**.\nKeep grinding!`,
        );
        return;
      }

      if (itemDependency.length > 0) {
        const unmetCommands = itemDependency
          .filter(
            (dep) =>
              "commandName" in dep && !inventory.hasCommand(dep.commandName),
          )
          .map((dep) => ("commandName" in dep ? dep.commandName : ""));

        const unmetItems = itemDependency
          .filter(
            (dep) => "itemName" in dep && !inventory.hasItem(dep.itemName),
          )
          .map((dep) => ("itemName" in dep ? dep.itemName : ""));

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
        formatBuyConfirmation(name, price),
      );
      const response = await confirmation.waitReply({
        filter: (msg) => msg.author.id === ctx.author.id,
        timeout: 60_000,
      });

      if (!response) return;

      if (response.context.content.toLowerCase() !== "yes") {
        await adapter.reply(ctx, "🚫 Purchase cancelled. No coins were spent.");
        return;
      }

      economy.coins -= price;
      inventory.addCommand(name);
      await userData.save({ session });

      await adapter.reply(
        ctx,
        `🎉 You unlocked the \`${name}\` command! Enjoy your new power.`,
      );
    });
  } finally {
    session.endSession();
  }
}

function generateShopMenu(page: number): string {
  const { pages, totalPages } = paginateShopCommands();

  const clampedPage = Math.min(Math.max(page, 1), totalPages);
  const pageContent =
    pages[clampedPage - 1] ?? "No commands are available for sale right now.";
  const pageIndicator = formatPageIndicator(clampedPage, totalPages);

  return `
‗   ↳ ❝ [ Shop: Commands ] ¡! ❞
ೃ⁀➷ Browse and unlock new commands below
         ◇─◇───◇─◇

${pageContent}
┊
${pageIndicator}

𓆩⟡𓆪 To buy a command, type \`/shop commands <name>\`
𓆩⟡𓆪 To change pages, type \`/shop commands --page=<number>\`
`.trim();
}

function paginateShopCommands(): { pages: string[]; totalPages: number } {
  const forSale = instance.getItemManager().getAllSellableCommands();
  const pages: string[] = [];
  let current: string[] = [];

  forSale.forEach((cmd, i) => {
    const {
      price = 0,
      requiredLevel = 0,
      requiredTotalExp = 0,
      itemDependency = [],
    } = cmd.shopInfo!;

    if (current.length === 0) {
      current.push("╭┈ available commands : ̗̀➛");
    }

    current.push(
      `┊ ${i + 1}. ${cmd.name} — 🪙 ${price} coins`,
      `┊    ↳ ${cmd.description}`,
      `┊    Level ${requiredLevel}+ · ${requiredTotalExp} EXP needed`,
    );

    if (itemDependency.length > 0) {
      const deps = itemDependency
        .map((dep) => {
          if ("commandName" in dep) return `cmd:${dep.commandName}`;
          if ("itemName" in dep) return `item:${dep.itemName}`;
        })
        .join(", ");
      current.push(`┊    Requires: ${deps}`);
    }

    const isPageFull = (i + 1) % COMMANDS_PER_PAGE === 0;
    const isLast = i === forSale.length - 1;

    if ((isPageFull && !isLast) || isLast) {
      current.push("╰─────────┈➤");
      pages.push(current.join("\n"));
      current = [];
    }
  });

  return { pages, totalPages: pages.length };
}

function formatPageIndicator(current: number, total: number): string {
  const dots = buildDots(current, total);
  return `├┈ page navigation ◌ೄˊˎ\n┊ ${dots}\n╰──────┈➤ ❝ [ Page ${current} ]`;
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

function formatBuyConfirmation(itemName: string, price: number): string {
  return `
‗   ↳ ❝ [ Shop: Confirm Purchase ] ¡! ❞
ೃ⁀➷ You're about to buy the following command
         ◇─◇───◇─◇

╭┈ purchase details : ̗̀➛
┊ Command  ›  ${itemName}
┊ Price    ›  🪙 ${price} coins
╰─────────┈➤

𓆩⟡𓆪 Reply \`yes\` to confirm, or anything else to cancel
`.trim();
}

function formatDependencyError(
  name: string,
  unmetCommands: string[],
  unmetItems: string[],
): string {
  const rows: string[] = ["╭┈ dependencies : ̗̀➛"];

  if (unmetCommands.length > 0) {
    rows.push(`┊ commands: ${unmetCommands.map((c) => `'${c}'`).join(", ")}`);
  }

  if (unmetItems.length > 0) {
    rows.push(`┊ items: ${unmetItems.map((i) => `'${i}'`).join(", ")}`);
  }

  rows.push("╰─────────┈➤");

  const allMissing = [
    ...unmetCommands.map((c) => `\`${c}\``),
    ...unmetItems.map((i) => `\`${i}\``),
  ].join(", ");

  return `
‗   ↳ ❝ [ Shop: Confirm Purchase ] ¡! ❞
ೃ⁀➷ You can't buy \`${name}\` yet! You haven't bought the required items yet.
         ◇─◇───◇─◇

${rows.join("\n")}

𓆩⟡𓆪 Purchase ${allMissing} first
`.trim();
}
