export default interface TXICommand {
  name: string;
  description: string;
  usage: string;

  aliases?: string[];
  cooldown?: number;

  minimumArguments: number;
  usedStringFlags?: string[];
  usedBooleanFlags?: string[];

  run: () => Promise<void>;
}
