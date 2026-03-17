import TXCLIAdapter from "./adapters/TXCLIAdapter";
import TXEventBus from "./core/TXEventBus";

function main() {
  let eventBus = new TXEventBus();
  let cliAdapter = new TXCLIAdapter(eventBus);
  cliAdapter.connect();

  eventBus.on("message", (ctx) => {
    cliAdapter.sendMessage(ctx.changeContent(`Content: ${ctx.content}`));
  });
}

main();
