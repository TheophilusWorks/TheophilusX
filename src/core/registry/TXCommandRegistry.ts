import fs from "fs/promises";
import path from "node:path";
import TXCommand from "../command/TXCommand.js";
import TXLogger from "../logger/TXLogger.js";
import { TXLoggerNode } from "../logger/TXLoggerNode.js";
import { DebugLevel } from "../../types/TXDebugLevel.js";
import { importDefault } from "../../utils/importDefault.js";

export default class TXCommandRegistry {
  private adminCommands: Map<string, TXCommand>;
  private commands: Map<string, TXCommand>;

  private commandAliases: Map<string, TXCommand>;
  private adminCommandAliases: Map<string, TXCommand>;

  private commandsPath: string;
  private adminCommandsPath: string;

  public commandCount = 0;
  public adminCommandCount = 0;

  private logger: TXLogger;

  constructor(
    commandsPath: string,
    adminCommandsPath: string,
    logger: TXLogger,
  ) {
    this.commandsPath = commandsPath;
    this.adminCommandsPath = adminCommandsPath;
    this.logger = logger.scope("CommandRegistry");
    this.commands = new Map();
    this.adminCommands = new Map();
    this.commandAliases = new Map();
    this.adminCommandAliases = new Map();
  }

  public async load(): Promise<void> {
    this.logger.log(
      `Loading all commands in "${this.commandsPath}"`,
      DebugLevel.Info,
    );

    const categoryDirs = await fs.readdir(this.commandsPath);
    this.logger.log(
      `Found ${categoryDirs.length} command categories`,
      DebugLevel.Info,
    );

    for (const category of categoryDirs) {
      const categoryPath = path.resolve(this.commandsPath, category);

      const stat = await fs.stat(categoryPath);
      if (!stat.isDirectory()) continue;

      const commandFiles = (await fs.readdir(categoryPath)).filter(
        (f) => f.endsWith(".ts") || f.endsWith(".js"),
      );

      for (const commandFile of commandFiles) {
        const fullPath = path.resolve(categoryPath, commandFile);
        const cmd = await importDefault<TXCommand>(fullPath);

        if (!cmd.category) {
          cmd.category = category;
        }

        this.commands.set(cmd.name, cmd);
        this.commandCount++;

        this.logger.log(
          `Loaded command "${cmd.name}" from category "${category}"`,
          DebugLevel.Ok,
        );

        if (cmd.aliases) {
          for (const alias of cmd.aliases) {
            if (this.commandAliases.has(alias))
              throw new Error(
                `The command "${cmd.name}" is trying to enroll the alias "${alias}" but its already taken by the command "${this.commandAliases.get(alias)?.name || ""}". Please choose a different alias.`,
              );

            this.commandAliases.set(alias, cmd);
            this.logger.log(
              `Enrolled alias "${alias}" for command "${cmd.name}"`,
              DebugLevel.Ok,
            );
          }
        }
      }
    }
  }

  public async reloadModules() {
    this.commands = new Map();
    this.adminCommands = new Map();
    this.commandAliases = new Map();
    this.adminCommandAliases = new Map();
    this.commandCount = 0;
    this.adminCommandCount = 0;

    await this.load();
    await this.loadAdmin();
  }

  public async loadAdmin(): Promise<void> {
    this.logger.log(
      `Loading all admin commands in "${this.adminCommandsPath}"`,
      DebugLevel.Info,
    );

    const categoryDirs = await fs.readdir(this.adminCommandsPath);
    this.logger.log(
      `Found ${categoryDirs.length} admin command categories`,
      DebugLevel.Ok,
    );

    for (const category of categoryDirs) {
      const categoryPath = path.resolve(this.adminCommandsPath, category);

      const stat = await fs.stat(categoryPath);
      if (!stat.isDirectory()) continue;

      const commandFiles = (await fs.readdir(categoryPath)).filter(
        (f) => f.endsWith(".ts") || f.endsWith(".js"),
      );

      for (const commandFile of commandFiles) {
        const fullPath = path.resolve(categoryPath, commandFile);
        const cmd = await importDefault<TXCommand>(fullPath);

        if (!cmd.category) {
          cmd.category = category;
        }

        this.adminCommands.set(cmd.name, cmd);
        this.adminCommandCount++;

        this.logger.log(
          `Loaded admin command "${cmd.name}" from category "${category}"`,
          DebugLevel.Ok,
        );

        if (cmd.aliases) {
          for (const alias of cmd.aliases) {
            if (this.adminCommandAliases.has(alias))
              throw new Error(
                `The admin command "${cmd.name}" is trying to enroll the alias "${alias}" but its already taken by the command "${this.commandAliases.get(alias)?.name || ""}". Please choose a different alias.`,
              );

            this.adminCommandAliases.set(alias, cmd);
            this.logger.log(
              `Enrolled alias "${alias}" for admin command "${cmd.name}"`,
              DebugLevel.Ok,
            );
          }
        }
      }
    }
  }

  public has(cmdName: string): boolean {
    return this.commands.has(cmdName);
  }

  public get(cmdName: string): TXCommand | undefined {
    return this.commands.get(cmdName);
  }

  public getAlias(alias: string): TXCommand | undefined {
    return this.commandAliases.get(alias);
  }

  public getAll(): Map<string, TXCommand> {
    return this.commands;
  }

  public hasAdmin(cmdName: string): boolean {
    return this.adminCommands.has(cmdName);
  }

  public getAdmin(cmdName: string): TXCommand | undefined {
    return this.adminCommands.get(cmdName);
  }

  public getAdminAlias(alias: string): TXCommand | undefined {
    return this.adminCommandAliases.get(alias);
  }

  public getAllAdmin(): Map<string, TXCommand> {
    return this.adminCommands;
  }

  public toSummaryNode(): TXLoggerNode {
    const categories = new Set(
      Array.from(this.commands.values()).map((c) => c.category!),
    );

    const adminCategories = new Set(
      Array.from(this.adminCommands.values()).map((c) => c.category!),
    );

    return {
      label: `Commands (${this.commandCount} public, ${this.adminCommandCount} admin)`,
      children: [
        {
          label: `Public (${this.commandCount})`,
          children: Array.from(categories).map((category) => ({
            label: category,
            children: Array.from(this.commands.values())
              .filter((c) => c.category === category)
              .map((c) => ({
                label: `${c.name} - ${c.description}`,
                children: [],
              })),
          })),
        },
        {
          label: `Admin (${this.adminCommandCount})`,
          children: Array.from(adminCategories).map((category) => ({
            label: category,
            children: Array.from(this.adminCommands.values())
              .filter((c) => c.category === category)
              .map((c) => ({
                label: `${c.name} - ${c.description}`,
                children: [],
              })),
          })),
        },
      ],
    };
  }
}
