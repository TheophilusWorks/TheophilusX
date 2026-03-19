import "dotenv/config";
import createDiscordAdapter from "./adapters/discordAdapter";
import createCLIAdapter from "./adapters/TXCLIAdapter";
import TXClient from "./core/TXClient";
import TXEventBus from "./core/TXEventBus";

async function main() {
  let eventBus = new TXEventBus();
  let cliAdapter = createCLIAdapter(eventBus);
  let discordClient = await TXClient.createDiscord(
    process.env.DISCORD_TOKEN || "",
  );
  let discordAdapter = createDiscordAdapter(discordClient, eventBus);
  await discordAdapter.connect();
  cliAdapter.connect();

  eventBus.on("message", (ctx) => {
    console.log(`Received message: ${JSON.stringify(ctx, null, 2)}`);
  });

  eventBus.on("command", (ctx, command) => {
    console.log("Received command!");
    console.log(`Context: ${JSON.stringify(ctx, null, 2)}`);
    console.log(`Command context: ${JSON.stringify(command, null, 2)}`);
  });
}

main();
