import TXTimedEvent from "../../core/event/TXTimedEvent.js";

const H = (h: number) => h * 60 * 60 * 1000;

export default new TXTimedEvent((adapter) => ({
  [H(6)]: async () => {
    await adapter.announce(
      "☀️ Good morning, everyone! Rise and shine!\n" +
        "Don't skip breakfast — your brain needs fuel. 🍳\n" +
        "Let's make today a great one! 😊",
    );
  },
  [H(12)]: async () => {
    await adapter.announce(
      "🌤️ Good afternoon! It's lunch time!\n" +
        "Step away from the screen, eat something, and take a breather. 🍱\n" +
        "You're halfway through the day — keep it up! 😤",
    );
  },
  [H(18)]: async () => {
    await adapter.announce(
      "🌆 Good evening, everyone!\n" +
        "Hope your day went well. Time to wind down and relax. 🛋️\n" +
        "You deserve it! 🌟",
    );
  },
  [H(21)]: async () => {
    await adapter.announce(
      "🌙 Good night, everyone!\n" +
        "Get some rest and don't stay up too late! 😴\n" +
        "See you all tomorrow! 👋\n" +
        "Don't worry, I'm still here 😉",
    );
  },
}));
