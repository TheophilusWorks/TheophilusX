import EventEmitter from "node:events";
import fs from "fs/promises";
import path from "node:path";
import TXLogger from "../logger/TXLogger.js";
import { TXLoggerNode } from "../logger/TXLoggerNode.js";
import { DebugLevel } from "../../types/TXDebugLevel.js";
import TXEvents from "../../types/TXEvents.js";
import TXEventBuilder, { TXEventOptions } from "../event/TXEventBuilder.js";
import { importDefault } from "../../utils/importDefault.js";
import { TXIContext } from "../context/TXContext.js";

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
        await importDefault<TXEventBuilder<keyof TXEvents>>(fullPath);

      this.on(event.event, this.wrapEvent(event));
      this.eventCount++;

      this.logger.log(
        `Enrolled event "${event.event}" from "${path.basename(file)}"`,
        DebugLevel.Ok,
      );
    }
  }

  private wrapEvent<K extends keyof TXEvents>(
    event: TXEventBuilder<K>,
  ): TXEvents[K] {
    const wrapper = (...args: Parameters<TXEvents[K]>) => {
      if (!this.shouldCallbackRun(event.options, args)) return;
      return event.execute(...args);
    };

    return wrapper as TXEvents[K];
  }

  private shouldCallbackRun(
    options: TXEventOptions | undefined,
    args: any[],
  ): boolean {
    if (!options) return true;
    const ctx = args[0] as TXIContext;
    return !options.blacklistedPlatforms.includes(ctx.platform);
  }

  public on<K extends keyof TXEvents>(event: K, callback: TXEvents[K]): void {
    this.eventBus.on(event, callback);
  }

  public off<K extends keyof TXEvents>(event: K, callback: TXEvents[K]): void {
    this.eventBus.off(event, callback);
  }

  public emit<K extends keyof TXEvents>(
    event: K,
    ...args: Parameters<TXEvents[K]>
  ): void {
    this.eventBus.emit(event, ...args);
  }

  public clear(): void {
    this.eventBus = new EventEmitter();
  }

  public async reloadModules(): Promise<void> {
    this.clear();
    this.eventCount = 0;
    await this.load();
  }

  public toSummaryNode(): TXLoggerNode {
    return {
      label: `Events (${this.eventCount})`,
      children: this.eventBus
        .eventNames()
        .map((e) => ({ label: String(e), children: [] })),
    };
  }
}
