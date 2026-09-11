import crypto from "node:crypto";
import { supabase } from "./supabase";

type UserRow = {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  role: "admin" | "customer";
  account_status: "pending" | "approved" | "rejected";
  access_level: "manage" | "booking";
  password_hash: string;
  password_salt: string;
};

type PublicUser = Omit<UserRow, "password_hash" | "password_salt">;

function hashPassword(password: string, salt = crypto.randomBytes(16).toString("hex")) {
  return new Promise<{ hash: string; salt: string }>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) reject(error);
      else resolve({ hash: derivedKey.toString("hex"), salt });
    });
  });
}

export function toPublicUser(user: PublicUser) {
  return { id: user.id, fullName: user.full_name, email: user.email, phone: user.phone, role: user.role, accountStatus: user.account_status, accessLevel: user.access_level };
}

export async function createUser(input: { fullName: string; email: string; phone: string; password: string }) {
  const password = await hashPassword(input.password);
  const { data, error } = await supabase.from("users").insert({
    full_name: input.fullName,
    email: input.email,
    phone: input.phone,
    role: "customer",
    account_status: "pending",
    access_level: "booking",
    password_hash: password.hash,
    password_salt: password.salt,
  }).select("id").single();
  if (error) throw error;
  return getUserById(data.id);
}

async function ensureAdminUserFromEnv() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) return;

  const password = await hashPassword(adminPassword);
  const { data: existingUser, error: fetchError } = await supabase.from("users").select("id").eq("email", adminEmail).maybeSingle<{ id: number }>();
  if (fetchError) throw fetchError;

  if (existingUser) {
    const { error: updateError } = await supabase.from("users").update({
      full_name: "Quản trị viên Lotus Cinema",
      role: "admin",
      account_status: "approved",
      access_level: "manage",
      password_hash: password.hash,
      password_salt: password.salt,
      phone: "",
    }).eq("id", existingUser.id);
    if (updateError) throw updateError;
    return;
  }

  const { error: insertError } = await supabase.from("users").insert({
    full_name: "Quản trị viên Lotus Cinema",
    email: adminEmail,
    phone: "",
    role: "admin",
    account_status: "approved",
    access_level: "manage",
    password_hash: password.hash,
    password_salt: password.salt,
  });
  if (insertError) throw insertError;
}

export async function findUserForLogin(email: string, password: string) {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (adminEmail && email === adminEmail) {
    await ensureAdminUserFromEnv();
  }

  const { data: user, error } = await supabase.from("users").select("*").eq("email", email).maybeSingle<UserRow>();
  if (error) throw error;
  if (!user) return undefined;

  const generatedHash = await hashPassword(password, user.password_salt);
  const expectedHash = Buffer.from(user.password_hash, "hex");
  const actualHash = Buffer.from(generatedHash.hash, "hex");

  if (expectedHash.length !== actualHash.length) return undefined;

  const matches = crypto.timingSafeEqual(expectedHash, actualHash);
  return matches ? user : undefined;
}

export function getUserById(id: number) {
  return supabase.from("users").select("id, full_name, email, phone, role, account_status, access_level").eq("id", id).maybeSingle<PublicUser>().then(({ data, error }) => {
    if (error) throw error;
    return data ?? undefined;
  });
}

export async function updateUser(id: number, input: { fullName: string; email: string; phone: string }) {
  const { error } = await supabase.from("users").update({ full_name: input.fullName, email: input.email, phone: input.phone }).eq("id", id);
  if (error) throw error;
  return getUserById(id);
}

export async function updatePassword(id: number, currentPassword: string, newPassword: string) {
  const { data: user, error } = await supabase.from("users").select("*").eq("id", id).maybeSingle<UserRow>();
  if (error) throw error;
  if (!user) return false;
  const currentHash = await hashPassword(currentPassword, user.password_salt);
  if (!crypto.timingSafeEqual(Buffer.from(currentHash.hash, "hex"), Buffer.from(user.password_hash, "hex"))) return false;
  const nextPassword = await hashPassword(newPassword);
  const { error: updateError } = await supabase.from("users").update({ password_hash: nextPassword.hash, password_salt: nextPassword.salt }).eq("id", id);
  if (updateError) throw updateError;
  return true;
}

export async function deleteUser(id: number) {
  const { error: sessionError } = await supabase.from("sessions").delete().eq("user_id", id);
  if (sessionError) throw sessionError;
  const { error } = await supabase.from("users").delete().eq("id", id);
  if (error) throw error;
}

export async function createSession(userId: number) {
  const token = crypto.randomBytes(32).toString("hex");
  const { error } = await supabase.from("sessions").insert({ token, user_id: userId, expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  if (error) throw error;
  return token;
}

export async function getUserFromSession(token?: string) {
  if (!token) return undefined;
  const { data: session, error } = await supabase.from("sessions").select("user_id, expires_at").eq("token", token).maybeSingle<{ user_id: number; expires_at: number }>();
  if (error) throw error;
  if (!session || session.expires_at < Date.now()) return undefined;
  return getUserById(session.user_id);
}

export async function deleteSession(token?: string) {
  if (!token) return;
  const { error } = await supabase.from("sessions").delete().eq("token", token);
  if (error) throw error;
}

export function isDatabaseConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "23505";
}
