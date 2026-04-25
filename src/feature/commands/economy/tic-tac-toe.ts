import mongoose from "mongoose";
import TXCommand from "../../../core/command/TXCommand.js";
import Users, { queryUser } from "../../../core/database/model/Users.js";
import { mention, text } from "../../../core/message/TXMessageBuilder.js";
import {
  TXIAuthor,
  TXIContext,
  TXPlatform,
} from "../../../core/context/TXContext.js";
import TXAdapterBuilder from "../../../core/adapter/TXAdapterBuilder.js";
import { initializeUser } from "../../utils/database/initializeUser.js";

type TXTicTacToePlayer = "X" | "O";
type TXTicTacToeCell = TXTicTacToePlayer | number | string;
type TXTicTacToeEndReason = "win" | "draw" | "timeout";
type TXBetResult =
  | { status: "accepted"; amount: number }
  | { status: "declined" }
  | { status: "timeout" }
  | { status: "skipped" };

const PLAYER_SYMBOLS: Record<TXTicTacToePlayer, string> = {
  X: "✚",
  O: "⬤",
};

const WIN_SYMBOL = "✦";

const winningCombinations = [
  // horizontal
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],

  // vertical
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],

  // diagonals
  [0, 4, 8],
  [2, 4, 6],
];

export default new TXCommand({
  name: "tic-tac-toe",
  description: "Play tic-tac-toe with someone",
  usage: "tic-tac-toe <user> {--bet}",
  minimumMentions: 1,
  minimumArguments: 0,
  minimumGroupedArguments: 0,
  aliases: ["ttt", "xoxo"],
  shopInfo: {
    price: 1000,
  },
  cooldown: 5_000,
  execute: async (ctx, { adapter, booleanFlags }) => {
    const opponentUser = ctx.mentions[0];
    const hasBet = booleanFlags?.["bet"] ?? false;
    let bet = 0;

    if (opponentUser.isSelf) {
      await adapter.reply(ctx, `I don't have any data for you to play with!`);
      return;
    }

    if (ctx.author.isEveryone) {
      await adapter.reply(ctx, "@everyone don't any form of data.");
      return;
    }

    if (ctx.author.id === opponentUser.id) {
      await adapter.reply(ctx, `You cannot play against yourself!`);
      return;
    }

    if (hasBet) {
      const betResult = await askForBet(ctx, adapter, opponentUser);

      if (betResult.status === "accepted") {
        bet = betResult.amount;
      } else if (betResult.status === "declined") {
        await adapter.reply(ctx, `⁀➷ Bet declined. Game cancelled.`);
        return;
      } else if (betResult.status === "timeout") {
        return;
      }
    }

    const winner = await playGame(ctx, adapter, opponentUser);
    if (!hasBet || !winner) return;

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const winnerUser = winner === "X" ? ctx.author : opponentUser;
        const loserUser = winner === "X" ? opponentUser : ctx.author;

        const winnerData = await Users.findOne(
          queryUser(ctx.platform, winnerUser.id),
        ).session(session);
        const loserData = await Users.findOne(
          queryUser(ctx.platform, loserUser.id),
        ).session(session);

        if (!winnerData || !loserData)
          throw new Error("Could not find user data");

        const winnerOldCoins = winnerData.economy!.coins;
        const loserOldCoins = loserData.economy!.coins;

        await Users.updateOne(
          queryUser(ctx.platform, winnerUser.id),
          { $inc: { "economy.coins": bet } },
          { session },
        );

        await Users.updateOne(
          queryUser(ctx.platform, loserUser.id),
          { $inc: { "economy.coins": -bet } },
          { session },
        );

        await adapter.reply(
          ctx,
          formatPayoutMessage(
            winnerUser.displayName,
            loserUser.displayName,
            winnerOldCoins,
            loserOldCoins,
            bet,
          ),
        );
      });
    } catch (error) {
      const err = error as Error;
      await adapter.reply(
        ctx,
        `An error occurred while transferring the bet: ${err.message}... Refunding the bet and aborting the transaction.`,
      );
    } finally {
      session.endSession();
    }
  },
});

// ─────────────────────────────────────────
// Bet
// ─────────────────────────────────────────

async function checkBalanceForBet(
  ctx: TXIContext,
  adapter: TXAdapterBuilder,
  host: TXIAuthor,
  opponent: TXIAuthor,
  platform: TXPlatform,
  bet: number,
): Promise<boolean> {
  await initializeUser(ctx, { targetId: host.id });
  await initializeUser(ctx, { targetId: opponent.id });
  const hostData = await Users.findOne(queryUser(platform, host.id));
  if (!hostData || hostData.economy!.coins < bet) {
    await adapter.reply(ctx, {
      parts: [
        mention(host.id, host.displayName),
        text(
          " has insufficient coins to place that bet! Please lower the amount.",
        ),
      ],
    });
    return false;
  }

  const opponentData = await Users.findOne(queryUser(platform, opponent.id));
  if (!opponentData || opponentData.economy!.coins < bet) {
    await adapter.reply(ctx, {
      parts: [
        mention(opponent.id, opponent.displayName),
        text(
          " has insufficient coins to place that bet! Please lower the amount.",
        ),
      ],
    });
    return false;
  }

  return true;
}

async function askForBet(
  ctx: TXIContext,
  adapter: TXAdapterBuilder,
  opponentUser: TXIAuthor,
): Promise<TXBetResult> {
  const betPrompt = await adapter.reply(
    ctx,
    [
      `   ↳ ❝ [ Tic Tac Toe ] ¡! ❞`,
      `⁀➷ How much do you want to bet?`,
      `        ◇─◇───◇─◇`,
      ``,
      `𓆩⟡𓆪 Reply with a number, or 0 to skip.`,
    ].join("\n"),
  );

  const betReply = await betPrompt.waitReply({
    timeout: 60_000,
    filter: (msg) => msg.author.id === ctx.author.id,
  });

  if (!betReply) return { status: "timeout" };

  const amount = parseFloat(betReply.context.content.trim());

  if (isNaN(amount) || amount < 0) {
    await betReply.reply(`Invalid amount! Please use a positive number.`);
    return askForBet(ctx, adapter, opponentUser);
  }

  const hasEnough = await checkBalanceForBet(
    ctx,
    adapter,
    ctx.author,
    opponentUser,
    ctx.platform,
    amount,
  );

  if (!hasEnough) return { status: "declined" };
  if (amount === 0) return { status: "skipped" };

  const challengePrompt = await betReply.reply({
    parts: [
      text(
        [
          `   ↳ ❝ [ Tic Tac Toe ] ¡! ❞`,
          `⁀➷ You've been challenged to a bet, `,
        ].join("\n"),
      ),
      mention(opponentUser.id, opponentUser.displayName),
      text("!"),
      text(
        [
          `        ◇─◇───◇─◇`,
          ``,
          `╭┈ Challenge : ̗̀➛`,
          `┊ ⟡ From   →  ${ctx.author.displayName}`,
          `┊ ⟡ Bet    →  ${amount} coins`,
          `╰─────────┈➤`,
          ``,
          `𓆩⟡𓆪 Reply yes to accept or no to decline.`,
        ].join("\n"),
      ),
    ],
  });

  const confirmation = await challengePrompt?.waitReply({
    timeout: 60_000,
    filter: (msg) => msg.author.id === opponentUser.id,
  });

  if (!confirmation) {
    await adapter.reply(ctx, `⁀➷ No response from opponent. Bet skipped.`);
    return { status: "timeout" };
  }

  const reply = confirmation.context.content.trim().toLowerCase();
  if (reply === "yes") return { status: "accepted", amount };
  return { status: "declined" };
}

// ─────────────────────────────────────────
// Game Loop
// ─────────────────────────────────────────

async function playGame(
  ctx: TXIContext,
  adapter: TXAdapterBuilder,
  opponentUser: TXIAuthor,
): Promise<TXTicTacToePlayer | null> {
  const player1 = ctx.author.displayName;
  const player2 = opponentUser.displayName;

  let currentPlayerID = ctx.author.id;
  let currentPlayerMove: TXTicTacToePlayer = "X";
  let board = initBoard();

  const switchPlayer = () => {
    currentPlayerID =
      currentPlayerID === ctx.author.id ? opponentUser.id : ctx.author.id;
    currentPlayerMove = currentPlayerMove === "X" ? "O" : "X";
  };

  while (true) {
    const movePrompt = await adapter.reply(
      ctx,
      formatMessage(displayBoard(board), player1, player2, currentPlayerMove),
    );

    const moveReply = await movePrompt.waitReply({
      timeout: 60_000,
      filter: (msg) => msg.author.id === currentPlayerID,
    });

    if (!moveReply) {
      const winner: TXTicTacToePlayer = currentPlayerMove === "X" ? "O" : "X";
      await adapter.reply(
        ctx,
        formatEndMessage(
          displayBoard(board),
          player1,
          player2,
          winner,
          "timeout",
        ),
      );
      return winner;
    }

    const moveIndex = parseInt(moveReply.context.content.trim());

    if (isNaN(moveIndex) || moveIndex < 1 || moveIndex > 9) {
      await moveReply.reply(
        `Invalid move! Please reply with a number between 1 and 9.`,
      );
      continue;
    }

    if (typeof board[moveIndex - 1] !== "number") {
      await moveReply.reply(
        `That cell is already taken! Please choose another one.`,
      );
      continue;
    }

    board[moveIndex - 1] = currentPlayerMove;

    if (playerWon(currentPlayerMove, board)) {
      markWinningCells(currentPlayerMove, board);
      await moveReply.reply(
        formatEndMessage(
          displayBoard(board),
          player1,
          player2,
          currentPlayerMove,
          "win",
        ),
      );
      return currentPlayerMove;
    }

    if (boardIsFull(board)) {
      await moveReply.reply(
        formatEndMessage(displayBoard(board), player1, player2, null, "draw"),
      );
      return null;
    }

    switchPlayer();
  }
}

// ─────────────────────────────────────────
// Board
// ─────────────────────────────────────────

function initBoard(): TXTicTacToeCell[] {
  return Array.from({ length: 9 }, (_, i) => i + 1);
}

function boardIsFull(board: TXTicTacToeCell[]): boolean {
  return board.every((cell) => typeof cell !== "number");
}

function playerWon(
  player: TXTicTacToePlayer,
  board: TXTicTacToeCell[],
): boolean {
  return winningCombinations.some(
    ([a, b, c]) =>
      board[a] === player && board[b] === player && board[c] === player,
  );
}

function markWinningCells(
  player: TXTicTacToePlayer,
  board: TXTicTacToeCell[],
): void {
  for (const [a, b, c] of winningCombinations) {
    if (board[a] === player && board[b] === player && board[c] === player) {
      board[a] = board[b] = board[c] = WIN_SYMBOL;
      return;
    }
  }
}

function renderCell(cell: TXTicTacToeCell): string {
  if (cell === "X") return PLAYER_SYMBOLS.X;
  if (cell === "O") return PLAYER_SYMBOLS.O;
  return `${cell}`;
}

function displayBoard(board: TXTicTacToeCell[]): string {
  const row = (a: TXTicTacToeCell, b: TXTicTacToeCell, c: TXTicTacToeCell) =>
    `${renderCell(a)}     ${renderCell(b)}     ${renderCell(c)}`;
  const sep = `   ◈     ◈   `;

  return [
    row(board[0], board[1], board[2]),
    sep,
    row(board[3], board[4], board[5]),
    sep,
    row(board[6], board[7], board[8]),
  ].join("\n");
}

// ─────────────────────────────────────────
// Messages
// ─────────────────────────────────────────

function formatPayoutMessage(
  winner: string,
  loser: string,
  winnerOldCoins: number,
  loserOldCoins: number,
  amount: number,
): string {
  const winnerNewCoins = (winnerOldCoins + amount).toFixed(2);
  const loserNewCoins = (loserOldCoins - amount).toFixed(2);

  return [
    `   ↳ ❝ [ Tic Tac Toe ] ¡! ❞`,
    `⁀➷ The coins have been settled...`,
    `        ◇─◇───◇─◇`,
    ``,
    `╭┈ Payout : ̗̀➛`,
    `┊ 🪙 ${winner}  →  ${winnerOldCoins} → ${winnerNewCoins} (+${amount})`,
    `┊ 💸 ${loser}  →  ${loserOldCoins} → ${loserNewCoins} (-${amount})`,
    `╰─────────┈➤`,
    ``,
    `𓆩⟡𓆪 ${winner} walks away richer!`,
  ].join("\n");
}

function formatMessage(
  asciiBoard: string,
  player1: string,
  player2: string,
  currentPlayer: TXTicTacToePlayer,
): string {
  const board = asciiBoard
    .split("\n")
    .map((line) => `┊ ${line}`)
    .join("\n");

  return [
    `   ↳ ❝ [ Tic Tac Toe ] ¡! ❞`,
    `⁀➷ Reply with a number (1─9) to place your move!`,
    `        ◇─◇───◇─◇`,
    ``,
    `╭┈ Board : ̗̀➛`,
    board,
    `╰─────────┈➤`,
    ``,
    `╭┈ Players : ̗̀➛`,
    `┊ ${PLAYER_SYMBOLS.X} → ${player1}`,
    `┊ ${PLAYER_SYMBOLS.O} → ${player2}`,
    `╰────────────┈➤`,
    ``,
    `𓆩⟡𓆪 It's ${currentPlayer === "X" ? PLAYER_SYMBOLS.X : PLAYER_SYMBOLS.O}'s turn!`,
  ].join("\n");
}

function formatEndMessage(
  asciiBoard: string,
  player1: string,
  player2: string,
  winner: TXTicTacToePlayer | null,
  reason: TXTicTacToeEndReason,
): string {
  const board = asciiBoard
    .split("\n")
    .map((line) => `┊ ${line}`)
    .join("\n");

  const winnerName = winner === "X" ? player1 : player2;

  const subtitle = {
    win: `⁀➷ What a game! The battle has been decided...`,
    draw: `⁀➷ Every square is claimed... no one budged!`,
    timeout: `⁀➷ Tick tock... silence speaks louder than moves.`,
  }[reason];

  const footer = {
    win: `𓆩⟡𓆪 ${winnerName} wins the match!`,
    draw: `𓆩⟡𓆪 It's a draw! A true clash of equals.`,
    timeout: `𓆩⟡𓆪 ${winnerName} wins — their opponent ran out of time!`,
  }[reason];

  return [
    `   ↳ ❝ [ Tic Tac Toe ] ¡! ❞`,
    subtitle,
    `        ◇─◇───◇─◇`,
    ``,
    `╭┈ Board : ̗̀➛`,
    board,
    `╰─────────┈➤`,
    ``,
    footer,
  ].join("\n");
}
