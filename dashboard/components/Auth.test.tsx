import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Auth from "./Auth";
import { api } from "../services/api";

vi.mock("../services/api", () => ({
  api: {
    getGithubAuthStatus: vi.fn(),
  },
}));

describe("Auth Component", () => {
  const mockOnAuthSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, document.title, "/");
  });

  it("renders GitHub-only login", () => {
    render(<Auth onAuthSuccess={mockOnAuthSuccess} />);
    expect(screen.getByText("DevAssist")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue with GitHub/i })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("developer_alpha")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Password")).not.toBeInTheDocument();
    expect(screen.queryByText(/Launch Demo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Register here/i)).not.toBeInTheDocument();
  });

  it("shows configuration error when GitHub OAuth is not configured", async () => {
    (api.getGithubAuthStatus as any).mockResolvedValue({ configured: false, callbackUrl: "" });

    render(<Auth onAuthSuccess={mockOnAuthSuccess} />);
    fireEvent.click(screen.getByRole("button", { name: /Continue with GitHub/i }));

    await waitFor(() => {
      expect(screen.getByText(/GitHub sign-in is not configured yet/i)).toBeInTheDocument();
    });
  });

  it("accepts a GitHub callback session from query params", async () => {
    const user = { id: "1", username: "octocat", role: "developer" };
    window.history.replaceState(
      {},
      document.title,
      `/?auth_token=test-token&auth_user=${encodeURIComponent(JSON.stringify(user))}`
    );

    render(<Auth onAuthSuccess={mockOnAuthSuccess} />);

    await waitFor(() => {
      expect(mockOnAuthSuccess).toHaveBeenCalledWith("test-token", user);
    });
  });
});
