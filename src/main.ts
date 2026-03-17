import TXCLIAdapter from "./adapters/TXCLIAdapter";
import TXClient from "./core/TXClient";
import TXEventBus from "./core/TXEventBus";

function main() {
  let eventBus = new TXEventBus();
  let cliAdapter = new TXCLIAdapter(eventBus, TXClient.createCLI());
  cliAdapter.connect();

  eventBus.on("message", (ctx) => {
    cliAdapter.sendMessage(ctx.changeContent(`Content: ${ctx.content}`));
  });
}

main();
