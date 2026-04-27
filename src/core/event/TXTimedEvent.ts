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

    function getManilaMs(): {
      msFromMidnight: number;
      hours: number;
      minutes: number;
    } {
      const now = new Date();
      const manila = new Date(
        now.toLocaleString("en-US", { timeZone: "Asia/Manila" }),
      );
      return {
        msFromMidnight:
          manila.getHours() * 3_600_000 +
          manila.getMinutes() * 60_000 +
          manila.getSeconds() * 1_000,
        hours: manila.getHours(),
        minutes: manila.getMinutes(),
      };
    }

    const { msFromMidnight: currentMs } = getManilaMs();
    for (const key of Object.keys(jobs)) {
      if (Number(key) <= currentMs) {
        fired.add(Number(key));
      }
    }

    setInterval(() => {
      const { msFromMidnight, hours, minutes } = getManilaMs();

      // reset at PH midnight
      if (hours === 0 && minutes === 0) fired.clear();

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
