import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

export default function ChangePassword() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => {
        if (!response.ok) window.location.href = "/";
        else setCheckingSession(false);
      })
      .catch(() => { window.location.href = "/"; });
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (form.newPassword !== form.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) setError(result.message || "Không thể đổi mật khẩu.");
      else {
        setMessage(result.message);
        setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      }
    } catch {
      setError("Không thể kết nối đến máy chủ.");
    } finally {
      setSaving(false);
    }
  }

  if (checkingSession) return <div className="loading-state">Đang xác thực tài khoản...</div>;
  return <div className="page-shell"><main className="account-layout"><header className="account-header"><Link href="/cap-2" className="brand-mark"><span className="brand-symbol">LT</span><span>Learning space</span></Link><Link href="/profile" className="secondary-button">← Hồ sơ</Link></header><section className="account-intro"><p className="eyebrow">BẢO MẬT THÀNH VIÊN</p><h1>Đổi mật khẩu.</h1><p>Dùng một mật khẩu riêng tư và khó đoán để bảo vệ tài khoản Lotus Cinema.</p></section><nav className="account-tabs"><Link href="/profile">Thông tin cá nhân</Link><Link href="/change-password" className="active">Đổi mật khẩu</Link></nav><form onSubmit={submit} className="account-form password-form"><label htmlFor="current-password">Mật khẩu hiện tại</label><input id="current-password" type="password" autoComplete="current-password" value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} required /><label htmlFor="new-password">Mật khẩu mới</label><input id="new-password" type="password" autoComplete="new-password" minLength={8} value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} required /><label htmlFor="confirm-password">Xác nhận mật khẩu mới</label><input id="confirm-password" type="password" autoComplete="new-password" minLength={8} value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} required /><p className="password-hint">Mật khẩu mới cần tối thiểu 8 ký tự.</p>{error && <p className="form-message error-message">{error}</p>}{message && <p className="form-message success-message">{message}</p>}<button className="primary-button account-save" type="submit" disabled={saving}>{saving ? "Đang cập nhật..." : "Cập nhật mật khẩu"} <span aria-hidden="true">→</span></button></form></main></div>;
}
