import TXAdapterBuilder from "../adapter/TXAdapterBuilder.js";

export default class TXTimedEvent {
  public name: string = "";
  public schedule: (
    adapter: TXAdapterBuilder,
  ) => Record<number, () => Promise<any>>;

  constructor(
    schedule: (adapter: TXAdapterBuilder) => Record<number, () => Promise<any>>,
  ) {
    this.schedule = schedule;
  }

  public start(adapter: TXAdapterBuilder): void {
    const jobs = this.schedule(adapter);
    const fired = new Set<number>();

    setInterval(() => {
      const now = new Date();
      const msFromMidnight =
        now.getHours() * 3_600_000 +
        now.getMinutes() * 60_000 +
        now.getSeconds() * 1_000;

      if (now.getHours() === 0 && now.getMinutes() === 0) fired.clear();

      for (const [key, job] of Object.entries(jobs)) {
        const targetMs = Number(key);
        if (fired.has(targetMs)) continue;
        if (msFromMidnight >= targetMs) {
          fired.add(targetMs);
          job().catch((err) =>
            console.warn(
              `[TXTimedEvent "${this.name}"] Job at ${targetMs}ms failed:`,
              err,
            ),
          );
        }
      }
    }, 60_000);
  }
}
