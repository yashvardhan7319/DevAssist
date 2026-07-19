import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";

const envFilePath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envFilePath });

const isProduction = process.env.NODE_ENV === "production";
const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

function parsePort(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const config = {
  port: parsePort(process.env.PORT, 3000),
  nodeEnv: process.env.NODE_ENV || "development",
  sqliteDbPath: process.env.SQLITE_DB_PATH || "",
  allowEphemeralSqlite: process.env.ALLOW_EPHEMERAL_SQLITE === "true",
  jwtSecret: process.env.JWT_SECRET || (isProduction ? "" : "devassist-local-development-secret-change-me"),
  jsonRequestLimit: process.env.JSON_REQUEST_LIMIT || "1mb",
  largeJsonRequestLimit: process.env.LARGE_JSON_REQUEST_LIMIT || "25mb",
  githubImportMaxFiles: parsePositiveInteger(process.env.GITHUB_IMPORT_MAX_FILES, 150),
  githubImportMaxFileBytes: parsePositiveInteger(process.env.GITHUB_IMPORT_MAX_FILE_BYTES, 150_000),
  githubClientId: process.env.GITHUB_CLIENT_ID || "",
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET || "",
  appUrl,
  githubCallbackUrl: (process.env.GITHUB_CALLBACK_URL || `${appUrl}/api/auth/github/callback`).replace(/\/$/, ""),
  githubPat: process.env.GITHUB_PAT || process.env.GITHUB_SYSTEM_TOKEN || "",
  groqApiKey: process.env.GROQ_API_KEY || "",
};

function readExampleValue(name: string): string {
  const examplePath = path.resolve(process.cwd(), ".env.example");
  if (!fs.existsSync(examplePath)) {
    return "";
  }

  const line = fs
    .readFileSync(examplePath, "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith(`${name}=`));

  return line ? line.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "") : "";
}

function looksLikeRealSecret(value: string): boolean {
  if (!value || value.includes("your_") || value.includes("replace-with")) {
    return false;
  }

  return /^(gsk_|ghp_|github_pat_|[a-f0-9]{32,})/i.test(value);
}

export function validateConfig() {
  const exampleGroqApiKey = readExampleValue("GROQ_API_KEY");
  if (looksLikeRealSecret(exampleGroqApiKey)) {
    console.warn("[CONFIG WARNING]: .env.example contains a real-looking GROQ_API_KEY. DevAssist ignores .env.example at runtime; move secrets to .env and keep .env.example as placeholders only.");
  }
  if (!process.env.JWT_SECRET) {
    console.warn("[CONFIG WARNING]: JWT_SECRET is missing. Set a strong secret before deploying shared or production environments.");
  }
  if (isProduction && !process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required in production.");
  }
  if (isProduction && !config.sqliteDbPath && !config.allowEphemeralSqlite) {
    throw new Error("SQLITE_DB_PATH is required in production so DevAssist stores data on a configured persistent volume.");
  }
  if (!config.groqApiKey) {
    console.warn("[CONFIG WARNING]: GROQ_API_KEY is missing. AI analysis features will fail until it is configured.");
  }
  if (config.groqApiKey) {
    console.info(`Groq API key detected from ${envFilePath} and configured.`);
  }
  if (!config.githubClientId || !config.githubClientSecret) {
    console.warn("⚠️  [CONFIG WARNING]: GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET is missing. GitHub OAuth features will be unavailable.");
  }
}
