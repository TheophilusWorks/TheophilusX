export default interface TXEvents {
  messageCreate: (message: any) => Promise<void>;
  commandCreate: (command: any) => Promise<void>;
}
