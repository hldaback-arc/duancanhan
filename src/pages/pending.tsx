import Link from "next/link";
import { MouseEvent, useEffect, useState } from "react";

type AccountStatus = "pending" | "approved" | "rejected";
type PendingUser = { fullName: string; email: string; accountStatus: AccountStatus };

export default function Pending() {
  const [user, setUser] = useState<PendingUser | null>(null);
  const [status, setStatus] = useState<AccountStatus>("pending");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function checkStatus() {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) {
          window.location.href = "/";
          return;
        }
        const result = await response.json();
        if (!active) return;
        const nextUser = result.user as PendingUser;
        setUser(nextUser);
        setStatus(nextUser.accountStatus);
        setLoading(false);
        if (nextUser.accountStatus === "approved") window.location.href = "/cap-2";
      } catch {
        if (active) setLoading(false);
      }
    }

    checkStatus();
    const timer = window.setInterval(checkStatus, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  async function goToLogin(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    await logout();
  }

  if (loading) return <div className="loading-state">Đang kiểm tra trạng thái tài khoản...</div>;

  const rejected = status === "rejected";
  return <div className="page-shell"><main className="approval-layout">
    <section className="approval-panel" aria-labelledby="approval-title">
      <Link href="/" className="brand-mark"><span className="brand-symbol">LT</span><span>Lotus Cinema</span></Link>
      <div className="approval-mark" aria-hidden="true">{rejected ? "!" : "✓"}</div>
      <p className="eyebrow">{rejected ? "YÊU CẦU CHƯA ĐƯỢC DUYỆT" : "LOTUS CINEMA MEMBERS"}</p>
      <h1 id="approval-title">{rejected ? "Tài khoản chưa được cấp quyền." : "Hồ sơ đang chờ cấp quyền."}</h1>
      <p>{rejected ? "Quản trị viên chưa thể phê duyệt tài khoản này. Vui lòng liên hệ rạp để được hỗ trợ thêm." : "Thông tin của bạn đã được ghi nhận. Quản trị viên sẽ kiểm tra và cấp quyền truy cập trong thời gian sớm nhất."}</p>
      {user && <div className="approval-account"><span>{user.fullName.slice(0, 2).toUpperCase()}</span><div><strong>{user.fullName}</strong><small>{user.email}</small></div></div>}
      {!rejected && <div className="approval-status"><i /> Đang chờ quản trị viên xác nhận</div>}
      <div className="approval-actions"><button className="text-button" type="button" onClick={logout}>Đăng xuất</button><Link href="/" className="secondary-button" onClick={goToLogin}>Về trang đăng nhập <span aria-hidden="true">→</span></Link></div>
    </section>
  </main></div>;
}
