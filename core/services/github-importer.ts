import { config } from "../config/env";
import { RepoFile } from "../db";

interface GitHubRepoMetadata {
  name: string;
  full_name: string;
  default_branch: string;
  html_url: string;
  language: string | null;
}

interface GitHubTreeEntry {
  path: string;
  sha: string;
  type: "blob" | "tree" | string;
  size?: number;
}

interface GitHubTreeResponse {
  tree: GitHubTreeEntry[];
  truncated: boolean;
}

export interface GitHubImportResult {
  name: string;
  githubUrl: string;
  branch: string;
  language: string;
  framework: string;
  files: RepoFile[];
}

interface GitHubImportOptions {
  accessToken?: string;
}

interface GitHubBlobResponse {
  content: string;
  encoding: string;
}

const TEXT_EXTENSIONS = new Set([
  ".c",
  ".cc",
  ".conf",
  ".config",
  ".cpp",
  ".cs",
  ".css",
  ".csv",
  ".dockerfile",
  ".env",
  ".example",
  ".go",
  ".h",
  ".html",
  ".java",
  ".js",
  ".json",
  ".jsx",
  ".kt",
  ".lock",
  ".md",
  ".mjs",
  ".py",
  ".rb",
  ".rs",
  ".sh",
  ".sql",
  ".svelte",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".vue",
  ".xml",
  ".yaml",
  ".yml",
]);

const TEXT_FILENAMES = new Set([
  ".dockerignore",
  ".editorconfig",
  ".env.example",
  ".eslintrc",
  ".gitignore",
  "Dockerfile",
  "LICENSE",
  "Makefile",
  "README",
  "README.md",
  "requirements.txt",
]);

const SKIPPED_PATH_PARTS = new Set([
  ".git",
  ".next",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "target",
  "vendor",
]);

function parseGitHubUrl(input: string): { owner: string; repo: string } {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("GitHub URL is required.");
  }

  const shorthand = trimmed.match(/^([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
  if (shorthand) {
    return { owner: shorthand[1], repo: shorthand[2] };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Enter a valid GitHub repository URL, for example https://github.com/owner/repo.");
  }

  if (!["github.com", "www.github.com"].includes(parsed.hostname.toLowerCase())) {
    throw new Error("Only github.com repository URLs are supported.");
  }

  const [owner, rawRepo] = parsed.pathname.split("/").filter(Boolean);
  if (!owner || !rawRepo) {
    throw new Error("GitHub URL must include both an owner and repository name.");
  }

  return { owner, repo: rawRepo.replace(/\.git$/i, "") };
}

function resolveAccessToken(options: GitHubImportOptions = {}): string {
  return (options.accessToken || config.githubPat || "").trim();
}

function githubHeaders(options: GitHubImportOptions = {}): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "DevAssist-GitHub-Importer",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const accessToken = resolveAccessToken(options);
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

async function fetchGitHubJson<T>(url: string, options: GitHubImportOptions = {}): Promise<T> {
  const response = await fetch(url, { headers: githubHeaders(options) });
  if (!response.ok) {
    const details = await response.text().catch(() => "");
    if (response.status === 404) {
      throw new Error("GitHub repository was not found or is not accessible with the configured token.");
    }
    if (response.status === 403) {
      throw new Error("GitHub rate limit or permission check failed. Configure GITHUB_PAT for higher limits or private repositories.");
    }
    throw new Error(`GitHub request failed (${response.status}). ${details.slice(0, 180)}`);
  }
  return response.json() as Promise<T>;
}

async function fetchBlobText(
  owner: string,
  repo: string,
  entry: GitHubTreeEntry,
  options: GitHubImportOptions = {}
): Promise<string> {
  const blob = await fetchGitHubJson<GitHubBlobResponse>(
    `https://api.github.com/repos/${owner}/${repo}/git/blobs/${entry.sha}`,
    options
  );

  if (blob.encoding !== "base64") {
    throw new Error(`Unsupported GitHub blob encoding for ${entry.path}.`);
  }

  return Buffer.from(blob.content.replace(/\s/g, ""), "base64").toString("utf-8");
}

function isImportableFile(entry: GitHubTreeEntry): boolean {
  if (entry.type !== "blob") return false;
  if (!entry.size || entry.size > config.githubImportMaxFileBytes) return false;

  const parts = entry.path.split("/");
  if (parts.some((part) => SKIPPED_PATH_PARTS.has(part))) return false;

  const filename = parts[parts.length - 1];
  const extension = filename.includes(".") ? `.${filename.split(".").pop()}` : "";
  return TEXT_FILENAMES.has(filename) || TEXT_EXTENSIONS.has(extension.toLowerCase());
}

function scoreEntry(entry: GitHubTreeEntry): number {
  const path = entry.path.toLowerCase();
  if (path === "readme.md" || path === "package.json" || path === "requirements.txt") return 0;
  if (path.includes("/test") || path.includes(".test.") || path.includes(".spec.")) return 3;
  if (path.startsWith("src/") || path.startsWith("app/") || path.startsWith("server/")) return 1;
  return 2;
}

function detectLanguage(metadataLanguage: string | null, files: RepoFile[]): string {
  if (metadataLanguage) return metadataLanguage;

  const scores = new Map<string, number>();
  const extensionLanguage: Record<string, string> = {
    ".go": "Go",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".py": "Python",
    ".rs": "Rust",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
  };

  files.forEach((file) => {
    const filename = file.path.split("/").pop() || "";
    const extension = filename.includes(".") ? `.${filename.split(".").pop()}` : "";
    const language = extensionLanguage[extension.toLowerCase()];
    if (language) scores.set(language, (scores.get(language) || 0) + 1);
  });

  return [...scores.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "Unknown";
}

function packageDependencies(file: RepoFile): Record<string, string> {
  try {
    const parsed = JSON.parse(file.content) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    return { ...(parsed.dependencies || {}), ...(parsed.devDependencies || {}) };
  } catch {
    return {};
  }
}

function detectFramework(files: RepoFile[]): string {
  const packageJson = files.find((file) => file.path.endsWith("package.json"));
  if (packageJson) {
    const deps = packageDependencies(packageJson);
    if (deps.next) return "Next.js";
    if (deps.react) return "React";
    if (deps.express) return "Express";
    if (deps["@angular/core"]) return "Angular";
    if (deps.vue) return "Vue";
    if (deps.svelte) return "Svelte";
  }

  const joined = files.map((file) => `${file.path}\n${file.content.slice(0, 2000)}`).join("\n").toLowerCase();
  if (joined.includes("fastapi")) return "FastAPI";
  if (joined.includes("django")) return "Django";
  if (joined.includes("flask")) return "Flask";
  if (joined.includes("github.com/gin-gonic/gin")) return "Gin";
  if (joined.includes("actix-web")) return "Actix";
  if (joined.includes("axum")) return "Axum";
  return "Unknown";
}

export async function importGitHubRepository(
  githubUrl: string,
  options: GitHubImportOptions = {}
): Promise<GitHubImportResult> {
  const { owner, repo } = parseGitHubUrl(githubUrl);
  const metadata = await fetchGitHubJson<GitHubRepoMetadata>(`https://api.github.com/repos/${owner}/${repo}`, options);
  const branch = metadata.default_branch;
  const tree = await fetchGitHubJson<GitHubTreeResponse>(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    options
  );

  const selectedEntries = tree.tree
    .filter(isImportableFile)
    .sort((a, b) => scoreEntry(a) - scoreEntry(b) || a.path.localeCompare(b.path))
    .slice(0, config.githubImportMaxFiles);

  if (selectedEntries.length === 0) {
    throw new Error("No supported text source files were found in this GitHub repository.");
  }

  const files: RepoFile[] = [];
  for (const entry of selectedEntries) {
    const content = await fetchBlobText(owner, repo, entry, options);
    files.push({
      path: entry.path,
      content,
      size: entry.size || content.length,
    });
  }

  return {
    name: metadata.name || repo,
    githubUrl: metadata.html_url,
    branch,
    language: detectLanguage(metadata.language, files),
    framework: detectFramework(files),
    files,
  };
}
