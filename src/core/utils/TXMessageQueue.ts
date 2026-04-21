const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface TXMessageQueueOptions {
  minDelayMs?: number;
  maxDelayMs?: number;
}

type TXQueueJob = () => Promise<void>;

export default class TXMessageQueue {
  private minDelayMs: number;
  private maxDelayMs: number;
  private queue: TXQueueJob[];
  private running: boolean;

  constructor(options: TXMessageQueueOptions = {}) {
    this.minDelayMs = options.minDelayMs ?? 1500;
    this.maxDelayMs = options.maxDelayMs ?? 3500;
    this.queue = [];
    this.running = false;
  }

  enqueue(job: TXQueueJob): void {
    this.queue.push(job);
    if (!this.running) this._run();
  }

  private async _run(): Promise<void> {
    this.running = true;
    while (this.queue.length > 0) {
      const job = this.queue.shift()!;
      await job().catch(console.error);
      const delay =
        Math.random() * (this.maxDelayMs - this.minDelayMs) + this.minDelayMs;
      await sleep(delay);
    }
    this.running = false;
  }
}
