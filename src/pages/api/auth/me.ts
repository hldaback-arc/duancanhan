import type { NextApiRequest, NextApiResponse } from "next";
import { deleteUser, isDatabaseConstraintError, toPublicUser, updateUser } from "@/lib/auth";
import { clearSession, requireUser } from "@/lib/api";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;
  if (req.method === "GET") return res.status(200).json({ user: toPublicUser(user) });
  if (req.method === "DELETE") {
    await deleteUser(user.id);
    await clearSession(req, res);
    return res.status(200).json({ ok: true });
  }
  if (req.method !== "PATCH") return res.status(405).json({ message: "Phương thức không được hỗ trợ." });
  const { fullName, email, phone } = req.body ?? {};
  if (![fullName, email, phone].every((value) => typeof value === "string" && value.trim())) return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin." });
  try {
    const updated = await updateUser(user.id, { fullName: fullName.trim(), email: email.trim().toLowerCase(), phone: phone.trim() });
    return res.status(200).json({ user: updated ? toPublicUser(updated) : undefined });
  } catch (error) {
    if (isDatabaseConstraintError(error)) return res.status(409).json({ message: "Email đã được sử dụng." });
    return res.status(500).json({ message: "Không thể cập nhật thông tin." });
  }
}