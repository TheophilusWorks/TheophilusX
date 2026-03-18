import createCLIAdapter from "./adapters/TXCLIAdapter";
import TXEventBus from "./core/TXEventBus";

function main() {
  let eventBus = new TXEventBus();
  let cliAdapter = createCLIAdapter(eventBus);
  cliAdapter.connect();

  eventBus.on("message", (ctx) => {
    console.log(`Found context: ${JSON.stringify(ctx, null, 2)}`);
  });
}

main();
