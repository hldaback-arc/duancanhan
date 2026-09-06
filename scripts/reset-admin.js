const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const sqlite3 = require("sqlite3").verbose();

const databaseDirectory = path.join(process.cwd(), "data");
const databasePath = path.join(databaseDirectory, "learning-space.sqlite");
const admin = {
  fullName: "Quản trị viên Lotus Cinema",
  email: "admin@lotuscinema.vn",
  studentId: "ADMIN-001",
  className: "ADMIN",
  password: "Admin@123456",
};

fs.mkdirSync(databaseDirectory, { recursive: true });
const database = new sqlite3.Database(databasePath);
const run = (sql, parameters = []) => new Promise((resolve, reject) => {
  database.run(sql, parameters, function onRun(error) {
    if (error) reject(error);
    else resolve(this);
  });
});
const get = (sql, parameters = []) => new Promise((resolve, reject) => {
  database.get(sql, parameters, (error, row) => error ? reject(error) : resolve(row));
});

async function reset() {
  await run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, full_name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, student_id TEXT NOT NULL UNIQUE, class_name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'customer', password_hash TEXT NOT NULL, password_salt TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)");
  await run("CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires_at INTEGER NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)");
  const columns = await new Promise((resolve, reject) => database.all("PRAGMA table_info(users)", (error, rows) => error ? reject(error) : resolve(rows)));
  if (!columns.some((column) => column.name === "role")) await run("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'customer'");
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(admin.password, salt, 64).toString("hex");
  await run("BEGIN TRANSACTION");
  try {
    await run("DELETE FROM sessions");
    await run("DELETE FROM users");
    await run("INSERT INTO users (full_name, email, student_id, class_name, role, password_hash, password_salt) VALUES (?, ?, ?, ?, 'admin', ?, ?)", [admin.fullName, admin.email, admin.studentId, admin.className, hash, salt]);
    await run("COMMIT");
  } catch (error) {
    await run("ROLLBACK");
    throw error;
  }
  const account = await get("SELECT id, email, role FROM users");
  console.log(`Created ${account.role} account #${account.id}: ${account.email}`);
}

reset().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => database.close());
