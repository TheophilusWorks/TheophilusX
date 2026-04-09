import TXEvents from "../types/TXEvents.js";
import TXConfig from "../types/TXConfig.js";
import toError from "../utils/toError.js";
import path from "node:path";
import TXCommand from "./command/TXCommand.js";
import { DebugLevel } from "../types/TXDebugLevel.js";
import { TXPlatform } from "./context/TXContext.js";
import buildCliAdapter from "../adapters/cliAdapter.js";
import { GlobalFonts } from "@napi-rs/canvas";
import TXLogger from "./logger/TXLogger.js";
import TXCommandRegistry from "./registry/TXCommandRegistry.js";
import TXEventRegistry from "./registry/TXEventRegistry.js";
import TXAdapterRegistry from "./registry/TXAdapterRegistry.js";
import buildDiscordAdapter from "../adapters/discordAdapter.js";
import { getDirname } from "../utils/path.js";
import TXDatabaseManager from "./database/TXDatabaseManager.js";
import { Schema } from "mongoose";

const __dirname = getDirname(import.meta.url);
GlobalFonts.registerFromPath(
  path.resolve(__dirname, "../../assets/Montserrat-Bold.ttf"),
  "Montserrat",
);

export default class TheophilusX {
  public static version = "1.0.0";
  public prefixes: string[];
  public adminPrefixes: string[];

  private logger: TXLogger;
  private config: TXConfig;

  private commandRegistry: TXCommandRegistry;
  private eventRegistry: TXEventRegistry;
  private adapterRegistry: TXAdapterRegistry;

  private databaseManager: TXDatabaseManager;

  constructor(config: TXConfig) {
    this.config = config;
    this.logger = TXLogger.create(config.debugLogs);
    this.prefixes = Array.isArray(config.prefix)
      ? config.prefix
      : [config.prefix];

    this.adminPrefixes = Array.isArray(config.adminPrefix)
      ? config.adminPrefix
      : [config.adminPrefix];

    this.commandRegistry = new TXCommandRegistry(
      config.commandsPath,
      config.adminCommandsPath,
      this.logger,
    );
    this.eventRegistry = new TXEventRegistry(config.eventsPath, this.logger);
    this.adapterRegistry = new TXAdapterRegistry(this.logger);
    this.databaseManager = new TXDatabaseManager(
      config.mongoDbURI,
      this.logger,
    );
  }

  public on<K extends keyof TXEvents>(event: K, callback: TXEvents[K]) {
    this.eventRegistry.on(event, callback);
  }

  public emit<K extends keyof TXEvents>(
    event: K,
    ...args: Parameters<TXEvents[K]>
  ) {
    this.eventRegistry.emit(event, ...args);
  }

  public hasCommand(cmdName: string): boolean {
    return this.commandRegistry.has(cmdName);
  }

  public getCommand(cmdName: string): TXCommand | undefined {
    return this.commandRegistry.get(cmdName);
  }

  public getCommandAlias(alias: string): TXCommand | undefined {
    return this.commandRegistry.getAlias(alias);
  }

  public getCommands(): Map<string, TXCommand> {
    return this.commandRegistry.getAll();
  }

  public hasAdminCommand(cmdName: string): boolean {
    return this.commandRegistry.hasAdmin(cmdName);
  }

  public getAdminCommand(cmdName: string): TXCommand | undefined {
    return this.commandRegistry.getAdmin(cmdName);
  }

  public getAdminCommandAlias(alias: string): TXCommand | undefined {
    return this.commandRegistry.getAdminAlias(alias);
  }

  public getAdminCommands(): Map<string, TXCommand> {
    return this.commandRegistry.getAllAdmin();
  }

  public getUsedPlatforms() {
    return this.adapterRegistry.usedPlatforms;
  }

  public getConfig() {
    return this.config;
  }

  public async start() {
    this.logger.log("Starting TheophilusX...", DebugLevel.Info);

    try {
      await this.databaseManager.connect();
      await this.eventRegistry.load();
      await this.commandRegistry.load();
      await this.commandRegistry.loadAdmin();
      this.registerPlatforms();
      this.adapterRegistry.check();
      this.logger.log("TheophilusX logging in", DebugLevel.Ok);
      this.adapterRegistry.login();

      this.logger.collect(this.eventRegistry.toSummaryNode());
      this.logger.collect(this.commandRegistry.toSummaryNode());
      this.logger.collect(this.adapterRegistry.toSummaryNode());
      this.logger.printSummary(`TheophilusX v${TheophilusX.version}`);
    } catch (error) {
      let e = toError(error);
      this.logger.fatal(`Error starting TheophilusX: ${e.message}`);
    }
  }

  get commandCount() {
    return this.commandRegistry.commandCount;
  }

  get eventCount() {
    return this.eventRegistry.eventCount;
  }

  private registerPlatforms() {
    const { platforms, token } = this.config;
    if (!platforms) return;

    if (platforms.cli) {
      this.adapterRegistry.add(buildCliAdapter(this), TXPlatform.Cli);
    }

    if (platforms.discord) {
      if (!token.discordToken)
        throw new Error("Discord token is required for Discord platform");
      this.adapterRegistry.add(
        buildDiscordAdapter(this, token.discordToken),
        TXPlatform.Discord,
      );
    }

    if (platforms.facebookMessenger) {
      // TODO: Implement Facebook Messenger adapter
    }
  }
}
