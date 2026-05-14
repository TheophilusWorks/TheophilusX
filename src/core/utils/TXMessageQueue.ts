import { randomRange } from "../../utils/randomRange.js";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface TXMessageQueueOptions {
  minDelayMs?: number;
  maxDelayMs?: number;
  switchDelayMinMs?: number;
  switchDelayMaxMs?: number;
}

type TXQueueJob = () => Promise<void>;

export default class TXMessageQueue {
  private minDelayMs: number;
  private maxDelayMs: number;
  private switchDelayMinMs: number;
  private switchDelayMaxMs: number;
  private queues: Map<string, TXQueueJob[]>;
  private running: Map<string, boolean>;
  private lastServerID: string | null = null;

  constructor(options: TXMessageQueueOptions = {}) {
    this.minDelayMs = options.minDelayMs ?? 1500;
    this.maxDelayMs = options.maxDelayMs ?? 2500;
    this.switchDelayMinMs = options.switchDelayMinMs ?? 1500;
    this.switchDelayMaxMs = options.switchDelayMaxMs ?? 3500;
    this.queues = new Map();
    this.running = new Map();
  }

  enqueue(serverID: string, job: TXQueueJob): void {
    if (!this.queues.has(serverID)) this.queues.set(serverID, []);
    this.queues.get(serverID)!.push(job);
    if (!this.running.get(serverID)) this._run(serverID);
  }

  getSize(threadID: string): number {
    return this.queues.get(threadID)?.length || 0;
  }

  private async _run(serverID: string): Promise<void> {
    this.running.set(serverID, true);
    const queue = this.queues.get(serverID)!;

    while (queue.length > 0) {
      // extra delay when switching between threads
      if (this.lastServerID !== null && this.lastServerID !== serverID) {
        const switchDelay = randomRange(
          this.switchDelayMinMs,
          this.switchDelayMaxMs,
        );
        await sleep(switchDelay);
      }
      this.lastServerID = serverID;

      const delay = randomRange(this.minDelayMs, this.maxDelayMs);
      await sleep(delay);
      const job = queue.shift()!;
      await job().catch(console.error);
    }

    this.running.set(serverID, false);
  }
}
