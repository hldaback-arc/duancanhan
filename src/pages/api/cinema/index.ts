import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/api";
import { supabase } from "@/lib/supabase";

type CinemaResponse = { movies: unknown[]; rooms: unknown[]; showtimes: unknown[]; tickets: unknown[]; users: unknown[] };

async function requireManager(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return undefined;
  const canManage = user.role === "admin" || (user.approval_status === "approved" && user.management_role !== "none");
  if (!canManage) {
    res.status(403).json({ message: "Bạn không có quyền quản trị rạp." });
    return undefined;
  }
  return user;
}

async function getCinemaData(): Promise<CinemaResponse> {
  const [movies, rooms, showtimes, tickets, users] = await Promise.all([
    supabase.from("movies").select("*").order("id"),
    supabase.from("rooms").select("*").order("id"),
    supabase.from("showtimes").select("*").order("date").order("start_time"),
    supabase.from("tickets").select("*").order("created_at", { ascending: false }),
    supabase.from("users").select("id, full_name, email, phone, role, approval_status, management_role, created_at").order("created_at", { ascending: false }),
  ]);
  const failed = [movies, rooms, showtimes, tickets].find((result) => result.error);
  if (failed?.error) throw failed.error;
  return {
    movies: movies.data ?? [],
    rooms: rooms.data ?? [],
    showtimes: showtimes.data ?? [],
    tickets: tickets.data ?? [],
    users: users.data ?? [],
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const manager = await requireManager(req, res);
  if (!manager) return;
  try {
    if (req.method === "GET") {
      const data = await getCinemaData();
      if (manager.role !== "admin") data.users = [];
      return res.status(200).json(data);
    }
    if (req.method !== "POST") return res.status(405).json({ message: "Phương thức không được hỗ trợ." });

    const { action, data } = req.body ?? {};
    let result;
    if (manager.role !== "admin") {
      const allowedActions = manager.management_role === "manager" ? ["movie", "room", "showtime"] : ["ticket"];
      if (!allowedActions.includes(action)) return res.status(403).json({ message: "Cấp quyền hiện tại không cho phép thao tác này." });
    }
    if (action === "permission") {
      if (manager.role !== "admin") return res.status(403).json({ message: "Chỉ admin mới được cấp quyền." });
      if (!data?.userId || !["none", "operator", "manager"].includes(data.managementRole)) return res.status(400).json({ message: "Thông tin quyền không hợp lệ." });
      result = await supabase.from("users").update({ approval_status: data.managementRole === "none" ? "rejected" : "approved", management_role: data.managementRole }).eq("id", data.userId).select("id, full_name, email, phone, role, approval_status, management_role, created_at").single();
    }
    if (action === "movie") result = await supabase.from("movies").insert(data).select("*").single();
    else if (action === "room") result = await supabase.from("rooms").insert(data).select("*").single();
    else if (action === "showtime") result = await supabase.from("showtimes").insert(data).select("*").single();
    else if (action === "ticket") {
      result = await supabase.from("tickets").insert({ ...data, user_id: manager.id, customer_name: manager.full_name, customer_email: manager.email }).select("*").single();
    } else if (action !== "permission") return res.status(400).json({ message: "Loại dữ liệu không hợp lệ." });
    if (result.error) throw result.error;
    return res.status(201).json({ item: result.data });
  } catch (error) {
    console.error("Cinema API error", error);
    return res.status(500).json({ message: "Không thể lưu dữ liệu rạp lúc này." });
  }
}