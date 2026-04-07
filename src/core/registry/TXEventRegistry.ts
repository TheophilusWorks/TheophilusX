import EventEmitter from "node:events";
import fs from "fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import TXLogger from "../logger/TXLogger.js";
import { TXLoggerNode } from "../logger/TXLoggerNode.js";
import { DebugLevel } from "../../types/TXDebugLevel.js";
import TXEvents from "../../types/TXEvents.js";
import TXEventBuilder from "../event/TXEventBuilder.js";

export default class TXEventRegistry {
  private eventBus: EventEmitter;
  private logger: TXLogger;
  private eventsPath: string;

  public eventCount = 0;

  constructor(eventsPath: string, logger: TXLogger) {
    this.eventsPath = eventsPath;
    this.logger = logger.scope("EventRegistry");
    this.eventBus = new EventEmitter();
  }

  public async load(): Promise<void> {
    this.logger.log(
      `Loading all events in "${this.eventsPath}"`,
      DebugLevel.Info,
    );

    const files = (await fs.readdir(this.eventsPath)).filter(
      (f) => f.endsWith(".ts") || f.endsWith(".js"),
    );

    this.logger.log(`Found ${files.length} events`, DebugLevel.Info);

    for (const file of files) {
      const fullPath = path.resolve(this.eventsPath, file);
      const event =
        await this.importDefault<TXEventBuilder<keyof TXEvents>>(fullPath);

      this.on(event.event, event.callback);
      this.eventCount++;

      this.logger.log(
        `Enrolled event "${event.event}" from "${path.basename(file)}"`,
        DebugLevel.Ok,
      );
    }
  }

  public on<K extends keyof TXEvents>(event: K, callback: TXEvents[K]): void {
    this.eventBus.on(event, callback);
  }

  public emit<K extends keyof TXEvents>(
    event: K,
    ...args: Parameters<TXEvents[K]>
  ): void {
    this.eventBus.emit(event, ...args);
  }

  public toSummaryNode(): TXLoggerNode {
    return {
      label: `Events (${this.eventCount})`,
      children: this.eventBus.eventNames().map((e) => ({
        label: String(e),
        children: [],
      })),
    };
  }

  private async importDefault<T>(filePath: string): Promise<T> {
    const mod = await import(pathToFileURL(filePath).href);
    return (mod.default?.default ?? mod.default) as T;
  }
}
