import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import Home from "../../src/pages/index";

vi.mock("next/router", () => ({
  useRouter: () => ({
    replace: vi.fn(),
  }),
}));

describe("Home page", () => {
  it("renders login heading and form inputs", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /đăng nhập/i })).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mật khẩu/i)).toBeInTheDocument();
  });
});
