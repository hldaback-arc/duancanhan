const crypto = require("node:crypto");
const { createClient } = require("@supabase/supabase-js");

if (typeof process.loadEnvFile === "function") process.loadEnvFile(".env.local");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD;
if (!adminEmail || !adminPassword) throw new Error("Missing ADMIN_EMAIL or ADMIN_PASSWORD in .env.local");
if (adminPassword.length < 8) throw new Error("ADMIN_PASSWORD must contain at least 8 characters");
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
    approval_status: "approved",
    management_role: "none",
    password_hash: password.hash,
    password_salt: password.salt,
  }, { onConflict: "email" }).select("id, email, role").single();
  if (error) throw error;
  console.log(`Created ${data.role} account #${data.id}: ${data.email}`);
}
reset().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
