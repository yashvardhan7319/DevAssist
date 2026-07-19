import { Response } from "express";
import { Database } from "../../core/services/database";
import { AuthenticatedRequest } from "../middlewares/auth";
import { config } from "../../core/config/env";
import {
  createAuthToken,
  hashPassword,
  verifyLegacyBase64Password,
  verifyPassword,
} from "../../core/services/auth-security";
import { logger } from "../../core/utils/logger";
import crypto from "crypto";

export const getSystemGithubDetails = () => {
  return { hasSystemGithubToken: false, systemGithubUsername: null };
};

type PublicUser = {
  id: string;
  username: string;
  email: string;
  role: "developer" | "viewer";
  githubUsername?: string;
  hasGithubToken: boolean;
};

function getPublicUser(user: any): PublicUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    githubUsername: user.githubUsername,
    hasGithubToken: Boolean(user.githubAccessToken),
  };
}


function buildGithubState(): string {
  const nonce = crypto.randomBytes(16).toString("hex");
  const timestamp = Date.now().toString(36);
  const payload = `${timestamp}.${nonce}`;
  const signature = crypto.createHmac("sha256", config.jwtSecret).update(payload).digest("hex");
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

function verifyGithubState(state: unknown): boolean {
  if (typeof state !== "string") return false;

  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const parts = decoded.split(".");
    if (parts.length !== 3) return false;

    const [timestamp, nonce, signature] = parts;
    const payload = `${timestamp}.${nonce}`;
    const expected = crypto.createHmac("sha256", config.jwtSecret).update(payload).digest("hex");
    const ageMs = Date.now() - parseInt(timestamp, 36);

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    return (
      ageMs >= 0 &&
      ageMs < 10 * 60 * 1000 &&
      signatureBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    );
  } catch {
    return false;
  }
}

function sanitizeGithubUsername(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 32) || `github_${crypto.randomUUID().slice(0, 8)}`;
}


function redirectWithAuthError(res: Response, message: string): void {
  const url = new URL(config.appUrl);
  url.searchParams.set("auth_error", message);
  res.redirect(url.toString());
}

async function fetchGithub(url: string, init: RequestInit, action: string): Promise<globalThis.Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error(`GitHub ${action} timed out. Check your internet connection and try again.`);
    }

    throw new Error(
      `Could not reach GitHub for ${action}. Start DevAssist with normal network access and check your firewall or proxy settings.`
    );
  } finally {
    clearTimeout(timeout);
  }
}

export class AuthController {
  static register(req: AuthenticatedRequest, res: Response): void {
    try {
      const { username, email, password, role } = req.body;

      if (!username || !email || !password) {
        res.status(400).json({ error: "All fields (username, email, password) are required." });
        return;
      }

      if (Database.findUserByUsername(username)) {
        res.status(409).json({ error: "Username is already taken." });
        return;
      }

      if (Database.findUserByEmail(email)) {
        res.status(409).json({ error: "Email is already registered." });
        return;
      }

      const accountRole = "developer";
      const passwordHash = hashPassword(password);
      const user = Database.createUser(username, email, passwordHash, accountRole);

      const token = createAuthToken({ id: user.id, username: user.username });
      const sysDetails = getSystemGithubDetails();

      logger.info(`User registered successfully: ${username}`);
      res.status(201).json({
        token,
        user: {
          ...getPublicUser(user),
          ...sysDetails,
        },
      });
    } catch (error: any) {
      logger.error("User registration failed", error);
      res.status(error.statusCode || 500).json({ error: error.message || "Failed to create account." });
    }
  }

  static login(req: AuthenticatedRequest, res: Response): void {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required." });
      return;
    }

    const user = Database.findUserByUsername(username) || Database.findUserByEmail(username);
    if (!user) {
      res.status(401).json({ error: "Invalid username or password." });
      return;
    }

    const passwordMatches =
      verifyPassword(password, user.passwordHash) ||
      verifyLegacyBase64Password(password, user.passwordHash);

    if (!passwordMatches) {
      res.status(401).json({ error: "Invalid username or password." });
      return;
    }

    if (!user.passwordHash.startsWith("scrypt$")) {
      Database.updateUser(user.id, { passwordHash: hashPassword(password) });
    }

    const token = createAuthToken({ id: user.id, username: user.username });
    const sysDetails = getSystemGithubDetails();

    logger.info(`User logged in successfully: ${username}`);
    res.json({
      token,
      user: {
        ...getPublicUser(user),
        ...sysDetails,
      },
    });
  }

  static githubStatus(req: AuthenticatedRequest, res: Response): void {
    res.json({
      configured: Boolean(config.githubClientId && config.githubClientSecret),
      callbackUrl: config.githubCallbackUrl,
    });
  }

  static githubStart(req: AuthenticatedRequest, res: Response): void {
    if (!config.githubClientId || !config.githubClientSecret) {
      redirectWithAuthError(res, "GitHub sign-in is not configured. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env, then restart DevAssist.");
      return;
    }

    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", config.githubClientId);
    url.searchParams.set("redirect_uri", config.githubCallbackUrl);
    url.searchParams.set("scope", "read:user user:email repo");
    url.searchParams.set("state", buildGithubState());
    res.redirect(url.toString());
  }

  static async githubCallback(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { code, state, error, error_description } = req.query;
      if (error) {
        redirectWithAuthError(res, String(error_description || error));
        return;
      }
      if (typeof code !== "string") {
        redirectWithAuthError(res, "GitHub sign-in could not be verified. Please try again.");
        return;
      }
      const validState = verifyGithubState(state);
      if (!validState && config.nodeEnv === "production") {
        redirectWithAuthError(res, "GitHub sign-in could not be verified. Please start sign-in again from DevAssist.");
        return;
      }
      if (!validState) {
        logger.warn("GitHub OAuth state verification failed in development. Continuing because localhost development can lose state after refresh/restart.");
      }
      if (!config.githubClientId || !config.githubClientSecret) {
        redirectWithAuthError(res, "GitHub sign-in is not configured on this server.");
        return;
      }

      const tokenResponse = await fetchGithub("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: config.githubClientId,
          client_secret: config.githubClientSecret,
          code,
          redirect_uri: config.githubCallbackUrl,
        }),
      }, "sign-in verification");
      const tokenJson: any = await tokenResponse.json();
      if (!tokenResponse.ok || !tokenJson.access_token) {
        throw new Error(tokenJson.error_description || "GitHub did not return an access token.");
      }

      const githubHeaders = {
        Authorization: `Bearer ${tokenJson.access_token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "DevAssist",
      };
      const profileResponse = await fetchGithub("https://api.github.com/user", { headers: githubHeaders }, "profile loading");
      if (!profileResponse.ok) {
        throw new Error("Could not load GitHub profile.");
      }
      const profile: any = await profileResponse.json();

      let email = typeof profile.email === "string" && profile.email ? profile.email : "";
      if (!email) {
        const emailResponse = await fetchGithub("https://api.github.com/user/emails", { headers: githubHeaders }, "email loading");
        if (emailResponse.ok) {
          const emails: any[] = await emailResponse.json();
          email = emails.find((entry) => entry.primary && entry.verified)?.email || emails.find((entry) => entry.verified)?.email || "";
        }
      }

      const githubUsername = String(profile.login || "");
      const fallbackEmail = `${sanitizeGithubUsername(githubUsername)}@users.noreply.github.com`;
      email = email || fallbackEmail;

      let user =
        Database.findUserByGithubUsername(githubUsername) ||
        Database.findUserByEmail(email);

      if (user) {
        user = Database.updateUser(user.id, {
          githubUsername,
          githubAccessToken: tokenJson.access_token,
          role: user.role,
        }) || user;
      } else {
        const usernameBase = sanitizeGithubUsername(githubUsername || profile.name || "github_user");
        let username = usernameBase;
        let suffix = 1;
        while (Database.findUserByUsername(username)) {
          suffix += 1;
          username = `${usernameBase}_${suffix}`;
        }

        const role = "developer";
        user = Database.createUser(username, email, `github$${crypto.randomUUID()}`, role);
        user = Database.updateUser(user.id, {
          githubUsername,
          githubAccessToken: tokenJson.access_token,
        }) || user;
      }

      const authToken = createAuthToken({ id: user.id, username: user.username });
      const publicUser = getPublicUser(user);
      const redirectUrl = new URL(config.appUrl);
      redirectUrl.searchParams.set("auth_token", authToken);
      redirectUrl.searchParams.set("auth_user", JSON.stringify(publicUser));
      res.redirect(redirectUrl.toString());
    } catch (callbackError: any) {
      logger.error("GitHub OAuth callback failed", callbackError);
      redirectWithAuthError(res, callbackError.message || "GitHub sign-in failed.");
    }
  }

  static me(req: AuthenticatedRequest, res: Response): void {
    const sysDetails = getSystemGithubDetails();
    res.json({
      user: {
        ...getPublicUser(req.user),
        ...sysDetails,
      },
    });
  }
}
