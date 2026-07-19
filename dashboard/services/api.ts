import { Repository, Analysis, Notification, User, OrchestrationRun } from "../types";

class ApiService {
  private getHeaders(token: string | null, isJson = true): HeadersInit {
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    if (isJson) {
      headers["Content-Type"] = "application/json";
    }
    return headers;
  }

  private async handleResponse<T>(res: Response, fallbackError: string): Promise<T> {
    const contentType = res.headers.get("content-type");
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("ais_auth_token");
        localStorage.removeItem("ais_user");
        window.dispatchEvent(new Event("ais_unauthorized"));
      }
      if (contentType && contentType.includes("application/json")) {
        const err = await res.json();
        throw new Error(err.error || fallbackError);
      }
      throw new Error(`${fallbackError} (Server status ${res.status})`);
    }
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error(`${fallbackError} (Invalid server response format)`);
    }
    return res.json() as Promise<T>;
  }

  async login(payload: any): Promise<{ token: string; user: User }> {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return this.handleResponse<{ token: string; user: User }>(res, "Failed to log in.");
  }

  async register(payload: any): Promise<{ token: string; user: User }> {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return this.handleResponse<{ token: string; user: User }>(res, "Failed to register.");
  }

  async getGithubAuthStatus(): Promise<{ configured: boolean; callbackUrl: string }> {
    const res = await fetch("/api/auth/github/status");
    return this.handleResponse<{ configured: boolean; callbackUrl: string }>(res, "Failed to load GitHub sign-in status.");
  }

  async getMe(token: string): Promise<{ user: User }> {
    const res = await fetch("/api/auth/me", {
      headers: this.getHeaders(token, false),
    });
    return this.handleResponse<{ user: User }>(res, "Failed to load user profile");
  }



  async getRepositories(token: string): Promise<{ repositories: Repository[] }> {
    const res = await fetch("/api/repositories", {
      headers: this.getHeaders(token, false),
    });
    return this.handleResponse<{ repositories: Repository[] }>(res, "Failed to fetch repositories");
  }

  async createRepository(
    token: string,
    payload: {
      name?: string;
      language?: string;
      framework?: string;
      sourceType?: "github" | "zip";
      githubUrl?: string;
      githubToken?: string;
    }
  ): Promise<{ repository: Repository }> {
    const res = await fetch("/api/repositories", {
      method: "POST",
      headers: this.getHeaders(token, true),
      body: JSON.stringify(payload),
    });
    return this.handleResponse<{ repository: Repository }>(res, "Failed to establish project.");
  }

  async getRepositoryDetails(token: string, id: string): Promise<{ repository: Repository; analyses: Analysis[] }> {
    const res = await fetch(`/api/repositories/${id}`, {
      headers: this.getHeaders(token, false),
    });
    return this.handleResponse<{ repository: Repository; analyses: Analysis[] }>(res, "Failed to load repo details");
  }

  async deleteRepository(token: string, id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/repositories/${id}`, {
      method: "DELETE",
      headers: this.getHeaders(token, false),
    });
    if (!res.ok) throw new Error("Failed to delete repository");
    return res.json();
  }

  async saveFile(token: string, repoId: string, path: string, content: string): Promise<{ success: boolean; files: any[] }> {
    const res = await fetch(`/api/repositories/${repoId}/files`, {
      method: "POST",
      headers: this.getHeaders(token, true),
      body: JSON.stringify({ path, content }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to save file.");
    }
    return res.json();
  }

  async deleteFile(token: string, repoId: string, path: string): Promise<{ success: boolean; files: any[] }> {
    const res = await fetch(`/api/repositories/${repoId}/files`, {
      method: "DELETE",
      headers: this.getHeaders(token, true),
      body: JSON.stringify({ path }),
    });
    if (!res.ok) throw new Error("Failed to delete file.");
    return res.json();
  }

  async triggerAnalysis(token: string, repoId: string, analysisType: string, payload: any = {}): Promise<{ analysis: Analysis }> {
    const res = await fetch(`/api/repositories/${repoId}/analyze`, {
      method: "POST",
      headers: this.getHeaders(token, true),
      body: JSON.stringify({ analysisType, ...payload }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to trigger analysis.");
    }
    return res.json();
  }

  async explainFile(token: string, repoId: string, filePath: string): Promise<{ filePath: string; explanation: string }> {
    const res = await fetch(`/api/repositories/${repoId}/explain-file`, {
      method: "POST",
      headers: this.getHeaders(token, true),
      body: JSON.stringify({ filePath }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to explain file.");
    }
    return res.json();
  }

  async getNotifications(token: string): Promise<{ notifications: Notification[] }> {
    const res = await fetch("/api/notifications", {
      headers: this.getHeaders(token, false),
    });
    return this.handleResponse<{ notifications: Notification[] }>(res, "Failed to fetch notifications");
  }

  async markNotificationRead(token: string, id: string): Promise<{ success: boolean; notification: Notification }> {
    const res = await fetch(`/api/notifications/${id}/read`, {
      method: "POST",
      headers: this.getHeaders(token, false),
    });
    if (!res.ok) throw new Error("Failed to mark notification as read");
    return res.json();
  }

  async startOrchestration(token: string, repositoryId: string, userInput?: string): Promise<{ orchestration: OrchestrationRun; message: string }> {
    const res = await fetch("/api/orchestrations", {
      method: "POST",
      headers: this.getHeaders(token, true),
      body: JSON.stringify({ repositoryId, userInput }),
    });
    return this.handleResponse<{ orchestration: OrchestrationRun; message: string }>(res, "Failed to start orchestration run.");
  }

  async getOrchestration(token: string, id: string): Promise<{ orchestration: OrchestrationRun }> {
    const res = await fetch(`/api/orchestrations/${id}`, {
      headers: this.getHeaders(token, false),
    });
    return this.handleResponse<{ orchestration: OrchestrationRun }>(res, "Failed to fetch orchestration details.");
  }

  async cancelOrchestration(token: string, id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/orchestrations/${id}/cancel`, {
      method: "POST",
      headers: this.getHeaders(token, false),
    });
    return this.handleResponse<{ success: boolean; message: string }>(res, "Failed to cancel orchestration run.");
  }

  async getOrchestrationsForRepo(token: string, repoId: string): Promise<{ orchestrations: OrchestrationRun[] }> {
    const res = await fetch(`/api/orchestrations/repo/${repoId}`, {
      headers: this.getHeaders(token, false),
    });
    return this.handleResponse<{ orchestrations: OrchestrationRun[] }>(res, "Failed to list orchestrations.");
  }

  async getAdminOverview(token: string): Promise<any> {
    const res = await fetch("/api/admin/overview", {
      headers: this.getHeaders(token, false),
    });
    return this.handleResponse<any>(res, "Failed to load admin overview.");
  }

  async runAdminAction(token: string, payload: { action: string; label?: string; repositoryId?: string }): Promise<any> {
    const res = await fetch("/api/admin/actions", {
      method: "POST",
      headers: this.getHeaders(token, true),
      body: JSON.stringify(payload),
    });
    return this.handleResponse<any>(res, "Failed to run admin action.");
  }


}

export const api = new ApiService();
