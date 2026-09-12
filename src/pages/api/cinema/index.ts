import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/api";
import { supabase } from "@/lib/supabase";

type CinemaResponse = { movies: unknown[]; rooms: unknown[]; showtimes: unknown[]; tickets: unknown[] };

async function requireAdmin(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return undefined;
  if (user.account_status !== "approved") {
    res.status(403).json({ message: "Tài khoản chưa được cấp quyền sử dụng dữ liệu rạp." });
    return undefined;
  }
  if (user.role !== "admin" && !["booking", "manage"].includes(user.access_level)) {
    res.status(403).json({ message: "Bạn không có quyền quản trị rạp." });
    return undefined;
  }
  return user;
}

function canManage(user: { role: string; access_level: string }) {
  return user.role === "admin" || user.access_level === "manage";
}

async function getCinemaData(): Promise<CinemaResponse> {
  const [movies, rooms, showtimes, tickets] = await Promise.all([
    supabase.from("movies").select("*").order("id"),
    supabase.from("rooms").select("*").order("id"),
    supabase.from("showtimes").select("*").order("date").order("start_time"),
    supabase.from("tickets").select("*").order("created_at", { ascending: false }),
  ]);
  const failed = [movies, rooms, showtimes, tickets].find((result) => result.error);
  if (failed?.error) throw failed.error;
  return {
    movies: movies.data ?? [],
    rooms: rooms.data ?? [],
    showtimes: showtimes.data ?? [],
    tickets: tickets.data ?? [],
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    if (req.method === "GET") return res.status(200).json(await getCinemaData());
    if (req.method !== "POST") return res.status(405).json({ message: "Phương thức không được hỗ trợ." });

    const { action, data } = req.body ?? {};
    let result;
    if (["movie", "room", "showtime", "delete", "update"].includes(action) && !canManage(admin)) {
      return res.status(403).json({ message: "Quyền hiện tại chỉ cho phép đặt vé và in vé." });
    }
    if (action === "movie") result = await supabase.from("movies").insert(data).select("*").single();
    else if (action === "room") result = await supabase.from("rooms").insert(data).select("*").single();
    else if (action === "showtime") result = await supabase.from("showtimes").insert(data).select("*").single();
    else if (action === "ticket") {
      const existing = await supabase.from("tickets").select("seats").eq("showtime_id", data.showtime_id);
      if (existing.error) throw existing.error;
      const bookedSeats = new Set((existing.data ?? []).flatMap((ticket) => ticket.seats ?? []));
      const requestedSeats = Array.isArray(data.seats) ? data.seats : [];
      const conflict = requestedSeats.find((seat: string) => bookedSeats.has(seat));
      if (conflict) return res.status(409).json({ message: `Ghế ${conflict} vừa được đặt. Vui lòng chọn ghế khác.` });
      result = await supabase.from("tickets").insert({ ...data, user_id: admin.id, customer_name: admin.full_name, customer_email: admin.email }).select("*").single();
    } else if (action === "delete") {
      const table = data.table as string;
      if (!["movies", "rooms", "showtimes", "tickets"].includes(table)) return res.status(400).json({ message: "Loại dữ liệu không hợp lệ." });
      result = await supabase.from(table).delete().eq("id", data.id);
    } else if (action === "update") {
      const table = data.table as string;
      if (!["movies", "rooms", "showtimes", "tickets"].includes(table)) return res.status(400).json({ message: "Loại dữ liệu không hợp lệ." });
      const { id, ...changes } = data;
      delete changes.table;
      if (table === "tickets" && changes.showtime_id && Array.isArray(changes.seats)) {
        const existing = await supabase.from("tickets").select("id,seats").eq("showtime_id", changes.showtime_id).neq("id", id);
        if (existing.error) throw existing.error;
        const bookedSeats = new Set((existing.data ?? []).flatMap((ticket) => ticket.seats ?? []));
        const conflict = changes.seats.find((seat: string) => bookedSeats.has(seat));
        if (conflict) return res.status(409).json({ message: `Ghế ${conflict} đã được đặt trong suất chiếu này.` });
      }
      result = await supabase.from(table).update(changes).eq("id", id).select("*").single();
    } else return res.status(400).json({ message: "Loại dữ liệu không hợp lệ." });
    if (result.error) throw result.error;
    return res.status(201).json({ item: result.data });
  } catch (error) {
    console.error("Cinema API error", error);
    return res.status(500).json({ message: "Không thể lưu dữ liệu rạp lúc này." });
  }
}