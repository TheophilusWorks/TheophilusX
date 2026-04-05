import EventEmitter from "node:events";
import TXEvents from "../types/TXEvents";
import TXConfig from "../types/TXConfig";
import toError from "../utils/toError";
import fs from "fs/promises";
import TXCommandCategory from "./command/TXCommandCategory";
import TXEventBuilder from "./event/TXEventBuilder";
import path from "node:path";
import TXCommand from "./command/TXCommand";
import { DebugLevel } from "../types/TXDebugLevel";
import TXAdapterBuilder from "./adapter/TXAdapterBuilder";
import { pathToFileURL } from "node:url";

export default class TheophilusX {
  private eventBus: EventEmitter;
  private adapterBuilders: TXAdapterBuilder[];
  private config: TXConfig;
  private commandCategories: TXCommandCategory[];

  constructor(config: TXConfig) {
    this.eventBus = new EventEmitter();
    this.config = config;
    this.commandCategories = new Array();
    this.adapterBuilders = new Array();
  }

  public on<K extends keyof TXEvents>(event: K, callback: TXEvents[K]) {
    this.eventBus.on(event, callback);
  }

  public emit<K extends keyof TXEvents>(
    event: K,
    ...args: Parameters<TXEvents[K]>
  ) {
    this.eventBus.emit(event, ...args);
  }

  public async start() {
    this.debug("Starting TheophilusX...", DebugLevel.Info);

    try {
      this.checkForAdapters();
      this.debug(
        `Found ${this.adapterBuilders.length} adapters`,
        DebugLevel.Ok,
      );
      await this.loadEvents();
      await this.loadCommands();
      await this.loginBot();
    } catch (error) {
      let e = toError(error);
      this.config.debugLogs = true;
      this.debug(`Error starting TheophilusX: ${e.message}`, DebugLevel.Error);
    }
  }

  public addAdapter(adapter: TXAdapterBuilder) {
    this.adapterBuilders.push(adapter);
  }

  public debug(msg: string, header = DebugLevel.Debug) {
    if (!this.config.debugLogs) return;
    if (header === DebugLevel.Error) {
      console.error(`[ ${header} ] ${msg}`);
    } else {
      console.log(`[ ${header} ] ${msg}`);
    }
  }

  private checkForAdapters(): void {
    this.debug("Checking for adapters", DebugLevel.Info);
    if (this.adapterBuilders.length === 0) {
      throw new Error(
        "Missing at least one adapter in configuration. Please provide an adapter to start TheophilusX.",
      );
    }
  }

  private async loadEvents() {
    if (!this.config.eventsPath) {
      throw new Error(
        "Missing events path in configuration. Please provide an event path to start TheophilusX.",
      );
    }

    this.debug(
      `Loading all events in "${this.config.eventsPath}"`,
      DebugLevel.Info,
    );

    const files = (await fs.readdir(this.config.eventsPath)).filter(
      (f) => f.endsWith(".ts") || f.endsWith(".js"),
    );

    this.debug(`Found ${files.length} events`, DebugLevel.Info);

    for (const file of files) {
      const fullPath = path.resolve(this.config.eventsPath, file);
      const event =
        await this.importDefault<TXEventBuilder<keyof TXEvents>>(fullPath);
      console.log(event);

      this.on(event.event, event.callback);
      this.debug(
        `Enrolled event "${event.event}" from "${path.basename(file)}"`,
        DebugLevel.Ok,
      );
    }
  }

  private async loadCommands() {
    if (!this.config.commandsPath) {
      throw new Error(
        "Missing commands path in configuration. Please provide a commands path to start TheophilusX.",
      );
    }

    this.debug(
      `Loading all commands in "${this.config.commandsPath}"`,
      DebugLevel.Info,
    );

    const categoryDirs = await fs.readdir(this.config.commandsPath);
    this.debug(
      `Found ${categoryDirs.length} command categories`,
      DebugLevel.Ok,
    );

    for (const category of categoryDirs) {
      const categoryPath = path.resolve(this.config.commandsPath, category);

      const stat = await fs.stat(categoryPath);
      if (!stat.isDirectory()) continue;

      const commandFiles = (await fs.readdir(categoryPath)).filter(
        (f) => f.endsWith(".ts") || f.endsWith(".js"),
      );

      const commands: TXCommand[] = [];

      for (const commandFile of commandFiles) {
        const fullPath = path.resolve(categoryPath, commandFile);
        const cmd = await this.importDefault<TXCommand>(fullPath);
        commands.push(cmd);
        this.debug(
          `Loaded command "${cmd.name}" from category "${category}"`,
          DebugLevel.Ok,
        );
      }

      this.commandCategories.push({ category, commands });
    }
  }

  private async loginBot() {
    for (const adapterBuilder of this.adapterBuilders) {
      await adapterBuilder.login();
    }
  }

  private async importDefault<T>(filePath: string): Promise<T> {
    const mod = await import(pathToFileURL(filePath).href);
    return (mod.default?.default ?? mod.default) as T;
  }
}
