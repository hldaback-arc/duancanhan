import type { NextApiRequest, NextApiResponse } from "next";
import { stringifySetCookie } from "cookie";
import { deleteSession, getUserFromSession } from "./auth";

export const sessionCookie = "learning_session";

export function setSessionCookie(res: NextApiResponse, token: string) {
  res.setHeader("Set-Cookie", stringifySetCookie({ name: sessionCookie, value: token, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 7 * 24 * 60 * 60 }));
}

export async function requireUser(req: NextApiRequest, res: NextApiResponse) {
  const user = await getUserFromSession(req.cookies[sessionCookie]);
  if (!user) {
    res.status(401).json({ message: "Phiên đăng nhập đã hết hạn." });
    return undefined;
  }
  return user;
}

export async function clearSession(req: NextApiRequest, res: NextApiResponse) {
  await deleteSession(req.cookies[sessionCookie]);
  res.setHeader("Set-Cookie", stringifySetCookie({ name: sessionCookie, value: "", httpOnly: true, path: "/", maxAge: 0 }));
}