import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useEffect, useState } from "react";
import { useLocale } from "./_app";

export default function Home() {
  const router = useRouter();
  const { locale } = useLocale();
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (response) => {
        if (!response.ok) {
          setCheckingSession(false);
          return;
        }
        const result = await response.json();
        if (result.user.accountStatus === "pending") router.replace("/pending");
        else router.replace("/cap-2");
      })
      .catch(() => setCheckingSession(false));
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.status === "pending") router.replace("/pending");
        else setError(result.message || "Không thể đăng nhập.");
      } else router.replace("/cap-2");
    } catch {
      setError("Không thể kết nối đến máy chủ.");
    } finally {
      setLoading(false);
    }
  }

  const isEnglish = locale === "en";

  if (checkingSession) return <div className="loading-state">{isEnglish ? "Checking session..." : "Đang kiểm tra phiên đăng nhập..."}</div>;

  return (
    <div className="page-shell">
      <main className="login-layout">
        <section className="form-panel" aria-labelledby="form-title">
          <div className="form-heading">
            <p className="section-label">LOTUS CINEMA</p>
            <h2 id="form-title">{isEnglish ? "Login" : "Đăng nhập"}</h2>
            <p>{isEnglish ? "Sign in to book tickets and manage your member account." : "Đăng nhập để đặt vé và quản lý tài khoản thành viên."}</p>
          </div>
          <form onSubmit={handleSubmit} className="student-form">
            <label htmlFor="email">Email <span>*</span></label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="ban@example.com"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <label htmlFor="password">{isEnglish ? "Password" : "Mật khẩu"} <span>*</span></label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder={isEnglish ? "Minimum 8 characters" : "Tối thiểu 8 ký tự"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            {error && <p className="form-message error-message">{error}</p>}
            <button type="submit" className="primary-button">
              {loading ? (isEnglish ? "Authenticating..." : "Đang xác thực...") : isEnglish ? "Login" : "Đăng nhập"} <span aria-hidden="true">→</span>
            </button>
          </form>
          <p className="form-footer">{isEnglish ? "New member?" : "Chưa có tài khoản?"} <Link href="/register">{isEnglish ? "Register now" : "Đăng ký ngay"}</Link></p>
        </section>
      </main>
    </div>
  );
}
