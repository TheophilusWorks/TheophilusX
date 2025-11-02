# Getting Started

This guide will walk you through setting up TheophilusX and getting your bot running.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (latest LTS version recommended)
- **npm** or **yarn** package manager
- **TypeScript** knowledge (moderate level)
- A **Discord account** and access to the Discord Developer Portal
- A MongoDB Database

## Creating Your Discord Bot

1. Navigate to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give your bot a name
3. Navigate to the "Bot" section in the left sidebar
4. Click "Add Bot" to create a bot user
5. Under the "Token" section, click "Reset Token" and copy your bot token (keep this secure!)
6. Scroll down to "Privileged Gateway Intents" and enable:
   - Presence Intent
   - Server Members Intent
   - Message Content Intent
7. Navigate to the "OAuth2" → "URL Generator" section
8. Select the following scopes:
   - `bot`
   - `applications.commands`
9. Select the bot permissions your bot needs (Administrator is recommended)
10. Copy the generated URL and use it to invite your bot to your server

## Getting Your MongoDB URI

To store data for your bot, you'll need a MongoDB database. MongoDB Atlas provides a free tier (M0) that's perfect for getting started with 512MB of storage.

### Step 1: Create Your MongoDB Atlas Account

1. Navigate to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Sign up using your email or Google account
3. Verify your email address if required
4. Complete the welcome questionnaire (select your preferences for goal, experience level, and preferred language)

### Step 2: Deploy a Free Cluster

1. On the "Deploy a cloud database" page, click **Create** under the **M0 FREE** tier
2. **Choose your cloud provider:**
   - AWS or Google Cloud (both support the free tier)
   - Select the region closest to you or your users for better performance
3. **Name your cluster** (optional - you can keep the default name like "Cluster0")
4. Click the green **Create** button
5. Wait 1-3 minutes for your cluster to be provisioned

### Step 3: Set Up Database Access (Create a User)

1. In the left sidebar under **Security**, click **Database Access**
2. Click **Add New Database User**
3. **Authentication Method:** Select **Password**
4. **Username:** Create a username (e.g., `botUser`)
5. **Password:** Create a strong password and save it securely
   - Avoid special characters like `@`, `:`, `/`, `?`, `#`, `[`, `]`, and `%` to prevent connection string issues
   - Or use these characters but remember you'll need to URL-encode them later
6. **Database User Privileges:** 
   - Select **Built-in Role**
   - Choose **Read and write to any database** (or "Atlas admin" for full access)
7. Click **Add User**

### Step 4: Configure Network Access

1. In the left sidebar under **Security**, click **Network Access** (or **Database & Network Access**)
2. Click **Add IP Address**
3. You have two options:
   - **For development:** Click **Allow Access from Anywhere** (sets IP to `0.0.0.0/0`)
   - **For production:** Click **Add Current IP Address** to only allow your specific IP
4. Add an optional comment to describe this entry
5. Click **Confirm**

**Security Note:** While "Allow Access from Anywhere" is convenient for development, your database is still protected by username/password authentication. For production, restrict access to specific IP addresses.

### Step 5: Get Your Connection String

1. Go back to **Database** in the sidebar
2. Click the **Connect** button on your cluster
3. Select **Drivers** (or "Connect your application")
4. **Select your driver and version:**
   - Driver: **Node.js**
   - Version: **5.5 or later** (latest)
5. Copy the connection string provided (it looks like this):
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### Step 6: Format Your MongoDB URI

1. Replace `<username>` with your actual database username
2. Replace `<password>` with your actual database password
3. **Add your database name** between `.mongodb.net/` and `?`:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/myBotDatabase?retryWrites=true&w=majority
   ```

**Important Notes:**
- If your password contains special characters (`@`, `:`, `/`, `?`, `#`, `[`, `]`, `%`), they must be percent-encoded:
  - `@` becomes `%40`
  - `:` becomes `%3A`
  - `/` becomes `%2F`
  - `?` becomes `%3F`
  - Example: If your password is `P@ss:word`, use `P%40ss%3Aword`
- The database name you specify will be created automatically when your bot first writes data to it
- Keep your connection string secure and never commit it to public repositories

**Your final MongoDB URI should look like:**
```
mongodb+srv://botUser:SecurePassword123@cluster0.abc123.mongodb.net/theophilusxDB?retryWrites=true&w=majority
```

## Installation

Clone the repository and install dependencies:

```bash
npm install
```

## Configuration

Create a `.env` file in the root directory of your project:

```env
DISCORD_TOKEN="your_bot_token_here"
GUILD_ID="your_test_server_id_here"
MONGODB_URI="your_mongodb_uri_here"
```

Replace the placeholder values:
- `your_bot_token_here` with the token you copied from the Discord Developer Portal
- `your_test_server_id_here` with your Discord server ID
- `your_mongodb_uri_here` with your MongoDB connection string

## Initializing the Client

TheophilusX uses a custom client class that extends Discord.js' `Client()` class. The client is instantiated in `src/main.ts`:

```typescript
import "dotenv/config"
import { TheophilusX } from "./structures/TheophilusX";

export const client = new TheophilusX()

client.instantiate()
```

The `instantiate()` method handles:
- Loading all commands from the `commands/` directory
- Loading all events from the `events/` directory
- Registering slash commands with Discord
- Logging in to Discord

## Running Your Bot

Build the TypeScript code:

```bash
npm run build
```

Start the bot:

```bash
npm run start
```

If everything is set up correctly, you should see log messages indicating:
- TheophilusX is instantiating
- Commands are being loaded
- Events are being registered
- The bot has successfully logged in
- The bot is ready

## Project Structure

```
theophilusx/
├── src/
│   ├── commands/          # Command files organized by category
│   │   └── slash-commands/
│   │       └── info/
│   │           └── ping.ts
│   ├── events/            # Event handler files
│   │   ├── 01-deleteDuplicatedCommands.ts
│   │   ├── 02-syncCommands.ts
│   │   └── 03-clientReady.ts
│   ├── structures/        # Core framework classes
│   │   ├── TXCommand.ts
│   │   ├── TXEvent.ts
│   │   └── TheophilusX.ts
│   ├── typings/           # TypeScript type definitions
│   │   ├── Client.ts
│   │   └── Command.ts
│   ├── utils/             # Utility functions
│   │   └── PrettyLogger.ts
│   └── main.ts           # Entry point
├── docs/                 # Documentation files
├── ...                   # Other files/directories
├── .env                  # Environment variables (create this)
└── package.json
```

## Next Steps

Now that your bot is running, you can:
- [Add new commands](02-Add-New-Command.md) to extend functionality
- [Add new events](03-Add-New-Events.md) to handle Discord events

## Troubleshooting

**Bot won't start:**
- Verify your `DISCORD_TOKEN` and `MONGODB_URI` is correct in the `.env` file
- Ensure all dependencies are installed with `npm install`
- Check that you've built the project with `npm run build`

**Commands not appearing:**
- Make sure you've enabled `applications.commands` scope when inviting the bot
- Wait a few minutes for Discord to register slash commands
- Try running the bot again to trigger command sync

**Permission errors:**
- Verify your bot has the necessary permissions in your Discord server
- Check that required intents are enabled in the Developer Portal

**MongoDB connection errors:**
- Verify your connection string is correct and properly formatted
- Ensure your IP address is whitelisted in MongoDB Atlas Network Access
- Check that your database user has the correct permissions
- Make sure you've replaced `<username>` and `<password>` with actual credentials

---

**Next:** [Adding New Commands →](02-Add-New-Commands.md)
