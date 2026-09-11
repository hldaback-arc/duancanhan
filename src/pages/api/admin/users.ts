import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/api";
import { supabase } from "@/lib/supabase";

type AccountStatus = "pending" | "approved" | "rejected";
type AccessLevel = "manage" | "booking";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireUser(req, res);
  if (!admin) return;
  if (admin.role !== "admin") return res.status(403).json({ message: "Bạn không có quyền quản trị tài khoản." });

  try {
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, phone, role, account_status, access_level, created_at")
        .eq("role", "customer")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return res.status(200).json({ users: data ?? [] });
    }

    if (req.method !== "PATCH") return res.status(405).json({ message: "Phương thức không được hỗ trợ." });
    const userId = Number(req.body?.userId);
    const status = req.body?.status as AccountStatus;
    const accessLevel = req.body?.accessLevel as AccessLevel;
    if (!Number.isInteger(userId) || !["pending", "approved", "rejected"].includes(status) || !["manage", "booking"].includes(accessLevel)) {
      return res.status(400).json({ message: "Thông tin cấp quyền không hợp lệ." });
    }

    const { data, error } = await supabase
      .from("users")
      .update({ account_status: status, access_level: accessLevel })
      .eq("id", userId)
      .eq("role", "customer")
      .select("id, full_name, email, phone, role, account_status, access_level, created_at")
      .single();
    if (error) throw error;
    return res.status(200).json({ user: data });
  } catch (error) {
    console.error("Admin users API error", error);
    return res.status(500).json({ message: "Không thể cập nhật danh sách tài khoản lúc này." });
  }
}
