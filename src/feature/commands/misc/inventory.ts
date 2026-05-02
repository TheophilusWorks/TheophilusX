import TXCommand from "../../../core/command/TXCommand.js";
import TXItemInventory from "../../../core/item-manager/TXItemInventory.js";
import Users, { queryUser } from "../../../core/database/model/Users.js";
import { initializeUser } from "../../utils/database/initializeUser.js";

type TXCategory = "commands" | "items";

export default new TXCommand({
  name: "inventory",
  description: "View your inventory here!",
  usage: "inventory <commands | items>",
  minimumArguments: 1,
  cooldown: 15_000,
  minimumGroupedArguments: 0,
  aliases: ["inv"],
  minimumMentions: 0,
  execute: async (ctx, { adapter, args }) => {
    let category = args[0];

    await initializeUser(ctx);
    let user = await Users.findOne(queryUser(ctx.platform, ctx.author.id));

    // unreachable
    if (!user) return;
    let inv = TXItemInventory.hydrateInventory(user.inventory);
    await adapter.reply(
      ctx,
      showInventoryCategory(category as TXCategory, inv),
    );
    return;
  },
});

function showInventoryCategory(
  category: TXCategory,
  inv: TXItemInventory,
): string {
  let content =
    category == "commands" ? formatCmdCategory(inv) : formatItemCategory(inv);
  let buffer = `
‗   ↳ ❝ [ Inventory: ${category} ] ¡! ❞
ೃ⁀➷ Here are all of your ${category}
        ◇─◇───◇─◇

╭┈ ${category} : ̗̀➛
${content}
╰────────────┈➤

𓆩⟡𓆪 Type %shop ${category} and buy more ${category} :)
`;

  return buffer;
}

function formatCmdCategory(inv: TXItemInventory) {
  return (
    inv
      .getCommands()
      .map((v, i) => `┊ ${i + 1}. ${v}`)
      .join("\n") || "┊ No items found"
  );
}

function formatItemCategory(inv: TXItemInventory) {
  return (
    inv
      .getItems()
      .map((v, i) => `┊ ${i + 1}. ${v.itemName} — ${v.amount}`)
      .join("\n") || "┊ No items found"
  );
}
