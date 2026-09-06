import type { NextApiRequest, NextApiResponse } from "next";
import { updatePassword } from "@/lib/auth";
import { requireUser } from "@/lib/api";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;
  if (req.method !== "POST") return res.status(405).json({ message: "Phương thức không được hỗ trợ." });
  const { currentPassword, newPassword } = req.body ?? {};
  if (typeof currentPassword !== "string" || typeof newPassword !== "string") return res.status(400).json({ message: "Vui lòng nhập đủ mật khẩu." });
  if (newPassword.length < 8) return res.status(400).json({ message: "Mật khẩu mới cần ít nhất 8 ký tự." });
  if (!(await updatePassword(user.id, currentPassword, newPassword))) return res.status(400).json({ message: "Mật khẩu hiện tại không đúng." });
  return res.status(200).json({ message: "Đổi mật khẩu thành công." });
}