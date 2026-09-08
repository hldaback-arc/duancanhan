import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/api";
import { supabase } from "@/lib/supabase";

type CinemaResponse = { movies: unknown[]; rooms: unknown[]; showtimes: unknown[]; tickets: unknown[] };

async function requireAdmin(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return undefined;
  if (user.role !== "admin") {
    res.status(403).json({ message: "Bạn không có quyền quản trị rạp." });
    return undefined;
  }
  return user;
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
    if (action === "movie") result = await supabase.from("movies").insert(data).select("*").single();
    else if (action === "room") result = await supabase.from("rooms").insert(data).select("*").single();
    else if (action === "showtime") result = await supabase.from("showtimes").insert(data).select("*").single();
    else if (action === "ticket") {
      result = await supabase.from("tickets").insert({ ...data, user_id: admin.id, customer_name: admin.fullName, customer_email: admin.email }).select("*").single();
    } else return res.status(400).json({ message: "Loại dữ liệu không hợp lệ." });
    if (result.error) throw result.error;
    return res.status(201).json({ item: result.data });
  } catch (error) {
    console.error("Cinema API error", error);
    return res.status(500).json({ message: "Không thể lưu dữ liệu rạp lúc này." });
  }
}