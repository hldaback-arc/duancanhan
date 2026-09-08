const crypto = require("node:crypto");
const { createClient } = require("@supabase/supabase-js");

if (typeof process.loadEnvFile === "function") process.loadEnvFile(".env.local");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD;
if (!supabaseUrl || !serviceRoleKey || !adminEmail || !adminPassword) {
  throw new Error("Missing Supabase or admin environment variables");
}
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const admin = {
  fullName: "Quản trị viên Lotus Cinema",
  email: adminEmail,
  phone: "",
  password: adminPassword,
};

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  return { hash: crypto.scryptSync(password, salt, 64).toString("hex"), salt };
}
async function reset() {
  const password = hashPassword(admin.password);
  const { data, error } = await supabase.from("users").upsert({
    full_name: admin.fullName,
    email: admin.email,
    phone: admin.phone,
    role: "admin",
    password_hash: password.hash,
    password_salt: password.salt,
  }, { onConflict: "email" }).select("id, email, role").single();
  if (error) throw error;
  const { error: sessionError } = await supabase.from("sessions").delete().eq("user_id", data.id);
  if (sessionError) throw sessionError;
  console.log(`Created ${data.role} account #${data.id}: ${data.email}`);
}
reset().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
