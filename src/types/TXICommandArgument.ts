import TXAdapterBuilder from "../core/adapter/TXAdapterBuilder.js";

export default interface TXICommandArgument {
  command: string; // cant think of something better bc this could be an alias
  args: string[];
  groupedArgs: TXICommandArgument[];

  adapter: TXAdapterBuilder;

  stringFlags?: Record<string, string>;
  booleanFlags?: Record<string, boolean>;
}
