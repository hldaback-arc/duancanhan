import type { NextApiRequest, NextApiResponse } from "next";
import { createSession, findUserForLogin, toPublicUser } from "@/lib/auth";
import { setSessionCookie } from "@/lib/api";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Phương thức không được hỗ trợ." });
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  try {
    const user = email && password ? await findUserForLogin(email, password) : undefined;
    if (!user) return res.status(401).json({ message: "Email hoặc mật khẩu không đúng." });
    setSessionCookie(res, await createSession(user.id));
    return res.status(200).json({ user: toPublicUser(user) });
  } catch {
    return res.status(500).json({ message: "Không thể đăng nhập lúc này." });
  }
}