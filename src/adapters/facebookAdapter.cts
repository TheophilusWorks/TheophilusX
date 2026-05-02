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
import path from "path";
import { sleep } from "../utils/sleep.js";
import { randomRange } from "../utils/randomRange.js";

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
  logMessageData?: {
    addedParticipants?: { userFbId?: string; id?: string }[];
    leftParticipantFbId?: string;
  };
}

interface FcaThread {
  threadID: string;
  isGroup: boolean;
  threadType?: string;
  name?: string;
}

// ---------------------------------------------------------------------------
// Appstate persistence
// ---------------------------------------------------------------------------

const APPSTATE_PATH =
  process.env.APPSTATE_PATH || `${process.env.HOME}/appstate.json`;

function loadAppState(fallbackRaw: string): any {
  try {
    if (fs.existsSync(APPSTATE_PATH)) {
      const content = fs.readFileSync(APPSTATE_PATH, "utf-8");
      console.log("[FB] Loaded appstate from file:", APPSTATE_PATH);
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn(
      "[FB] Failed to read appstate file, falling back to env var:",
      err,
    );
  }

  console.log("[FB] No appstate file found, seeding from env var...");
  const parsed = JSON.parse(fallbackRaw);
  saveAppState(parsed);
  return parsed;
}

function saveAppState(appState: any) {
  try {
    const dir = path.dirname(APPSTATE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(APPSTATE_PATH, JSON.stringify(appState), "utf-8");
    console.log("[FB] Appstate saved to:", APPSTATE_PATH);
  } catch (err) {
    console.error("[FB] Failed to save appstate:", err);
  }
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
      const tag = `@${part.displayName ?? part.userId}`;
      const fromIndex = body.length;
      body += tag;
      mentions.push({ tag, id: part.userId, fromIndex });
    } else {
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
    attachmentPaths: message.attachments ?? [],
  };
}

// ---------------------------------------------------------------------------
// fca sendMessage — promisified
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
// fca react
// ---------------------------------------------------------------------------

async function fcaReact(
  api: any,
  emoji: string,
  messageID: string,
  threadID: string,
): Promise<void> {
  const STANDARD = new Set(["👍", "❤️", "😮", "😢", "😆", "😠"]);
  const force = !STANDARD.has(emoji);

  await sleep(300, 1000);
  return api.setMessageReaction(emoji, messageID, threadID, force);
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
// Self-context builder for outbound messages
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

  // stopListening is the function returned by api.listenMqtt() — calling it
  // shuts down the MQTT connection cleanly before reconnecting.
  let stopListening: (() => void) | null = null;

  // All active waitReply handlers subscribe here.
  const replyListeners = new Set<(event: FcaEvent) => void>();

  const rateLimiter = new TXRateLimiter(options.rateLimit);
  const queue = new TXMessageQueue(options.queue);

  // Appstate auto-save interval handle — cleared on shutdown
  let appStateSaveInterval: ReturnType<typeof setInterval> | null = null;

  // Group logger interval handle — cleared on shutdown
  let groupLoggerInterval: ReturnType<typeof setTimeout> | null = null;

  // Tracks the last time any message was sent out (used by the group logger)
  let lastActivityMs = 0;

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

          const info = await fcaSend(
            api,
            threadID,
            body,
            mentions,
            attachmentPaths,
            replyToMessageID,
          );
          lastActivityMs = Date.now();
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
    ).catch(() => ({
      displayName: event.senderID,
      username: event.senderID,
      avatarURL: undefined,
    }));

    const mentionsMap = new Map<
      string,
      {
        id: string;
        displayName: string;
        username: string;
        isAdmin: boolean;
        isSelf: boolean;
        avatarURL?: string;
        isEveryone: boolean;
      }
    >();

    for (const [id, name] of Object.entries(event.mentions ?? {})) {
      mentionsMap.set(id, {
        id,
        displayName: name,
        username: name,
        isAdmin:
          bot.getConfig().adminIds?.some((a: any) => a.facebookId === id) ??
          false,
        isSelf: selfID === id,
        avatarURL,
        isEveryone: false,
      });
    }

    if (event.type === "message_reply") {
      const repliedSenderID: string | undefined = (event as any).messageReply
        ?.senderID;
      if (
        repliedSenderID &&
        repliedSenderID !== selfID &&
        !mentionsMap.has(repliedSenderID)
      ) {
        const {
          displayName: rDisplayName,
          username: rUsername,
          avatarURL: rAvatarURL,
        } = await resolveUserInfo(repliedSenderID).catch(() => ({
          displayName: repliedSenderID,
          username: repliedSenderID,
          avatarURL: undefined,
        }));

        mentionsMap.set(repliedSenderID, {
          id: repliedSenderID,
          displayName: rDisplayName,
          username: rUsername,
          isAdmin:
            bot
              .getConfig()
              .adminIds?.some((a: any) => a.facebookId === repliedSenderID) ??
            false,
          isSelf: false,
          avatarURL: rAvatarURL,
          isEveryone: false,
        });
      }
    }

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
        isEveryone: event.body?.includes("@everyone") ?? false,
      },
      mentions: [...mentionsMap.values()],
      serverId: event.threadID,
      channelId: event.threadID,
      timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
      metadata: {},
      replied: false,
      raw: event,
    };
  }

  // ---------------------------------------------------------------------------
  // Central event handler
  // ---------------------------------------------------------------------------

  async function onMqttEvent(event: FcaEvent) {
    // Fan out to any active waitReply listeners first
    for (const listener of replyListeners) {
      listener(event);
    }

    if (event.type === "event") {
      const logType = (event as any).logMessageType as string | undefined;

      if (logType === "log:subscribe") {
        const addedIDs: string[] =
          event.logMessageData?.addedParticipants
            ?.map((p) => p.userFbId ?? p.id)
            .filter((id): id is string => Boolean(id)) ?? [];

        for (const uid of addedIDs) {
          const isAdmin =
            bot.getConfig().adminIds?.some((a: any) => a.facebookId === uid) ??
            false;

          const ctx = await buildFacebookContext(isAdmin, {
            type: "log:subscribe",
            threadID: event.threadID,
            senderID: uid,
            timestamp: event.timestamp,
          });

          bot.emit("userJoin", ctx, adapter);
        }
        return;
      }

      if (logType === "log:unsubscribe") {
        const leftID: string =
          event.logMessageData?.leftParticipantFbId ?? event.senderID;

        if (leftID) {
          const isAdmin =
            bot
              .getConfig()
              .adminIds?.some((a: any) => a.facebookId === leftID) ?? false;

          const ctx = await buildFacebookContext(isAdmin, {
            type: "log:unsubscribe",
            threadID: event.threadID,
            senderID: leftID,
            timestamp: event.timestamp,
          });

          bot.emit("userLeave", ctx, adapter);
        }
        return;
      }

      return;
    }

    if (event.type !== "message" && event.type !== "message_reply") return;
    if (!event.body?.trim()) return;

    const senderID = event.senderID;
    const selfID: string = api.getCurrentUserID?.() ?? "";

    if (senderID === selfID) return;
    if (!rateLimiter.isAllowed(senderID)) return;

    const isAdmin =
      bot.getConfig().adminIds?.some((id: any) => id.facebookId === senderID) ??
      false;

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
  }

  // ---------------------------------------------------------------------------
  // MQTT connection with exponential backoff reconnect
  //
  // FIX: stopListening() MUST be called before starting a new listenMqtt()
  // call. Without this, the old MQTT connection lingers and fights the new
  // one, causing the "Connection refused: Server unavailable" loop you were
  // seeing — Facebook rejects a second simultaneous MQTT connection from the
  // same session.
  // ---------------------------------------------------------------------------

  const MQTT_RECONNECT_BASE_MS = 2_000;
  const MQTT_RECONNECT_MAX_MS = 60_000;
  let reconnectAttempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let mqttStopped = false; // guard against reconnect after intentional shutdown

  function startMqtt() {
    if (mqttStopped) return;

    // Always tear down the previous listener before starting a new one.
    // Per fca-unofficial docs: calling stopListening() when an error occurs
    // prevents the old listen loop from continuing.
    if (stopListening) {
      try {
        stopListening();
      } catch {
        // ignore — old connection may already be dead
      }
      stopListening = null;
    }

    try {
      stopListening = api.listenMqtt(async (err: any, event: FcaEvent) => {
        if (err) {
          console.error("[FB] MQTT error:", err?.message ?? err);
          // Call stopListening immediately on error per fca docs — this
          // prevents the old listener from firing again.
          if (stopListening) {
            try {
              stopListening();
            } catch {
              /* ignore */
            }
            stopListening = null;
          }
          scheduleReconnect();
          return;
        }

        reconnectAttempt = 0; // reset backoff on successful event
        await onMqttEvent(event);
      });

      console.log("[FB] MQTT listening started.");
    } catch (err) {
      console.error("[FB] listenMqtt() threw synchronously:", err);
      scheduleReconnect();
    }
  }

  function scheduleReconnect() {
    if (mqttStopped) return;
    if (reconnectTimer) return; // already scheduled

    const delay = Math.min(
      MQTT_RECONNECT_BASE_MS * 2 ** reconnectAttempt,
      MQTT_RECONNECT_MAX_MS,
    );
    reconnectAttempt++;

    console.warn(
      `[FB] MQTT disconnected. Reconnecting in ${delay}ms (attempt ${reconnectAttempt})...`,
    );

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      startMqtt();
    }, delay);
  }

  // ---------------------------------------------------------------------------
  // waitReply — uses replyListeners set instead of EventEmitter
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
          replyListeners.delete(handler);
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
          replyListeners.delete(handler);

          resolve(
            new TXMessage(
              incoming,
              makeFacebookReplyFn(incoming, event.messageID ?? ""),
            ),
          );
        }

        replyListeners.add(handler);
      });
    };
  }

  // ---------------------------------------------------------------------------
  // Group logger — sends a keepalive ping to a Facebook group every 8–10
  // minutes when the bot hasn't sent any message in that window, preventing
  // Facebook from flagging the session as inactive.
  // ---------------------------------------------------------------------------

  function startGroupLogger(groupId: string) {
    if (groupLoggerInterval) {
      clearTimeout(groupLoggerInterval);
      groupLoggerInterval = null;
    }

    function scheduleNext() {
      // Random delay between 4 and 6 minutes (in ms)
      const delayMs = randomRange(4000, 6000);

      groupLoggerInterval = setTimeout(async () => {
        const idleSinceMs = Date.now() - lastActivityMs;

        // Only ping if we haven't sent anything within this window
        if (lastActivityMs === 0 || idleSinceMs >= 8 * 60 * 1000) {
          try {
            console.log(
              `[FB][GroupLogger] No activity for ${Math.round(idleSinceMs / 1000)}s — sending keepalive to group ${groupId}`,
            );

            let logMessages = [
              "Hello, just loggin'",
              "Dot dot dot",
              `Random string here: ${crypto.randomUUID()}`,
              "No requests/responses received yet :⁫(",
              "Hellow",
              "log log log",
            ];
            let randomLogMsg =
              logMessages[Math.floor(randomRange(0, logMessages.length))];
            await fcaSend(api, groupId, randomLogMsg, [], []);
            lastActivityMs = Date.now();
          } catch (err) {
            console.warn("[FB][GroupLogger] Keepalive send failed:", err);
          }
        } else {
          console.log(
            `[FB][GroupLogger] Recent activity detected (${Math.round(idleSinceMs / 1000)}s ago) — skipping keepalive.`,
          );
        }

        scheduleNext();
      }, delayMs);
    }

    scheduleNext();
    console.log(
      `[FB][GroupLogger] Started. Keepalive target group: ${groupId}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Adapter
  // ---------------------------------------------------------------------------

  const adapter = new TXAdapterBuilder()
    .setLoginManager(async () => {
      const appState = loadAppState(appStateRaw);

      await new Promise<void>((resolve, reject) => {
        login({ appState }, (err: any, _api: any) => {
          if (err) return reject(err);
          api = _api;

          saveAppState(api.getAppState());

          api.setOptions({
            listenEvents: true,
            logLevel: "silent",
            autoMarkDelivery: false,
            autoMarkRead: false,
            updatePresence: false,
          });

          api.on?.("sessionExpired", () =>
            console.warn("[FB] Session expired — attempting auto-login..."),
          );
          api.on?.("autoLoginSuccess", () => {
            console.log("[FB] Auto-login succeeded.");
            saveAppState(api.getAppState());
          });
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

      // Periodically persist fresh appstate so sessions don't go stale.
      // Stale appstate is the most common cause of "Server unavailable" errors.
      if (appStateSaveInterval) clearInterval(appStateSaveInterval);
      if (groupLoggerInterval) {
        clearTimeout(groupLoggerInterval);
        groupLoggerInterval = null;
      }
      appStateSaveInterval = setInterval(
        () => {
          try {
            const fresh = api?.getAppState?.();
            if (fresh) saveAppState(fresh);
          } catch (err) {
            console.warn("[FB] Appstate periodic save failed:", err);
          }
        },
        30 * 60 * 1000,
      ); // every 30 minutes

      mqttStopped = false;
      startMqtt();

      // Start group logger if configured
      const groupLogger = bot.getConfig().groupLogger;
      if (groupLogger?.enabled && groupLogger?.facebookGroupId) {
        startGroupLogger(groupLogger.facebookGroupId);
      }
    })

    .setMessageSender(async (target, message) => {
      const { body, mentions, attachmentPaths } = resolveMessage(message);
      const info = await queuedSend(target, body, mentions, attachmentPaths);

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

    .setAnnouncementSender(async (message) => {
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
    })

    .setEmojiReactor(async (ctx, emoji) => {
      const raw = ctx.raw as FcaEvent;
      if (!raw?.messageID) {
        console.warn("[FB] emojiReactor: no messageID on ctx.raw, skipping");
        return;
      }
      await fcaReact(api, emoji, raw.messageID, ctx.serverId);
    });

  return adapter;
}
