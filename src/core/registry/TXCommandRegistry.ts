import fs from "fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import TXCommand from "../command/TXCommand";
import TXLogger from "../logger/TXLogger";
import { TXLoggerNode } from "../logger/TXLoggerNode";
import { DebugLevel } from "../../types/TXDebugLevel";

export default class TXCommandRegistry {
  private commands: Map<string, TXCommand>;
  private commandAliases: Map<string, TXCommand>;
  private logger: TXLogger;
  private commandsPath: string;

  public commandCount = 0;

  constructor(commandsPath: string, logger: TXLogger) {
    this.commandsPath = commandsPath;
    this.logger = logger.scope("CommandRegistry");
    this.commands = new Map();
    this.commandAliases = new Map();
  }

  public async load(): Promise<void> {
    this.logger.log(
      `Loading all commands in "${this.commandsPath}"`,
      DebugLevel.Info,
    );

    const categoryDirs = await fs.readdir(this.commandsPath);
    this.logger.log(
      `Found ${categoryDirs.length} command categories`,
      DebugLevel.Ok,
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
        const cmd = await this.importDefault<TXCommand>(fullPath);

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

  public toSummaryNode(): TXLoggerNode {
    const categories = new Set(
      Array.from(this.commands.values()).map((c) => c.category!),
    );

    return {
      label: `Commands (${this.commandCount})`,
      children: Array.from(categories).map((category) => ({
        label: category,
        children: Array.from(this.commands.values())
          .filter((c) => c.category === category)
          .map((c) => ({ label: c.name, children: [] })),
      })),
    };
  }

  private async importDefault<T>(filePath: string): Promise<T> {
    const mod = await import(pathToFileURL(filePath).href);
    return (mod.default?.default ?? mod.default) as T;
  }
}
