import readline from "readline/promises";
import TheophilusX from "../core/TheophilusX.js";
import TXAdapterBuilder from "../core/adapter/TXAdapterBuilder.js";
import { TXIContext, TXPlatform } from "../core/context/TXContext.js";
import instance from "../instance.js";
import TXCommandArgumentParser from "../core/command/parser/TXCommandParser.js";
import TXSentMessage, {
  TXIWaitReplyOptions,
} from "../core/message/TXSentMessage.js";
import TXMessage from "../core/message/TXMessage.js";
import TXMessageOptions from "../core/message/TXMessageOptions.js";
import { TXMessagePart } from "../core/message/TXMessagePart.js";

// --- adapter ---

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
      resolve: (msg: TXMessage | null) => void;
      timer: NodeJS.Timeout;
      filter?: (ctx: TXIContext) => boolean;
    }
  >();

  function allocateReplyId(): number {
    return replyIdCounter++;
  }

  function makeCliReplyFn(
    incoming: TXIContext,
  ): (msg: TXMessageOptions | string) => Promise<TXSentMessage | null> {
    return async (msg) => {
      const id = allocateReplyId();
      printResolved(msg);
      console.log(`[reply id: ${id}]\n`);

      return new TXSentMessage(incoming, makeWaitReply(id));
    };
  }

  function makeWaitReply(replyId: number) {
    return (
      _ctx: TXIContext,
      options: TXIWaitReplyOptions,
    ): Promise<TXMessage | null> => {
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          waitReplyMap.delete(replyId);
          resolve(null);
        }, options.timeout);

        waitReplyMap.set(replyId, { resolve, timer, filter: options.filter });
      });
    };
  }

  const adapter = new TXAdapterBuilder()
    .setLoginManager(async () => {
      await new Promise((res) => setTimeout(res, 1000));
      rl.prompt();

      rl.on("line", async (input) => {
        const trimmed = input.trim();

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
              pending.resolve(
                new TXMessage(incomingCtx, makeCliReplyFn(incomingCtx)),
              );
            }
          }

          await new Promise((res) => setTimeout(res, 300));
          rl.prompt();
          return;
        }

        const usedPrefix = instance.prefixes.find((p) => trimmed.startsWith(p));
        const usedAdminPrefix = instance.adminPrefixes.find((p) =>
          trimmed.startsWith(p),
        );
        const ctx = buildCLIContext(trimmed);

        if (usedPrefix) {
          const args = new TXCommandArgumentParser(
            usedPrefix,
            trimmed,
            adapter,
            undefined,
            ctx,
          ).parse();
          bot.emit("commandCreate", args);
        } else if (usedAdminPrefix) {
          const args = new TXCommandArgumentParser(
            usedAdminPrefix,
            trimmed,
            adapter,
            undefined,
            ctx,
          ).parse();
          bot.emit("adminCommandCreate", args);
        } else {
          bot.emit("messageCreate", ctx, adapter);
        }

        rl.prompt();
      });
    })
    .setMessageSender(async (_target, message) => {
      const id = allocateReplyId();
      printResolved(message);
      console.log(`[reply id: ${id}]\n`);

      const ctx = buildCLIContext("");
      return new TXSentMessage(ctx, makeWaitReply(id));
    })
    .setReplySender(async (_ctx, message) => {
      const id = allocateReplyId();
      printResolved(message);
      console.log(`[reply id: ${id}]\n`);

      const ctx = buildCLIContext("");
      return new TXSentMessage(ctx, makeWaitReply(id));
    });

  return adapter;
}

// --- resolvers ---

function resolvePartsToString(parts: TXMessagePart[] | undefined): string {
  return (
    parts
      ?.map((p) => (p.type === "text" ? p.value : `@${p.displayName}`))
      .join("") || ""
  );
}

function resolveMessage(message: TXMessageOptions | string): {
  content: string;
  files: string[];
} {
  if (typeof message === "string") return { content: message, files: [] };
  return {
    content: resolvePartsToString(message?.parts),
    files: message.attachments ?? [],
  };
}

function printResolved(message: TXMessageOptions | string) {
  const { content, files } = resolveMessage(message);
  console.log(content);
  if (files.length) console.log(files.join("\n"));
}

// --- helpers ---

function buildCLIContext(raw: string): TXIContext {
  const trimmed = raw.trim();
  return {
    platform: TXPlatform.Cli,
    content: trimmed,
    channelId: undefined,
    serverId: "0",
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
