export enum TXPlatform {
  Cli = "CLI",
  Discord = "DISCORD",
  FacebookMessenger = "FACEBOOK_MESSENGER",
}

export interface TXIAuthor {
  id: string;
  displayName: string;
  username: string;
  avatarURL: string;
  isSelf: boolean;
  isAdmin: boolean;
  isEveryone: boolean;
}

export interface TXIContext {
  platform: TXPlatform;
  author: TXIAuthor;
  content: string;
  channelId: string;
  serverId: string;
  timestamp: Date;
  raw: unknown;
  replied: boolean;
  mentions: TXIAuthor[];

  // used by the middlewares
  metadata: Record<string, unknown>;
}
