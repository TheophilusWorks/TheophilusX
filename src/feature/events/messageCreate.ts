import TXEventBuilder from "../../core/event/TXEventBuilder.js";

export default new TXEventBuilder("messageCreate", async (ctx, adapter) => {
  if (ctx.author.isSelf || ctx.content == "") return;

  adapter.reply(
    "Hello! This is a response from the messageCreate event... Received your message: " +
      ctx.content,
  );
});
