```markdown
# X4A Facilitator Telegram Bot

A lightweight **Telegraf**-based Telegram bot that links Solana wallets to Telegram users and provides real-time access status, tier information, and subscription expiry for the **X4A** service.

---

## Features

- `/start` – Welcome message with command overview
- `/link <wallet>` – Link a Solana wallet to your Telegram account
- `/status` – Check active plan, tier, and time remaining
- `/tier` – Quick view of current tier and time left
- `/help` – Usage instructions
- *(Admin)* `/whoami` – Show your Telegram ID (if admin enabled)

---

## Requirements

- Node.js ≥ 18
- A Telegram Bot Token from [@BotFather](https://t.me/BotFather)
- A `.env` file with required variables
- Database functions (`db.js`) with:
  - `getUserByTelegram(telegramId)`
  - `getUserByWallet(wallet)`
  - `linkWalletTelegram(wallet, telegramId)`
  - `linkTelegramToWallet(...)` *(optional)*
  - `getStatus(wallet)` → returns `{ active, tier, expiresAt, secondsLeft }`

---

## Installation

```bash
git clone <your-repo-url>
cd <project-folder>
npm install
```

### Install dependencies:
```bash
npm install telegraf dotenv
```

---

## `.env` File

```env
TELEGRAM_BOT_TOKEN=your:bot_token_here
TELEGRAM_BOT_NAME=X4A Facilitator
TELEGRAM_BOT_ADMIN=123456789  # Optional: enable /whoami for this user ID
```

---

## Project Structure

```
.
├── bot.js           ← Main bot logic (this file)
├── db.js            ← Database helpers (must implement required functions)
├── .env             ← Environment variables
└── README.md        ← This file
```

---

## Database Functions (`db.js`) – Required Exports

```js
export function getUserByTelegram(telegramId) { ... }
export function getUserByWallet(wallet) { ... }
export function linkWalletTelegram(wallet, telegramId) { ... }
export function linkTelegramToWallet(wallet, telegramId) { ... } // optional
export function getStatus(wallet) {
  return {
    active: true/false,
    tier: "Pro" | "Basic" | etc.,
    expiresAt: unix_timestamp_seconds,
    secondsLeft: seconds_remaining
  };
}
```

---

## Running the Bot

```bash
node bot.js
```

> Bot runs in **polling mode**. For production, consider using webhooks.

---

## Commands

| Command | Description |
|-------|------------|
| `/start` | Welcome + command list |
| `/link 9xFh...` | Link Solana wallet |
| `/status` | Show access status with countdown |
| `/tier` | Current tier & time left |
| `/help` | How to use the bot |

---

## Example `/status` Output

```
Active
Tier: Pro
Expires: in 2 hours (~120m)
Wallet: `9xFh...`
```

---

## Security Notes

- Validates Solana public keys using Base58 regex
- Uses MarkdownV2 escaping for wallet addresses
- No sensitive data logged

---

## Contributing

1. Fork the repo
2. Create a feature branch
3. Commit changes
4. Open a Pull Request

---

## License

MIT © 2025 X4A Team

---
```


```
