import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useEffect, useState } from "react";
import { useLocale } from "./_app";

export default function ChangePassword() {
  const router = useRouter();
  const { locale } = useLocale();
  const isEnglish = locale === "en";
  const [checkingSession, setCheckingSession] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => {
        if (!response.ok) router.replace("/");
        else setCheckingSession(false);
      })
      .catch(() => { router.replace("/"); });
  }, [router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (form.newPassword !== form.confirmPassword) {
      setError(isEnglish ? "The confirmation password does not match." : "Mật khẩu xác nhận không khớp.");
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
      if (!response.ok) setError(result.message || (isEnglish ? "Unable to change password." : "Không thể đổi mật khẩu."));
      else {
        setMessage(result.message || (isEnglish ? "Password updated successfully." : "Mật khẩu đã được cập nhật."));
        setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      }
    } catch {
      setError(isEnglish ? "Unable to connect to the server." : "Không thể kết nối đến máy chủ.");
    } finally {
      setSaving(false);
    }
  }

  if (checkingSession) return <div className="loading-state">{isEnglish ? "Verifying account..." : "Đang xác thực tài khoản..."}</div>;
  return (
    <div className="page-shell">
      <main className="account-layout">
        <header className="account-header">
          <Link href="/cap-2" className="brand-mark"><span className="brand-symbol">LT</span><span>Lotus Cinema</span></Link>
          <Link href="/profile" className="secondary-button">← {isEnglish ? "Profile" : "Hồ sơ"}</Link>
        </header>
        <section className="account-intro">
          <p className="eyebrow">{isEnglish ? "MEMBER SECURITY" : "BẢO MẬT THÀNH VIÊN"}</p>
          <h1>{isEnglish ? "Change password." : "Đổi mật khẩu."}</h1>
          <p>{isEnglish ? "Use a private, hard-to-guess password to protect your Lotus Cinema account." : "Dùng một mật khẩu riêng tư và khó đoán để bảo vệ tài khoản Lotus Cinema."}</p>
        </section>
        <nav className="account-tabs"><Link href="/profile">{isEnglish ? "Personal information" : "Thông tin cá nhân"}</Link><Link href="/change-password" className="active">{isEnglish ? "Change password" : "Đổi mật khẩu"}</Link></nav>
        <form onSubmit={submit} className="account-form password-form">
          <label htmlFor="current-password">{isEnglish ? "Current password" : "Mật khẩu hiện tại"}</label>
          <input id="current-password" type="password" autoComplete="current-password" value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} required />
          <label htmlFor="new-password">{isEnglish ? "New password" : "Mật khẩu mới"}</label>
          <input id="new-password" type="password" autoComplete="new-password" minLength={8} value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} required />
          <label htmlFor="confirm-password">{isEnglish ? "Confirm new password" : "Xác nhận mật khẩu mới"}</label>
          <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} required />
          <p className="password-hint">{isEnglish ? "New password must be at least 8 characters long." : "Mật khẩu mới cần tối thiểu 8 ký tự."}</p>
          {error && <p className="form-message error-message">{error}</p>}
          {message && <p className="form-message success-message">{message}</p>}
          <button className="primary-button account-save" type="submit" disabled={saving}>{saving ? (isEnglish ? "Updating..." : "Đang cập nhật...") : isEnglish ? "Update password" : "Cập nhật mật khẩu"} <span>→</span></button>
        </form>
      </main>
    </div>
  );
}
