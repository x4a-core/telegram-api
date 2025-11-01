// db.js
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(path.join(DATA_DIR, 'x402.db'));
db.pragma('journal_mode = wal');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet TEXT UNIQUE,
  telegram_id TEXT UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet TEXT NOT NULL,
  tier TEXT NOT NULL,
  amount_base INTEGER NOT NULL,
  tx_sig TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS entitlements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet TEXT NOT NULL,
  tier TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- Marketplace Products table
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  usdc_base INTEGER NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  sold INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  image_url TEXT,
  physical INTEGER NOT NULL DEFAULT 0
);

-- Marketplace Orders table (NEW)
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT NOT NULL,
  wallet TEXT,
  amount_base INTEGER NOT NULL,
  tx_sig TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
`);

// --- User / Tier Statements ---
const upsertUserByWalletStmt = db.prepare(`
INSERT INTO users (wallet) VALUES (?)
ON CONFLICT(wallet) DO NOTHING
`);
const linkTelegramStmt = db.prepare(`
INSERT INTO users (wallet, telegram_id) VALUES (?, ?)
ON CONFLICT(wallet) DO UPDATE SET telegram_id=excluded.telegram_id
`);
const linkTelegramByIdStmt = db.prepare(`
INSERT INTO users (telegram_id, wallet) VALUES (?, ?)
ON CONFLICT(telegram_id) DO UPDATE SET wallet=excluded.wallet
`);
const getUserByWalletStmt = db.prepare(`SELECT * FROM users WHERE wallet = ?`);
const getUserByTelegramStmt = db.prepare(`SELECT * FROM users WHERE telegram_id = ?`);
const insertPaymentStmt = db.prepare(`
INSERT INTO payments (wallet, tier, amount_base, tx_sig) VALUES (?, ?, ?, ?)
`);
const insertEntitlementStmt = db.prepare(`
INSERT INTO entitlements (wallet, tier, expires_at) VALUES (?, ?, ?)
`);
const getEntitlementStmt = db.prepare(`
SELECT * FROM entitlements
WHERE wallet = ?
ORDER BY expires_at DESC
LIMIT 1
`);
const getEntitlementByTierStmt = db.prepare(`
SELECT * FROM entitlements
WHERE wallet = ? AND tier = ?
ORDER BY expires_at DESC
LIMIT 1
`);

// --- Product Statements ---
const insertProductStmt = db.prepare(`
  INSERT INTO products (id, title, usdc_base, stock, description, image_url, physical)
  VALUES (@id, @title, @usdc_base, @stock, @description, @image_url, @physical)
  ON CONFLICT(id) DO UPDATE SET
    title      = excluded.title,
    usdc_base  = excluded.usdc_base,
    stock      = excluded.stock,
    description = excluded.description,
    image_url  = excluded.image_url,
    physical   = excluded.physical
`);
const getAllProductsStmt = db.prepare(`SELECT * FROM products ORDER BY rowid ASC`);
const getProductByIdStmt = db.prepare(`SELECT * FROM products WHERE id = ?`);
const decrementStockStmt = db.prepare(`
  UPDATE products
  SET stock = stock - 1, sold = sold + 1
  WHERE id = ? AND stock > 0
`);

// --- Order Statements (NEW) ---
const insertOrderStmt = db.prepare(`
  INSERT INTO orders (sku, wallet, amount_base, tx_sig)
  VALUES (?, ?, ?, ?)
`);


// --- Exported Functions ---

// User/Tier Functions
export function ensureUser(wallet) {
  upsertUserByWalletStmt.run(wallet);
}

export function linkWalletTelegram(wallet, telegramId) {
  linkTelegramStmt.run(wallet, String(telegramId));
}

export function linkTelegramToWallet(telegramId, wallet) {
  linkTelegramByIdStmt.run(String(telegramId), wallet);
}

export function getUserByWallet(wallet) {
  return getUserByWalletStmt.get(wallet) || null;
}

export function getUserByTelegram(telegramId) {
  return getUserByTelegramStmt.get(String(telegramId)) || null;
}

export function insertPayment({ wallet, tier, amountBase, txSig }) {
  insertPaymentStmt.run(wallet, tier, amountBase, txSig || null);
}

export function grantOrExtendEntitlement({ wallet, tier, durationSec }) {
  const now = Math.floor(Date.now() / 1000);
  const current = getEntitlementByTierStmt.get(wallet, tier);
  const base = current && current.expires_at > now ? current.expires_at : now;
  const expiresAt = base + Number(durationSec || 0);
  insertEntitlementStmt.run(wallet, tier, expiresAt);
  return expiresAt;
}

export function getStatus(wallet) {
  const ent = getEntitlementStmt.get(wallet);
  const now = Math.floor(Date.now() / 1000);
  if (!ent) return { active: false, wallet, tier: null, expiresAt: null, secondsLeft: 0 };
  const left = Math.max(0, ent.expires_at - now);
  return {
    active: left > 0,
    wallet,
    tier: ent.tier,
    expiresAt: ent.expires_at,
    secondsLeft: left
  };
}

// Product/Marketplace Functions (NEW)
export function insertProduct(data) {
  insertProductStmt.run(data);
}

export function getAllProducts() {
  return getAllProductsStmt.all();
}

export function getProductById(id) {
  return getProductByIdStmt.get(id);
}

export function decrementStock(id) {
  return decrementStockStmt.run(id);
}

// Order Functions (NEW)
export function insertOrder({ sku, wallet, amountBase, txSig }) {
  insertOrderStmt.run(sku, wallet, amountBase, txSig);
}
