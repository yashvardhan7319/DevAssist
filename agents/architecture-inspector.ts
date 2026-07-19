import { RepoFile } from "../core/db";
import { getDependencyManifestFiles } from "../core/services/dependency-parser";

const MAX_KEY_FILES = 28;
const MAX_RELATIONS = 80;

type ArchitectureInsight = {
  fileTree: string;
  keyFiles: Array<{ path: string; role: string; signals: string[] }>;
  routes: Array<{ method: string; path: string; file: string }>;
  imports: Array<{ from: string; to: string }>;
  manifests: string[];
  dataStores: string[];
  externalServices: string[];
};

export function buildArchitectureInsight(files: RepoFile[]): ArchitectureInsight {
  const normalizedFiles = files
    .filter((file) => file.path && !isIgnoredPath(file.path))
    .slice()
    .sort((a, b) => scoreArchitectureFile(a.path) - scoreArchitectureFile(b.path) || a.path.localeCompare(b.path));

  const keyFiles = normalizedFiles.slice(0, MAX_KEY_FILES).map((file) => ({
    path: file.path,
    role: inferFileRole(file.path, file.content || ""),
    signals: collectSignals(file.path, file.content || ""),
  }));

  return {
    fileTree: buildFileTree(normalizedFiles.map((file) => file.path)),
    keyFiles,
    routes: normalizedFiles.flatMap(extractRoutes).slice(0, MAX_RELATIONS),
    imports: normalizedFiles.flatMap(extractImports).slice(0, MAX_RELATIONS),
    manifests: getDependencyManifestFiles(files).map((file) => file.path),
    dataStores: detectDataStores(normalizedFiles),
    externalServices: detectExternalServices(normalizedFiles),
  };
}

export function buildArchitecturePromptContext(files: RepoFile[]): string {
  const insight = buildArchitectureInsight(files);
  return [
    "Repository Architecture Signals",
    `File tree:\n${insight.fileTree || "No file tree detected."}`,
    `Key files:\n${JSON.stringify(insight.keyFiles, null, 2)}`,
    `Routes and handlers:\n${JSON.stringify(insight.routes, null, 2)}`,
    `Import and module relationships:\n${JSON.stringify(insight.imports, null, 2)}`,
    `Dependency manifests:\n${JSON.stringify(insight.manifests, null, 2)}`,
    `Detected persistence or state layers:\n${JSON.stringify(insight.dataStores, null, 2)}`,
    `Detected external services:\n${JSON.stringify(insight.externalServices, null, 2)}`,
  ].join("\n\n");
}

export function buildLocalArchitectureDiagram(files: RepoFile[]): string {
  const insight = buildArchitectureInsight(files);
  const joined = files.map((file) => `${file.path}\n${file.content || ""}`).join("\n").toLowerCase();
  const frameworkLabel = summarizeFramework(joined);
  const languageLabel = summarizeLanguage(files);
  const apiLabel = frameworkLabel === "Project UI" ? `${languageLabel} Backend` : `${frameworkLabel} Service`;
  const routeSummary = insight.routes.length
    ? `${insight.routes.length} detected endpoint${insight.routes.length === 1 ? "" : "s"}`
    : "request handling";
  const manifestLabel = insight.manifests.length
    ? insight.manifests.slice(0, 2).map((manifest) => manifest.split("/").pop()).join(" + ")
    : "runtime config";

  const hasAuth = /auth|jwt|session|oauth|login|password|bcrypt/.test(joined);
  const hasFrontend = /react|vue|svelte|angular|tsx|jsx|component|dashboard|page/.test(joined);
  const hasAi = /groq|openai|ollama|langgraph|agent|llm|prompt|model|completion/.test(joined);
  const hasRag = /knowledge|rag|embedding|vector|chunk|retrieval|semantic|context builder/.test(joined);
  const hasDeployment = /docker|vercel|render|deploy|workflow|github actions/.test(joined);
  const hasExport = /pdf|markdown|html|report|export|readme/.test(joined);

  const lines = [
    ...buildMermaidInitBlock(),
    "flowchart TB",
    '  subgraph L1["Layer 1 - Users"]',
    node("DEV", "Developer", ["Uses system", "Reviews output"], "external"),
    node("ADMIN", hasAuth ? "Admin" : "Operator", [hasAuth ? "Manages access" : "Runs project", "Monitors status"], "external"),
    "  end",
    '  subgraph L2["Layer 2 - Presentation Layer"]',
    ...(hasFrontend
      ? [
          node("DASH", `${frameworkLabel} Dashboard`, ["Repository overview", "AI insights"], "presentation"),
          node("CHAT", "Repository Chat", ["Ask questions", "View responses"], "presentation"),
          node("DOCVIEW", "Documentation View", ["README", "Architecture"], "presentation"),
        ]
      : [
          node("CLIENT", "API Client", ["Sends HTTP requests", "Receives JSON"], "presentation"),
          node("DOCVIEW", "API Documentation", ["OpenAPI docs", "Endpoint reference"], "presentation"),
        ]),
    ...(hasExport ? [node("REPORTVIEW", "Reports View", ["PDF", "Markdown"], "presentation")] : []),
    "  end",
    '  subgraph L3["Layer 3 - Backend Services"]',
    ...(hasAuth ? [node("AUTH", "Authentication Service", ["Session validation", "Token handling"], "backend")] : []),
    node("API", apiLabel, [routeSummary, "Business rules"], "backend"),
    node("REPOSVC", "Repository Service", ["Source metadata", manifestLabel], "backend"),
    ...(hasExport ? [node("EXPORT", "Export Service", ["Document output", "Download assets"], "backend")] : []),
    "  end",
    ...(hasAi
      ? [
          '  subgraph L4["Layer 4 - AI Layer"]',
          node("ORCH", "AI Orchestrator", ["Workflow control", "Agent coordination"], "ai"),
          node("REPOAGENT", "Repository Agent", ["Code analysis", "Architecture signals"], "ai"),
          node("REVIEW", "Code Review Agent", ["Best practices", "Risk findings"], "ai"),
          ...(hasExport ? [node("DOCAGENT", "Documentation Agent", ["README generation", "Architecture report"], "ai")] : []),
          ...(joined.includes("test") ? [node("TESTAGENT", "Test Generator", ["Unit tests", "Coverage ideas"], "ai")] : []),
          "  end",
        ]
      : []),
    ...(hasRag
      ? [
          '  subgraph L5["Layer 5 - RAG Pipeline"]',
          node("PARSER", "Repository Parser", ["Reads files", "Extracts symbols"], "rag"),
          node("CHUNK", "Chunking Engine", ["Splits code", "Keeps context"], "rag"),
          node("EMBED", "Embedding Generator", ["Creates vectors", "Indexes meaning"], "rag"),
          node("SEARCH", "Vector Search", ["Finds context", "Ranks matches"], "rag"),
          node("CONTEXT", "Context Builder", ["Builds prompt", "Grounds answer"], "rag"),
          "  end",
        ]
      : []),
    '  subgraph L6["Layer 6 - Data Layer"]',
    ...buildDataNodes(insight),
    "  end",
    ...(insight.externalServices.length
      ? [
          '  subgraph L7["Layer 7 - External Services"]',
          ...insight.externalServices.slice(0, 4).map((service, index) =>
            node(`EXT${index}`, service, externalResponsibilities(service), "external")
          ),
          "  end",
        ]
      : []),
    ...buildEdges({ hasAuth, hasFrontend, hasAi, hasRag, hasExport, hasExternal: insight.externalServices.length > 0 }),
    ...buildStyles({ hasAi, hasRag, hasExternal: insight.externalServices.length > 0 }),
  ];

  return lines.join("\n");
}

function buildMermaidInitBlock(): string[] {
  return [
    '%%{init: {"theme": "base", "themeVariables": { "background": "#FFFFFF", "primaryColor": "#FFFFFF", "secondaryColor": "#FFFFFF", "tertiaryColor": "#FFFFFF", "clusterBkg": "#FFFFFF", "clusterBorder": "#CBD5E1", "mainBkg": "#FFFFFF", "nodeBorder": "#CBD5E1", "lineColor": "#64748B", "fontFamily": "Inter", "fontSize": "14px", "textColor": "#1E293B", "edgeLabelBackground": "#FFFFFF"}, "flowchart": {"htmlLabels": true}}}%%',
  ];
}

function node(id: string, title: string, responsibilities: string[], className: string): string {
  const label = [title, ...responsibilities.slice(0, 3).map((item) => `- ${item}`)]
    .map(escapeNodeLabel)
    .join("<br/>");

  return `    ${id}["${label}"]:::${className}`;
}

function buildDataNodes(insight: ArchitectureInsight): string[] {
  const stores = insight.dataStores.length ? insight.dataStores : ["Application Data"];
  return stores.slice(0, 3).map((store, index) =>
    `    DB${index}[("${escapeNodeLabel(store)}<br/>- Persistent records<br/>- Runtime state")]:::data`
  );
}

function buildEdges(options: {
  hasAuth: boolean;
  hasFrontend: boolean;
  hasAi: boolean;
  hasRag: boolean;
  hasExport: boolean;
  hasExternal: boolean;
}): string[] {
  const firstPresentation = options.hasFrontend ? "DASH" : "CLIENT";
  const edges = [
    `  DEV --> ${firstPresentation}`,
    `  ADMIN --> ${firstPresentation}`,
    options.hasAuth ? `  ${firstPresentation} --> AUTH` : "",
    `  ${firstPresentation} --> API`,
    options.hasAuth ? "  AUTH --> DB0" : "",
    "  API --> REPOSVC",
    "  API --> DB0",
  ];

  if (options.hasAi) {
    edges.push("  API --> ORCH", "  ORCH --> REPOAGENT", "  ORCH --> REVIEW");
    if (options.hasExport) edges.push("  ORCH --> DOCAGENT");
    if (options.hasRag) edges.push("  REPOAGENT --> PARSER", "  CONTEXT --> ORCH");
  }

  if (options.hasRag) {
    edges.push("  PARSER --> CHUNK", "  CHUNK --> EMBED", "  EMBED --> SEARCH", "  SEARCH --> CONTEXT", "  SEARCH --> DB0");
  }

  if (options.hasExport) {
    edges.push(options.hasAi ? "  DOCAGENT --> EXPORT" : "  API --> EXPORT", "  EXPORT --> REPORTVIEW", "  EXPORT --> DB0");
  }

  if (options.hasExternal) {
    edges.push(options.hasAi ? "  ORCH --> EXT0" : "  API --> EXT0");
  }

  return edges.filter(Boolean);
}

function buildStyles(options: { hasAi: boolean; hasRag: boolean; hasExternal: boolean }): string[] {
  return [
    "  linkStyle default stroke:#475569,stroke-width:1.4px",
    "  style L1 fill:#FFFFFF,stroke:#64748B,stroke-width:1px",
    "  style L2 fill:#FFFFFF,stroke:#2563EB,stroke-width:1px",
    "  style L3 fill:#FFFFFF,stroke:#16A34A,stroke-width:1px",
    ...(options.hasAi ? ["  style L4 fill:#FFFFFF,stroke:#9333EA,stroke-width:1px"] : []),
    ...(options.hasRag ? ["  style L5 fill:#FFFFFF,stroke:#6366F1,stroke-width:1px"] : []),
    "  style L6 fill:#FFFFFF,stroke:#F97316,stroke-width:1px",
    ...(options.hasExternal ? ["  style L7 fill:#FFFFFF,stroke:#64748B,stroke-width:1px"] : []),
    "  classDef presentation fill:#FFFFFF,stroke:#2563EB,stroke-width:2px,color:#1E293B",
    "  classDef backend fill:#FFFFFF,stroke:#16A34A,stroke-width:2px,color:#1E293B",
    "  classDef ai fill:#FFFFFF,stroke:#9333EA,stroke-width:2px,color:#1E293B",
    "  classDef rag fill:#FFFFFF,stroke:#6366F1,stroke-width:2px,color:#1E293B",
    "  classDef data fill:#FFFFFF,stroke:#F97316,stroke-width:2px,color:#1E293B",
    "  classDef external fill:#FFFFFF,stroke:#64748B,stroke-width:2px,color:#1E293B",
  ];
}

function externalResponsibilities(service: string): string[] {
  if (/github/i.test(service)) return ["Repository API", "Source import"];
  if (/groq|openai|ollama|llm/i.test(service)) return ["LLM inference", "AI responses"];
  if (/docker|vercel|render/i.test(service)) return ["Deployment target", "Runtime hosting"];
  return ["External integration", "Service calls"];
}

function summarizeFramework(joinedContent: string): string {
  const frameworks = [
    ["React", /react|vite/],
    ["Spring Boot", /spring-boot|springframework/],
    ["FastAPI", /fastapi/],
    ["Express", /express/],
    ["Next.js", /next/],
    ["Django", /django/],
    ["Flask", /flask/],
  ];
  return frameworks
    .filter(([, pattern]) => (pattern as RegExp).test(joinedContent))
    .map(([name]) => name)
    .slice(0, 2)
    .join(" + ") || "Project UI";
}

function summarizeLanguage(files: RepoFile[]): string {
  const counts = new Map<string, number>();
  const languages: Record<string, string> = {
    ts: "TypeScript",
    tsx: "TypeScript",
    js: "JavaScript",
    jsx: "JavaScript",
    py: "Python",
    java: "Java",
    kt: "Kotlin",
    go: "Go",
    rs: "Rust",
    php: "PHP",
    rb: "Ruby",
  };

  for (const file of files) {
    const ext = file.path.split(".").pop()?.toLowerCase() || "";
    const language = languages[ext];
    if (language) counts.set(language, (counts.get(language) || 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "Application";
}

function escapeNodeLabel(label: string): string {
  return label
    .replace(/<[^>]*>/g, "")
    .replace(/["]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 54);
}

function buildFileTree(paths: string[]): string {
  return paths.slice(0, 80).join("\n");
}

function extractRoutes(file: RepoFile): Array<{ method: string; path: string; file: string }> {
  const content = file.content || "";
  const routes: Array<{ method: string; path: string; file: string }> = [];
  const patterns = [
    /\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)["'`]/gi,
    /@(app|router)\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)["'`]/gi,
    /@(Get|Post|Put|Patch|Delete)Mapping\(\s*["'`]([^"'`]+)["'`]/g,
    /Route::(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)["'`]/gi,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const method = (match[2] && match[3] ? match[2] : match[1]).toUpperCase();
      const routePath = match[3] || match[2] || match[1];
      routes.push({ method, path: routePath, file: file.path });
    }
  }

  return routes;
}

function extractImports(file: RepoFile): Array<{ from: string; to: string }> {
  const content = file.content || "";
  const imports = new Set<string>();
  const patterns = [
    /import\s+.*?\s+from\s+["'`]([^"'`]+)["'`]/g,
    /import\(\s*["'`]([^"'`]+)["'`]\s*\)/g,
    /require\(\s*["'`]([^"'`]+)["'`]\s*\)/g,
    /from\s+([\w.]+)\s+import/g,
    /import\s+([\w.]+)/g,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      imports.add(match[1]);
    }
  }

  return [...imports].slice(0, 8).map((target) => ({ from: file.path, to: target }));
}

function collectSignals(filePath: string, content: string): string[] {
  const signals = new Set<string>();
  const lower = `${filePath}\n${content}`.toLowerCase();

  if (/express|fastify|fastapi|spring|controller|router/.test(lower)) signals.add("api routes");
  if (/react|vue|svelte|component|jsx|tsx/.test(lower)) signals.add("ui component");
  if (/sqlite|postgres|mysql|mongodb|redis|prisma|sequelize|typeorm|sqlalchemy|mongoose/.test(lower)) signals.add("data persistence");
  if (/groq|openai|langgraph|agent|llm|embedding|mermaid/.test(lower)) signals.add("ai workflow");
  if (/jwt|auth|session|oauth|passport|bcrypt/.test(lower)) signals.add("authentication");
  if (/docker|vercel|render|workflow|github actions|deployment/.test(lower)) signals.add("deployment");
  if (/\.env|process\.env|config|settings/.test(lower)) signals.add("configuration");

  return [...signals].slice(0, 6);
}

function inferFileRole(filePath: string, content: string): string {
  const lower = `${filePath}\n${content}`.toLowerCase();
  if (isDependencyManifestPath(filePath)) return "Dependency manifest";
  if (/route|controller|express|fastapi|spring controller|router/.test(lower)) return "API routing and request handling";
  if (/middleware|auth|jwt|session/.test(lower)) return "Authentication or middleware layer";
  if (/database|sqlite|postgres|schema|model|repository|storage/.test(lower)) return "Persistence and domain data layer";
  if (/react|component|tsx|jsx|page|dashboard/.test(lower)) return "Frontend UI component";
  if (/groq|langgraph|agent|orchestrat|knowledge-base|embedding/.test(lower)) return "AI agent and orchestration layer";
  if (/docker|vercel|render|workflow|deploy/.test(lower)) return "Deployment and operations config";
  if (/test|spec/.test(lower)) return "Automated tests";
  if (/readme|docs|markdown/.test(lower)) return "Documentation";
  return "Application module";
}

function scoreArchitectureFile(filePath: string): number {
  const lower = filePath.toLowerCase();
  if (isIgnoredPath(lower)) return 100;
  if (/server\.ts|app\.|main\.|index\.|routes?|controller|middleware/.test(lower)) return 0;
  if (/groq|ai|agent|orchestrat|knowledge/.test(lower)) return 1;
  if (/db|database|storage|schema|model|repository/.test(lower)) return 2;
  if (/component|page|dashboard|store|api/.test(lower)) return 3;
  if (isDependencyManifestPath(lower) || /config|env|docker|vercel|render|workflow/.test(lower)) return 4;
  return 8;
}

function isDependencyManifestPath(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return /(^|\/)(package\.json|requirements\.txt|pyproject\.toml|pom\.xml|build\.gradle|go\.mod|cargo\.toml|gemfile)$/.test(lower);
}

function isIgnoredPath(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return /(^|\/)(node_modules|dist|build|coverage|\.git|target|vendor)\//.test(lower) || /\.(png|jpg|jpeg|gif|webp|ico|svg|map|lock)$/i.test(lower);
}

function detectDataStores(files: RepoFile[]): string[] {
  const joined = files.map((file) => `${file.path}\n${file.content || ""}`).join("\n").toLowerCase();
  const stores = [
    ["SQLite", /sqlite|\.sqlite|node:sqlite/],
    ["PostgreSQL", /postgres|pg\b|psycopg/],
    ["MySQL", /mysql|mariadb/],
    ["MongoDB", /mongodb|mongoose/],
    ["Redis", /redis/],
    ["File storage", /storage|savefile|writefile|upload|repositories\//],
  ];

  return stores.filter(([, pattern]) => (pattern as RegExp).test(joined)).map(([name]) => name as string);
}

function detectExternalServices(files: RepoFile[]): string[] {
  const joined = files.map((file) => `${file.path}\n${file.content || ""}`).join("\n").toLowerCase();
  const services = [
    ["GitHub API", /github|api\.github\.com/],
    ["Groq API", /groq|api\.groq\.com/],
    ["OpenAI API", /openai|api\.openai\.com/],
    ["Ollama", /ollama/],
    ["Vercel", /vercel/],
    ["Render", /render\.com|render\.yaml/],
    ["Docker", /dockerfile|docker-compose/],
  ];

  return services.filter(([, pattern]) => (pattern as RegExp).test(joined)).map(([name]) => name as string);
}
