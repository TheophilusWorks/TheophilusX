import createDiscordAdapter from "../adapters/discordAdapter";
import TXClient from "./TXClient";
import TXCommand from "./TXCommand";
import TXEventBus from "./TXEventBus";
import { TXToken } from "./TXToken";
import config from "../../config.json";
import fs from "fs/promises";
import path from "path";
import TXEvent, { TXIEvent } from "./TXEvent";
import createCLIAdapter from "../adapters/TXCLIAdapter";
import TXAdapterBuilder, { TXAdapter } from "../adapters/TXAdapterBuilder";
import { TXPlatform } from "./TXPlatform";

export default class TheophilusX {
  private tokens: TXToken;
  private eventBus: TXEventBus;
  private commands: Record<string, TXCommand>;
  private adapters: Partial<Record<TXPlatform, TXAdapter>>

  constructor(tokens: TXToken, eventBus: TXEventBus) {
    this.tokens = tokens;
    this.eventBus = eventBus;
    this.commands = {};
    this.adapters = {};
  }
  public async run() {
    await this.enrollCommands();
    await this.attachEventListeners();
    await this.connectAdapters();
  }

  public getCommand(name: string) {
    return this.commands[name];
  }

  public getAdapter(platform: TXPlatform) {
    return this.adapters[platform] || new TXAdapterBuilder().build()
  }

  private async enrollCommands() {
    let commands: TXCommand[] = await this.importDirectory(config.command.path);

    for (const cmd of commands) {
      if (this.commands[cmd.name]) {
        throw new Error(`Found duplicate command '${cmd.name}'`);
      }

      console.log(`Imported: ${JSON.stringify(cmd, null, 2)}`);
      this.commands[cmd.name] = cmd;
    }
  }

  private async attachEventListeners() {
    let events: TXEvent<keyof TXIEvent>[] = await this.importDirectory(
      config.event.path,
    );

    for (const event of events) {
      this.eventBus.on(event.getEvent(), event.getCallable());
      console.log(`Attached: ${event.getEvent()}`);
    }
  }

  private async connectAdapters() {
    let { discord } = this.tokens;

    if (discord) {
      let discordClient = await TXClient.createDiscord(discord);
      let discordAdapter = createDiscordAdapter(discordClient, this.eventBus);
      await discordAdapter.connect();
      this.adapters["discord"] = discordAdapter
    }

    if (config.cli.enableCliMode) {
      let cliAdapter = createCLIAdapter(this.eventBus);
      cliAdapter.connect();
      this.adapters["cli"] = cliAdapter
    }
  }

  private importFile(filepath: string) {
    return require(path.resolve(filepath)).default;
  }

  private async importDirectory(dirpath: string) {
    let files = [];
    for (const filepath of await fs.readdir(dirpath)) {
      let file = this.importFile(path.join(dirpath, filepath));
      files.push(file);
    }
    return files;
  }
}
