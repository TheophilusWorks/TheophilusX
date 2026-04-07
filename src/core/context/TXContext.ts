export enum TXPlatform {
  Cli = "CLI",
  Discord = "DISCORD",
  FavebookMessenger = "FACEBOOK_MESSENGER",
}

export interface TXIAuthor {
  id: string;
  displayName: string;
  username?: string;
  isSelf: boolean;
  isAdmin: boolean;
}

export interface TXIContext {
  platform: TXPlatform;
  author: TXIAuthor;
  content: string;
  channelId?: string;
  serverId?: string;
  timestamp: Date;
  raw: unknown;
  replied: boolean;
}
