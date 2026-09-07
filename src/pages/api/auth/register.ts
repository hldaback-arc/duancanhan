import type { NextApiRequest, NextApiResponse } from "next";
import { createSession, createUser, isDatabaseConstraintError, toPublicUser } from "@/lib/auth";
import { setSessionCookie } from "@/lib/api";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Phương thức không được hỗ trợ." });
  const { fullName, email, phone, password } = req.body ?? {};
  if (![fullName, email, phone, password].every((value) => typeof value === "string" && value.trim())) return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin." });
  if (password.length < 8) return res.status(400).json({ message: "Mật khẩu cần ít nhất 8 ký tự." });
  try {
    const user = await createUser({ fullName: fullName.trim(), email: email.trim().toLowerCase(), phone: phone.trim(), password });
    if (!user) return res.status(500).json({ message: "Không thể tạo tài khoản." });
    setSessionCookie(res, await createSession(user.id));
    return res.status(201).json({ user: toPublicUser(user) });
  } catch (error) {
    if (isDatabaseConstraintError(error)) return res.status(409).json({ message: "Email đã được sử dụng." });
    return res.status(500).json({ message: "Không thể tạo tài khoản lúc này." });
  }
}