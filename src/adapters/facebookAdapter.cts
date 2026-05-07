import { createMessengerBot, MessengerBot } from "@dongdev/fca-unofficial";
import TheophilusX from "../core/TheophilusX";
import fs from "fs";
import TXAdapterBuilder from "../core/adapter/TXAdapterBuilder";
import {
  MessengerMessageEvent,
  ThreadEvent,
} from "../types/facebookAdapter/types";
import { TXIAuthor, TXIContext, TXPlatform } from "../core/context/TXContext";
import TXCommandArgumentParser from "../core/command/parser/TXCommandParser";
import TXMessageOptions from "../core/message/TXMessageOptions";
import { TXMessagePart } from "../core/message/TXMessagePart";
import TXSentMessage, {
  TXIWaitReplyOptions,
} from "../core/message/TXSentMessage";
import TXMessage from "../core/message/TXMessage";
import { sleep } from "../utils/sleep";
import path from "path";
import { downloadFile } from "../utils/downloadFile";
import os from "os";
import TXRateLimiter from "../core/utils/TXRateLimiter";
import TXMessageQueue from "../core/utils/TXMessageQueue";
import TXSlidingCache from "../core/utils/TXSlidingCache";

const rateLimiter = new TXRateLimiter({
  windowMs: 60_000,
  maxRequests: 7,
  cleanupIntervalMs: 5 * 60_000,
});

const queue = new TXMessageQueue({
  minDelayMs: 1000,
  maxDelayMs: 1500,
  switchDelayMinMs: 500,
  switchDelayMaxMs: 700,
});

const USER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 mins
export const userCache = new TXSlidingCache<TXIAuthor>(USER_CACHE_TTL_MS);

export default async function buildFacebookAdapter(
  instance: TheophilusX,
  appstateRaw: string,
) {
  let bot: MessengerBot;
  let adapter = new TXAdapterBuilder()
    .setLoginManager(async () => {
      const appState = JSON.parse(appstateRaw);

      bot ??= await createMessengerBot(
        { appState },
        {
          listenEvents: true,
          stopOnSignals: true,
          logLevel: "info",
          online: true,
          emitReady: true,
          autoReconnect: true,
          updatePresence: true,
        },
      );

      if (!bot) return;

      bot.on("ready", () => log("MQTT connected and ready"));
      bot.on("error", (e) => log(e));

      bot.on("messageCreate", async (event: MessengerMessageEvent) => {
        const isAdmin =
          instance
            .getConfig()
            .adminIds?.some((id) => id.facebookId === event.senderID) ?? false;

        const usedPrefix = instance.prefixes.find((p) =>
          event.body.startsWith(p),
        );
        const usedAdminPrefix = instance.adminPrefixes.find((p) =>
          event.body.startsWith(p),
        );

        const ctx = await buildFacebookContext(bot, instance, isAdmin, event);

        if (usedPrefix) {
          if (!rateLimiter.isAllowed(event.threadID)) return;
          const args = new TXCommandArgumentParser(
            usedPrefix,
            event.body,
            adapter,
            undefined,
          ).parse();
          instance.emit("commandCreate", ctx, args);
        } else if (usedAdminPrefix) {
          if (!rateLimiter.isAllowed(event.threadID)) return;
          const args = new TXCommandArgumentParser(
            usedAdminPrefix,
            event.body,
            adapter,
          ).parse();
          instance.emit("adminCommandCreate", ctx, args);
        } else {
          instance.emit("messageCreate", ctx, adapter);
        }
      });

      bot.on("threadUpdate", async (event: ThreadEvent) => {
        if (event.logMessageType === "log:subscribe") {
          const ids =
            event.logMessageData?.addedParticipants?.map((p) => p.userFbId) ??
            [];
          if (ids.length > 0) await getCachedUser(bot, instance, ...ids);

          const ctx = await buildFacebookContext(bot, instance, false, event);

          if (ids.length > 0) {
            const joinedId = ids[0];
            const infoMap = await getCachedUser(bot, instance, joinedId);
            const isAdmin =
              instance
                .getConfig()
                .adminIds?.some((id) => id.facebookId === joinedId) ?? false;

            ctx.author = infoMap[joinedId] ?? {
              id: joinedId,
              displayName: joinedId,
              username: joinedId,
              isAdmin,
              isSelf: false,
              avatarURL: avatarFallback(joinedId),
              isEveryone: false,
            };
          }

          instance.emit("userJoin", ctx, adapter);
        } else if (event.logMessageType === "log:unsubscribe") {
          const leftId = event.logMessageData?.leftParticipantFbId;
          if (leftId) await getCachedUser(bot, instance, leftId);

          const ctx = await buildFacebookContext(bot, instance, false, event);

          if (leftId) {
            const infoMap = await getCachedUser(bot, instance, leftId);
            const isAdmin =
              instance
                .getConfig()
                .adminIds?.some((id) => id.facebookId === leftId) ?? false;

            ctx.author = infoMap[leftId] ?? {
              id: leftId,
              displayName: leftId,
              username: leftId,
              isAdmin,
              isSelf: false,
              avatarURL: avatarFallback(leftId),
              isEveryone: false,
            };
          }

          instance.emit("userLeave", ctx, adapter);
        }
      });

      bot.catch((e, ctx) =>
        log(`Middleware error found at thread ${ctx?.threadID}: ${e}`),
      );
    })

    .setMessageSender(async (target, message) => {
      const { body, mentions, attachmentPaths } = await resolveMessage(
        bot,
        instance,
        message,
      );
      const result = await typeMessage(
        bot,
        target,
        async () =>
          await bot.ctx.api.sendMessage(
            {
              body,
              mentions,
              attachment:
                attachmentPaths.length > 0
                  ? await Promise.all(attachmentPaths.map(resolveAttachment))
                  : undefined,
            },
            target,
          ),
      );

      const ctx = await buildFacebookContext(bot, instance, false, {
        type: "message",
        senderID: bot.ctx.api.getCurrentUserID(),
        threadID: target,
        messageID: result.messageID,
        body,
        args: body.split(" "),
        attachments: [],
        mentions: {},
        timestamp: String(Date.now()),
        isGroup: true,
        participantIDs: [],
        isUnread: false,
      } as unknown as MessengerMessageEvent);

      return new TXSentMessage(
        ctx,
        facebookWaitReply(bot, instance, result.messageID),
      );
    })

    .setReplySender(async (ctx, message) => {
      const raw = ctx.raw as MessengerMessageEvent;
      const { body, mentions, attachmentPaths } = await resolveMessage(
        bot,
        instance,
        message,
      );

      const result = await typeMessage(
        bot,
        ctx.serverId,
        async () =>
          await bot.ctx.api.sendMessage(
            {
              body,
              mentions,
              attachment:
                attachmentPaths.length > 0
                  ? await Promise.all(attachmentPaths.map(resolveAttachment))
                  : undefined,
            },
            ctx.serverId,
            undefined,
            raw.messageID,
          ),
      );

      ctx.replied = true;
      return new TXSentMessage(
        ctx,
        facebookWaitReply(bot, instance, result.messageID),
      );
    })

    .setEmojiReactor(async (ctx, emoji) => {
      const raw = ctx.raw as MessengerMessageEvent;
      if (!raw?.messageID) return;
      await sleep(700, 1500);
      await bot.ctx.api.setMessageReaction(emoji, raw.messageID, ctx.serverId);
    })

    .setUserGetter(async (ctx) => {
      const raw = ctx.raw as MessengerMessageEvent;
      const participantIDs = raw.participantIDs ?? [];
      const selfID = bot.ctx.api.getCurrentUserID();
      const infoMap = await getCachedUser(bot, instance, ...participantIDs);

      return participantIDs.map(
        (id) =>
          infoMap[id] ?? {
            id,
            displayName: id,
            username: id,
            isAdmin: false,
            isSelf: false,
            avatarURL: avatarFallback(id),
            isEveryone: false,
          },
      );
    })

    .setAnnouncementSender(async (message) => {
      const { body, mentions, attachmentPaths } = await resolveMessage(
        bot,
        instance,
        message,
      );
      const threadList = await bot.client.threads.getList(500, null, ["INBOX"]);
      const groups = threadList.filter((t: any) => t.isGroup);

      if (groups.length === 0) return null;

      let first: TXSentMessage | null = null;

      for (const thread of groups) {
        try {
          const attachments =
            attachmentPaths.length > 0
              ? await Promise.all(attachmentPaths.map(resolveAttachment))
              : undefined;

          const result = await typeMessage(bot, thread.threadID, () =>
            bot.ctx.api.sendMessage(
              { body, mentions, attachment: attachments },
              thread.threadID,
            ),
          );

          const ctx = await buildFacebookContext(bot, instance, false, {
            type: "message",
            senderID: bot.ctx.api.getCurrentUserID(),
            threadID: thread.threadID,
            messageID: result.messageID,
            body,
            args: body.split(" "),
            attachments: [],
            mentions: {},
            timestamp: String(Date.now()),
            isGroup: true,
            participantIDs: [],
            isUnread: false,
          } as unknown as MessengerMessageEvent);

          const sent = new TXSentMessage(
            ctx,
            facebookWaitReply(bot, instance, result.messageID),
          );
          if (!first) first = sent;
        } catch (e) {
          log(`Announcement failed for thread ${thread.threadID}: ${e}`);
        }
      }

      return first;
    })

    .setUserResolver(async (userId) => {
      try {
        const infoMap = await getCachedUser(bot, instance, userId);
        return infoMap[userId] ?? null;
      } catch {
        return null;
      }
    })

    .setSelfUIDResolver(() => {
      return bot.ctx.api.getCurrentUserID();
    })

    .setUserKicker(async (targetUserID, serverID) => {
      try {
        await sleep(500, 1000);
        await bot.ctx.api.removeUserFromGroup(targetUserID, serverID);
      } catch (e) {
        log(`Failed to leave ${serverID}: ${e}`);
      }
    })

    .setServersUIDGetter(async () => {
      const threadList = await bot.client.threads.getList(500, null, ["INBOX"]);
      const groups = threadList.filter((t: any) => t.isGroup);
      return groups.map((t: any) => t.threadID);
    });

  userCache.scheduleCleanup(60_000);
  return adapter;
}

// ---------------------------------------------------------------------------
// User cache — stores TXIAuthor, fetches via flat API
// ---------------------------------------------------------------------------

async function getCachedUser(
  bot: MessengerBot,
  instance: TheophilusX,
  ...ids: string[]
): Promise<Record<string, TXIAuthor>> {
  const result: Record<string, TXIAuthor> = {};
  const selfID = bot.ctx.api.getCurrentUserID();

  await Promise.all(
    ids.map(async (id) => {
      const author = await userCache.getOrInit(id, async () => {
        const info = await new Promise<any>((resolve, reject) => {
          bot.ctx.api.getUserInfo([id], (err: any, data: any) => {
            if (err) reject(err);
            else resolve(data?.[id]);
          });
        });

        const displayName = info?.name ?? info?.vanity ?? id;
        const username = info?.vanity ?? id;

        return {
          id,
          displayName,
          username,
          isAdmin:
            instance
              .getConfig()
              .adminIds?.some((a: any) => a.facebookId === id) ?? false,
          isSelf: selfID === id,
          avatarURL: avatarFallback(displayName, info?.thumbSrc),
          isEveryone: false,
        } as TXIAuthor;
      });

      result[id] = author;
    }),
  );

  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function avatarFallback(name: string | undefined, thumbSrc?: string) {
  return (
    thumbSrc ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name ?? "User")}&background=7c3aed&color=ffffff&size=256`
  );
}

async function resolveAttachment(p: string): Promise<fs.ReadStream> {
  if (typeof (p as any).pipe === "function") return p as any;
  if (p.startsWith("http://") || p.startsWith("https://")) {
    const ext = (() => {
      try {
        return path.extname(new URL(p).pathname) || ".jpg";
      } catch {
        return ".jpg";
      }
    })();
    const tmp = path.join(
      os.tmpdir(),
      `tx_attach_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`,
    );
    await downloadFile(p, tmp);
    const stream = fs.createReadStream(tmp);
    stream.on("close", () => fs.unlink(tmp, () => {}));
    return stream;
  }
  return fs.createReadStream(p);
}

async function resolveMessage(
  bot: MessengerBot,
  instance: TheophilusX,
  message: TXMessageOptions | string,
): Promise<{
  body: string;
  mentions: { tag: string; id: string; fromIndex: number }[];
  attachmentPaths: string[];
}> {
  if (typeof message === "string") {
    return { body: message, mentions: [], attachmentPaths: [] };
  }
  const { body, mentions } = await resolvePartsToFca(
    bot,
    instance,
    message.parts,
  );
  return { body, mentions, attachmentPaths: message.attachments ?? [] };
}

async function resolvePartsToFca(
  bot: MessengerBot,
  instance: TheophilusX,
  parts: TXMessagePart[] | undefined,
): Promise<{
  body: string;
  mentions: { tag: string; id: string; fromIndex: number }[];
}> {
  let body = "";
  const mentions: { tag: string; id: string; fromIndex: number }[] = [];

  const mentionParts = (parts ?? []).filter(
    (p): p is Extract<TXMessagePart, { type: "mention" }> =>
      p.type === "mention",
  );
  const infoMap: Record<string, TXIAuthor> =
    mentionParts.length > 0
      ? await getCachedUser(bot, instance, ...mentionParts.map((p) => p.userId))
      : {};

  for (const part of parts ?? []) {
    if (part.type === "text") {
      body += part.value;
    } else if (part.type === "mention") {
      const info = infoMap[part.userId];
      const tag = `@${info?.displayName ?? info?.username ?? part.displayName}`;
      const fromIndex = body.length;
      body += tag;
      mentions.push({ tag, id: part.userId, fromIndex });
    }
  }

  return { body, mentions };
}

function log(msg: any) {
  if (typeof msg === "object" && msg !== null && !Array.isArray(msg)) {
    console.log(`[FB Adapter]: ${JSON.stringify(msg, null, 2)}`);
  } else {
    console.log(`[FB Adapter]: ${msg}`);
  }
}

// ---------------------------------------------------------------------------
// Context builder
// ---------------------------------------------------------------------------

async function buildFacebookContext(
  bot: MessengerBot,
  instance: TheophilusX,
  isAdmin: boolean,
  raw: unknown,
): Promise<TXIContext> {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("buildFacebookContext: raw is not an object");
  }

  const obj = raw as Record<string, unknown>;

  // Narrow to MessengerMessageEvent
  if (
    "senderID" in obj &&
    "messageID" in obj &&
    typeof obj.senderID === "string" &&
    typeof obj.threadID === "string"
  ) {
    const event = raw as MessengerMessageEvent;
    const selfID = bot.ctx.api.getCurrentUserID();
    const senderID = event.senderID;
    const threadID = event.threadID;

    const mentionIDs = Object.keys(event.mentions ?? {});
    const replyTargetID = event.messageReply?.senderID;
    const shouldAddReplyTarget =
      replyTargetID &&
      replyTargetID !== senderID &&
      !mentionIDs.includes(replyTargetID);

    const allIDsToFetch = shouldAddReplyTarget
      ? [senderID, ...mentionIDs, replyTargetID]
      : [senderID, ...mentionIDs];

    const infoMap = await getCachedUser(bot, instance, ...allIDsToFetch);
    const sender = infoMap[senderID];

    const mentions: TXIAuthor[] = mentionIDs.map(
      (id) =>
        infoMap[id] ?? {
          id,
          displayName: id,
          username: id,
          isAdmin: false,
          isSelf: selfID === id,
          avatarURL: avatarFallback(id),
          isEveryone: false,
        },
    );

    if (shouldAddReplyTarget) {
      const info = infoMap[replyTargetID];
      mentions.unshift(
        info ?? {
          id: replyTargetID,
          displayName: replyTargetID,
          username: replyTargetID,
          isAdmin: false,
          isSelf: selfID === replyTargetID,
          avatarURL: avatarFallback(replyTargetID),
          isEveryone: false,
        },
      );
    }

    return {
      platform: TXPlatform.FacebookMessenger,
      content: event.body ?? "",
      isDM: !event.isGroup,
      author: sender ?? {
        id: senderID,
        displayName: senderID,
        username: senderID,
        isAdmin,
        isSelf: selfID === senderID,
        avatarURL: avatarFallback(senderID),
        isEveryone: false,
      },
      mentions,
      channelId: threadID,
      serverId: threadID,
      timestamp: event.timestamp
        ? new Date(Number(event.timestamp))
        : new Date(),
      metadata: {},
      replied: false,
      raw,
    };
  }

  // Narrow to ThreadEvent
  if ("logMessageType" in obj && typeof obj.threadID === "string") {
    const event = raw as ThreadEvent;
    const threadID = event.threadID;
    const selfID = bot.ctx.api.getCurrentUserID();

    const infoMap = await getCachedUser(bot, instance, event.author);
    const author = infoMap[event.author];

    return {
      platform: TXPlatform.FacebookMessenger,
      content: event.logMessageBody ?? "",
      isDM: false,
      author: author ?? {
        id: event.author,
        displayName: event.author,
        username: event.author,
        isAdmin,
        isSelf: selfID === event.author,
        avatarURL: avatarFallback(event.author),
        isEveryone: false,
      },
      mentions: [],
      channelId: threadID,
      serverId: threadID,
      timestamp: new Date(),
      metadata: {},
      replied: false,
      raw,
    };
  }

  throw new Error("buildFacebookContext: unknown event shape");
}

// ---------------------------------------------------------------------------
// Wait reply
// ---------------------------------------------------------------------------

function facebookWaitReply(
  bot: MessengerBot,
  instance: TheophilusX,
  sentMessageID: string,
) {
  return function (
    ctx: TXIContext,
    options: TXIWaitReplyOptions,
  ): Promise<TXMessage | null> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        bot.off("messageCreate", handler as any);
        resolve(null);
      }, options.timeout);

      async function handler(event: MessengerMessageEvent) {
        if (event.threadID !== ctx.serverId) return;
        if (event.type !== "message_reply") return;
        if ((event as any).messageReply?.messageID !== sentMessageID) return;

        const incoming = await buildFacebookContext(
          bot,
          instance,
          ctx.author.isAdmin,
          event,
        );
        if (options.filter && !options.filter(incoming)) return;

        clearTimeout(timer);
        bot.off("messageCreate", handler as any);
        resolve(new TXMessage(incoming, makeReplyFn(bot, instance, incoming)));
      }

      bot.on("messageCreate", handler as any);
    });
  };
}

function makeReplyFn(
  bot: MessengerBot,
  instance: TheophilusX,
  ctx: TXIContext,
) {
  return async (
    msg: TXMessageOptions | string,
  ): Promise<TXSentMessage | null> => {
    const raw = ctx.raw as MessengerMessageEvent;
    const { body, mentions, attachmentPaths } = await resolveMessage(
      bot,
      instance,
      msg,
    );

    const result = await bot.ctx.api.sendMessage(
      {
        body,
        mentions,
        attachment:
          attachmentPaths.length > 0
            ? await Promise.all(attachmentPaths.map(resolveAttachment))
            : undefined,
      },
      ctx.serverId,
      undefined,
      raw.messageID,
    );

    ctx.replied = true;
    return new TXSentMessage(
      ctx,
      facebookWaitReply(bot, instance, result.messageID),
    );
  };
}

// ---------------------------------------------------------------------------
// Type message
// ---------------------------------------------------------------------------

function typeMessage(
  bot: MessengerBot,
  threadID: string,
  fn: () => Promise<any>,
): Promise<any> {
  return new Promise((resolve, reject) => {
    queue.enqueue(threadID, async () => {
      try {
        await bot.ctx.api.sendTypingIndicator(threadID);
        await sleep(700, 1000);
        resolve(await fn());
      } catch (e) {
        reject(e);
      }
    });
  });
}
