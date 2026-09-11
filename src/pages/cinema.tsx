// @ts-nocheck
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Movie = { id: string; title: string; genre: string; duration: number; release: string; status: "Đang chiếu" | "Sắp chiếu"; poster: string };
type Room = { id: string; name: string; type: string; rows: number; seats: number; status: "Hoạt động" | "Bảo trì" };
type Seat = { id: string; row: string; number: number; type: "Thường"; status: "Trống" | "Đã đặt" };
type LoyaltyCustomer = { name: string; email: string; points: number; tier: string; joined: string };
type Showtime = { id: string; movieId: string; roomId: string; date: string; start: string; end: string; price: number };
type Ticket = { id: string; customer: string; email: string; showtimeId: string; movie: string; seats: string; amount: number; status: string; paymentMethod: string };
type AccountUser = { id: number; full_name: string; email: string; phone: string; account_status: "pending" | "approved" | "rejected"; access_level: "manage" | "booking"; created_at: string };
type View = "overview" | "movies" | "rooms" | "seats" | "schedules" | "tickets" | "customers" | "accounts" | "booking" | "revenue";
type MovieMap = { get(key: string): Movie };
type RoomMap = { get(key: string): Room };

const moviesSeed: Movie[] = [
  { id: "MV-001", title: "Avatar 3", genre: "Sci-Fi", duration: 162, release: "15/09/2026", status: "Đang chiếu", poster: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=160&q=80" },
  { id: "MV-002", title: "Conan: Ngôi sao 5 cánh", genre: "Anime", duration: 110, release: "20/09/2026", status: "Sắp chiếu", poster: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=160&q=80" },
  { id: "MV-003", title: "Mùa hè cuối cùng", genre: "Tâm lý", duration: 98, release: "08/09/2026", status: "Đang chiếu", poster: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=160&q=80" },
  { id: "MV-004", title: "Đêm trong rừng", genre: "Kinh dị", duration: 115, release: "01/10/2026", status: "Sắp chiếu", poster: "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=160&q=80" },
];
const roomsSeed: Room[] = [
  { id: "R-01", name: "Phòng 01", type: "2D", rows: 5, seats: 40, status: "Hoạt động" },
  { id: "R-02", name: "Phòng 02", type: "3D", rows: 5, seats: 40, status: "Hoạt động" },
  { id: "R-VIP", name: "Phòng VIP", type: "IMAX", rows: 5, seats: 40, status: "Bảo trì" },
];
const showtimesSeed: Showtime[] = [
  { id: "ST-001", movieId: "MV-001", roomId: "R-01", date: "15/09/2026", start: "18:00", end: "20:42", price: 80000 },
  { id: "ST-002", movieId: "MV-001", roomId: "R-02", date: "15/09/2026", start: "20:00", end: "22:42", price: 100000 },
  { id: "ST-003", movieId: "MV-002", roomId: "R-01", date: "15/09/2026", start: "19:30", end: "21:20", price: 70000 },
];
const customersSeed: LoyaltyCustomer[] = [{ name: "Nguyễn Minh Anh", email: "minhanh@email.com", points: 960, tier: "Vàng", joined: "02/08/2026" }, { name: "Trần Hoàng Nam", email: "hoangnam@email.com", points: 720, tier: "Bạc", joined: "18/08/2026" }, { name: "Lê Thu Hà", email: "thuha@email.com", points: 350, tier: "Đồng", joined: "01/09/2026" }];
const revenueSeed = [14.2, 16.8, 15.6, 18.9, 21.7, 20.4, 17.9];
const revenueTotal = revenueSeed.reduce((sum, value) => sum + value, 0);
const todayTickets = 236;
const todayRevenue = 18.9;
function loyaltyTier(points: number) { return points >= 900 ? "Vàng" : points >= 500 ? "Bạc" : "Đồng"; }

function money(value: number) { return `${value.toLocaleString("vi-VN")}đ`; }
function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers, ...rows].map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(",")).join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
function makeSeats(room: Room, bookedSeats = new Set<string>()): Seat[] {
  return Array.from({ length: room.seats }, (_, index) => {
    const row = String.fromCharCode(65 + Math.floor(index / 8));
    const number = index % 8 + 1;
    const id = `${row}${String(number).padStart(2, "0")}`;
    return { id, row, number, type: "Thường", status: bookedSeats.has(id) ? "Đã đặt" : "Trống" };
  });
}

async function postCinemaData(action: string, data: Record<string, unknown>) {
  const response = await fetch("/api/cinema", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, data }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Không thể lưu dữ liệu rạp.");
  return result.item;
}

async function deleteCinemaData(table: string, id: string) {
  const response = await fetch("/api/cinema", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", data: { table, id } }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Không thể xóa dữ liệu.");
}

function toTicket(row: any): Ticket {
  const seats = Array.isArray(row.seats)
    ? row.seats
    : typeof row.seats === "string"
      ? row.seats.replace(/^{|}$/g, "").split(",").map((seat: string) => seat.trim().replace(/^"|"$/g, "")).filter(Boolean)
      : [];
  return { id: row.id, customer: row.customer_name, email: row.customer_email, showtimeId: String(row.showtime_id), movie: row.movie || "", seats: seats.join(", "), amount: row.amount, status: row.status, paymentMethod: row.payment_method };
}

export default function Cinema() {
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isViewChanging, setIsViewChanging] = useState(false);
  const [view, setView] = useState<View>("overview");
  const [movies, setMovies] = useState(moviesSeed);
  const [rooms, setRooms] = useState(roomsSeed);
  const [showtimes, setShowtimes] = useState(showtimesSeed);
  const [customers, setCustomers] = useState(customersSeed);
  const [accountUsers, setAccountUsers] = useState<AccountUser[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [query, setQuery] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("R-01");
  const [seats, setSeats] = useState<Seat[]>(makeSeats(roomsSeed[0]));
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [selectedShowtime, setSelectedShowtime] = useState(showtimesSeed[0].id);
  const [bookingStep, setBookingStep] = useState<"showtime" | "seats" | "payment" | "ticket">("showtime");
  const [paymentMethod, setPaymentMethod] = useState("Ví điện tử");
  const [modal, setModal] = useState<"movie" | "room" | "showtime" | null>(null);
  const [editModal, setEditModal] = useState<{ type: "movie" | "room" | "showtime" | "ticket" | "customer"; item: any } | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then(async (response) => {
      const result = response.ok ? await response.json() : undefined;
      if (!result?.user || result.user.accountStatus !== "approved") window.location.href = result?.user?.accountStatus === "pending" ? "/pending" : "/";
      else {
        const administrator = result.user.role === "admin";
        setIsAdmin(administrator);
        setCanManage(administrator || result.user.accessLevel === "manage");
        const dataResponse = await fetch("/api/cinema");
        if (!dataResponse.ok) throw new Error("Không thể tải dữ liệu rạp.");
        const data = await dataResponse.json();
        if (data.movies?.length) setMovies(data.movies);
        if (data.rooms?.length) setRooms(data.rooms);
        if (data.showtimes?.length) setShowtimes(data.showtimes.map((item: any) => ({ id: item.id, movieId: item.movie_id, roomId: item.room_id, date: item.date, start: item.start_time, end: item.end_time, price: item.price })));
        const moviesById = new Map((data.movies || []).map((item: any) => [item.id, item.title]));
        const showtimesById = new Map((data.showtimes || []).map((item: any) => [item.id, item.movie_id]));
        setTickets((data.tickets || []).map((item: any) => toTicket({ ...item, movie: moviesById.get(showtimesById.get(item.showtime_id)) || "" })));
        if (administrator) {
          const usersResponse = await fetch("/api/admin/users");
          if (usersResponse.ok) setAccountUsers((await usersResponse.json()).users || []);
        }
        setCheckingAccess(false);
      }
    }).catch(() => { window.location.href = "/"; });
  }, []);

  useEffect(() => {
    const returnToBooking = () => {
      if (bookingStep === "ticket") startNewBooking();
    };
    window.addEventListener("afterprint", returnToBooking);
    return () => window.removeEventListener("afterprint", returnToBooking);
  }, [bookingStep]);

  const movieMap = useMemo(() => new Map(movies.map((movie) => [movie.id, movie])) as MovieMap, [movies]);
  const roomMap = useMemo(() => new Map(rooms.map((room) => [room.id, room])) as RoomMap, [rooms]);
  const filteredMovies = movies.filter((movie) => `${movie.title} ${movie.id}`.toLowerCase().includes(query.toLowerCase()));
  const currentShowtime = showtimes.find((showtime) => showtime.id === selectedShowtime) || showtimes[0];
  const selectedMovie = currentShowtime ? movieMap.get(currentShowtime.movieId) : movies[0];
  const selectedRoom = currentShowtime ? roomMap.get(currentShowtime.roomId) : rooms[0];
  const total = currentShowtime ? selectedSeats.length * currentShowtime.price : 0;

  useEffect(() => {
    const roomId = view === "booking" ? currentShowtime?.roomId : selectedRoomId;
    const room = roomId ? roomMap.get(roomId) : undefined;
    const booked = view === "booking"
      ? new Set(tickets.filter((ticket) => String(ticket.showtimeId) === String(selectedShowtime)).flatMap((ticket) => ticket.seats.split(",").map((seat) => seat.trim()).filter(Boolean)))
      : new Set<string>();
    if (room) setSeats(makeSeats(room, booked));
  }, [currentShowtime?.roomId, roomMap, selectedRoomId, selectedShowtime, tickets, view]);

  function changeRoom(roomId: string) {
    const room = rooms.find((item) => item.id === roomId);
    if (!room) return;
    setSelectedRoomId(roomId);
    setSelectedSeats([]);
    setSeats(makeSeats(room));
  }
  function addSeat() {
    const room = roomMap.get(selectedRoomId);
    if (!room) { setNotice("Không tìm thấy phòng chiếu."); return; }
    const index = seats.length;
    const row = String.fromCharCode(65 + Math.floor(index / 8));
    const number = index % 8 + 1;
    setRooms((current) => current.map((item) => item.id === room.id ? { ...item, seats: item.seats + 1 } : item));
    setSeats((current) => [...current, { id: `${row}${String(number).padStart(2, "0")}`, row, number, type: "Thường", status: "Trống" }]);
    setNotice("Đã thêm ghế mới vào sơ đồ phòng.");
  }
  function removeSeat(seatId: string) {
    const room = roomMap.get(selectedRoomId);
    if (!room || !window.confirm(`Xóa ghế ${seatId}?`)) return;
    setSeats((current) => current.filter((seat) => seat.id !== seatId));
    setSelectedSeats((current) => current.filter((id) => id !== seatId));
    setRooms((current) => current.map((item) => item.id === room.id ? { ...item, seats: Math.max(0, item.seats - 1) } : item));
    setNotice(`Đã xóa ghế ${seatId}.`);
  }
  function exportTickets() { downloadCsv("bao-cao-ve-lotus-cinema.csv", ["Mã vé", "Khách hàng", "Phim", "Ghế", "Thành tiền", "Trạng thái"], tickets.map((ticket) => [ticket.id, ticket.customer, ticket.movie, ticket.seats, String(ticket.amount), ticket.status])); setNotice("Đã tải báo cáo vé xuống máy."); }
  function exportCustomers() { downloadCsv("danh-sach-tich-diem-lotus-cinema.csv", ["Khách hàng", "Email", "Điểm tích lũy", "Hạng thành viên", "Ngày tham gia"], [["Nguyễn Minh Anh", "minhanh@email.com", "960", "Vàng", "02/08/2026"], ["Trần Hoàng Nam", "hoangnam@email.com", "720", "Bạc", "18/08/2026"], ["Lê Thu Hà", "thuha@email.com", "350", "Đồng", "01/09/2026"]]); setNotice("Đã tải danh sách tích điểm xuống máy."); }
    function redeemVoucher(email: string, cost: number, code: string) { const customer = customers.find((item) => item.email === email); if (!customer) return; if (customer.points < cost) { setNotice(`${customer.name} chưa đủ điểm để dùng mã ${code}.`); return; } setCustomers((current) => current.map((item) => item.email === email ? { ...item, points: item.points - cost, tier: loyaltyTier(item.points - cost) } : item)); setNotice(`Đã dùng mã ${code}. ${customer.name} bị trừ ${cost} điểm.`); }
  async function removeItem(table: string, id: string, label: string, onRemove: () => void) { if (!window.confirm(`Xóa ${label} này?`)) return; try { await deleteCinemaData(table, id); onRemove(); setNotice(`Đã xóa ${label}.`); } catch (error) { setNotice(error instanceof Error ? error.message : `Không thể xóa ${label}.`); } }
  async function updateItem(table: string, id: string, changes: Record<string, unknown>, onUpdate: (item: any) => void) { try { const saved = await postCinemaData("update", { table, id, ...changes }); onUpdate(saved); setEditModal(null); setNotice("Đã cập nhật thông tin."); } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể cập nhật thông tin."); } }
  function toggleSeat(seat: Seat) {
    if (seat.status === "Đã đặt") { setNotice(`${seat.id} không thể chọn vì ghế đã được đặt.`); return; }
    setNotice(""); setSelectedSeats((current) => current.includes(seat.id) ? current.filter((id) => id !== seat.id) : [...current, seat.id]);
  }
  async function saveMovie(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const movie: Movie = { id: `MV-${String(movies.length + 1).padStart(3, "0")}`, title: String(data.get("title")), genre: String(data.get("genre")), duration: Number(data.get("duration")), release: String(data.get("release")), status: data.get("status") as Movie["status"], poster: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=160&q=80" }; try { const saved = await postCinemaData("movie", movie); setMovies((current) => [...current, saved]); setModal(null); } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể lưu phim."); } }
  async function saveRoom(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const room: Room = { id: `R-${String(rooms.length + 1).padStart(2, "0")}`, name: String(data.get("name")), type: String(data.get("type")), rows: Number(data.get("rows")), seats: Number(data.get("seats")), status: "Hoạt động" }; try { const saved = await postCinemaData("room", room); setRooms((current) => [...current, saved]); setModal(null); } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể lưu phòng."); } }
  async function saveShowtime(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const roomId = String(data.get("roomId")); const date = String(data.get("date")); const start = String(data.get("start"));
    const duplicate = showtimes.some((showtime) => showtime.roomId === roomId && showtime.date === date && showtime.start === start);
    if (duplicate) { setNotice("Phòng này đã có lịch chiếu trùng ngày và giờ."); return; }
    const showtime = { id: `ST-${String(showtimes.length + 1).padStart(3, "0")}`, movie_id: String(data.get("movieId")), room_id: roomId, date, start_time: start, end_time: String(data.get("end")), price: Number(data.get("price")) };
    try { const saved = await postCinemaData("showtime", showtime); setShowtimes((current) => [...current, { id: saved.id, movieId: saved.movie_id, roomId: saved.room_id, date: saved.date, start: saved.start_time, end: saved.end_time, price: saved.price }]); setModal(null); setNotice("Đã tạo lịch chiếu mới."); } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể lưu lịch chiếu."); }
  }
  async function finishPayment() { const show = showtimes.find((item) => item.id === selectedShowtime); if (!show || !selectedSeats.length) return; try { const saved = await postCinemaData("ticket", { id: `TICKET-${show.id}-${Date.now()}`, showtime_id: show.id, seats: selectedSeats, amount: total, payment_method: paymentMethod, status: "Đã thanh toán" }); setTickets((current) => [toTicket({ ...saved, movie: selectedMovie?.title }), ...current]); setBookingStep("ticket"); setNotice("Đặt vé thành công. Vé điện tử đã sẵn sàng."); } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể lưu vé."); } }
  function startNewBooking() { setSelectedSeats([]); setBookingStep("showtime"); setView("booking"); setNotice(""); }
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }
  async function updateAccountStatus(userId: number, status: AccountUser["account_status"], accessLevel: AccountUser["access_level"]) {
    try {
      const response = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, status, accessLevel }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Không thể cập nhật quyền tài khoản.");
      setAccountUsers((current) => current.map((user) => user.id === userId ? result.user : user));
      setNotice(status === "approved" ? "Đã cấp quyền cho tài khoản." : "Đã cập nhật trạng thái tài khoản.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể cập nhật quyền tài khoản.");
    }
  }

  if (checkingAccess) return <div className="loading-state">Đang kiểm tra quyền quản trị...</div>;
  const nav = (next: View) => {
    if (next === view || isViewChanging) return;
    setIsViewChanging(true);
    window.setTimeout(() => {
      setView(next);
      setNotice("");
      setIsViewChanging(false);
    }, 120);
  };
  return <div className={`cinema-app${canManage ? "" : " cinema-readonly"}`}>
    <aside className="cinema-sidebar"><Link href="/" className="cinema-logo"><span className="brand-symbol">LT</span><span>LOTUS<br /><small>CINEMA</small></span></Link><p className="sidebar-label">QUẢN TRỊ RẠP</p><nav className="cinema-nav" aria-label="Điều hướng quản trị">
      <button className={`nav-item ${view === "overview" ? "active" : ""}`} onClick={() => nav("overview")} type="button">▦ <span>Tổng quan</span></button>
      <button className={`nav-item ${view === "movies" ? "active" : ""}`} onClick={() => nav("movies")} type="button">▣ <span>Quản lý phim</span><b>{movies.length}</b></button>
      <button className={`nav-item ${view === "rooms" ? "active" : ""}`} onClick={() => nav("rooms")} type="button">▤ <span>Phòng chiếu</span><b>{rooms.length}</b></button>
      <button className={`nav-item ${view === "seats" ? "active" : ""}`} onClick={() => nav("seats")} type="button">⌗ <span>Quản lý ghế</span></button>
      <button className={`nav-item ${view === "schedules" ? "active" : ""}`} onClick={() => nav("schedules")} type="button">▥ <span>Lịch chiếu</span><b>{showtimes.length}</b></button>
      <button className={`nav-item ${view === "tickets" ? "active" : ""}`} onClick={() => nav("tickets")} type="button">◇ <span>Quản lý vé</span><b>{todayTickets}</b></button>
      <button className={`nav-item ${view === "customers" ? "active" : ""}`} onClick={() => nav("customers")} type="button">✦ <span>Tích điểm</span><b>980</b></button>
      {isAdmin && <button className={`nav-item ${view === "accounts" ? "active" : ""}`} onClick={() => nav("accounts")} type="button">✓ <span>Cấp quyền tài khoản</span><b>{accountUsers.filter((user) => user.account_status === "pending").length}</b></button>}
      <button className={`nav-item ${view === "booking" ? "active" : ""}`} onClick={() => nav("booking")} type="button">◇ <span>Đặt vé</span></button>
      <button className={`nav-item ${view === "revenue" ? "active" : ""}`} onClick={() => nav("revenue")} type="button">↗ <span>Doanh thu</span></button>
    </nav><div className="sidebar-bottom"><Link href="/profile">⚙ Cài đặt</Link><button type="button" onClick={logout}>↪ Đăng xuất</button></div></aside>
    <main className={`cinema-main${isViewChanging ? " cinema-main-changing" : ""}`}><header className="cinema-topbar"><div><p className="section-label">THỨ BA, 08 THÁNG 09, 2026</p><h1>{view === "booking" ? "Đặt vé xem phim" : isAdmin ? "Xin chào, quản trị viên." : "Không gian vận hành rạp."}</h1></div><Link href="/profile" className="admin-profile"><span>AD</span><span><strong>{isAdmin ? "Admin" : "Nhân viên"}</strong><small>{canManage ? "Quản lý dữ liệu" : "Đặt vé và in vé"}</small></span><i>⌄</i></Link></header>
      {notice && <div className="cinema-notice">{notice}</div>}
      {view === "overview" && <><AdminSummary movies={movies} rooms={rooms} /><Overview movies={movies} rooms={rooms} showtimes={showtimes} onNavigate={nav} /></>}
      {view === "movies" && <><Heading title="Quản lý phim" action={canManage ? "+ Thêm phim" : "Chỉ xem dữ liệu"} onAction={() => canManage && setModal("movie")} /><section className="management-panel"><div className="panel-toolbar"><label className="search-box">⌕<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên phim, mã phim..." /></label><button className="filter-button" type="button">☷ Bộ lọc</button></div><div className="table-wrap"><table><thead><tr><th>PHIM</th><th>THỂ LOẠI</th><th>THỜI LƯỢNG</th><th>KHỞI CHIẾU</th><th>TRẠNG THÁI</th><th /></tr></thead><tbody>{filteredMovies.map((movie) => <tr key={movie.id}><td><div className="movie-cell"><img className="poster poster-image" src={movie.poster} alt={`Poster ${movie.title}`} /><span><strong>{movie.title}</strong><small>{movie.id}</small></span></div></td><td>{movie.genre}</td><td>{movie.duration} phút</td><td>{movie.release}</td><td><span className={`status ${movie.status === "Đang chiếu" ? "status-live" : "status-upcoming"}`}><i />{movie.status}</span></td><td>{canManage && <><button className="table-action" type="button" onClick={() => setEditModal({ type: "movie", item: movie })}>Sửa</button><button className="table-action danger" type="button" onClick={() => removeItem("movies", movie.id, "phim", () => setMovies((current) => current.filter((item) => item.id !== movie.id)))}>Xóa</button></>}</td></tr>)}</tbody></table></div></section></>}
      {view === "rooms" && <><Heading title="Quản lý phòng chiếu" action={canManage ? "+ Thêm phòng" : "Chỉ xem dữ liệu"} onAction={() => canManage && setModal("room")} /><section className="room-grid">{rooms.map((room) => <article className="room-card" key={room.id}><div className="room-card-top"><span className="room-code">{room.id}</span><span className={`status ${room.status === "Hoạt động" ? "status-live" : "status-maintenance"}`}><i />{room.status}</span></div><div className="room-title"><h3>{room.name}</h3><span>{room.type}</span></div><div className="room-meta"><span><small>HÀNG GHẾ</small><strong>{room.rows}</strong></span><span><small>SỨC CHỨA</small><strong>{room.seats}<em> ghế</em></strong></span></div><div className="room-actions"><button type="button" onClick={() => { changeRoom(room.id); nav("seats"); }}>⌗ Sơ đồ ghế</button>{canManage && <><button className="table-action" type="button" onClick={() => setEditModal({ type: "room", item: room })}>Sửa</button><button className="table-action danger" type="button" onClick={() => removeItem("rooms", room.id, "phòng", () => setRooms((current) => current.filter((item) => item.id !== room.id)))}>Xóa</button></>}</div></article>)}</section></>}
      {view === "seats" && <SeatManager canManage={canManage} rooms={rooms} roomId={selectedRoomId} seats={seats} selectedSeats={selectedSeats} onRoomChange={changeRoom} onToggle={toggleSeat} onAddSeat={addSeat} onDeleteSeat={removeSeat} />}
      {view === "schedules" && <ScheduleManager canManage={canManage} showtimes={showtimes} movieMap={movieMap} roomMap={roomMap} onAdd={() => setModal("showtime")} onDelete={(id) => removeItem("showtimes", id, "lịch chiếu", () => setShowtimes((current) => current.filter((item) => item.id !== id)))} onEdit={(item) => setEditModal({ type: "showtime", item })} />}
      {view === "tickets" && <TicketManager canManage={canManage} tickets={tickets} onExport={exportTickets} onDelete={(id) => removeItem("tickets", id, "vé", () => setTickets((current) => current.filter((item) => item.id !== id)))} onEdit={(item) => setEditModal({ type: "ticket", item })} />}
      {view === "customers" && <><RewardsVouchers customers={customers} onRedeem={canManage ? redeemVoucher : () => setNotice("Tài khoản hiện tại chỉ có quyền xem mục này.")} /><CustomerManager readOnly={!canManage} customers={customers} setCustomers={setCustomers} onExport={exportCustomers} onEdit={(customer) => setEditModal({ type: "customer", item: customer })} onDelete={(email) => { if (window.confirm("Xóa thành viên này?")) setCustomers((current) => current.filter((item) => item.email !== email)); }} /></>}
      {view === "accounts" && <AccountApprovalWithPermissions users={accountUsers} onStatusChange={updateAccountStatus} />}
      {view === "booking" && <>{bookingStep !== "showtime" && <button className="filter-button booking-back-button" type="button" onClick={startNewBooking}>← Quay lại chọn phim</button>}<BookingFlow step={bookingStep} showtimes={showtimes} movieMap={movieMap} roomMap={roomMap} selectedShowtime={selectedShowtime} selectedSeats={selectedSeats} seats={seats} total={total} paymentMethod={paymentMethod} onShowtime={(id) => { setSelectedShowtime(id); setBookingStep("seats"); const show = showtimes.find((item) => item.id === id); if (show) changeRoom(show.roomId); }} onToggle={toggleSeat} onPayment={setPaymentMethod} onNext={() => setBookingStep(bookingStep === "seats" ? "payment" : "seats")} onFinish={finishPayment} onRestart={startNewBooking} /></>}
      {view === "revenue" && <Revenue />}
      <footer className="cinema-footer">© 2026 Lotus Cinema <span>Hệ thống quản lý rạp chiếu phim</span></footer>
    </main>
    {modal && <AdminModal type={modal} movies={movies} rooms={rooms} onClose={() => setModal(null)} onMovie={saveMovie} onRoom={saveRoom} onShowtime={saveShowtime} />}
    {editModal && <EditModal type={editModal.type} item={editModal.item} movies={movies} rooms={rooms} onClose={() => setEditModal(null)} onSubmit={(changes) => {
      if (editModal.type === "customer") { setCustomers((current) => current.map((customer) => customer.email === editModal.item.email ? { ...customer, ...changes, points: Number(changes.points), tier: loyaltyTier(Number(changes.points)) } : customer)); setEditModal(null); setNotice("Đã cập nhật thông tin tích điểm."); return; }
      const table = editModal.type === "movie" ? "movies" : editModal.type === "room" ? "rooms" : editModal.type === "showtime" ? "showtimes" : "tickets";
      updateItem(table, editModal.item.id, changes, (saved) => {
        if (editModal.type === "movie") setMovies((current) => current.map((item) => item.id === saved.id ? saved : item));
        if (editModal.type === "room") setRooms((current) => current.map((item) => item.id === saved.id ? saved : item));
        if (editModal.type === "showtime") setShowtimes((current) => current.map((item) => item.id === saved.id ? { id: saved.id, movieId: saved.movie_id, roomId: saved.room_id, date: saved.date, start: saved.start_time, end: saved.end_time, price: saved.price } : item));
        if (editModal.type === "ticket") setTickets((current) => current.map((item) => item.id === saved.id ? toTicket({ ...saved, movie: item.movie }) : item));
      });
    }} />}
  </div>;
}

function Heading({ title, action, onAction }: { title: string; action: string; onAction: () => void }) { return <div className="cinema-heading"><div><p className="section-label">DỮ LIỆU VẬN HÀNH</p><h2>{title}</h2></div><button className="primary-button add-button" type="button" onClick={onAction}>{action}</button></div>; }
function AdminSummary({ movies, rooms }: { movies: Movie[]; rooms: Room[] }) { const liveMovies = movies.filter((movie) => movie.status === "Đang chiếu").length; const activeRooms = rooms.filter((room) => room.status === "Hoạt động").length; return <section className="admin-summary"><div className="summary-kpi revenue"><span>↗</span><small>TỔNG DOANH THU · 7 NGÀY</small><strong>{revenueTotal.toFixed(1).replace(".", ",")} triệu</strong><em>+12,8% so với tuần trước</em></div><div className="summary-kpi tickets"><span>◇</span><small>VÉ ĐÃ BÁN · 7 NGÀY</small><strong>1.562</strong><em>Giá vé bình quân 80.300đ</em></div><div className="summary-kpi movies"><span>▣</span><small>PHIM ĐANG CHIẾU</small><strong>{liveMovies}</strong><em>{movies.length - liveMovies} phim sắp chiếu</em></div><div className="summary-kpi rooms"><span>▤</span><small>PHÒNG HOẠT ĐỘNG</small><strong>{activeRooms}</strong><em>{rooms.length - activeRooms} phòng bảo trì</em></div></section>; }
function Overview({ movies, rooms, showtimes, onNavigate }: { movies: Movie[]; rooms: Room[]; showtimes: Showtime[]; onNavigate: (view: View) => void }) { return <><section className="cinema-stats"><div><span className="stat-icon orange">▣</span><p>Phim đang chiếu</p><strong>{movies.filter((movie) => movie.status === "Đang chiếu").length}</strong><small>Danh mục hiện tại</small></div><div><span className="stat-icon green">▤</span><p>Phòng hoạt động</p><strong>{rooms.filter((room) => room.status === "Hoạt động").length}<em>/{rooms.length}</em></strong><small>Công suất sẵn sàng</small></div><div><span className="stat-icon blue">▰</span><p>Vé đã bán hôm nay</p><strong>{todayTickets}</strong><small>Doanh thu {todayRevenue.toFixed(1).replace(".", ",")} triệu</small></div><div><span className="stat-icon violet">↗</span><p>Doanh thu hôm nay</p><strong>{todayRevenue.toFixed(1).replace(".", ",")}<em>tr</em></strong><small>236 vé · giá bình quân 80.000đ</small></div></section><div className="quick-grid"><button onClick={() => onNavigate("seats")} type="button"><strong>⌗</strong><span><b>Sơ đồ ghế</b><small>Chọn và quản lý trạng thái ghế</small></span>→</button><button onClick={() => onNavigate("schedules")} type="button"><strong>▥</strong><span><b>Lịch chiếu</b><small>{showtimes.length} suất chiếu đang hoạt động</small></span>→</button><button onClick={() => onNavigate("booking")} type="button"><strong>◇</strong><span><b>Đặt vé mẫu</b><small>Kiểm tra luồng chọn ghế và thanh toán</small></span>→</button></div><Revenue /></>; }
function TicketManager({ tickets, onExport, onDelete, onEdit }: { tickets: Ticket[]; onExport: () => void; onDelete: (id: string) => void; onEdit: (ticket: Ticket) => void }) { return <><Heading title="Quản lý vé" action="Xuất báo cáo" onAction={onExport} /><section className="management-panel"><div className="panel-toolbar"><label className="search-box">⌕<input placeholder="Tìm mã vé, tên khách hàng..." /></label><button className="filter-button" type="button">▣ Tất cả trạng thái</button></div><div className="table-wrap"><table><thead><tr><th>MÃ VÉ</th><th>KHÁCH HÀNG</th><th>PHIM</th><th>GHẾ</th><th>THÀNH TIỀN</th><th>TRẠNG THÁI</th><th /></tr></thead><tbody>{tickets.map((ticket) => <tr key={ticket.id}><td><strong>{ticket.id}</strong></td><td>{ticket.customer}</td><td>{ticket.movie}</td><td>{ticket.seats}</td><td>{money(ticket.amount)}</td><td><span className={`status ${ticket.status === "Đã thanh toán" ? "status-live" : "status-upcoming"}`}><i />{ticket.status}</span></td><td><button className="table-action" type="button" onClick={() => onEdit(ticket)}>Sửa</button><button className="table-action danger" type="button" onClick={() => onDelete(ticket.id)}>Xóa</button></td></tr>)}</tbody></table></div></section></>; }
function RewardsVouchers({ customers, onRedeem }: { customers: LoyaltyCustomer[]; onRedeem: (email: string, cost: number, code: string) => void }) { const [selectedEmail, setSelectedEmail] = useState(customers[0]?.email || ""); const copy = (code: string) => navigator.clipboard?.writeText(code); const vouchers = [{ tier: "ĐỒNG", code: "LOTUS10", detail: "Giảm 10% vé · Trừ 100 điểm", cost: 100, tone: "bronze" }, { tier: "BẠC", code: "LOTUS15", detail: "Giảm 15% vé · Trừ 500 điểm", cost: 500, tone: "silver" }, { tier: "VÀNG", code: "LOTUS20", detail: "Giảm 20% + bắp nước · Trừ 900 điểm", cost: 900, tone: "gold" }]; return <section className="reward-vouchers"><div className="voucher-toolbar"><strong>Dùng voucher khuyến mãi</strong><label>Thành viên<select value={selectedEmail} onChange={(event) => setSelectedEmail(event.target.value)}>{customers.map((customer) => <option key={customer.email} value={customer.email}>{customer.name} · {customer.points} điểm</option>)}</select></label></div>{vouchers.map((voucher) => <article className={`reward-voucher ${voucher.tone}`} key={voucher.code}><span>{voucher.tier}</span><strong>{voucher.code}</strong><small>{voucher.detail}</small><div><button onClick={() => copy(voucher.code)} type="button">Sao chép</button><button onClick={() => onRedeem(selectedEmail, voucher.cost, voucher.code)} type="button">Dùng mã</button></div></article>)}</section>; }
function CustomerEditLauncher({ customers, onEdit }: { customers: LoyaltyCustomer[]; onEdit: (customer: LoyaltyCustomer) => void }) { const [email, setEmail] = useState(customers[0]?.email || ""); return <div className="customer-edit-launcher"><label>Chọn thành viên để cập nhật<select value={email} onChange={(event) => setEmail(event.target.value)}>{customers.map((customer) => <option key={customer.email} value={customer.email}>{customer.name}</option>)}</select></label><button className="filter-button" type="button" onClick={() => { const customer = customers.find((item) => item.email === email); if (customer) onEdit(customer); }}>Sửa thông tin tích điểm</button></div>; }
function AccountApproval({ users, onStatusChange }: { users: AccountUser[]; onStatusChange: (id: number, status: AccountUser["account_status"]) => void }) {
  const pendingCount = users.filter((user) => user.account_status === "pending").length;
  return <><Heading title="Cấp quyền tài khoản" action={`${pendingCount} hồ sơ chờ duyệt`} onAction={() => undefined} /><section className="management-panel"><div className="approval-admin-banner"><span>✓</span><div><strong>Kiểm duyệt thành viên mới</strong><small>Xác nhận quyền truy cập trước khi tài khoản có thể sử dụng hệ thống.</small></div><b>{pendingCount} chờ xử lý</b></div><div className="table-wrap"><table><thead><tr><th>THÀNH VIÊN</th><th>LIÊN HỆ</th><th>NGÀY ĐĂNG KÝ</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><div className="customer-cell"><span>{user.full_name.slice(0, 2).toUpperCase()}</span><strong>{user.full_name}<small>{user.email}</small></strong></div></td><td>{user.phone || "Chưa cập nhật"}</td><td>{new Date(user.created_at).toLocaleDateString("vi-VN")}</td><td><span className={`status ${user.account_status === "approved" ? "status-live" : user.account_status === "pending" ? "status-upcoming" : "status-rejected"}`}><i />{user.account_status === "approved" ? "Đã cấp quyền" : user.account_status === "pending" ? "Chờ cấp quyền" : "Từ chối"}</span></td><td><button className="table-action approve-action" type="button" onClick={() => onStatusChange(user.id, "approved")} disabled={user.account_status === "approved"}>Cấp quyền</button><button className="table-action danger" type="button" onClick={() => onStatusChange(user.id, "rejected")} disabled={user.account_status === "rejected"}>Từ chối</button></td></tr>)}</tbody></table>{!users.length && <p className="empty-state">Chưa có tài khoản thành viên nào đăng ký.</p>}</div></section></>;
}
function AccountApprovalWithPermissions({ users, onStatusChange }: { users: AccountUser[]; onStatusChange: (id: number, status: AccountUser["account_status"], accessLevel: AccountUser["access_level"]) => void }) {
  const pendingCount = users.filter((user) => user.account_status === "pending").length;
  const [levels, setLevels] = useState<Record<number, AccountUser["access_level"]>>(() => Object.fromEntries(users.map((user) => [user.id, user.access_level])));
  return <><Heading title="Cấp quyền tài khoản" action={`${pendingCount} hồ sơ chờ duyệt`} onAction={() => undefined} /><section className="management-panel"><div className="approval-admin-banner"><span>✓</span><div><strong>Kiểm duyệt thành viên mới</strong><small>Chọn quyền quản lý đầy đủ hoặc chỉ đặt vé và in vé.</small></div><b>{pendingCount} chờ xử lý</b></div><div className="table-wrap"><table><thead><tr><th>THÀNH VIÊN</th><th>LIÊN HỆ</th><th>QUYỀN TRUY CẬP</th><th>NGÀY ĐĂNG KÝ</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead><tbody>{users.map((user) => { const level = levels[user.id] || user.access_level; return <tr key={user.id}><td><div className="customer-cell"><span>{user.full_name.slice(0, 2).toUpperCase()}</span><strong>{user.full_name}<small>{user.email}</small></strong></div></td><td>{user.phone || "Chưa cập nhật"}</td><td><select className="permission-select" value={level} onChange={(event) => setLevels((current) => ({ ...current, [user.id]: event.target.value as AccountUser["access_level"] }))}><option value="manage">Quản lý: sửa và xóa</option><option value="booking">Đặt vé và in vé</option></select></td><td>{new Date(user.created_at).toLocaleDateString("vi-VN")}</td><td><span className={`status ${user.account_status === "approved" ? "status-live" : user.account_status === "pending" ? "status-upcoming" : "status-rejected"}`}><i />{user.account_status === "approved" ? "Đã cấp quyền" : user.account_status === "pending" ? "Chờ cấp quyền" : "Từ chối"}</span></td><td><button className="table-action approve-action" type="button" onClick={() => onStatusChange(user.id, "approved", level)}>Cấp quyền</button><button className="table-action danger" type="button" onClick={() => onStatusChange(user.id, "rejected", level)} disabled={user.account_status === "rejected"}>Từ chối</button></td></tr>; })}</tbody></table>{!users.length && <p className="empty-state">Chưa có tài khoản thành viên nào đăng ký.</p>}</div></section></>;
}
function CustomerManager({ customers, setCustomers, onExport, onEdit, onDelete }: { customers: LoyaltyCustomer[]; setCustomers: (customers: LoyaltyCustomer[]) => void; onExport: () => void; onEdit: (customer: LoyaltyCustomer) => void; onDelete: (email: string) => void }) {
  const [showForm, setShowForm] = useState(false);
  function addCustomer(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const points = Number(data.get("points") || 0); setCustomers([...customers, { name: String(data.get("name")), email: String(data.get("email")), points, tier: loyaltyTier(points), joined: "08/09/2026" }]); setShowForm(false); }
  return <><Heading title="Chương trình tích điểm" action="Xuất danh sách" onAction={onExport} /><section className="management-panel"><div className="loyalty-banner"><span>✦</span><div><strong>Lotus Rewards</strong><small>1 điểm cho mỗi 1.000đ thanh toán · Điểm dùng đổi vé và combo</small></div><b>{customers.length + 977} thành viên</b></div>{showForm && <form className="loyalty-add-form" onSubmit={addCustomer}><label>Họ và tên<input name="name" placeholder="Nguyễn Văn A" required /></label><label>Email<input name="email" type="email" placeholder="email@example.com" required /></label><label>Điểm khởi tạo<input name="points" type="number" min="0" defaultValue="0" /></label><button className="primary-button" type="submit">Lưu thành viên</button><button className="filter-button" onClick={() => setShowForm(false)} type="button">Hủy</button></form>}<div className="panel-toolbar"><label className="search-box">⌕<input placeholder="Tìm tên hoặc email thành viên..." /></label><span className="customer-count">Tổng điểm đang lưu hành: {customers.reduce((sum, customer) => sum + customer.points, 0).toLocaleString("vi-VN")}</span><button className="filter-button" onClick={() => setShowForm(true)} type="button">+ Thêm thành viên</button></div><div className="table-wrap"><table><thead><tr><th>THÀNH VIÊN</th><th>ĐIỂM TÍCH LŨY</th><th>HẠNG</th><th>NGÀY THAM GIA</th><th>TRẠNG THÁI</th><th /></tr></thead><tbody>{customers.map((customer) => <tr key={customer.email}><td><div className="customer-cell"><span>{customer.name.slice(0, 2).toUpperCase()}</span><strong>{customer.name}<small>{customer.email}</small></strong></div></td><td><strong className="points-value">{customer.points.toLocaleString("vi-VN")} điểm</strong></td><td><span className={`tier tier-${customer.tier.toLowerCase()}`}>{customer.tier}</span></td><td>{customer.joined}</td><td><span className="status status-live"><i />Đang hoạt động</span></td><td><button className="table-action" type="button" onClick={() => onEdit(customer)}>Sửa</button><button className="table-action danger" type="button" onClick={() => onDelete(customer.email)}>Xóa</button></td></tr>)}</tbody></table></div></section></>;
}
function SeatManager({ rooms, roomId, seats, selectedSeats, onRoomChange, onToggle, onAddSeat, onDeleteSeat }: { rooms: Room[]; roomId: string; seats: Seat[]; selectedSeats: string[]; onRoomChange: (id: string) => void; onToggle: (seat: Seat) => void; onAddSeat: () => void; onDeleteSeat: (id: string) => void }) {
  return <><Heading title="Quản lý ghế" action="+ Thêm ghế" onAction={onAddSeat} /><section className="seat-workspace"><div className="seat-toolbar"><label>Phòng chiếu<select value={roomId} onChange={(event) => onRoomChange(event.target.value)}>{rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label><span className="seat-legend"><i className="seat-dot empty" /> Trống <i className="seat-dot selected" /> Đang chọn <i className="seat-dot booked" /> Đã đặt</span></div><div className="screen-wide">MÀN HÌNH</div><div className="seat-map large-seat-map">{seats.map((seat) => <button className={`seat-button ${seat.status === "Đã đặt" ? "seat-booked" : "seat-empty"} ${selectedSeats.includes(seat.id) ? "seat-selected" : ""}`} key={seat.id} onClick={() => onToggle(seat)} type="button">{seat.id}</button>)}</div><div className="seat-detail"><div><small>GHẾ ĐANG CHỌN</small><strong>{selectedSeats.length ? selectedSeats.join(", ") : "Chưa chọn ghế"}</strong></div><div><small>THAO TÁC</small><span>Chọn ghế để xem thông tin và thay đổi trạng thái</span>{selectedSeats[0] && <button className="table-action danger" type="button" onClick={() => onDeleteSeat(selectedSeats[0])}>Xóa ghế đang chọn</button>}</div></div></section></>;
}
function ScheduleManager({ showtimes, movieMap, roomMap, onAdd, onDelete, onEdit }: { showtimes: Showtime[]; movieMap: Map<string, Movie>; roomMap: Map<string, Room>; onAdd: () => void; onDelete: (id: string) => void; onEdit: (item: Showtime) => void }) { return <><Heading title="Quản lý lịch chiếu" action="+ Thêm lịch chiếu" onAction={onAdd} /><section className="management-panel"><div className="panel-toolbar"><label className="search-box">⌕<input placeholder="Tìm phim, phòng, ngày..." /></label><button className="filter-button" type="button">▣ Lọc theo ngày</button><button className="filter-button" type="button">▤ Lọc theo phòng</button></div><div className="table-wrap"><table><thead><tr><th>PHIM</th><th>PHÒNG</th><th>NGÀY</th><th>GIỜ CHIẾU</th><th>GIÁ VÉ</th><th>TRẠNG THÁI</th><th /></tr></thead><tbody>{showtimes.map((showtime) => <tr key={showtime.id}><td><strong>{movieMap.get(showtime.movieId)?.title}</strong><small className="table-sub">{showtime.id}</small></td><td>{roomMap.get(showtime.roomId)?.name}</td><td>{showtime.date}</td><td><strong>{showtime.start}</strong> - {showtime.end}</td><td>{money(showtime.price)}</td><td><span className="status status-live"><i />Đang mở bán</span></td><td><button className="table-action" type="button" onClick={() => onEdit(showtime)}>Sửa</button><button className="table-action danger" type="button" onClick={() => onDelete(showtime.id)}>Xóa</button></td></tr>)}</tbody></table></div></section></>; }
function BookingFlow({ step, showtimes, movieMap, roomMap, selectedShowtime, selectedSeats, seats, total, paymentMethod, onShowtime, onToggle, onPayment, onNext, onFinish }: { step: string; showtimes: Showtime[]; movieMap: MovieMap; roomMap: RoomMap; selectedShowtime: string; selectedSeats: string[]; seats: Seat[]; total: number; paymentMethod: string; onShowtime: (id: string) => void; onToggle: (seat: Seat) => void; onPayment: (method: string) => void; onNext: () => void; onFinish: () => void }) { const show = showtimes.find((item) => item.id === selectedShowtime) || showtimes[0]!; const movie = movieMap.get(show.movieId); const room = roomMap.get(show.roomId); if (step === "ticket") return <Ticket movie={movie} show={show} room={room} selectedSeats={selectedSeats} total={total} />; return <section className="booking-shell"><div className="booking-steps"><span className="done">1. Suất chiếu</span><span className={step !== "showtime" ? "done" : ""}>2. Chọn ghế</span><span className={step === "payment" ? "done" : ""}>3. Thanh toán</span></div>{step === "showtime" && <div className="showtime-picker"><h2>Chọn suất chiếu</h2><p>15/09/2026 · Các suất đang mở bán</p>{showtimes.map((item) => <button className={selectedShowtime === item.id ? "showtime-option chosen" : "showtime-option"} key={item.id} onClick={() => onShowtime(item.id)} type="button"><strong>{item.start}</strong><span>{movieMap.get(item.movieId)?.title}<small>{roomMap.get(item.roomId)?.name} · {money(item.price)}</small></span>→</button>)}</div>}{step === "seats" && <div className="booking-seat-panel"><div className="screen-wide">MÀN HÌNH</div><div className="seat-map large-seat-map">{seats.map((seat) => <button className={`seat-button seat-${seat.status.toLowerCase()} seat-${seat.type.toLowerCase()} ${selectedSeats.includes(seat.id) ? "seat-selected" : ""}`} key={seat.id} onClick={() => onToggle(seat)} type="button">{seat.id}</button>)}</div><BookingSummary movie={movie} show={show} room={room} selectedSeats={selectedSeats} total={total} action="Tiếp tục thanh toán" onAction={onNext} /></div>}{step === "payment" && <div className="payment-panel"><div><p className="section-label">XÁC NHẬN ĐẶT VÉ</p><h2>Kiểm tra thông tin</h2><dl><dt>Phim</dt><dd>{movie.title}</dd><dt>Suất chiếu</dt><dd>{show.date} · {show.start} - {show.end}</dd><dt>Phòng</dt><dd>{room.name}</dd><dt>Ghế</dt><dd>{selectedSeats.join(", ")}</dd></dl></div><BookingSummary movie={movie} show={show} room={room} selectedSeats={selectedSeats} total={total} action="Xác nhận đặt vé" onAction={onFinish} paymentMethod={paymentMethod} onPayment={onPayment} /></div>}</section>; }
function BookingSummary({ movie, show, room, selectedSeats, total, action, onAction, paymentMethod, onPayment }: { movie: Movie; show: Showtime; room: Room; selectedSeats: string[]; total: number; action: string; onAction: () => void; paymentMethod?: string; onPayment?: (value: string) => void }) { return <aside className="booking-summary"><p className="section-label">THÔNG TIN VÉ</p><h3>{movie.title}</h3><p>{show.start} - {show.end} · {room.name}</p><strong>{selectedSeats.length ? selectedSeats.join(", ") : "Chưa chọn ghế"}</strong><div className="summary-total"><span>{selectedSeats.length} x {money(show.price)}</span><b>{money(total)}</b></div>{onPayment && <label className="payment-select">Phương thức<select value={paymentMethod} onChange={(event) => onPayment(event.target.value)}><option>Tiền mặt</option><option>Ví điện tử</option><option>Thẻ ngân hàng</option></select></label>}<button className="primary-button" disabled={!selectedSeats.length} onClick={onAction} type="button">{action} <span>→</span></button></aside>; }
function Ticket({ movie, show, room, selectedSeats, total }: { movie?: Movie; show: Showtime; room?: Room; selectedSeats: string[]; total: number }) { return <section className="ticket-result"><div className="ticket-card"><p className="section-label">LOTUS CINEMA · VÉ ĐIỆN TỬ</p><h2>{movie?.title}</h2><div className="ticket-info"><span><small>NGÀY</small>{show.date}</span><span><small>GIỜ</small>{show.start}</span><span><small>PHÒNG</small>{room?.name}</span><span><small>GHẾ</small>{selectedSeats.join(", ")}</span></div><div className="fake-qr">▦<br /><small>QR-{show.id}-001</small></div><p>Mã vé: <strong>TICKET-{show.id}-001</strong></p><strong>{money(total)}</strong></div><button className="primary-button print-button" type="button" onClick={() => window.print()}>In vé <span>↗</span></button></section>; }
function Revenue() { const min = Math.min(...revenueSeed); const range = Math.max(...revenueSeed) - min; const points = revenueSeed.map((value, index) => `${index * 16.67},${120 - ((value - min) / range) * 88}`).join(" "); return <section className="revenue-panel"><div className="revenue-head"><div><p className="section-label">DỮ LIỆU MÔ PHỎNG · CẬP NHẬT HÔM NAY</p><h2>Doanh thu 7 ngày</h2></div><button className="filter-button" type="button">02/09/2026 - 08/09/2026 ▾</button></div><div className="revenue-line-chart"><svg viewBox="0 0 100 140" preserveAspectRatio="none" role="img" aria-label="Biểu đồ đường doanh thu bảy ngày"><line x1="0" y1="120" x2="100" y2="120" /><polyline points={points} />{revenueSeed.map((value, index) => { const y = 120 - ((value - min) / range) * 88; return <g key={value}><circle cx={index * 16.67} cy={y} r="1.7" /><title>{["T2", "T3", "T4", "T5", "T6", "T7", "CN"][index]}: {value.toFixed(1).replace(".", ",")} triệu</title></g>; })}</svg><div className="line-chart-labels">{revenueSeed.map((value, index) => <span key={value}><strong>{value.toFixed(1).replace(".", ",")}tr</strong><small>{["T2", "T3", "T4", "T5", "T6", "T7", "CN"][index]}</small></span>)}</div></div><div className="revenue-summary"><span><small>TỔNG DOANH THU</small><strong>{revenueTotal.toFixed(1).replace(".", ",")} triệu</strong></span><span><small>VÉ ĐÃ BÁN</small><strong>1.562 vé</strong></span><span><small>PHIM BÁN CHẠY</small><strong>Avatar 3 · 42,6 triệu</strong></span></div></section>; }
function AdminModal({ type, movies, rooms, onClose, onMovie, onRoom, onShowtime }: { type: "movie" | "room" | "showtime"; movies: Movie[]; rooms: Room[]; onClose: () => void; onMovie: (event: FormEvent<HTMLFormElement>) => void; onRoom: (event: FormEvent<HTMLFormElement>) => void; onShowtime: (event: FormEvent<HTMLFormElement>) => void }) { const submit = type === "movie" ? onMovie : type === "room" ? onRoom : onShowtime; return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="cinema-modal" onSubmit={submit}><button className="modal-close" type="button" onClick={onClose}>×</button><p className="section-label">{type === "movie" ? "THÔNG TIN PHIM" : type === "room" ? "THÔNG TIN PHÒNG" : "TẠO LỊCH CHIẾU"}</p><h2>{type === "movie" ? "Thêm phim" : type === "room" ? "Thêm phòng chiếu" : "Thêm lịch chiếu"}</h2>{type === "movie" && <><label>Tên phim<input name="title" required /></label><div className="form-row"><label>Thể loại<select name="genre"><option>Sci-Fi</option><option>Anime</option><option>Tâm lý</option><option>Kinh dị</option></select></label><label>Thời lượng<input name="duration" type="number" defaultValue="120" required /></label></div><div className="form-row"><label>Ngày khởi chiếu<input name="release" defaultValue="15/09/2026" required /></label><label>Trạng thái<select name="status"><option>Đang chiếu</option><option>Sắp chiếu</option></select></label></div></>}{type === "room" && <><label>Tên phòng<input name="name" placeholder="Phòng 03" required /></label><div className="form-row"><label>Loại phòng<select name="type"><option>2D</option><option>3D</option><option>IMAX</option></select></label><label>Số hàng<input name="rows" type="number" defaultValue="5" required /></label></div><label>Sức chứa<input name="seats" type="number" defaultValue="40" required /></label></>}{type === "showtime" && <><label>Phim<select name="movieId">{movies.map((movie) => <option value={movie.id} key={movie.id}>{movie.title}</option>)}</select></label><label>Phòng<select name="roomId">{rooms.filter((room) => room.status === "Hoạt động").map((room) => <option value={room.id} key={room.id}>{room.name}</option>)}</select></label><div className="form-row"><label>Ngày<input name="date" defaultValue="15/09/2026" required /></label><label>Giá vé<input name="price" type="number" defaultValue="80000" required /></label></div><div className="form-row"><label>Giờ bắt đầu<input name="start" type="time" defaultValue="18:00" required /></label><label>Giờ kết thúc<input name="end" type="time" defaultValue="20:42" required /></label></div></>}<button className="primary-button modal-submit" type="submit">Lưu thông tin <span>→</span></button></form></div>; }

function EditModal({ type, item, movies, rooms, onClose, onSubmit }: { type: "movie" | "room" | "showtime" | "ticket" | "customer"; item: any; movies: Movie[]; rooms: Room[]; onClose: () => void; onSubmit: (changes: Record<string, unknown>) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const changes: Record<string, unknown> = {}; data.forEach((value, key) => { if (key === "seatsList") changes.seats = String(value).split(",").map((seat) => seat.trim()).filter(Boolean); else changes[key] = key === "duration" || key === "rows" || key === "seats" || key === "price" || key === "amount" || key === "points" ? Number(value) : value; }); onSubmit(changes); }
  const title = type === "movie" ? "Cập nhật phim" : type === "room" ? "Cập nhật phòng chiếu" : type === "showtime" ? "Cập nhật lịch chiếu" : type === "ticket" ? "Cập nhật vé" : "Cập nhật tích điểm";
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="cinema-modal" onSubmit={submit}><button className="modal-close" type="button" onClick={onClose}>×</button><p className="section-label">CHỈNH SỬA DỮ LIỆU</p><h2>{title}</h2>{type === "movie" && <><label>Tên phim<input name="title" defaultValue={item.title} required /></label><div className="form-row"><label>Thể loại<input name="genre" defaultValue={item.genre} required /></label><label>Thời lượng<input name="duration" type="number" defaultValue={item.duration} required /></label></div><div className="form-row"><label>Ngày khởi chiếu<input name="release" defaultValue={item.release} required /></label><label>Trạng thái<select name="status" defaultValue={item.status}><option>Đang chiếu</option><option>Sắp chiếu</option></select></label></div></>}{type === "room" && <><label>Tên phòng<input name="name" defaultValue={item.name} required /></label><div className="form-row"><label>Loại phòng<input name="type" defaultValue={item.type} required /></label><label>Số hàng<input name="rows" type="number" defaultValue={item.rows} required /></label></div><div className="form-row"><label>Sức chứa<input name="seats" type="number" defaultValue={item.seats} required /></label><label>Trạng thái<select name="status" defaultValue={item.status}><option>Hoạt động</option><option>Bảo trì</option></select></label></div></>}{type === "showtime" && <><label>Phim<select name="movie_id" defaultValue={item.movieId}>{movies.map((movie) => <option value={movie.id} key={movie.id}>{movie.title}</option>)}</select></label><label>Phòng<select name="room_id" defaultValue={item.roomId}>{rooms.map((room) => <option value={room.id} key={room.id}>{room.name}</option>)}</select></label><div className="form-row"><label>Ngày<input name="date" defaultValue={item.date} required /></label><label>Giá vé<input name="price" type="number" defaultValue={item.price} required /></label></div><div className="form-row"><label>Giờ bắt đầu<input name="start_time" defaultValue={item.start} required /></label><label>Giờ kết thúc<input name="end_time" defaultValue={item.end} required /></label></div></>}{type === "ticket" && <><label>Ghế<input name="seatsList" defaultValue={item.seats} required /></label><div className="form-row"><label>Thành tiền<input name="amount" type="number" defaultValue={item.amount} required /></label><label>Trạng thái<select name="status" defaultValue={item.status}><option>Đã thanh toán</option><option>Chờ thanh toán</option></select></label></div><label>Phương thức thanh toán<input name="payment_method" defaultValue={item.paymentMethod} required /></label></>}{type === "customer" && <><label>Họ và tên<input name="name" defaultValue={item.name} required /></label><label>Email<input name="email" defaultValue={item.email} type="email" required /></label><label>Điểm tích lũy<input name="points" defaultValue={item.points} type="number" min="0" required /></label></>}<button className="primary-button modal-submit" type="submit">Lưu cập nhật <span>→</span></button></form></div>;
}
