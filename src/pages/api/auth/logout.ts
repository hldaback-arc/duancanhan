import type { NextApiRequest, NextApiResponse } from "next";
import { clearSession } from "@/lib/api";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Phương thức không được hỗ trợ." });
  await clearSession(req, res);
  return res.status(200).json({ ok: true });
}