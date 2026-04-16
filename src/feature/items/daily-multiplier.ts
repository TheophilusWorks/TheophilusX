import TXItemBuilder from "../../core/item-manager/TXItemBuilder.js";

export default new TXItemBuilder({
  name: "daily-multiplier",
  description: "Doubles your daily rewards (not stackable)",
  duration: null,
  expiresAt: null,
  levelRequirement: 1,
  totalExpRequirement: 0,
  price: 1000,
});
