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

const rateLimiter = new TXRateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
  cleanupIntervalMs: 5 * 60_000,
});

const queue = new TXMessageQueue({
  minDelayMs: 1000,
  maxDelayMs: 1500,
  switchDelayMinMs: 500,
  switchDelayMaxMs: 700,
});

interface CachedUserInfo {
  name: string;
  vanity?: string;
  thumbSrc?: string;
  cachedAt: number;
}

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

      bot.on("ready", () => {
        log("MQTT connected and ready");
      });

      bot.on("error", (e) => log(e));

      bot.on("messageCreate", async (event: MessengerMessageEvent) => {
        if (!rateLimiter.isAllowed(event.threadID)) return;
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
          const args = new TXCommandArgumentParser(
            usedPrefix,
            event.body,
            adapter,
            undefined,
          ).parse();
          instance.emit("commandCreate", ctx, args);
        } else if (usedAdminPrefix) {
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
        const isAdmin =
          instance
            .getConfig()
            .adminIds?.some((id) => id.facebookId === event.author) ?? false;

        const ctx = await buildFacebookContext(bot, instance, isAdmin, event);

        if (event.logMessageType === "log:subscribe") {
          instance.emit("userJoin", ctx, adapter);
        } else if (event.logMessageType === "log:unsubscribe") {
          instance.emit("userLeave", ctx, adapter);
        }
      });

      bot.catch((e, ctx) =>
        log(`Middleware error found at thread ${ctx?.threadID}: ${e}`),
      );
    })

    .setMessageSender(async (target, message) => {
      const { body, mentions, attachmentPaths } = resolveMessage(message);
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
      const { body, mentions, attachmentPaths } = resolveMessage(message);

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

      const infoMap = await getCachedUserInfo(bot, ...participantIDs);

      return participantIDs
        .filter((id) => id !== selfID)
        .map((id) => {
          const info = infoMap[id];
          const displayName = info?.name ?? id;
          return {
            id,
            displayName,
            username: info?.vanity ?? id,
            isAdmin:
              instance
                .getConfig()
                .adminIds?.some((a: any) => a.facebookId === id) ?? false,
            isSelf: false,
            avatarURL: avatarFallback(displayName, info?.thumbSrc),
            isEveryone: false,
          };
        });
    })

    .setAnnouncementSender(async (message) => {
      const { body, mentions, attachmentPaths } = resolveMessage(message);

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
      const infoMap = await getCachedUserInfo(bot, userId);
      const info = infoMap[userId];
      const selfID = bot.ctx.api.getCurrentUserID();
      const displayName = info?.name ?? userId;

      return {
        id: userId,
        displayName,
        username: info?.vanity ?? userId,
        isAdmin:
          instance
            .getConfig()
            .adminIds?.some((a: any) => a.facebookId === userId) ?? false,
        isSelf: selfID === userId,
        avatarURL: avatarFallback(displayName, info?.thumbSrc),
        isEveryone: false,
      };
    });

  return adapter;
}
const USER_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const userInfoCache = new Map<string, CachedUserInfo>();

async function getCachedUserInfo(
  bot: MessengerBot,
  ...ids: string[]
): Promise<Record<string, CachedUserInfo>> {
  const now = Date.now();
  const result: Record<string, CachedUserInfo> = {};
  const toFetch: string[] = [];

  for (const id of ids) {
    const cached = userInfoCache.get(id);
    if (cached && now - cached.cachedAt < USER_CACHE_TTL_MS) {
      result[id] = cached;
    } else {
      toFetch.push(id);
    }
  }

  if (toFetch.length > 0) {
    const fetched = await bot.client.users.getInfo(...toFetch);
    for (const id of toFetch) {
      const info = fetched[id];
      if (info) {
        const entry: CachedUserInfo = {
          name: info.name ?? id,
          vanity: info.vanity,
          thumbSrc: info.thumbSrc,
          cachedAt: now,
        };
        userInfoCache.set(id, entry);
        result[id] = entry;
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function avatarFallback(name: string, thumbSrc?: string) {
  return (
    thumbSrc ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=7c3aed&color=ffffff&size=256`
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
    return fs.createReadStream(tmp);
  }
  return fs.createReadStream(p);
}

function resolveMessage(message: TXMessageOptions | string): {
  body: string;
  mentions: { tag: string; id: string; fromIndex: number }[];
  attachmentPaths: string[];
} {
  if (typeof message === "string") {
    return { body: message, mentions: [], attachmentPaths: [] };
  }
  const { body, mentions } = resolvePartsToFca(message.parts);
  return {
    body,
    mentions,
    attachmentPaths: message.attachments ?? [],
  };
}

function resolvePartsToFca(parts: TXMessagePart[] | undefined): {
  body: string;
  mentions: { tag: string; id: string; fromIndex: number }[];
} {
  let body = "";
  const mentions: { tag: string; id: string; fromIndex: number }[] = [];

  for (const part of parts ?? []) {
    if (part.type === "text") {
      body += part.value;
    } else if (part.userId) {
      const tag = `@${part.displayName ?? "Facebook User"}`;
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

    const infoMap = await getCachedUserInfo(bot, ...allIDsToFetch);

    const sender = infoMap[senderID];
    const displayName = sender?.name ?? senderID;

    const mentions: TXIAuthor[] = mentionIDs.map((id) => {
      const info = infoMap[id];
      const mDisplayName = info?.name ?? id;
      return {
        id,
        displayName: mDisplayName,
        username: info?.vanity ?? id,
        isAdmin:
          instance
            .getConfig()
            .adminIds?.some((a: any) => a.facebookId === id) ?? false,
        isSelf: selfID === id,
        avatarURL: avatarFallback(mDisplayName, info?.thumbSrc),
        isEveryone: false,
      };
    });

    if (shouldAddReplyTarget) {
      const info = infoMap[replyTargetID];
      const mDisplayName = info?.name ?? replyTargetID;
      mentions.unshift({
        id: replyTargetID,
        displayName: mDisplayName,
        username: info?.vanity ?? replyTargetID,
        isAdmin:
          instance
            .getConfig()
            .adminIds?.some((a: any) => a.facebookId === replyTargetID) ??
          false,
        isSelf: selfID === replyTargetID,
        avatarURL: avatarFallback(mDisplayName, info?.thumbSrc),
        isEveryone: false,
      });
    }

    return {
      platform: TXPlatform.FacebookMessenger,
      content: event.body ?? "",
      isDM: !event.isGroup,
      author: {
        id: senderID,
        displayName,
        username: sender?.vanity ?? senderID,
        isAdmin,
        isSelf: selfID === senderID,
        avatarURL: avatarFallback(displayName, sender?.thumbSrc),
        isEveryone: (event.body ?? "").includes("@everyone"),
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

    return {
      platform: TXPlatform.FacebookMessenger,
      content: event.logMessageBody ?? "",
      isDM: false,
      author: {
        id: event.author,
        displayName: event.author,
        username: event.author,
        isAdmin,
        isSelf: false,
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
    const { body, mentions, attachmentPaths } = resolveMessage(msg);

    const result = await bot.ctx.api.sendMessage(
      {
        body,
        mentions,
        attachment:
          attachmentPaths.length > 0
            ? attachmentPaths.map(resolveAttachment)
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
