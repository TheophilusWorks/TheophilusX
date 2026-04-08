import readline from "readline/promises";
import TheophilusX from "../core/TheophilusX.js";
import TXAdapterBuilder from "../core/adapter/TXAdapterBuilder.js";
import { TXIContext, TXPlatform } from "../core/context/TXContext.js";
import instance from "../instance.js";
import TXCommandArgumentParser from "../core/command/parser/TXCommandParser.js";
import TXSentMessage, {
  TXIWaitReplyOptions,
} from "../core/message/TXSentMessage.js";

export default function buildCliAdapter(bot: TheophilusX) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
  });

  let replyIdCounter = 0;

  const waitReplyMap = new Map<
    number,
    {
      resolve: (ctx: TXIContext | null) => void;
      timer: NodeJS.Timeout;
      filter?: (ctx: TXIContext) => boolean;
    }
  >();

  function makeWaitReply(replyId: number) {
    return (
      _ctx: TXIContext,
      options: TXIWaitReplyOptions,
    ): Promise<TXIContext | null> => {
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          waitReplyMap.delete(replyId);
          resolve(null);
        }, options.timeout);

        waitReplyMap.set(replyId, { resolve, timer, filter: options.filter });
      });
    };
  }

  function allocateReplyId(): number {
    return replyIdCounter++;
  }

  const adapter = new TXAdapterBuilder()
    .setLoginManager(async () => {
      await new Promise((res) => setTimeout(res, 1000));
      rl.prompt();

      rl.on("line", (input) => {
        const trimmed = input.trim();

        // Handle reply syntax: "reply: <id> <message>"
        const replyMatch = trimmed.match(/^reply:\s*(\d+)\s+([\s\S]+)$/);
        if (replyMatch) {
          const replyId = parseInt(replyMatch[1], 10);
          const content = replyMatch[2];
          const pending = waitReplyMap.get(replyId);

          if (!pending) {
            console.log(
              `[TX] No pending reply with id ${replyId} (may have timed out or never existed).`,
            );
          } else {
            const incomingCtx = buildCLIContext(content);
            if (pending.filter && !pending.filter(incomingCtx)) {
              console.log(`[TX] Reply filtered out.`);
            } else {
              clearTimeout(pending.timer);
              waitReplyMap.delete(replyId);
              pending.resolve(incomingCtx);
            }
          }

          rl.prompt();
          return;
        }

        const usedPrefix = instance.prefixes.find((p) => trimmed.startsWith(p));

        if (usedPrefix) {
          const args = new TXCommandArgumentParser(
            usedPrefix,
            trimmed,
            adapter,
            undefined,
            buildCLIContext(trimmed),
          ).parse();
          bot.emit("commandCreate", args);
        } else {
          bot.emit("messageCreate", buildCLIContext(trimmed), adapter);
        }

        rl.prompt();
      });
    })
    .setMessageSender(async (_target, message) => {
      const id = allocateReplyId();
      printMessage(message);
      console.log(`[reply id: ${id}]\n`);

      return new TXSentMessage(buildCLIContext(""), makeWaitReply(id));
    })
    .setReplySender(async (_ctx, message) => {
      const id = allocateReplyId();
      printMessage(message);
      console.log(`[reply id: ${id}]\n`);

      return new TXSentMessage(buildCLIContext(""), makeWaitReply(id));
    });

  return adapter;
}

function printMessage(
  message: string | { message: string; attachments?: string[] },
) {
  if (typeof message === "string") {
    console.log(message);
  } else {
    console.log(message.message);
    if (message.attachments?.length) {
      console.log(message.attachments.join("\n"));
    }
  }
}

function buildCLIContext(raw: string): TXIContext {
  const trimmed = raw.trim();
  return {
    platform: TXPlatform.Cli,
    content: trimmed,
    channelId: undefined,
    serverId: undefined,
    timestamp: new Date(),
    raw,
    replied: false,
    author: {
      id: "cli",
      displayName: "CLI User",
      username: "cli",
      isSelf: false,
      isAdmin: true,
    },
  };
}
