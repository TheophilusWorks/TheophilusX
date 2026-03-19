import "dotenv/config";
import TheophilusX from "./core/TheophilusX";
import { TXToken } from "./core/TXToken";
import TXEventBus from "./core/TXEventBus";

let { DISCORD_TOKEN } = process.env;
let tokens: TXToken = {
  discord: DISCORD_TOKEN || "",
};

let eventBus = new TXEventBus();
export const instance = new TheophilusX(tokens, eventBus);
instance.run();
