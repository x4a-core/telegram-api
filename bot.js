// bot.js
import 'dotenv/config';
import { Telegraf } from 'telegraf';
import {
  getUserByTelegram, getUserByWallet,
  linkWalletTelegram, linkTelegramToWallet,
  getStatus
} from './db.js';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

function fmtSecs(s) {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
}

bot.start(async (ctx) => {
  await ctx.reply(
`Welcome to ${process.env.TELEGRAM_BOT_NAME || 'X4A Facilitator'} 🚀

Commands:
/link <wallet>  — link your Solana wallet
/status         — check your access
/tier           — show current tier & expiry
/help           — help text`
  );
});

bot.help((ctx) => ctx.reply(
`• Use /link <wallet> to associate your wallet to this Telegram.
• After you pay on the site, you’ll receive automated confirmations here.
• /status shows whether you are active and the time left.`
));

bot.command('link', async (ctx) => {
  const parts = ctx.message.text.trim().split(/\s+/);
  if (parts.length !== 2) {
    return ctx.reply('Usage: /link <walletPublicKey>');
  }
  const wallet = parts[1];
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) {
    return ctx.reply('That does not look like a valid Solana address.');
  }
  linkWalletTelegram(wallet, ctx.from.id);
  return ctx.reply(`Linked ✅\nWallet: \`${wallet}\`\nNow pay on the site and I’ll notify you here.`, { parse_mode: 'Markdown' });
});

bot.command('status', async (ctx) => {
  const row = getUserByTelegram(ctx.from.id);
  if (!row?.wallet) {
    return ctx.reply('No wallet linked yet. Use /link <wallet>.');
  }
  const st = getStatus(row.wallet);
  if (!st.active) {
    return ctx.reply(`No active plan for \`${row.wallet}\`.\nUse the site to purchase a tier.`, { parse_mode: 'Markdown' });
  }
  return ctx.reply(
    `✅ Active\nTier: ${st.tier}\nExpires: <t:${st.expiresAt}:R> (~${fmtSecs(st.secondsLeft)})\nWallet: \`${row.wallet}\``,
    { parse_mode: 'Markdown' }
  );
});

bot.command('tier', async (ctx) => {
  const row = getUserByTelegram(ctx.from.id);
  if (!row?.wallet) return ctx.reply('No wallet linked yet. Use /link <wallet>.');
  const st = getStatus(row.wallet);
  if (!st.active) return ctx.reply('No active plan. Buy a tier on the site.');
  return ctx.reply(`Current tier: ${st.tier}\nTime left: ~${fmtSecs(st.secondsLeft)}`);
});

// Optional admin ping
if (process.env.TELEGRAM_BOT_ADMIN) {
  bot.command('whoami', (ctx) => ctx.reply(`Your Telegram ID: ${ctx.from.id}`));
}

bot.launch().then(() => {
  console.log('✅ Telegram bot started (polling).');
}).catch(err => {
  console.error('❌ Telegram bot error:', err);
});
