export default interface TXConfig {
  adminCommandsPath: string;
  commandsPath: string;
  eventsPath: string;
  debugLogs: boolean;
  platforms: {
    discord: boolean;
    facebookMessenger: boolean;
    cli: boolean;
  };

  prefix: string | string[];
  adminPrefix: string | string[];
  adminIds?: TXAdminId[];
  token: TXToken;
  mongoDbURI: string;
}

export interface TXToken {
  discordToken: string;
  facebookAppstate: string;
}

export interface TXAdminId {
  discordId?: string;
  facebookId?: string;
}
