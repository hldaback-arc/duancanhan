const crypto = require("node:crypto");
const { createClient } = require("@supabase/supabase-js");

if (typeof process.loadEnvFile === "function") process.loadEnvFile(".env.local");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const admin = {
  fullName: "Quản trị viên Lotus Cinema",
  email: "admin@lotuscinema.vn",
  phone: "",
  password: "Admin@123456",
};

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  return { hash: crypto.scryptSync(password, salt, 64).toString("hex"), salt };
}
async function reset() {
  const { error: sessionError } = await supabase.from("sessions").delete().neq("token", "");
  if (sessionError) throw sessionError;
  const { error: userError } = await supabase.from("users").delete().neq("email", "");
  if (userError) throw userError;
  const password = hashPassword(admin.password);
  const { data, error } = await supabase.from("users").insert({
    full_name: admin.fullName,
    email: admin.email,
    phone: admin.phone,
    role: "admin",
    password_hash: password.hash,
    password_salt: password.salt,
  }).select("id, email, role").single();
  if (error) throw error;
  console.log(`Created ${data.role} account #${data.id}: ${data.email}`);
}
reset().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
