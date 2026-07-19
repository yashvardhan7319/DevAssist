import { RepoFile, CodeReviewAnnotation, SecurityReport } from "../core/db";
import { buildArchitectureInsight, buildLocalArchitectureDiagram } from "./architecture-inspector";
import { parseDependenciesFromFiles } from "../core/services/dependency-parser";

export function runLocalRepoUnderstanding(files: RepoFile[]) {
  const insight = buildArchitectureInsight(files);
  const language = detectLanguage(files);
  const framework = detectFramework(files);

  return {
    language,
    framework,
    summary: [
      `Local analysis detected ${language} with ${framework}.`,
      `Scanned ${files.length} files and identified ${insight.keyFiles.length} key architecture modules.`,
      `Detected ${insight.routes.length} routes, ${insight.imports.length} import relationships, ${insight.dataStores.length} persistence layers, and ${insight.externalServices.length} external services.`,
      "Groq was unavailable, so DevAssist generated this repository-grounded architecture locally.",
    ].join(" "),
    mermaidDiagram: buildLocalArchitectureDiagram(files),
  };
}

export function runLocalPlanning(files: RepoFile[], requestText: string) {
  const insight = buildArchitectureInsight(files);
  const framework = detectFramework(files);
  const lowerRequest = requestText.toLowerCase();
  const persistenceFiles = insight.keyFiles
    .filter((file) => /database|persistence|data|model|schema|repository|migration/i.test(file.role + " " + file.path))
    .map((file) => file.path);

  if (/\b(database|db|sync|synchronization|replication|migration|postgres|sqlite|performance|bottleneck)\b/.test(lowerRequest)) {
    const dataStores = insight.dataStores.length ? insight.dataStores.join(", ") : "the detected persistence layer";
    return {
      tasks: [
        {
          title: "Inventory persistence boundaries",
          complexity: "S" as const,
          filesToModify: persistenceFiles,
          description: `Document how ${dataStores} is accessed, which modules own reads/writes, and where synchronization hooks should live.`,
        },
        {
          title: "Design idempotent synchronization flow",
          complexity: "M" as const,
          filesToModify: persistenceFiles,
          description: "Add a sync state table or metadata fields for last synced version, conflict status, retry count, and source timestamps so repeated sync runs do not duplicate data.",
        },
        {
          title: "Add transactional writes and conflict handling",
          complexity: "M" as const,
          filesToModify: persistenceFiles,
          description: "Wrap multi-table updates in transactions, validate incoming records, and define deterministic conflict resolution for stale or missing rows.",
        },
        {
          title: "Remove performance bottlenecks",
          complexity: "M" as const,
          filesToModify: persistenceFiles,
          description: "Add indexes for lookup/filter columns, batch large imports, avoid N+1 queries, and paginate high-volume reads.",
        },
        {
          title: "Verify real-time persistence",
          complexity: "S" as const,
          filesToModify: persistenceFiles,
          description: "Run migrations, seed representative records, test sync retries, and confirm dashboard/API reads reflect newly committed database state immediately.",
        },
      ],
    };
  }

  return {
    tasks: [
      {
        title: "Map affected modules",
        complexity: "S" as const,
        filesToModify: insight.keyFiles.slice(0, 6).map((file) => file.path),
        description: `Review the ${framework} entrypoints, routes, services, state modules, and persistence files related to: ${requestText}`,
      },
      {
        title: "Implement focused changes",
        complexity: "M" as const,
        description: "Update the smallest set of files needed, preserving existing project conventions and data contracts.",
      },
      {
        title: "Add validation and error states",
        complexity: "M" as const,
        description: "Cover invalid inputs, missing configuration, empty states, and failed external-service calls.",
      },
      {
        title: "Verify dashboard behavior",
        complexity: "S" as const,
        description: "Run type checks, tests, and manually confirm the related dashboard tab refreshes with stored results.",
      },
    ],
  };
}

export function runLocalCodeReview(files: RepoFile[]) {
  const annotations = scanCodeIssues(files);
  return {
    resultSummary: annotations.length
      ? `Local static review found ${annotations.length} potential issues. Groq was unavailable, so results are heuristic.`
      : "Local static review did not find obvious high-risk patterns. Groq was unavailable, so results are heuristic.",
    annotations,
  };
}

export function runLocalDependencyAnalysis(files: RepoFile[]) {
  return { dependencies: parseDependenciesFromFiles(files) };
}

export function runLocalTestGeneration(files: RepoFile[], filePath: string) {
  const target = files.find((file) => file.path === filePath);
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  const language = detectLanguage(target ? [target] : files);
  const testFile = filePath.replace(/(\.[^.]+)?$/, ext === "java" ? "Test.java" : ".test.ts");

  if (ext === "java") {
    return {
      testsCode: `// ${testFile}
// Local fallback test scaffold generated because Groq was unavailable.
// Add project-specific imports, mocks, and assertions based on ${filePath}.

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class GeneratedLocalTest {
    @Test
    void shouldLoadTargetClassBehavior() {
        assertTrue(true, "Replace with assertions for ${filePath}");
    }
}
`,
    };
  }

  if (["py"].includes(ext)) {
    return {
      testsCode: `# test_${filePath.split(/[\\/]/).pop() || "target.py"}
# Local fallback test scaffold generated because Groq was unavailable.

def test_${sanitizeIdentifier(filePath)}_loads():
    assert True
`,
    };
  }

  return {
    testsCode: `// ${testFile}
// Local fallback test scaffold generated because Groq was unavailable.
// Detected language: ${language}

import { describe, expect, it } from "vitest";

describe("${filePath}", () => {
  it("has a generated placeholder test", () => {
    expect(true).toBe(true);
  });
});
`,
  };
}

export function runLocalDocumentation(files: RepoFile[]) {
  const insight = buildArchitectureInsight(files);
  return {
    readmeMarkdown: `# Project Documentation

Generated locally because Groq was unavailable.

## Stack

- Language: ${detectLanguage(files)}
- Framework: ${detectFramework(files)}
- Files scanned: ${files.length}

## Key Files

${insight.keyFiles.map((file) => `- \`${file.path}\`: ${file.role}`).join("\n") || "- No key files detected."}

## Routes

${insight.routes.map((route) => `- \`${route.method} ${route.path}\` in \`${route.file}\``).join("\n") || "- No routes detected."}

## Persistence

${insight.dataStores.map((store) => `- ${store}`).join("\n") || "- No persistence layer detected."}
`,
  };
}

export function runLocalDeployment(files: RepoFile[]) {
  const usesNode = files.some((file) => file.path.endsWith("package.json"));
  const port = usesNode ? "3000" : "8000";
  return {
    dockerfileContent: usesNode
      ? `FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE ${port}
CMD ["npm", "start"]
`
      : `FROM python:3.12-slim
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
EXPOSE ${port}
CMD ["python", "main.py"]
`,
    dockerComposeContent: `services:
  app:
    build: .
    ports:
      - "${port}:${port}"
    env_file:
      - .env
`,
    githubActionsContent: `name: CI
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
`,
    vercelConfig: `{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
`,
    renderConfig: `services:
  - type: web
    name: devassist-app
    env: node
    buildCommand: npm ci && npm run build
    startCommand: npm start
    envVars:
      - key: PORT
        value: "${port}"
`,
    detectedEnvVars: detectEnvVars(files),
    compatibilityReport: {
      render: { compatible: true, issues: [], tips: ["Set required environment variables in Render dashboard."] },
      vercel: { compatible: usesNode, issues: usesNode ? [] : ["Non-Node backends may require Render or another server host."], tips: ["Use Vercel mainly for static/frontend deployments."] },
    },
    productionReadinessScore: 72,
    productionReadinessChecklist: [
      { category: "Config", item: "Environment variables documented", passed: true, recommendation: "Keep real secrets in hosting dashboard only." },
      { category: "Build", item: "Build command detected", passed: usesNode, recommendation: "Confirm npm scripts match deployment target." },
      { category: "Health", item: "Health endpoint", passed: files.some((file) => /health/i.test(file.path + file.content)), recommendation: "Expose a lightweight health endpoint for uptime checks." },
    ],
  };
}

export function runLocalLogAnalysis(logs: string) {
  const lower = logs.toLowerCase();
  const errorType =
    lower.includes("eaddrinuse") || lower.includes("port")
      ? "Port binding error"
      : lower.includes("env") || lower.includes("secret") || lower.includes("key")
        ? "Environment configuration error"
        : lower.includes("database") || lower.includes("sqlite") || lower.includes("postgres")
          ? "Database runtime error"
          : "Runtime error";

  return {
    rootCause: "Groq is unavailable, so DevAssist generated a local diagnostic from the provided logs.",
    errorType,
    resolutionSteps: [
      "Read the first stack trace line and identify the failing service or command.",
      "Verify required environment variables are present in .env or the hosting dashboard.",
      "Restart the process after configuration changes so runtime values are reloaded.",
      "Run the project checks again and compare the new logs.",
    ],
    recommendedFixCode: "",
  };
}

export function runLocalSecurityAnalysis(files: RepoFile[]): SecurityReport {
  const annotations = scanCodeIssues(files);
  const findings = annotations.map((annotation, index) => ({
    id: `local-security-${index + 1}`,
    category: normalizeSecurityCategory(annotation.category),
    title: annotation.category,
    severity: annotation.severity === "critical" ? "high" as const : "medium" as const,
    description: annotation.comment,
    filePath: annotation.filePath,
    lineNumber: annotation.lineNumber,
    remediation: "Review the highlighted code and replace risky patterns with validated, parameterized, or configuration-driven logic.",
  }));

  return {
    overallRiskScore: Math.min(100, findings.length * 12),
    summary: findings.length
      ? `Local security scan found ${findings.length} potential findings. Groq was unavailable, so results are heuristic.`
      : "Local security scan found no obvious high-risk patterns. Groq was unavailable, so results are heuristic.",
    findings,
    scannedAt: new Date().toISOString(),
    stats: countStats(findings),
  };
}

export function runLocalKnowledgeBaseEngine(files: RepoFile[]) {
  const insight = buildArchitectureInsight(files);
  return {
    folderTree: insight.fileTree,
    dependencyGraph: {
      nodes: insight.manifests.map((path) => ({ id: path, label: path, type: "manifest" })),
      links: [],
    },
    importGraph: {
      nodes: [...new Set(insight.imports.flatMap((entry) => [entry.from, entry.to]))].map((id) => ({ id, label: id })),
      links: insight.imports.map((entry) => ({ source: entry.from, target: entry.to })),
    },
    callGraph: { nodes: [], links: [] },
    architectureGraph: buildLocalArchitectureDiagram(files),
    serviceGraph: {
      nodes: insight.externalServices.map((service) => ({ id: service, label: service, type: "external" })),
      links: [],
    },
    frameworkDetection: { framework: detectFramework(files), confidence: 0.75, filesDetected: insight.keyFiles.map((file) => file.path) },
    languageDetection: [{ language: detectLanguage(files), percentage: 100, filesDetected: files.map((file) => file.path).slice(0, 20) }],
    apiDetection: insight.routes.map((route) => ({ ...route, description: "Detected route", handlerFile: route.file })),
    configurationDetection: insight.keyFiles
      .filter((file) => /config|manifest|deployment/i.test(file.role))
      .map((file) => ({ file: file.path, type: file.role, purpose: "Detected configuration or manifest file" })),
    databaseDetection: { dbType: insight.dataStores.join(", ") || "None detected", detectedFiles: insight.keyFiles.filter((file) => /database|persistence|data/i.test(file.role)).map((file) => file.path) },
    projectSummary: runLocalRepoUnderstanding(files).summary,
    technologyStackSummary: `${detectLanguage(files)} with ${detectFramework(files)}`,
    architectureSummary: "Local architecture summary generated from files, routes, imports, and detected services.",
    notes: [],
  };
}

export function explainLocalFile(files: RepoFile[], filePath: string): string {
  const target = files.find((file) => file.path === filePath);
  if (!target) {
    return "The requested file was not found in this repository.";
  }

  const signals = scanCodeIssues([target]);
  return [
    "Groq is unavailable, so DevAssist generated this local explanation from the file content.",
    "",
    `File: ${filePath}`,
    `Size: ${target.size || target.content.length} bytes`,
    `Detected role: ${detectFramework([target]) || detectLanguage([target])}`,
    "",
    "What this file likely does:",
    summarizeFile(target),
    "",
    signals.length
      ? `Local review noticed ${signals.length} potential issue(s): ${signals.map((signal) => signal.category).join(", ")}.`
      : "Local review did not detect obvious high-risk patterns in this file.",
  ].join("\n");
}

export function answerLocalKnowledgeBaseQuestion(query: string, context: string): string {
  return `Groq is unavailable, so this local answer is based on retrieved project context only.\n\nQuestion: ${query}\n\nRelevant context:\n${context.slice(0, 2500) || "No matching context was found."}`;
}

function summarizeFile(file: RepoFile): string {
  const content = file.content || "";
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  const imports = lines.filter((line) => /^\s*(import|from|require\()/.test(line)).slice(0, 6);
  const declarations = lines.filter((line) => /\b(class|function|const|let|def|public|private|export)\b/.test(line)).slice(0, 8);

  return [
    imports.length ? `Imports/dependencies: ${imports.map((line) => line.trim()).join("; ")}` : "No imports detected in the scanned portion.",
    declarations.length ? `Key declarations: ${declarations.map((line) => line.trim()).join("; ")}` : "No major declarations detected in the scanned portion.",
  ].join("\n");
}

function detectLanguage(files: RepoFile[]): string {
  const counts = new Map<string, number>();
  for (const file of files) {
    const ext = file.path.split(".").pop()?.toLowerCase() || "";
    const language = ({
      ts: "TypeScript",
      tsx: "TypeScript",
      js: "JavaScript",
      jsx: "JavaScript",
      java: "Java",
      py: "Python",
      go: "Go",
      rs: "Rust",
      php: "PHP",
      rb: "Ruby",
    } as Record<string, string>)[ext];
    if (language) counts.set(language, (counts.get(language) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "Unknown";
}

function detectFramework(files: RepoFile[]): string {
  const text = files.map((file) => `${file.path}\n${file.content || ""}`).join("\n").toLowerCase();
  const frameworks = [
    ["Spring Boot", /spring-boot|springframework/],
    ["React", /react|vite/],
    ["FastAPI", /fastapi/],
    ["Express", /express/],
    ["Next.js", /next/],
    ["Django", /django/],
    ["Flask", /flask/],
  ];
  return frameworks.filter(([, pattern]) => (pattern as RegExp).test(text)).map(([name]) => name).join(", ") || "Unknown";
}

function scanCodeIssues(files: RepoFile[]): CodeReviewAnnotation[] {
  const annotations: CodeReviewAnnotation[] = [];
  const checks = [
    { pattern: /(api[_-]?key|secret|token|password)\s*=\s*["'][^"']{8,}/i, category: "Potential hardcoded secret", severity: "critical" as const },
    { pattern: /execute\(\s*f["'`]|SELECT .* \+|query\([^)]*\$\{/i, category: "Potential SQL injection", severity: "critical" as const },
    { pattern: /\beval\s*\(|new Function\s*\(/, category: "Dynamic code execution", severity: "critical" as const },
    { pattern: /dangerouslySetInnerHTML|innerHTML\s*=/, category: "Potential XSS surface", severity: "warning" as const },
    { pattern: /Access-Control-Allow-Origin["']?\s*[:,]\s*["']\*/i, category: "Overly broad CORS", severity: "warning" as const },
  ];

  for (const file of files) {
    const lines = (file.content || "").split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const check of checks) {
        if (check.pattern.test(line)) {
          annotations.push({
            filePath: file.path,
            lineNumber: index + 1,
            severity: check.severity,
            category: check.category,
            comment: `Local static scan detected: ${check.category}.`,
          });
        }
      }
    });
  }

  return annotations.slice(0, 80);
}

function detectEnvVars(files: RepoFile[]) {
  const names = new Set<string>();
  const pattern = /process\.env\.([A-Z0-9_]+)|os\.getenv\(["']([A-Z0-9_]+)["']\)|\$\{([A-Z0-9_]+)\}/g;
  for (const file of files) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(file.content || "")) !== null) {
      names.add(match[1] || match[2] || match[3]);
    }
  }
  return [...names].map((name) => ({
    name,
    description: "Detected from source code or configuration.",
    isSensitive: /KEY|SECRET|TOKEN|PASSWORD|PAT/i.test(name),
    category: "runtime",
    recommendedValuePlaceholder: /KEY|SECRET|TOKEN|PASSWORD|PAT/i.test(name) ? "set-in-hosting-dashboard" : "configure-per-environment",
  }));
}

function normalizeSecurityCategory(category: string): SecurityReport["findings"][number]["category"] {
  if (/secret|key|token/i.test(category)) return "secrets";
  if (/sql/i.test(category)) return "sql_injection";
  if (/xss|html/i.test(category)) return "xss";
  if (/cors/i.test(category)) return "cors";
  return "headers";
}

function countStats(findings: SecurityReport["findings"]): SecurityReport["stats"] {
  return findings.reduce(
    (stats, finding) => {
      stats[finding.severity] += 1;
      return stats;
    },
    { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
  );
}

function sanitizeIdentifier(value: string): string {
  return value.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase() || "target";
}
