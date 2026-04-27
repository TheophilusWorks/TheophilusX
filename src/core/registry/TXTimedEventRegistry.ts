import fs from "fs/promises";
import path from "node:path";
import TXLogger from "../logger/TXLogger.js";
import { TXLoggerNode } from "../logger/TXLoggerNode.js";
import { DebugLevel } from "../../types/TXDebugLevel.js";
import TXTimedEvent from "../event/TXTimedEvent.js";
import TXAdapterBuilder from "../adapter/TXAdapterBuilder.js";
import { importDefault } from "../../utils/importDefault.js";

export default class TXTimedEventRegistry {
  private logger: TXLogger;
  private timedEventsPath: string;
  private events: TXTimedEvent[] = [];

  public eventCount = 0;

  constructor(timedEventsPath: string, logger: TXLogger) {
    this.timedEventsPath = timedEventsPath;
    this.logger = logger.scope("TimedEventRegistry");
  }

  public async load(): Promise<void> {
    this.logger.log(
      `Loading all timed events in "${this.timedEventsPath}"`,
      DebugLevel.Info,
    );

    const files = (await fs.readdir(this.timedEventsPath)).filter(
      (f) => f.endsWith(".ts") || f.endsWith(".js"),
    );

    this.logger.log(`Found ${files.length} timed events`, DebugLevel.Info);

    for (const file of files) {
      const fullPath = path.resolve(this.timedEventsPath, file);
      const event = await importDefault<TXTimedEvent>(fullPath);

      event.name = path.basename(file, path.extname(file));
      this.events.push(event);
      this.eventCount++;

      this.logger.log(
        `Enrolled timed event "${event.name}" from "${path.basename(file)}"`,
        DebugLevel.Ok,
      );
    }
  }

  public start(adapter: TXAdapterBuilder): void {
    for (const event of this.events) {
      event.start(adapter);

      this.logger.log(`Started timed event "${event.name}"`, DebugLevel.Ok);
    }
  }

  public clear(): void {
    this.events = [];
    this.eventCount = 0;
  }

  public async reloadModules(adapter: TXAdapterBuilder): Promise<void> {
    this.clear();
    await this.load();
    this.start(adapter);
  }

  public toSummaryNode(): TXLoggerNode {
    return {
      label: `Timed Events (${this.eventCount})`,
      children: this.events.map((e) => ({
        label: e.name,
        children: [],
      })),
    };
  }
}
