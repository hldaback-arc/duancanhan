import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useEffect, useState } from "react";

type User = { fullName: string; email: string; phone: string };

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState<User>({ fullName: "", email: "", phone: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (response) => {
        if (!response.ok) {
          router.replace("/");
          return;
        }
        const result = await response.json();
        setUser(result.user);
        setForm(result.user);
      })
      .catch(() => { router.replace("/"); });
  }, [router]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/auth/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json();
      if (!response.ok) setError(result.message || "Không thể cập nhật thông tin.");
      else { setUser(result.user); setForm(result.user); setMessage("Thông tin đã được cập nhật."); }
    } catch {
      setError("Không thể kết nối đến máy chủ.");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
  }

  async function deleteAccount() {
    if (!window.confirm("Bạn có chắc muốn xóa tài khoản? Dữ liệu sẽ không thể khôi phục.")) return;
    const response = await fetch("/api/auth/me", { method: "DELETE" });
    if (response.ok) router.replace("/");
    else setError("Không thể xóa tài khoản lúc này.");
  }

  if (!user) return <div className="loading-state">Đang tải hồ sơ...</div>;
  return <div className="page-shell"><main className="account-layout"><header className="account-header"><Link href="/cap-2" className="brand-mark"><span className="brand-symbol">LT</span><span>Lotus Cinema</span></Link><div className="account-header-actions"><Link href="/" className="secondary-button">← Trang chủ</Link><button className="text-button header-action" onClick={logout}>Đăng xuất <span aria-hidden="true">↗</span></button></div></header><section className="account-intro"><p className="eyebrow">HỒ SƠ THÀNH VIÊN</p><h1>Xin chào, {user.fullName.split(" ")[0]}.</h1><p>Giữ thông tin liên hệ chính xác để nhận vé điện tử và ưu đãi từ Lotus Cinema.</p></section><nav className="account-tabs"><Link href="/profile" className="active">Thông tin cá nhân</Link><Link href="/change-password">Đổi mật khẩu</Link></nav><form onSubmit={save} className="account-form"><div className="form-row"><div><label htmlFor="profile-name">Họ và tên</label><input id="profile-name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required /></div><div><label htmlFor="profile-email">Email nhận vé</label><input id="profile-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></div></div><label htmlFor="profile-phone">Số điện thoại</label><input id="profile-phone" type="tel" inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} autoComplete="tel" required />{error && <p className="form-message error-message">{error}</p>}{message && <p className="form-message success-message">{message}</p>}<button className="primary-button account-save" type="submit" disabled={saving}>{saving ? "Đang lưu..." : "Lưu thay đổi"} <span aria-hidden="true">→</span></button><button className="text-button delete-account-button" type="button" onClick={deleteAccount}>Xóa tài khoản</button></form></main></div>;
}
