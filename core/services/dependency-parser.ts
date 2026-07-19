import { RepoFile } from "../db";

export type ParsedDependency = {
  name: string;
  current: string;
  latest: string;
  outdated: boolean;
  vulnerable: boolean;
  vulnerabilityDetails?: string;
};

const MANIFEST_NAMES = new Set([
  "package.json",
  "requirements.txt",
  "pyproject.toml",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "gradle.properties",
  "go.mod",
  "Cargo.toml",
  "Gemfile",
]);

export function isDependencyManifestPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  const fileName = normalized.split("/").pop() || normalized;
  return MANIFEST_NAMES.has(fileName);
}

export function getDependencyManifestFiles(files: RepoFile[]): RepoFile[] {
  return files.filter((file) => isDependencyManifestPath(file.path));
}

export function parseDependenciesFromFiles(files: RepoFile[]): ParsedDependency[] {
  const found = new Map<string, ParsedDependency>();

  for (const file of getDependencyManifestFiles(files)) {
    for (const dep of parseDependenciesFromFile(file)) {
      const key = `${dep.name}@${dep.current}`;
      if (!found.has(key)) {
        found.set(key, dep);
      }
    }
  }

  return Array.from(found.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function parseDependenciesFromFile(file: RepoFile): ParsedDependency[] {
  const path = file.path.replace(/\\/g, "/").toLowerCase();
  const content = file.content || "";

  if (path.endsWith("package.json")) return parsePackageJson(content);
  if (path.endsWith("requirements.txt")) return parseRequirements(content);
  if (path.endsWith("pyproject.toml")) return parsePyproject(content);
  if (path.endsWith("pom.xml")) return parsePomXml(content);
  if (path.endsWith("build.gradle") || path.endsWith("build.gradle.kts")) return parseGradle(content);
  if (path.endsWith("go.mod")) return parseGoMod(content);
  if (path.endsWith("cargo.toml")) return parseCargoToml(content);
  if (path.endsWith("gemfile")) return parseGemfile(content);

  return [];
}

function createDependency(name: string, current = "managed or unspecified"): ParsedDependency {
  return {
    name: name.trim(),
    current: current.trim() || "managed or unspecified",
    latest: "Unknown",
    outdated: false,
    vulnerable: false,
    vulnerabilityDetails: "Detected from manifest. Run with GROQ_API_KEY configured or a package scanner to enrich latest-version and advisory details.",
  };
}

function parsePackageJson(content: string): ParsedDependency[] {
  try {
    const parsed = JSON.parse(content);
    const groups = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
    return groups.flatMap((group) =>
      Object.entries(parsed[group] || {}).map(([name, version]) =>
        createDependency(name, String(version))
      )
    );
  } catch {
    return [];
  }
}

function parseRequirements(content: string): ParsedDependency[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("-"))
    .map((line) => {
      const match = line.match(/^([A-Za-z0-9_.-]+)\s*([<>=!~]=?.*)?$/);
      return match ? createDependency(match[1], match[2] || "unbounded") : null;
    })
    .filter(Boolean) as ParsedDependency[];
}

function parsePyproject(content: string): ParsedDependency[] {
  const deps: ParsedDependency[] = [];
  const quotedDeps = content.match(/["'][A-Za-z0-9_.-]+[^"']*["']/g) || [];
  for (const raw of quotedDeps) {
    const value = raw.slice(1, -1);
    const match = value.match(/^([A-Za-z0-9_.-]+)\s*([<>=!~].*)?$/);
    if (match) deps.push(createDependency(match[1], match[2] || "unbounded"));
  }

  const poetryMatches = content.matchAll(/^\s*([A-Za-z0-9_.-]+)\s*=\s*["']([^"']+)["']/gm);
  for (const match of poetryMatches) {
    if (!["python", "version"].includes(match[1].toLowerCase())) {
      deps.push(createDependency(match[1], match[2]));
    }
  }

  return deps;
}

function parsePomXml(content: string): ParsedDependency[] {
  const deps: ParsedDependency[] = [];
  const parentMatch = content.match(/<parent>[\s\S]*?<groupId>(.*?)<\/groupId>[\s\S]*?<artifactId>(.*?)<\/artifactId>[\s\S]*?<version>(.*?)<\/version>[\s\S]*?<\/parent>/);
  if (parentMatch) {
    deps.push(createDependency(`${parentMatch[1]}:${parentMatch[2]}`, parentMatch[3]));
  }

  const dependencyBlocks = content.match(/<dependency>[\s\S]*?<\/dependency>/g) || [];
  for (const block of dependencyBlocks) {
    const groupId = getXmlTag(block, "groupId");
    const artifactId = getXmlTag(block, "artifactId");
    const version = getXmlTag(block, "version");
    const scope = getXmlTag(block, "scope");
    if (!groupId || !artifactId) continue;
    const suffix = scope ? ` (${scope})` : "";
    deps.push(createDependency(`${groupId}:${artifactId}${suffix}`, version || "managed by parent"));
  }

  return deps;
}

function parseGradle(content: string): ParsedDependency[] {
  const deps: ParsedDependency[] = [];
  const stringNotation = content.matchAll(/(?:implementation|api|compileOnly|runtimeOnly|testImplementation|testRuntimeOnly)\s*\(?\s*["']([^:"']+):([^:"']+):([^"']+)["']/g);
  for (const match of stringNotation) {
    deps.push(createDependency(`${match[1]}:${match[2]}`, match[3]));
  }

  const mapNotation = content.matchAll(/(?:implementation|api|compileOnly|runtimeOnly|testImplementation|testRuntimeOnly)\s*\(?\s*group:\s*["']([^"']+)["']\s*,\s*name:\s*["']([^"']+)["'](?:\s*,\s*version:\s*["']([^"']+)["'])?/g);
  for (const match of mapNotation) {
    deps.push(createDependency(`${match[1]}:${match[2]}`, match[3] || "managed or unspecified"));
  }

  return deps;
}

function parseGoMod(content: string): ParsedDependency[] {
  const deps: ParsedDependency[] = [];
  const lines = content.replace(/require\s*\(/g, "").replace(/\)/g, "").split(/\r?\n/);
  for (const line of lines) {
    const match = line.trim().match(/^([^\s]+)\s+(v[^\s]+)/);
    if (match) deps.push(createDependency(match[1], match[2]));
  }
  return deps;
}

function parseCargoToml(content: string): ParsedDependency[] {
  const deps: ParsedDependency[] = [];
  let inDeps = false;
  for (const line of content.split(/\r?\n/)) {
    const section = line.trim().match(/^\[(.+)]$/);
    if (section) {
      inDeps = ["dependencies", "dev-dependencies", "build-dependencies"].includes(section[1]);
      continue;
    }
    if (!inDeps) continue;
    const match = line.trim().match(/^([A-Za-z0-9_-]+)\s*=\s*(.+)$/);
    if (match) deps.push(createDependency(match[1], match[2].replace(/[",{}]/g, "").trim()));
  }
  return deps;
}

function parseGemfile(content: string): ParsedDependency[] {
  const deps: ParsedDependency[] = [];
  const matches = content.matchAll(/^\s*gem\s+["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?/gm);
  for (const match of matches) {
    deps.push(createDependency(match[1], match[2] || "unbounded"));
  }
  return deps;
}

function getXmlTag(block: string, tag: string): string {
  return block.match(new RegExp(`<${tag}>(.*?)<\\/${tag}>`))?.[1]?.trim() || "";
}
