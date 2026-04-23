import TXEvents from "../types/TXEvents.js";
import TXConfig from "../types/TXConfig.js";
import toError from "../utils/toError.js";
import path from "node:path";
import TXCommand from "./command/TXCommand.js";
import { DebugLevel } from "../types/TXDebugLevel.js";
import { TXIContext, TXPlatform } from "./context/TXContext.js";
import buildCliAdapter from "../adapters/cliAdapter.js";
import { GlobalFonts } from "@napi-rs/canvas";
import TXLogger from "./logger/TXLogger.js";
import TXCommandRegistry from "./registry/TXCommandRegistry.js";
import TXEventRegistry from "./registry/TXEventRegistry.js";
import TXAdapterRegistry from "./registry/TXAdapterRegistry.js";
import buildDiscordAdapter from "../adapters/discordAdapter.js";
import { getDirname } from "../utils/path.js";
import TXDatabaseManager from "./database/TXDatabaseManager.js";
import { exec, spawn } from "node:child_process";
import { promisify } from "node:util";
import TXAdapterBuilder from "./adapter/TXAdapterBuilder.js";
import TXCacheManager from "./cache-manager/TXCacheManager.js";
import TXICommandArgument from "../types/TXICommandArgument.js";
import TXItemManager from "./item-manager/TXItemManager.js";
import buildFacebookAdapter from "../adapters/facebookAdapter.cjs";
import fs from "fs";
import os from "os";

export const CACHE_DIR = path.join(os.tmpdir(), "cache");
const __dirname = getDirname(import.meta.url);
GlobalFonts.registerFromPath(
  path.resolve(__dirname, "../../assets/Montserrat-Bold.ttf"),
  "Montserrat",
);

const execAsync = promisify(exec);

export default class TheophilusX {
  public static version = "1.0.0";
  public prefixes: string[];
  public adminPrefixes: string[];

  public isReloading: boolean = false;
  public updateSchedule: Date | undefined = undefined;

  private logger: TXLogger;
  private config: TXConfig;
  private cache: TXCacheManager;

  private commandRegistry: TXCommandRegistry;
  private eventRegistry: TXEventRegistry;
  private adapterRegistry: TXAdapterRegistry;

  private databaseManager: TXDatabaseManager;
  private itemManager: TXItemManager;

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
    this.itemManager = new TXItemManager(
      config.itemsPath,
      this.databaseManager,
      this.logger,
    );
    this.cache = new TXCacheManager({
      cachePath: config.cachePath,
      updateSchedule: new Date(0),
    });
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

  public executeCommand(ctx: TXIContext, cmdQuery: TXICommandArgument) {
    this.emit("commandCreate", ctx, cmdQuery);
  }

  public executeAdminCommand(ctx: TXIContext, cmdQuery: TXICommandArgument) {
    this.emit("adminCommandCreate", ctx, cmdQuery);
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

  public getAllCommandAliases() {
    return this.commandRegistry.getAllAliases();
  }

  public getAllAdminCommandAliases() {
    return this.commandRegistry.getAllAdminAliases();
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

  public isUpdating(): boolean {
    return (
      this.updateSchedule !== undefined && this.updateSchedule > new Date()
    );
  }

  public async compile() {
    await execAsync("npx tsc");
  }

  public async updateTheophilusX(
    adapter: TXAdapterBuilder,
    context: TXIContext,
  ) {
    this.eventRegistry.clear();

    // set schedule 5 min from now
    const updateSchedule = new Date(Date.now() + 5 * 60_000);
    this.updateSchedule = updateSchedule;
    this.cache.set("updateSchedule", updateSchedule);
    this.cache.save();

    // wait 3:30 min before actually pulling
    await new Promise((res) => setTimeout(res, 3 * 60_000 + 30_000));

    await adapter.reply(context, "Pulling latest changes...");

    const { stdout: beforeHash } = await execAsync("git rev-parse HEAD");
    await execAsync("git pull");
    const { stdout: afterHash } = await execAsync("git rev-parse HEAD");

    const before = beforeHash.trim();
    const after = afterHash.trim();

    if (before === after) {
      this.updateSchedule = undefined;
      this.cache.set("updateSchedule", new Date(0));
      this.cache.save();
      await adapter.reply(context, "Already up to date. No new commits.");
    } else {
      const { stdout: logOutput } = await execAsync(
        `git log ${before}..${after} --oneline`,
      );

      const commits = logOutput.trim().split("\n").filter(Boolean);
      const commitLines = commits.map((line) => `• ${line}`).join("\n");

      await adapter.reply(
        context,
        `Pulled ${commits.length} commit${commits.length === 1 ? "" : "s"}:\n${commitLines}`,
      );

      await adapter.reply(context, "Compiling...");
      await execAsync("npx tsc");
    }

    await adapter.reply(context, "Restarting...");

    spawn(process.execPath, process.argv.slice(1), {
      detached: true,
      stdio: "inherit",
    }).unref();

    process.exit(0);
  }

  public async reloadModules() {
    this.logger.log("Reloading TheophilusX...", DebugLevel.Info);
    this.isReloading = true;
    await this.itemManager.reloadModules();
    await this.eventRegistry.reloadModules();
    await this.commandRegistry.reloadModules();
    this.isReloading = false;
    this.logger.log("Reloaded TheophilusX...", DebugLevel.Ok);
  }

  public async start() {
    this.logger.log("Starting TheophilusX...", DebugLevel.Info);

    // setup cache directory
    fs.mkdirSync(CACHE_DIR, { recursive: true });

    try {
      await this.databaseManager.connect();
      await this.itemManager.load();
      await this.cache.load();
      this.restoreUpdateSchedule();

      await this.eventRegistry.load();
      await this.commandRegistry.load();
      await this.commandRegistry.loadAdmin();
      this.registerPlatforms();
      this.adapterRegistry.check();
      this.logger.log("TheophilusX logging in", DebugLevel.Ok);
      this.adapterRegistry.login();

      this.logger.collect(this.itemManager.toSummaryNode());
      this.logger.collect(this.eventRegistry.toSummaryNode());
      this.logger.collect(this.commandRegistry.toSummaryNode());
      this.logger.collect(this.adapterRegistry.toSummaryNode());
      this.logger.printSummary(`TheophilusX v${TheophilusX.version}`);
    } catch (error) {
      let e = toError(error);
      this.logger.fatal(`Error starting TheophilusX: ${e.message}`);
      process.exit(1);
    }
  }

  get commandCount() {
    return this.commandRegistry.commandCount;
  }

  get eventCount() {
    return this.eventRegistry.eventCount;
  }

  private restoreUpdateSchedule() {
    const cached = this.cache.get("updateSchedule");

    if (!cached || cached.getTime() === 0) return;

    if (cached > new Date()) {
      this.updateSchedule = cached;
      this.logger.log(
        `Maintenance window active until ${cached.toLocaleTimeString()}`,
        DebugLevel.Info,
      );

      const remaining = cached.getTime() - Date.now();
      setTimeout(() => {
        this.updateSchedule = undefined;
        this.cache.set("updateSchedule", new Date(0));
        this.cache.save();
        this.logger.log("Maintenance window cleared.", DebugLevel.Ok);
      }, remaining);
    } else {
      // window already passed, clear it
      this.cache.set("updateSchedule", new Date(0));
      this.cache.save();
    }
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
      if (!token.facebookAppstate) {
        this.logger.log(
          "No appstate found for Facebook Messenger. Assuming it's currently in development mode. Skipping Registration.",
          DebugLevel.Warn,
        );
        return;
      }

      this.adapterRegistry.add(
        buildFacebookAdapter.default(this, token.facebookAppstate),
        TXPlatform.FacebookMessenger,
      );
    }
  }
}
