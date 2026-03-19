import createDiscordAdapter from "../adapters/discordAdapter";
import TXClient from "./TXClient";
import TXCommand from "./TXCommand";
import TXEventBus from "./TXEventBus";
import { TXToken } from "./TXToken";
import config from "../../config.json";
import fs from "fs/promises";
import path from "path";
import TXEvent, { TXIEvent } from "./TXEvent";

export default class TheophilusX {
  private tokens: TXToken;
  private eventBus: TXEventBus;
  private commands: Record<string, TXCommand>;

  constructor(tokens: TXToken, eventBus: TXEventBus) {
    this.tokens = tokens;
    this.eventBus = eventBus;
    this.commands = {};
  }
  public async run() {
    await this.enrollCommands();
    await this.attachEventListeners();
    await this.connectAdapters();
  }

  public getCommand(name: string) {
    return this.commands[name];
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
      discordAdapter.connect();
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
