export default interface TXConfig {
  commandsPath: string;
  eventsPath: string;
  debugLogs: boolean;

  prefix: string | string[];
  adminIds?: TXAdminId[];
  token: TXToken;
}

export interface TXToken {
  discordToken: string;
  facebookAppstate: string;
}

export interface TXAdminId {
  discordId?: string;
  facebookId?: string;
}
