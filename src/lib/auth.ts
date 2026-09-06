import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sqlite3 from "sqlite3";

type UserRow = {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  role: "admin" | "customer";
  password_hash: string;
  password_salt: string;
};

type PublicUser = Omit<UserRow, "password_hash" | "password_salt">;

const databaseDirectory = path.join(process.cwd(), "data");
const databasePath = path.join(databaseDirectory, "learning-space.sqlite");
let database: sqlite3.Database | undefined;

function getDatabase() {
  if (!database) {
    fs.mkdirSync(databaseDirectory, { recursive: true });
    database = new sqlite3.Database(databasePath);
    database.serialize(() => {
      database?.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, full_name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, phone TEXT NOT NULL DEFAULT '', student_id TEXT NOT NULL DEFAULT '', class_name TEXT NOT NULL DEFAULT '', role TEXT NOT NULL DEFAULT 'customer', password_hash TEXT NOT NULL, password_salt TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)");
      database?.run("CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires_at INTEGER NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)");
      database?.all("PRAGMA table_info(users)", (error, columns: { name: string }[] = []) => {
        if (!error && !columns.some((column) => column.name === "role")) database?.run("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'customer'");
        if (!error && !columns.some((column) => column.name === "phone")) database?.run("ALTER TABLE users ADD COLUMN phone TEXT NOT NULL DEFAULT ''");
      });
    });
  }
  return database;
}

function run(sql: string, parameters: unknown[] = []) {
  return new Promise<{ lastID: number }>((resolve, reject) => {
    getDatabase().run(sql, parameters, function onRun(error) {
      if (error) reject(error);
      else resolve({ lastID: this.lastID });
    });
  });
}

function get<T>(sql: string, parameters: unknown[] = []) {
  return new Promise<T | undefined>((resolve, reject) => {
    getDatabase().get(sql, parameters, (error, row) => {
      if (error) reject(error);
      else resolve(row as T | undefined);
    });
  });
}

function hashPassword(password: string, salt = crypto.randomBytes(16).toString("hex")) {
  return new Promise<{ hash: string; salt: string }>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) reject(error);
      else resolve({ hash: derivedKey.toString("hex"), salt });
    });
  });
}

export function toPublicUser(user: PublicUser) {
  return { id: user.id, fullName: user.full_name, email: user.email, phone: user.phone, role: user.role };
}

export async function createUser(input: { fullName: string; email: string; phone: string; password: string }) {
  const password = await hashPassword(input.password);
  const result = await run("INSERT INTO users (full_name, email, phone, student_id, class_name, role, password_hash, password_salt) VALUES (?, ?, ?, ?, 'member', 'customer', ?, ?)", [input.fullName, input.email, input.phone, input.phone, password.hash, password.salt]);
  return getUserById(result.lastID);
}

export async function findUserForLogin(email: string, password: string) {
  const user = await get<UserRow>("SELECT * FROM users WHERE email = ?", [email]);
  if (!user) return undefined;
  const passwordHash = await hashPassword(password, user.password_salt);
  const matches = crypto.timingSafeEqual(Buffer.from(passwordHash.hash, "hex"), Buffer.from(user.password_hash, "hex"));
  return matches ? user : undefined;
}

export function getUserById(id: number) {
  return get<PublicUser>("SELECT id, full_name, email, phone, role FROM users WHERE id = ?", [id]);
}

export async function updateUser(id: number, input: { fullName: string; email: string; phone: string }) {
  await run("UPDATE users SET full_name = ?, email = ?, phone = ? WHERE id = ?", [input.fullName, input.email, input.phone, id]);
  return getUserById(id);
}

export async function updatePassword(id: number, currentPassword: string, newPassword: string) {
  const user = await get<UserRow>("SELECT * FROM users WHERE id = ?", [id]);
  if (!user) return false;
  const currentHash = await hashPassword(currentPassword, user.password_salt);
  if (!crypto.timingSafeEqual(Buffer.from(currentHash.hash, "hex"), Buffer.from(user.password_hash, "hex"))) return false;
  const nextPassword = await hashPassword(newPassword);
  await run("UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?", [nextPassword.hash, nextPassword.salt, id]);
  return true;
}

export async function deleteUser(id: number) {
  await run("DELETE FROM sessions WHERE user_id = ?", [id]);
  return run("DELETE FROM users WHERE id = ?", [id]);
}

export async function createSession(userId: number) {
  const token = crypto.randomBytes(32).toString("hex");
  await run("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)", [token, userId, Date.now() + 7 * 24 * 60 * 60 * 1000]);
  return token;
}

export async function getUserFromSession(token?: string) {
  if (!token) return undefined;
  const session = await get<{ user_id: number; expires_at: number }>("SELECT user_id, expires_at FROM sessions WHERE token = ?", [token]);
  if (!session || session.expires_at < Date.now()) return undefined;
  return getUserById(session.user_id);
}

export function deleteSession(token?: string) {
  if (!token) return Promise.resolve();
  return run("DELETE FROM sessions WHERE token = ?", [token]);
}

export function isDatabaseConstraintError(error: unknown) {
  return error instanceof Error && error.message.includes("SQLITE_CONSTRAINT");
}
