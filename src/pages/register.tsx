import Link from "next/link";
import { FormEvent, useState } from "react";

export default function Register() {
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json();
      if (!response.ok) setError(result.message || "Không thể tạo tài khoản.");
      else window.location.href = "/cap-2";
    } catch {
      setError("Không thể kết nối đến máy chủ.");
    } finally {
      setLoading(false);
    }
  }

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return <div className="page-shell"><main className="auth-layout cinema-register-layout">
    <section className="auth-aside cinema-register-aside"><Link href="/" className="brand-mark"><span className="brand-symbol">LT</span><span>Lotus Cinema</span></Link><div><p className="eyebrow">LOTUS CINEMA MEMBERS</p><h1>Đặt vé nhanh. Nhận ưu đãi riêng.</h1><p>Tạo tài khoản thành viên để lưu thông tin, theo dõi vé và tích điểm sau mỗi lần xem phim.</p><div className="register-perks"><div><span>01</span><strong>Vé điện tử</strong><small>Giữ thông tin đặt vé trong một nơi.</small></div><div><span>02</span><strong>Lotus Rewards</strong><small>Tích điểm và đổi ưu đãi cho lần xem sau.</small></div><div><span>03</span><strong>Suất chiếu yêu thích</strong><small>Trở lại rạp nhanh hơn mỗi ngày.</small></div></div></div><p className="register-aside-note">MỘT TÀI KHOẢN · NHIỀU TRẢI NGHIỆM ĐIỆN ẢNH</p></section>
    <section className="form-panel auth-form-panel" aria-labelledby="register-title">
      <div className="form-heading"><p className="section-label">THẺ THÀNH VIÊN</p><h2 id="register-title">Tạo tài khoản</h2><p>Điền thông tin để bắt đầu hành trình tại Lotus Cinema.</p></div>
      <form onSubmit={handleSubmit} className="student-form register-form">
        <label htmlFor="fullName">Tên hiển thị <span>*</span></label><input id="fullName" placeholder="Nguyễn Minh Anh" value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} autoComplete="name" required />
        <label htmlFor="register-email">Email nhận vé <span>*</span></label><input id="register-email" type="email" placeholder="ban@example.com" value={form.email} onChange={(event) => updateField("email", event.target.value)} autoComplete="email" required />
        <label htmlFor="register-phone">Số điện thoại <span>*</span></label><input id="register-phone" type="tel" inputMode="tel" placeholder="090 123 4567" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} autoComplete="tel" required />
        <label htmlFor="register-password">Mật khẩu <span>*</span></label><input id="register-password" type="password" placeholder="Tối thiểu 8 ký tự" value={form.password} onChange={(event) => updateField("password", event.target.value)} autoComplete="new-password" minLength={8} required />
        {error && <p className="form-message error-message">{error}</p>}
        <button type="submit" className="primary-button">{loading ? "Đang tạo thẻ thành viên..." : "Tạo tài khoản thành viên"}<span aria-hidden="true">→</span></button>
      </form>
      <p className="form-footer">Đã là thành viên? <Link href="/">Đăng nhập để đặt vé</Link></p>
    </section>
  </main></div>;
}