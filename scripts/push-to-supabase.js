const path = require("node:path");
const sqlite3 = require("sqlite3").verbose();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jojvhyatsmbkvvodrjri.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databasePath = path.join(process.cwd(), "data", "learning-space.sqlite");

if (!serviceRoleKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY. Set it in the terminal before running this script.");
  process.exit(1);
}

function all(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    const database = new sqlite3.Database(databasePath);
    database.all(sql, parameters, (error, rows) => {
      database.close();
      if (error) reject(error);
      else resolve(rows);
    });
  });
}

async function pushUsers() {
  const users = await all("SELECT id, full_name, email, phone, student_id, role, password_hash, password_salt, created_at FROM users");
  const payload = users.map((user) => ({
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone || user.student_id || "Chưa cập nhật",
    role: user.role || "customer",
    password_hash: user.password_hash,
    password_salt: user.password_salt,
    created_at: user.created_at,
  }));

  const response = await fetch(`${supabaseUrl}/rest/v1/users?on_conflict=id`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Supabase users upsert failed (${response.status}): ${message}`);
  }
  console.log(`Pushed ${payload.length} user record(s) to ${supabaseUrl}.`);
}

pushUsers().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
