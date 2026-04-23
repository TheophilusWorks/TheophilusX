import fs from "fs";
import login from "@dongdev/fca-unofficial";
import TXAdapterBuilder from "../core/adapter/TXAdapterBuilder.js";
import { TXIContext, TXPlatform } from "../core/context/TXContext.js";
import TheophilusX from "../core/TheophilusX.js";
import TXCommandArgumentParser from "../core/command/parser/TXCommandParser.js";
import TXSentMessage, {
  TXIWaitReplyOptions,
} from "../core/message/TXSentMessage.js";
import TXMessage from "../core/message/TXMessage.js";
import TXMessageOptions from "../core/message/TXMessageOptions.js";
import { TXMessagePart } from "../core/message/TXMessagePart.js";
import TXRateLimiter, {
  TXRateLimiterOptions,
} from "../core/utils/TXRateLimiter.js";
import TXMessageQueue, {
  TXMessageQueueOptions,
} from "../core/utils/TXMessageQueue.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TXFacebookAdapterOptions {
  rateLimit?: TXRateLimiterOptions;
  queue?: TXMessageQueueOptions;
}

interface FcaMessageInfo {
  messageID: string;
  threadID: string;
  timestamp: number;
}

interface FcaEvent {
  type: string;
  threadID: string;
  senderID: string;
  body?: string;
  timestamp?: number;
  messageID?: string;
  mentions?: Record<string, string>;
  isGroup?: boolean;
}

interface FcaThread {
  threadID: string;
  isGroup: boolean;
  threadType?: string;
  name?: string;
}

// ---------------------------------------------------------------------------
// Resolvers
// ---------------------------------------------------------------------------

const userNameCache = new Map<
  string,
  { displayName: string; username: string; avatarURL?: string }
>();

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
      // fix #8: guard — only treat as mention if userId is present
      const tag = `@${part.displayName ?? part.userId}`;
      const fromIndex = body.length;
      body += tag;
      mentions.push({ tag, id: part.userId, fromIndex });
    } else {
      // malformed part — log and skip rather than silently corrupt the message
      console.warn("[FB] resolvePartsToFca: skipping malformed part:", part);
    }
  }

  return { body, mentions };
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
    // fix #3: store paths only — streams are opened inside fcaSend, not here
    attachmentPaths: message.attachments ?? [],
  };
}

// ---------------------------------------------------------------------------
// fca sendMessage — promisified
// fix #3: ReadStreams are created here, right before the actual send,
// so they are never stale from sitting in the queue.
// ---------------------------------------------------------------------------

function fcaSend(
  api: any,
  threadID: string,
  body: string,
  mentions: { tag: string; id: string; fromIndex: number }[],
  attachmentPaths: string[],
  replyToMessageID?: string,
): Promise<FcaMessageInfo> {
  return new Promise((resolve, reject) => {
    const msg: Record<string, any> = {};
    if (body) msg.body = body;
    if (mentions.length > 0) msg.mentions = mentions;
    // fix #3: open fresh ReadStreams here, not at resolveMessage time
    if (attachmentPaths.length > 0) {
      msg.attachment = attachmentPaths.map((p) => fs.createReadStream(p));
    }

    api.sendMessage(
      msg,
      threadID,
      (err: any, info: FcaMessageInfo) => {
        if (err) return reject(err);
        resolve(info);
      },
      replyToMessageID,
    );
  });
}

// ---------------------------------------------------------------------------
// Fetch ALL group threads the bot is in
// ---------------------------------------------------------------------------

function fetchAllGroupThreads(api: any): Promise<FcaThread[]> {
  return new Promise((resolve, reject) => {
    api.getThreadList(500, null, [], (err: any, threads: FcaThread[]) => {
      if (err) return reject(err);

      const groups = threads.filter(
        (t) => t.isGroup === true || t.threadType === "GROUP",
      );

      console.log(
        `[FB] Found ${groups.length} group thread(s) out of ${threads.length} total.`,
      );

      resolve(groups);
    });
  });
}

// ---------------------------------------------------------------------------
// fix #4: MQTT reconnect with exponential backoff
// ---------------------------------------------------------------------------

const MQTT_RECONNECT_BASE_MS = 2_000;
const MQTT_RECONNECT_MAX_MS = 60_000;

function attachMqttReconnect(
  api: any,
  getMqttEmitter: () => any,
  setMqttEmitter: (e: any) => void,
  onMessage: (event: FcaEvent) => void,
) {
  let attempt = 0;

  function attach(emitter: any) {
    emitter.on("error", (err: any) => {
      console.error("[FB] MQTT error:", err);
    });

    emitter.on("close", () => {
      const delay = Math.min(
        MQTT_RECONNECT_BASE_MS * 2 ** attempt,
        MQTT_RECONNECT_MAX_MS,
      );
      attempt++;
      console.warn(
        `[FB] MQTT connection closed. Reconnecting in ${delay}ms (attempt ${attempt})...`,
      );
      setTimeout(() => {
        try {
          const newEmitter = api.listenMqtt();
          setMqttEmitter(newEmitter);
          attach(newEmitter);
          attempt = 0; // reset on successful reconnect
          console.log("[FB] MQTT reconnected.");
        } catch (err) {
          console.error("[FB] MQTT reconnect failed:", err);
          // trigger close again via a fake close so the backoff loop continues
          getMqttEmitter()?.emit("close");
        }
      }, delay);
    });

    emitter.on("message", onMessage);
  }

  attach(getMqttEmitter());
}

// ---------------------------------------------------------------------------
// fix #7: dedicated self-context builder for outbound messages
// ---------------------------------------------------------------------------

function buildSelfContext(api: any, threadID: string, body: string): FcaEvent {
  return {
    type: "message",
    threadID,
    senderID: api.getCurrentUserID?.() ?? "",
    body,
    timestamp: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Main adapter builder
// ---------------------------------------------------------------------------

export default function buildFacebookAdapter(
  bot: TheophilusX,
  appStateRaw: string,
  options: TXFacebookAdapterOptions = {},
) {
  let api: any = null;
  let mqttEmitter: any = null;

  const rateLimiter = new TXRateLimiter(options.rateLimit);
  const queue = new TXMessageQueue(options.queue);

  function queuedSend(
    threadID: string,
    body: string,
    mentions: { tag: string; id: string; fromIndex: number }[],
    attachmentPaths: string[],
    replyToMessageID?: string,
  ): Promise<FcaMessageInfo> {
    return new Promise((resolve, reject) => {
      queue.enqueue(async () => {
        try {
          api.sendTypingIndicator(threadID);
          const typingMs = 300 + Math.random() * 500;
          await new Promise<void>((r) => setTimeout(r, typingMs));

          // fix #3: attachmentPaths are passed through; streams open inside fcaSend
          const info = await fcaSend(
            api,
            threadID,
            body,
            mentions,
            attachmentPaths,
            replyToMessageID,
          );
          resolve(info);
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Context builder
  // ---------------------------------------------------------------------------
  async function resolveUserInfo(
    senderID: string,
  ): Promise<{ displayName: string; username: string; avatarURL?: string }> {
    if (userNameCache.has(senderID)) return userNameCache.get(senderID)!;

    return new Promise((resolve) => {
      api.getUserInfo(senderID, (err: any, data: any) => {
        // on error or missing data, fall back to ID gracefully
        const info =
          !err && data?.[senderID]
            ? {
                displayName: data[senderID].name,
                username: data[senderID].vanity ?? senderID,
                avatarURL: data[senderID].thumbSrc ?? undefined,
              }
            : {
                displayName: senderID,
                username: senderID,
                avatarURL: undefined,
              };

        userNameCache.set(senderID, info);
        resolve(info);
      });
    });
  }

  async function buildFacebookContext(
    isAdmin: boolean,
    event: FcaEvent,
  ): Promise<TXIContext> {
    const selfID: string = api?.getCurrentUserID?.() ?? "";
    const { displayName, username, avatarURL } = await resolveUserInfo(
      event.senderID,
    );

    return {
      platform: TXPlatform.FacebookMessenger,
      content: event.body ?? "",
      author: {
        id: event.senderID,
        displayName,
        username,
        isAdmin,
        isSelf: selfID === event.senderID,
        avatarURL,
        isEveryone: event.body?.includes("@everyone") ?? false, // <-- add this
      },
      mentions: Object.entries(event.mentions ?? {}).map(([id, name]) => ({
        id,
        displayName: name,
        username: name,
        isAdmin:
          bot.getConfig().adminIds?.some((a: any) => a.facebookId === id) ??
          false,
        isSelf: selfID === id,
        avatarURL,
        isEveryone: false,
      })),
      serverId: event.threadID,
      timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
      metadata: {},
      replied: false,
      raw: event,
    };
  }

  // ---------------------------------------------------------------------------
  // waitReply
  // ---------------------------------------------------------------------------

  function makeFacebookReplyFn(incoming: TXIContext, rawMessageID: string) {
    return async (
      msg: TXMessageOptions | string,
    ): Promise<TXSentMessage | null> => {
      const { body, mentions, attachmentPaths } = resolveMessage(msg);
      const info = await queuedSend(
        incoming.serverId,
        body,
        mentions,
        attachmentPaths,
        rawMessageID,
      );
      incoming.replied = true;
      return new TXSentMessage(incoming, facebookWaitReply(info.messageID));
    };
  }

  function facebookWaitReply(sentMessageID: string) {
    return function (
      ctx: TXIContext,
      options: TXIWaitReplyOptions,
    ): Promise<TXMessage | null> {
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          mqttEmitter?.off("message", handler);
          resolve(null);
        }, options.timeout);

        async function handler(event: FcaEvent) {
          if (event.type !== "message_reply") return;
          if (event.threadID !== ctx.serverId) return;
          const replyTarget = (event as any).messageReply?.messageID;
          if (replyTarget !== sentMessageID) return;

          const isAdmin =
            bot
              .getConfig()
              .adminIds?.some((a: any) => a.facebookId === event.senderID) ??
            false;

          const incoming = await buildFacebookContext(isAdmin, event);
          if (options.filter && !options.filter(incoming)) return;

          clearTimeout(timer);
          mqttEmitter?.off("message", handler);

          resolve(
            new TXMessage(
              incoming,
              makeFacebookReplyFn(incoming, event.messageID ?? ""),
            ),
          );
        }

        mqttEmitter?.on("message", handler);
      });
    };
  }

  // ---------------------------------------------------------------------------
  // Adapter
  // ---------------------------------------------------------------------------

  const adapter = new TXAdapterBuilder()
    .setLoginManager(async () => {
      const appState = JSON.parse(appStateRaw);

      await new Promise<void>((resolve, reject) => {
        login({ appState }, (err: any, _api: any) => {
          if (err) return reject(err);
          api = _api;

          api.setOptions({
            listenEvents: true,
            logLevel: "silent",
            autoMarkDelivery: false,
            autoMarkRead: false,
          });

          api.on?.("sessionExpired", () =>
            console.warn("[FB] Session expired — attempting auto-login..."),
          );
          api.on?.("autoLoginSuccess", () =>
            console.log("[FB] Auto-login succeeded."),
          );
          api.on?.("autoLoginFailed", () =>
            console.error(
              "[FB] Auto-login failed. Manual intervention needed.",
            ),
          );
          api.on?.("checkpoint", (data: any) =>
            console.error("[FB] Checkpoint triggered:", data?.type),
          );

          resolve();
        });
      });

      // fix #4: use attachMqttReconnect instead of raw mqttEmitter.on
      mqttEmitter = api.listenMqtt();

      attachMqttReconnect(
        api,
        () => mqttEmitter,
        (e) => {
          mqttEmitter = e;
        },
        async (event: FcaEvent) => {
          if (event.type !== "message" && event.type !== "message_reply")
            return;
          if (!event.body?.trim()) return;

          const senderID = event.senderID;
          const selfID: string = api.getCurrentUserID?.() ?? "";

          if (senderID === selfID) return;
          if (!rateLimiter.isAllowed(senderID)) return;

          const isAdmin =
            bot
              .getConfig()
              .adminIds?.some((id: any) => id.facebookId === senderID) ?? false;

          const ctx = await buildFacebookContext(isAdmin, event);

          const usedPrefix = bot.prefixes.find((p: string) =>
            event.body!.startsWith(p),
          );
          const usedAdminPrefix = bot.adminPrefixes.find((p: string) =>
            event.body!.startsWith(p),
          );

          if (usedPrefix) {
            const args = new TXCommandArgumentParser(
              usedPrefix,
              event.body!,
              adapter,
              undefined,
            ).parse();
            bot.emit("commandCreate", ctx, args);
          } else if (usedAdminPrefix) {
            const args = new TXCommandArgumentParser(
              usedAdminPrefix,
              event.body!,
              adapter,
            ).parse();
            bot.emit("adminCommandCreate", ctx, args);
          } else {
            bot.emit("messageCreate", ctx, adapter);
          }
        },
      );
    })

    .setMessageSender(async (target, message) => {
      const { body, mentions, attachmentPaths } = resolveMessage(message);
      const info = await queuedSend(target, body, mentions, attachmentPaths);

      // fix #7: use buildSelfContext to make intent explicit
      const ctx = await buildFacebookContext(
        false,
        buildSelfContext(api, target, body),
      );

      return new TXSentMessage(ctx, facebookWaitReply(info.messageID));
    })

    .setReplySender(async (ctx, message) => {
      const { body, mentions, attachmentPaths } = resolveMessage(message);
      const originalMessageID: string = (ctx.raw as FcaEvent)?.messageID ?? "";

      const info = await queuedSend(
        ctx.serverId,
        body,
        mentions,
        attachmentPaths,
        originalMessageID,
      );

      ctx.replied = true;
      return new TXSentMessage(ctx, facebookWaitReply(info.messageID));
    })

    .setAnnouncementSender(async (_ctx, message) => {
      const { body, mentions, attachmentPaths } = resolveMessage(message);

      let groupThreads: FcaThread[];
      try {
        groupThreads = await fetchAllGroupThreads(api);
      } catch (err) {
        console.error("[FB] Failed to fetch group thread list:", err);
        return null;
      }

      if (groupThreads.length === 0) {
        console.warn("[FB] No group threads found — announcement not sent.");
        return null;
      }

      let first: TXSentMessage | null = null;

      for (const thread of groupThreads) {
        try {
          const info = await queuedSend(
            thread.threadID,
            body,
            mentions,
            attachmentPaths,
          );

          // fix #7: use buildSelfContext
          const ctx = await buildFacebookContext(
            false,
            buildSelfContext(api, thread.threadID, body),
          );

          const sent = new TXSentMessage(
            ctx,
            facebookWaitReply(info.messageID),
          );
          if (!first) first = sent;
        } catch (err) {
          console.error(
            `[FB] Announcement failed for group ${thread.threadID} (${thread.name ?? "unnamed"}):`,
            err,
          );
        }
      }

      return first;
    })
    .setUserResolver(async (userId) => {
      try {
        const { displayName, username, avatarURL } =
          await resolveUserInfo(userId);
        const selfID: string = api?.getCurrentUserID?.() ?? "";

        return {
          id: userId,
          displayName,
          username,
          avatarURL,
          isAdmin:
            bot
              .getConfig()
              .adminIds?.some((a: any) => a.facebookId === userId) ?? false,
          isSelf: selfID === userId,
          isEveryone: false,
        };
      } catch {
        return null;
      }
    });

  return adapter;
}
