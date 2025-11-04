import TXCommand from "../../../structures/TXCommand";

export default new TXCommand({
  name: "ping",
  description: "Pong!",
  cooldown: 3000,
  execute: async ({ message, client }) => {
    const start = Date.now()
    const ping = await message.reply("Pinging...")
    const end = Date.now()
    ping.edit(`Pong! Websocket: **${client.ws.ping}ms** | Client: **${end - start}ms**`);
  },
})
