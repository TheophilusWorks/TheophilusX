# Adding New Commands

This guide explains how to create commands for your TheophilusX bot. TheophilusX supports two types of commands:

1. **Slash Commands** - Modern Discord slash commands (`/ping`)
2. **TX Commands** - Traditional message-based commands (`tx> ping`)

---

## Slash Commands

### Command Structure

Slash commands are organized by category in the `src/commands/slash-commands/` directory:

```
src/commands/
└── slash-commands/
    ├── info/           # Information commands
    │   └── ping.ts
    ├── moderation/     # Moderation commands
    ├── utility/        # Utility commands
    └── ...             # Other categories
```

Each command is a TypeScript file that exports an instance of `TXSlashCommand`.

### Creating a Basic Slash Command

#### Step 1: Create the Command File

Create a new file in the appropriate category folder:

```
src/commands/slash-commands/info/ping.ts
```

#### Step 2: Define the Command

```typescript
import TXSlashCommand from "../../../structures/TXSlashCommand";

export default new TXSlashCommand({
  name: "ping",
  description: "Pong!",
  execute: async({ interaction, client }) => {
    try {
      const start = new Date().getMilliseconds()
      await interaction.deferReply()
      
      const end = new Date().getMilliseconds()
      
      interaction.editReply(
        `Pong! Websocket: ${client.ws.ping}ms | Client: ${start-end}ms`
      )
    } catch (error) {
      console.error("Error executing ping command:", error)
    }
  }
})
```

### Slash Command Properties

#### Required Properties

- **`name`** (string): The command name (lowercase, no spaces)
- **`description`** (string): Brief description of what the command does
- **`execute`** (function): The function that runs when the command is invoked

#### Optional Properties

- **`userPermissions`** (PermissionResolvable[] | bigint[]): Required user permissions
- **`botPermissions`** (PermissionResolvable[] | bigint[]): Required bot permissions
- **`cooldown`** (number): Cooldown time in milliseconds
- **`private`** (boolean): Whether the command is private/hidden
- **`serverOnly`** (boolean): Whether the command only works in servers
- **`options`** (ApplicationCommandOptionData[]): Command options/arguments

### Execute Function Parameters

The `execute` function receives an object with:

- **`client`**: The TheophilusX client instance
- **`interaction`**: The command interaction (typed as `GuildInteraction`)
- **`args`**: Command options resolver for accessing arguments

### Advanced Slash Command Examples

#### Command with Options

```typescript
import { ApplicationCommandOptionType } from "discord.js";
import TXSlashCommand from "../../../structures/TXSlashCommand";

export default new TXSlashCommand({
  name: "echo",
  description: "Echoes your message",
  options: [
    {
      name: "message",
      description: "The message to echo",
      type: ApplicationCommandOptionType.String,
      required: true
    }
  ],
  execute: async({ interaction, args }) => {
    const message = args.getString("message", true)
    
    await interaction.reply({
      content: message,
    })
  }
})
```

#### Command with Permissions

```typescript
import { PermissionFlagsBits, ApplicationCommandOptionType } from "discord.js";
import TXSlashCommand from "../../../structures/TXSlashCommand";

export default new TXSlashCommand({
  name: "kick",
  description: "Kick a member from the server",
  userPermissions: [PermissionFlagsBits.KickMembers],
  botPermissions: [PermissionFlagsBits.KickMembers],
  serverOnly: true,
  options: [
    {
      name: "user",
      description: "The user to kick",
      type: ApplicationCommandOptionType.User,
      required: true
    },
    {
      name: "reason",
      description: "Reason for kicking",
      type: ApplicationCommandOptionType.String,
      required: false
    }
  ],
  execute: async({ interaction, args }) => {
    const user = args.getUser("user", true)
    const reason = args.getString("reason") || "No reason provided"
    
    await interaction.reply({
      content: `Kicked ${user.tag} for: ${reason}`,
      ephemeral: true
    })
  }
})
```

---

## TX Commands

TX Commands are traditional message-based commands that use a prefix (default: `tx>`).

### Command Structure

TX commands are organized by category in the `src/commands/tx-commands/` directory:

```
src/commands/
└── tx-commands/
    ├── info/           # Information commands
    │   └── ping.ts
    ├── moderation/     # Moderation commands
    ├── economy/        # Economy commands
    └── ...             # Other categories
```

### Creating a Basic TX Command

#### Step 1: Create the Command File

Create a new file in the appropriate category folder:

```
src/commands/tx-commands/info/ping.ts
```

#### Step 2: Define the Command

```typescript
import TXCommand from "../../../structures/TXCommand";

export default new TXCommand({
  name: "ping",
  description: "Pong!",
  syntax: "ping",
  cooldown: 3000,
  execute: async ({ message, client }) => {
    const start = Date.now()
    const ping = await message.reply("Pinging...")
    const end = Date.now()
    ping.edit(`Pong! Websocket: **${client.ws.ping}ms** | Client: **${end - start}ms**`)
  },
})
```

### TX Command Properties

#### Required Properties

- **`name`** (string): The command name (lowercase, no spaces)
- **`description`** (string): Brief description of what the command does
- **`syntax`** (string): How to use the command (e.g., `"ping"`, `"balance [user]"`)
- **`execute`** (function): The function that runs when the command is invoked

#### Optional Properties

- **`userPermissions`** (PermissionResolvable[] | bigint[]): Required user permissions
- **`botPermissions`** (PermissionResolvable[] | bigint[]): Required bot permissions
- **`cooldown`** (number): Cooldown time in milliseconds
- **`private`** (boolean): Whether the command is private/hidden
- **`serverOnly`** (boolean): Whether the command only works in servers

For all available options, check `src/typings/Command.ts` (`TXCommandType` interface).

### Execute Function Parameters

The `execute` function receives an object with:

- **`client`**: The TheophilusX client instance
- **`message`**: The message that triggered the command (typed as `GuildMessage`)
- **`args`**: Array of string arguments split by spaces

### Advanced TX Command Examples

#### Command with Arguments

```typescript
import TXCommand from "../../../structures/TXCommand";
import { fetchUser } from "../../../utils/fetcher";

export default new TXCommand({
  name: "userinfo",
  description: "Get information about a user",
  syntax: "userinfo [user]",
  cooldown: 3000,
  execute: async ({ message, args }) => {
    const targetUser = (await fetchUser(args[0])) || message.author
    const member = message.guild?.members.cache.get(targetUser.id)
    
    await message.reply(
      `User: ${targetUser.tag}\nJoined: ${member?.joinedAt?.toDateString()}`
    )
  },
})
```

#### Command with Permissions

```typescript
import TXCommand from "../../../structures/TXCommand";
import { PermissionFlagsBits } from "discord.js";
import { fetchUser } from "../../../utils/fetcher";

export default new TXCommand({
  name: "kick",
  description: "Kick a member from the server",
  syntax: "kick <user> [reason]",
  userPermissions: [PermissionFlagsBits.KickMembers],
  botPermissions: [PermissionFlagsBits.KickMembers],
  serverOnly: true,
  cooldown: 5000,
  execute: async ({ message, args }) => {
    const targetUser = await fetchUser(args[0])
    if (!targetUser) {
      return message.reply("User not found!")
    }
    
    const reason = args.slice(1).join(" ") || "No reason provided"
    const member = message.guild?.members.cache.get(targetUser.id)
    
    if (!member) {
      return message.reply("Member not found in this server!")
    }
    
    await member.kick(reason)
    await message.reply(`Kicked ${targetUser.tag} for: ${reason}`)
  },
})
```

#### Command with Ephemeral Reply

```typescript
import TXCommand from "../../../structures/TXCommand";
import { fetchUser } from "../../../utils/fetcher";
import setEphemeral from "../../../utils/setEphemeral";
import Users from "../../../database/models/Users";

export default new TXCommand({
  name: "balance",
  description: "Check your or someone's balance",
  syntax: "balance [user]",
  cooldown: 3000,
  serverOnly: true,
  execute: async ({ message, args }) => {
    const targetUser = (await fetchUser(args[0])) || message.author

    const query = {
      userId: targetUser.id,
      guildId: message.guild?.id
    }
    let user = await Users.findOne(query)
    if (!user) user = new Users(query)
    
    const reply = await message.reply(
      `**${targetUser.displayName}'s** balance is: **${user.balance}**`
    )
    await setEphemeral(reply)
  }
})
```

### Using Fetcher Utilities

TX Commands have access to fetcher utilities for parsing mentions and IDs:

```typescript
import { fetchUser, fetchMember, fetchChannel, fetchRole } from "../../../utils/fetcher";

const user = await fetchUser(args[0])
const member = await fetchMember(args[0])
const channel = await fetchChannel(args[0])
const role = await fetchRole(args[0])
```

These utilities automatically handle:
- User mentions: `<@123>` or `<@!123>`
- Role mentions: `<@&123>`
- Channel mentions: `<#123>`
- Raw IDs: `123456789`

### Using Ephemeral Replies

Make replies deletable by the command author using `setEphemeral`:

```typescript
import setEphemeral from "../../../utils/setEphemeral";

const reply = await message.reply("This message can be deleted!")
await setEphemeral(reply)
```

This adds a 🗑️ reaction that only the command author can click to delete the message.

---

## Permission Handling

Both command types support permission checking:

```typescript
userPermissions: [PermissionFlagsBits.KickMembers, PermissionFlagsBits.BanMembers]
botPermissions: [PermissionFlagsBits.ManageMessages]
```

If the user or bot doesn't have the required permissions, the command will be blocked automatically with an ephemeral error message (TX Commands only).

---

## Best Practices

1. **Always handle errors**: Wrap your command logic in try-catch blocks
2. **Use defer for slow operations**: Call `interaction.deferReply()` for commands that take time
3. **Validate user input**: Check if required arguments exist and are valid
4. **Use ephemeral responses for sensitive data**: Set `ephemeral: true` for private responses
5. **Organize by category**: Place commands in appropriate category folders
6. **Keep commands focused**: Each command should do one thing well
7. **Add cooldowns to prevent spam**: Use the `cooldown` property for rate-limiting
8. **Use `serverOnly` for guild-specific commands**: Prevents commands from running in DMs

---

## Command Categories

Organize your commands into logical categories:

- **info**: Bot information, statistics, help commands
- **moderation**: Kick, ban, mute, warn commands
- **utility**: Tools and utilities for users
- **fun**: Entertainment and game commands
- **admin**: Server administration commands
- **economy**: Currency and shop systems

Create new category folders as needed in `src/commands/`.

---

## Troubleshooting

**Slash command not appearing:**
- Ensure the file is in the correct location under `src/commands/slash-commands/`
- Check that the file exports `default new TXSlashCommand(...)`
- Rebuild with `npm run build` and restart the bot
- Wait a few minutes for Discord to sync commands

**TX command not working:**
- Ensure the file is in the correct location under `src/commands/tx-commands/`
- Check that the file exports `default new TXCommand(...)`
- Verify the prefix in `txconfig.json` matches what you're using
- Rebuild and restart the bot

**Command throwing errors:**
- Check the console logs for detailed error messages
- Verify all required properties are properly defined
- Ensure permissions are correctly specified

**Arguments not working (TX Commands):**
- Remember that `args` is a string array split by spaces
- Use fetcher utilities for mentions and IDs
- Check if the argument exists before using it

---

**Next:** [Adding New Events →](03-Add-New-Events.md)
