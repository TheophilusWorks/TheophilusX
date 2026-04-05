export default interface TXICommandArgument {
  command: string;
  arguments: string[];
  stringFlags?: Record<string, string>;
  booleanFlags?: Record<string, boolean>;
}
