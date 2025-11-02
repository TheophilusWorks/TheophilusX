# Adding New Commands

This guide explains how to create slash commands for your TheophilusX bot.

## Command Structure

Commands in TheophilusX are organized by category in the `src/commands/` directory:

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

## Creating a Basic Command

### Step 1: Create the Command File

Create a new file in the appropriate category folder. For example, to create a ping command:

```
src/commands/info/ping.ts
```

### Step 2: Define the Command

```typescript
import TXSlashCommand from "../../../structures/TXSlashCommand";

export default new TXSlashCommand({
  name: "ping",
  description: "Pong!",
  // cooldown: 0,
  // options: [],
  // private: boolean # Only works in your Test/Private server,
  // ...
  execute: async({ interaction, client }) => {
    try {
      // Calculate response time
      const start = new Date().getMilliseconds()
      // Defer the reply to prevent timeout
      await interaction.deferReply()
      
      const end = new Date().getMilliseconds()
      
      // Send the response
      interaction.editReply(
        `Pong! Websocket: ${client.ws.ping}ms | Client: ${start-end}ms`
      )
    } catch (error) {
      console.error("Error executing ping command:", error)
    }
  }
})
```

### Step 3: Restart Your Bot

After creating the command file:

1. Rebuild the project: `npm run build`
2. Restart your bot: `npm run start`

The bot will automatically detect and register the new command.

## Command Properties

The `TXSlashCommand` constructor accepts a `CommandType` object with the following properties:

### Required Properties

- **`name`** (string): The command name (lowercase, no spaces)
- **`description`** (string): Brief description of what the command does
- **`execute`** (function): The function that runs when the command is invoked

### Optional Properties

- **`userPermissions`** (PermissionResolvable[]): Required user permissions
- **`cooldown`** (number): Cooldown time in seconds
- **`private`** (boolean): Whether the command is private/hidden
- **`options`** (ApplicationCommandOptionData[]): Command options/arguments

### Execute Function Parameters

The `execute` function receives an object with:

- **`client`**: The TheophilusX client instance
- **`interaction`**: The command interaction (typed as `GuildInteraction`)
- **`args`**: Command options resolver for accessing arguments

## Advanced Examples

### Command with Options

```typescript
import { ApplicationCommandOptionType, MessageFlags } from "discord.js";
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
    // Get the message option value
    const message = args.getString("message", true) // true = required, disable TS warning
    
    await interaction.reply({
      content: message,
    })
  }
})
```

### Command with Permissions

```typescript
import { PermissionFlagsBits } from "discord.js";
import TXSlashCommand from "../../../structures/TXSlashCommand";

export default new TXSlashCommand({
  name: "kick",
  description: "Kick a member from the server",
  userPermissions: [PermissionFlagsBits.KickMembers],
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
    const user = args.getUser("user")
    const reason = args.getString("reason") || "No reason provided"
    
    // Your kick logic here
    await interaction.reply({
      content: `Kicked ${user.tag} for: ${reason}`,
      ephemeral: true
    })
  }
})
```

### Command with Cooldown

```typescript
import TXSlashCommand from "../../../structures/TXSlashCommand";

export default new TXSlashCommand({
  name: "daily",
  description: "Claim your daily reward",
  cooldown: 86400, // 24 hours in seconds
  execute: async({ interaction }) => {
    await interaction.reply({
      content: "You claimed your daily reward!",
      ephemeral: true
    })
  }
})
```

### Command with Multiple Options

```typescript
import { ApplicationCommandOptionType } from "discord.js";
import TXSlashCommand from "../../../structures/TXSlashCommand";

export default new TXSlashCommand({
  name: "userinfo",
  description: "Get information about a user",
  options: [
    {
      name: "user",
      description: "The user to get info about",
      type: ApplicationCommandOptionType.User,
      required: false
    }
  ],
  execute: async({ interaction, args }) => {
    // If no user specified, use the command author
    const targetUser = args.getUser("user") || interaction.user
    const member = interaction.guild?.members.cache.get(targetUser.id)
    
    await interaction.reply({
      content: `User: ${targetUser.tag}\nJoined: ${member?.joinedAt?.toDateString()}`,
      ephemeral: true
    })
  }
})
```

## Best Practices

1. **Always handle errors**: Wrap your command logic in try-catch blocks
2. **Use defer for slow operations**: Call `interaction.deferReply()` for commands that take time to process
3. **Validate user input**: Check if required options exist and are valid
4. **Use ephemeral responses for sensitive data**: Set `ephemeral: true` for private responses
5. **Organize by category**: Place commands in appropriate category folders
6. **Keep commands focused**: Each command should do one thing well
7. **Add cooldowns to prevent spam**: Use the `cooldown` property for rate-limiting

## Command Categories

Organize your commands into logical categories:

- **info**: Bot information, statistics, help commands
- **moderation**: Kick, ban, mute, warn commands
- **utility**: Tools and utilities for users
- **fun**: Entertainment and game commands
- **admin**: Server administration commands
- **economy**: Currency and shop systems

Create new category folders as needed in `src/commands/`.

## Troubleshooting

**Command not appearing:**
- Ensure the file is in the correct location under `src/commands/`
- Check that the file exports `default new TXSlashCommand(...)`
- Rebuild with `npm run build` and restart the bot
- Wait a few minutes for Discord to sync commands

**Command throwing errors:**
- Check the console logs for detailed error messages
- Verify all required options are properly defined
- Ensure permissions are correctly specified

**Options not working:**
- Verify option types match the data you're trying to access
- Use the correct `args` method (`getString`, `getUser`, `getNumber`, etc.)
- Check that required options are marked as `required: true` (or suffix the option witg `!`)

---

**Next:** [Adding New Events →](03-Add-New-Events.md)
