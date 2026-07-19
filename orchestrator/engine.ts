import { Annotation, END, START, StateGraph, Send } from "@langchain/langgraph";
import { Database, AgentTask, OrchestrationRun, RepoFile, SecurityReport } from "../core/db";
import { config } from "../core/config/env";
import { getDependencyManifestFiles, isDependencyManifestPath, parseDependenciesFromFiles } from "../core/services/dependency-parser";
import { buildArchitecturePromptContext, buildLocalArchitectureDiagram } from "../agents/architecture-inspector";
import { StorageService } from "../core/services/storage.service";
import { logger } from "../core/utils/logger";
import { getGroqPublicError } from "../core/utils/public-errors";
import {
  runLocalCodeReview,
  runLocalDependencyAnalysis,
  runLocalDeployment,
  runLocalDocumentation,
  runLocalPlanning,
  runLocalRepoUnderstanding,
  runLocalSecurityAnalysis,
  runLocalTestGeneration,
} from "../agents/local-analysis";

const GROQ_MODEL_NAME = "llama-3.3-70b-versatile";
const MAX_ORCHESTRATOR_FILES = 24;
const MAX_FILE_CHARS = 5000;
const MAX_TOTAL_CONTEXT_CHARS = 65000;
const AGENT_TIMEOUT_MS = 60000;
const Type = {
  OBJECT: "object",
  ARRAY: "array",
  STRING: "string",
  BOOLEAN: "boolean",
  INTEGER: "integer",
  NUMBER: "number",
} as const;

type TaskDefinition = {
  agentId: string;
  name: string;
  dependencies: string[];
};

const LangGraphWorkflowState = Annotation.Root({
  runId: Annotation<string>,
  taskId: Annotation<string>({
    reducer: (current, update) => update ?? current,
    default: () => "",
  }),
});

// We will build the full graph inside executeRun so we have access to the DB context.
function getLangGraphWorkflowSummary(taskDefinitions: TaskDefinition[]): string {
  const rootCount = taskDefinitions.filter((task) => task.dependencies.length === 0).length;
  const edgeCount = taskDefinitions.reduce((count, task) => count + task.dependencies.length, 0);
  return `[LangGraph] Native workflow compiled with ${taskDefinitions.length} agent nodes, ${rootCount} root nodes, and ${edgeCount} dependency edges.`;
}



type OrchestratorAiClient = {
  models: {
    generateContent(options: any): Promise<{ text?: string }>;
  };
};

function hasConfiguredAiProvider(): boolean {
  return Boolean(config.groqApiKey);
}

function getOrchestratorAi(): OrchestratorAiClient {
  return getGroqCompatibleAi();
}

function getGroqCompatibleAi(): OrchestratorAiClient {
  return {
    models: {
      async generateContent(options: any) {
        const prompt = extractPromptText(options);
        const schema = options?.config?.responseSchema;
        const response = await callGroqJson(prompt, schema);
        return { text: response };
      },
    },
  };
}

function extractPromptText(options: any): string {
  return (options?.contents || [])
    .flatMap((content: any) => content?.parts || [])
    .map((part: any) => part?.text || "")
    .filter(Boolean)
    .join("\n\n");
}

async function callGroqJson(prompt: string, schema: any): Promise<string> {
  const messages = [
    {
      role: "system",
      content: [
        "You are an autonomous DevAssist agent.",
        "Return only valid JSON. Do not include markdown fences or prose outside JSON.",
        schema ? `JSON schema to follow:\n${JSON.stringify(schema)}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
    { role: "user", content: prompt },
  ];

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL_NAME,
        messages,
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (response.ok) {
      const body = await response.json();
      const content = body?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Groq returned an empty response.");
      }
      return content;
    }

    const errorText = await response.text();
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === maxRetries) {
      throw new Error(getGroqPublicError(response.status, errorText));
    }

    const backoff = 750 * attempt + Math.random() * 250;
    await new Promise((resolve) => setTimeout(resolve, backoff));
  }

  throw new Error("Failed to contact Groq API.");
}

// Helper to truncate/format codebase files for LLM prompt context
function getFilesTextSummary(files: RepoFile[]): string {
  if (!files || files.length === 0) return "No files in the repository.";

  let usedChars = 0;
  return files
    .slice()
    .sort((a, b) => scoreFileForContext(a.path) - scoreFileForContext(b.path) || a.path.localeCompare(b.path))
    .slice(0, MAX_ORCHESTRATOR_FILES)
    .map((f) => {
      const remaining = MAX_TOTAL_CONTEXT_CHARS - usedChars;
      if (remaining <= 0) return "";
      const content = (f.content || "").slice(0, Math.min(MAX_FILE_CHARS, remaining));
      usedChars += content.length;
      return `--- File: ${f.path} ---\n${content}${(f.content || "").length > content.length ? "\n[Truncated for orchestrator speed]" : ""}\n`;
    })
    .filter(Boolean)
    .join("\n\n");
}

function scoreFileForContext(filePath: string): number {
  const lower = filePath.toLowerCase();
  if (lower === "readme.md" || isDependencyManifestPath(lower)) return 0;
  if (lower.includes("main.") || lower.includes("app.") || lower.includes("server.") || lower.includes("index.")) return 1;
  if (lower.startsWith("src/") || lower.startsWith("server/") || lower.startsWith("app/")) return 2;
  if (lower.includes("test") || lower.includes("dist/") || lower.includes("build/")) return 5;
  return 3;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)} seconds.`)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}

function normalizeRepoUnderstanding(data: any) {
  const summary = data.summary || data.overallSummary || "";
  return {
    ...data,
    summary,
    resultSummary: summary,
  };
}

function ensureDetailedArchitectureDiagram(diagram: unknown, files: RepoFile[]): string {
  const mermaid = typeof diagram === "string" ? diagram.trim() : "";
  const nodeCount = (mermaid.match(/\w+\s*(?:\[|\()/g) || []).length;
  const edgeCount = (mermaid.match(/-->|---|==>|-.->/g) || []).length;
  const hasClasses = /\bclassDef\b|:::/i.test(mermaid);

  if (mermaid && nodeCount >= 8 && edgeCount >= 6 && hasClasses) {
    return mermaid;
  }

  return buildLocalArchitectureDiagram(files);
}

function normalizeDependencyOutput(data: any) {
  const dependencies = (data.dependencies || []).map((dep: any) => ({
    name: String(dep.name || "unknown"),
    current: String(dep.current || dep.version || "unknown"),
    latest: String(dep.latest || dep.recommended || "unknown"),
    outdated: Boolean(dep.outdated),
    vulnerable: Boolean(dep.vulnerable ?? dep.hasVulnerability),
    vulnerabilityDetails: dep.vulnerabilityDetails || dep.details || "",
  }));

  return {
    dependencies,
    vulnerabilityCount: dependencies.filter((dep: any) => dep.vulnerable).length,
  };
}

function normalizeCodeReviewOutput(data: any) {
  return {
    ...data,
    resultSummary: data.resultSummary || data.summary || "Code review completed.",
    annotations: data.annotations || [],
  };
}

function normalizeTestOutput(data: any) {
  if (typeof data.testsCode === "string") {
    return data;
  }

  const tests = Array.isArray(data.tests) ? data.tests : [];
  const testsCode = tests
    .map((test: any) => {
      const header = [test.filePath, test.framework].filter(Boolean).join(" - ");
      return `${header ? `// ${header}\n` : ""}${test.testCode || ""}`.trim();
    })
    .filter(Boolean)
    .join("\n\n");

  return {
    ...data,
    testsCode,
  };
}

function normalizeDeploymentOutput(data: any) {
  return {
    dockerfileContent: data.dockerfileContent || data.dockerfile || "",
    dockerComposeContent: data.dockerComposeContent || data.dockerCompose || "",
    githubActionsContent: data.githubActionsContent || data.ciWorkflow || "",
    vercelConfig: data.vercelConfig || "",
    renderConfig: data.renderConfig || "",
    detectedEnvVars: data.detectedEnvVars || [],
    compatibilityReport: data.compatibilityReport || {
      render: { compatible: false, issues: ["Not assessed by this orchestration run."], tips: [] },
      vercel: { compatible: false, issues: ["Not assessed by this orchestration run."], tips: [] },
    },
    productionReadinessScore: data.productionReadinessScore ?? 0,
    productionReadinessChecklist: data.productionReadinessChecklist || [],
    instructions: data.instructions || "",
  };
}

function normalizeSecuritySeverity(severity: string): "info" | "low" | "medium" | "high" | "critical" {
  const normalized = String(severity || "").toLowerCase();
  if (normalized === "critical" || normalized === "high" || normalized === "medium" || normalized === "low" || normalized === "info") {
    return normalized;
  }
  if (normalized === "warning") return "medium";
  return "info";
}

function normalizeSecurityCategory(category: string): SecurityReport["findings"][number]["category"] {
  const allowed = new Set([
    "secrets",
    "api_keys",
    "jwt",
    "authentication",
    "authorization",
    "sql_injection",
    "xss",
    "csrf",
    "ssrf",
    "dependency",
    "env_vars",
    "cors",
    "headers",
  ]);
  const normalized = String(category || "").toLowerCase().replace(/[\s-]+/g, "_");
  return (allowed.has(normalized) ? normalized : "headers") as SecurityReport["findings"][number]["category"];
}

function normalizeSecurityOutput(data: any): SecurityReport {
  if (typeof data.overallRiskScore === "number" && Array.isArray(data.findings)) {
    const findings = data.findings.map((finding: any, idx: number) => ({
      id: finding.id || `orchestrator-security-${idx + 1}`,
      category: normalizeSecurityCategory(finding.category),
      title: finding.title || "Security finding",
      severity: normalizeSecuritySeverity(finding.severity),
      description: finding.description || "",
      filePath: finding.filePath,
      lineNumber: finding.lineNumber,
      snippet: finding.snippet,
      remediation: finding.remediation || "Review and remediate this finding.",
    }));

    return {
      ...data,
      findings,
      scannedAt: data.scannedAt || new Date().toISOString(),
      stats: data.stats || countSecurityStats(findings),
    };
  }

  const findings = (data.vulnerabilities || []).map((vuln: any, idx: number) => {
    const severity = normalizeSecuritySeverity(vuln.severity);
    return {
      id: vuln.id || `orchestrator-security-${idx + 1}`,
      category: normalizeSecurityCategory(vuln.category || vuln.vulnerabilityType),
      title: vuln.title || vuln.vulnerabilityType || "Security finding",
      severity,
      description: vuln.description || vuln.comment || "",
      filePath: vuln.filePath,
      lineNumber: vuln.lineNumber,
      snippet: vuln.snippet,
      remediation: vuln.remediation || "Review and remediate this finding.",
    };
  });

  const riskScore =
    typeof data.securityScore === "number"
      ? Math.max(0, Math.min(100, 100 - data.securityScore))
      : 0;

  return {
    overallRiskScore: riskScore,
    summary: data.summary || `Security audit completed with ${findings.length} findings.`,
    findings,
    scannedAt: new Date().toISOString(),
    stats: countSecurityStats(findings),
  };
}

function countSecurityStats(findings: SecurityReport["findings"]): SecurityReport["stats"] {
  return findings.reduce(
    (acc, finding) => {
      acc[finding.severity] += 1;
      return acc;
    },
    { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
  );
}

// ==========================================
// 10 ISOLATED AGENT DEFINITIONS
// ==========================================

export interface BaseAgent {
  id: string;
  name: string;
  description: string;
  execute(files: RepoFile[], inputs: any, log: (msg: string) => void): Promise<any>;
}

// 1. Repository Understanding Agent
export const repoUnderstandingAgent: BaseAgent = {
  id: "repo_understanding",
  name: "Repository Understanding Agent",
  description: "Analyzes folder structure and codebase to detect the primary language, framework, and architecture overview.",
  async execute(files, inputs, log) {
    log("Scanning repository files...");
    const fileSummary = getFilesTextSummary(files);
    log(`Sending ${files.length} files to Groq for repository analysis...`);

    const ai = getOrchestratorAi();
    const response = await ai.models.generateContent({
      model: GROQ_MODEL_NAME,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are the Repository Understanding Agent. Analyze this repository's codebase and provide a structured summary.
Identify the primary programming language and framework. Explain the repository purpose and architectural style.

Repository Codebase:
${fileSummary}
`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            language: { type: Type.STRING, description: "The primary programming language (e.g. TypeScript, Python, etc.)" },
            framework: { type: Type.STRING, description: "The main framework detected (e.g. FastAPI, React, Express, etc.)" },
            architectureStyle: { type: Type.STRING, description: "Identified architectural style (e.g. MVC, Monolith, Microservices, Client-Only SPA)" },
            keyFiles: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of the most critical file paths in the codebase",
            },
            overallSummary: { type: Type.STRING, description: "A detailed natural-language overview of the folder structure and codebase purpose." },
          },
          required: ["language", "framework", "architectureStyle", "keyFiles", "overallSummary"],
        },
      },
    });

    const text = response.text?.trim() || "{}";
    log("Parsing structured JSON response...");
    return normalizeRepoUnderstanding(JSON.parse(text));
  },
};

// 2. Architecture Analyzer
export const architectureAnalyzer: BaseAgent = {
  id: "architecture_analyzer",
  name: "Architecture Analyzer",
  description: "Reviews components, data flows, and creates a clear, valid Mermaid diagram showing relations.",
  async execute(files, inputs, log) {
    const understanding = inputs.repo_understanding || {};
    log(`Analyzing code architecture. Found primary language: ${understanding.language || "Unknown"}, framework: ${understanding.framework || "Unknown"}`);
    
    const fileSummary = getFilesTextSummary(files);
    const architectureSignals = buildArchitecturePromptContext(files);
    const ai = getOrchestratorAi();
    const response = await ai.models.generateContent({
      model: GROQ_MODEL_NAME,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are the Architecture Analyzer Agent.
Review components, module boundaries, data flows, and structure. Generate an enterprise-grade layered High-Level System Architecture Mermaid flowchart of this codebase.
Use the repository understanding context provided below.

Mermaid rules for mermaidDiagram:
- Return only Mermaid code, no markdown fence.
- Start with this exact Mermaid init block (must use double quotes for valid JSON):
%%{init: {"theme": "base", "themeVariables": { "background": "#FFFFFF", "primaryColor": "#FFFFFF", "secondaryColor": "#FFFFFF", "tertiaryColor": "#FFFFFF", "clusterBkg": "#FFFFFF", "clusterBorder": "#CBD5E1", "mainBkg": "#FFFFFF", "nodeBorder": "#CBD5E1", "lineColor": "#64748B", "fontFamily": "Inter", "fontSize": "14px", "textColor": "#1E293B", "edgeLabelBackground": "#FFFFFF"}}}%%
- Use a Top-to-Bottom (TB) layout (flowchart TB). Do NOT create a long horizontal diagram.
- Separate every layer using Mermaid subgraphs. Every layer must have a clear title.
- Maintain equal spacing between layers, minimize edge crossings, keep the diagram symmetrical, and avoid unnecessary arrows.
- Every node must contain:
    - Component Name (e.g. React Frontend)
    - 2-3 short bullet points of responsibilities
- USE HTML LABELS FOR EXACT STYLING: You MUST use <br/> for line breaks and wrap the responsibilities in <small> tags.
  Example format: API["Backend API<br/><small>Handles routing<br/>Business logic</small>"] 
  Use simple node ids (e.g. WEB, API, DB).
- Use classDef for visual distinction and apply them (e.g. :::PresentationLayer). Define these classes:
  classDef PresentationLayer fill:#FFFFFF,stroke:#2563EB,stroke-width:2px,color:#1E293B
  classDef BackendServices fill:#FFFFFF,stroke:#16A34A,stroke-width:2px,color:#1E293B
  classDef AILayer fill:#FFFFFF,stroke:#9333EA,stroke-width:2px,color:#1E293B
  classDef RAGPipeline fill:#FFFFFF,stroke:#6366F1,stroke-width:2px,color:#1E293B
  classDef DatabaseLayer fill:#FFFFFF,stroke:#F97316,stroke-width:2px,color:#1E293B
  classDef ExternalServices fill:#FFFFFF,stroke:#64748B,stroke-width:2px,color:#1E293B
  classDef DefaultNode fill:#FFFFFF,stroke:#CBD5E1,stroke-width:2px,color:#1E293B
- DO NOT use Mermaid's default grey backgrounds, grey-filled subgraphs, or dark grey rectangles. The overall canvas must be pure white (#FFFFFF), subgraphs transparent or white, with only thin colored borders.
- Structure into layers like Users -> Presentation Layer -> Backend Services -> Data Layer -> External Services (adapt AI/RAG layers only if present).
- Derive components from THIS repository's real files, routes, frameworks, databases, and external services. Do not reuse a generic template.
- Avoid Mermaid grey backgrounds, raw HTML, markdown fences, file-path-heavy labels, unescaped quotes, and parentheses in labels.

Repository Understanding Context:
${JSON.stringify(understanding, null, 2)}

Extracted Architecture Signals:
${architectureSignals}

Repository Codebase:
${fileSummary}
`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            designPattern: { type: Type.STRING, description: "Primary design patterns found (e.g., Repository, Singleton, Pub/Sub)" },
            dataFlow: { type: Type.STRING, description: "Step-by-step description of how data flows through the application" },
            mermaidDiagram: { type: Type.STRING, description: "A valid enterprise TB Mermaid High-Level System Architecture with subgraph layers, white theme init block, classDef styling, short quoted labels, and real repository layers/services." },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Strengths of this architecture" },
            bottlenecks: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Potential architectural bottlenecks or scalability risks" },
          },
          required: ["designPattern", "dataFlow", "mermaidDiagram", "strengths", "bottlenecks"],
        },
      },
    });

    const text = response.text?.trim() || "{}";
    log("Architecture analysis completed successfully.");
    const parsed = JSON.parse(text);
    return {
      ...parsed,
      mermaidDiagram: ensureDetailedArchitectureDiagram(parsed.mermaidDiagram, files),
    };
  },
};

// 3. Dependency Analyzer
export const dependencyAnalyzer: BaseAgent = {
  id: "dependency_analyzer",
  name: "Dependency Analyzer",
  description: "Scans dependency manifests to audit packages for outdated versions and known vulnerabilities.",
  async execute(files, inputs, log) {
    log("Identifying manifest files in repository...");
    const manifests = getDependencyManifestFiles(files);
    const parsedDependencies = parseDependenciesFromFiles(files);

    if (manifests.length === 0) {
      log("No standard manifest files found. Creating empty report.");
      return { dependencies: [], vulnerabilityCount: 0 };
    }

    log(`Found ${manifests.length} manifest files and ${parsedDependencies.length} locally parsed dependencies. Auditing libraries...`);
    const manifestSummary = getFilesTextSummary(manifests);

    if (!hasConfiguredAiProvider()) {
      log("No AI provider configured. Returning locally parsed dependency list.");
      return { dependencies: parsedDependencies, vulnerabilityCount: 0 };
    }

    const ai = getOrchestratorAi();
    const response = await ai.models.generateContent({
      model: GROQ_MODEL_NAME,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are the Dependency Analyzer Agent. Parse these package manifests.
Cross-reference them against modern package versions and check if any are outdated or have known security vulnerabilities (like CVEs, prototype pollution, SQL injection dependencies, or memory corruption).

Manifest Files:
${manifestSummary}

Locally Parsed Dependencies:
${JSON.stringify(parsedDependencies, null, 2)}
`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            dependencies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Name of the package" },
                  current: { type: Type.STRING, description: "Current declared version constraint" },
                  latest: { type: Type.STRING, description: "Latest stable version available" },
                  outdated: { type: Type.BOOLEAN, description: "Whether the declared version is outdated" },
                  vulnerable: { type: Type.BOOLEAN, description: "Whether there are known security advisories" },
                  vulnerabilityDetails: { type: Type.STRING, description: "If vulnerable/outdated, describe why, listing CVE or upgrade suggestions." },
                },
                required: ["name", "current", "latest", "outdated", "vulnerable"],
              },
            },
            vulnerabilityCount: { type: Type.INTEGER, description: "Total count of dependencies flagged with vulnerabilities" },
          },
          required: ["dependencies", "vulnerabilityCount"],
        },
      },
    });

    const text = response.text?.trim() || "{}";
    const data = JSON.parse(text);
    const normalized = normalizeDependencyOutput(data);
    if (normalized.dependencies.length === 0 && parsedDependencies.length > 0) {
      log("AI returned no dependencies. Falling back to locally parsed manifest dependencies.");
      return { dependencies: parsedDependencies, vulnerabilityCount: 0 };
    }
    log(`Audited ${normalized.dependencies.length} packages. Found ${normalized.vulnerabilityCount} security warnings.`);
    return normalized;
  },
};

// 4. Planning Agent
export const planningAgent: BaseAgent = {
  id: "planning",
  name: "Planning Agent",
  description: "Breaks down a feature ticket or user request into a step-by-step ordered list of development subtasks.",
  async execute(files, inputs, log) {
    const userPrompt = inputs.userInput || "Refactor code and improve general structure.";
    const understanding = inputs.repo_understanding || {};
    log(`Planning tasks for feature: "${userPrompt}"`);

    const fileSummary = getFilesTextSummary(files);
    const ai = getOrchestratorAi();
    const response = await ai.models.generateContent({
      model: GROQ_MODEL_NAME,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are the Planning Agent. Break down the following user feature request/ticket based on the existing codebase files.
Create an ordered development task list with estimated complexity (S, M, L), detailed sub-tasks, and file paths to modify.

User Feature Request:
${userPrompt}

Existing Codebase Understanding:
${JSON.stringify(understanding, null, 2)}

Codebase Details:
${fileSummary}
`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            featureTitle: { type: Type.STRING, description: "High level title of the feature being planned" },
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "Task ID (e.g. task-1, task-2)" },
                  title: { type: Type.STRING, description: "Brief title of the step" },
                  complexity: { type: Type.STRING, description: "Complexity: S, M, or L" },
                  description: { type: Type.STRING, description: "Detailed description of implementation details and edits required" },
                  filesToModify: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific file paths that need edits" },
                },
                required: ["id", "title", "complexity", "description", "filesToModify"],
              },
            },
            architecturalImpact: { type: Type.STRING, description: "Short summary of how this change impacts existing services, db, or endpoints" },
          },
          required: ["featureTitle", "tasks", "architecturalImpact"],
        },
      },
    });

    const text = response.text?.trim() || "{}";
    const data = JSON.parse(text);
    log(`Planning complete! Created feature "${data.featureTitle}" with ${data.tasks.length} structured development tasks.`);
    return data;
  },
};

// 5. Security Agent
export const securityAgent: BaseAgent = {
  id: "security_agent",
  name: "Security Agent",
  description: "Scans files for logic/OWASP vulnerabilities (SQL Injection, CSRF, secrets exposure) based on architecture and dependency checks.",
  async execute(files, inputs, log) {
    const arch = inputs.architecture_analyzer || {};
    const deps = inputs.dependency_analyzer || {};
    log("Auditing codebase for security issues, checking authentication, data sanitation, and secrets...");

    const fileSummary = getFilesTextSummary(files);
    const ai = getOrchestratorAi();
    const response = await ai.models.generateContent({
      model: GROQ_MODEL_NAME,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are the Security Auditor Agent.
Examine this repository for OWASP Top 10 vulnerabilities (XSS, SQLi, CSRF, broken auth, insecure direct object references, or sensitive data exposure) and hardcoded secrets.
Incorporate structural context and dependency vulnerabilities provided below.

Architecture Context:
${JSON.stringify(arch, null, 2)}

Vulnerable Dependencies Checked:
${JSON.stringify(deps, null, 2)}

Codebase:
${fileSummary}
`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            findings: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  category: { type: Type.STRING, description: "One of: secrets, api_keys, jwt, authentication, authorization, sql_injection, xss, csrf, ssrf, dependency, env_vars, cors, headers" },
                  title: { type: Type.STRING },
                  filePath: { type: Type.STRING, description: "Target file containing the issue" },
                  lineNumber: { type: Type.INTEGER, description: "Estimated line number" },
                  severity: { type: Type.STRING, description: "Severity level: info, low, medium, high, or critical" },
                  description: { type: Type.STRING, description: "Explanation of why this is a risk and how a malicious user can exploit it" },
                  snippet: { type: Type.STRING, description: "Short snippet of problematic code, if applicable" },
                  remediation: { type: Type.STRING, description: "Remedial code snippet or fix guidelines" },
                },
                required: ["id", "category", "title", "severity", "description", "remediation"],
              },
            },
            overallRiskScore: { type: Type.INTEGER, description: "Overall security risk score (0 = safe, 100 = highly vulnerable)" },
            summary: { type: Type.STRING, description: "Executive security summary" },
            stats: {
              type: Type.OBJECT,
              properties: {
                critical: { type: Type.INTEGER },
                high: { type: Type.INTEGER },
                medium: { type: Type.INTEGER },
                low: { type: Type.INTEGER },
                info: { type: Type.INTEGER },
              },
              required: ["critical", "high", "medium", "low", "info"],
            },
          },
          required: ["overallRiskScore", "summary", "findings", "stats"],
        },
      },
    });

    const text = response.text?.trim() || "{}";
    const data = normalizeSecurityOutput(JSON.parse(text));
    log(`Security audit complete. Risk score: ${data.overallRiskScore}/100. Identified ${data.findings.length} findings.`);
    return data;
  },
};

// 6. Code Review Agent
export const codeReviewAgent: BaseAgent = {
  id: "code_review",
  name: "Code Review Agent",
  description: "Conducts clean, line-by-line static analysis for logic bugs, styling errors, performance issues, and missing error catchers.",
  async execute(files, inputs, log) {
    const plan = inputs.planning || {};
    log("Conducting a deep static code review focusing on style, structure, performance, and best practices...");

    const fileSummary = getFilesTextSummary(files);
    const ai = getOrchestratorAi();
    const response = await ai.models.generateContent({
      model: GROQ_MODEL_NAME,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are the Code Review Agent.
Audit this codebase for quality issues, structural errors, styling consistency, missing exceptions, or sluggish database/network queries.
Focus particularly on the files planned for modification if a plan is supplied.

Feature/Refactor Plan Reference:
${JSON.stringify(plan, null, 2)}

Codebase:
${fileSummary}
`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            qualityScore: { type: Type.INTEGER, description: "Code quality score from 0 to 100" },
            summary: { type: Type.STRING, description: "General summary of code quality and styling standard" },
            annotations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  filePath: { type: Type.STRING, description: "The file path containing the issue" },
                  lineNumber: { type: Type.INTEGER, description: "Approximate line number" },
                  severity: { type: Type.STRING, description: "Severity: info, warning, critical" },
                  category: { type: Type.STRING, description: "Category: Bug, Style, Performance, Logic" },
                  comment: { type: Type.STRING, description: "Detailed description of the issue and how to resolve it" },
                },
                required: ["filePath", "lineNumber", "severity", "category", "comment"],
              },
            },
          },
          required: ["qualityScore", "summary", "annotations"],
        },
      },
    });

    const text = response.text?.trim() || "{}";
    const data = normalizeCodeReviewOutput(JSON.parse(text));
    log(`Code review complete. Quality score: ${data.qualityScore}/100. Found ${data.annotations.length} improvement annotations.`);
    return data;
  },
};

// 7. Documentation Agent
export const documentationAgent: BaseAgent = {
  id: "documentation_writer",
  name: "Documentation Agent",
  description: "Drafts comprehensive developer guides, list of API routes, and a production-ready README.md file.",
  async execute(files, inputs, log) {
    const understanding = inputs.repo_understanding || {};
    const arch = inputs.architecture_analyzer || {};
    log("Assembling technical documentation for the codebase. Generating standard Markdown documentation...");

    const fileSummary = getFilesTextSummary(files);
    const ai = getOrchestratorAi();
    const response = await ai.models.generateContent({
      model: GROQ_MODEL_NAME,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are the Documentation Writer Agent. Write technical documentation for this repository.
Create a highly professional README.md markdown text, a clean developer setup guide, and an API/component reference guide.

Repository Overview:
${JSON.stringify(understanding, null, 2)}

Architecture Overview:
${JSON.stringify(arch, null, 2)}

Codebase:
${fileSummary}
`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            readmeMarkdown: { type: Type.STRING, description: "Comprehensive rich Markdown README text with headers, badges, and codeblocks" },
            setupGuide: { type: Type.STRING, description: "Step-by-step instructions to get the project building, running, and configuring secrets locally" },
            apiReference: { type: Type.STRING, description: "Quick API reference table listing endpoints or core React/Node modules and functions" },
          },
          required: ["readmeMarkdown", "setupGuide", "apiReference"],
        },
      },
    });

    const text = response.text?.trim() || "{}";
    log("Documentation generated successfully.");
    return JSON.parse(text);
  },
};

// 8. Test Generator
export const testGenerator: BaseAgent = {
  id: "test_generator",
  name: "Test Generator",
  description: "Formulates a thorough testing strategy and produces fully copy-pasteable test specs with mocks and setup fixtures.",
  async execute(files, inputs, log) {
    const plan = inputs.planning || {};
    const review = inputs.code_review || {};
    log("Drafting automated tests. Generating mock tests based on code review suggestions and feature requirements...");

    const fileSummary = getFilesTextSummary(files);
    const ai = getOrchestratorAi();
    const response = await ai.models.generateContent({
      model: GROQ_MODEL_NAME,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are the Test Generator Agent.
Create comprehensive unit/integration test specifications for the key business logic in this codebase.
Analyze the review feedback and feature target modifications below to structure mock context and test assertions.

Task/Feature Targets:
${JSON.stringify(plan, null, 2)}

Code Review Annotations:
${JSON.stringify(review, null, 2)}

Codebase:
${fileSummary}
`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            testStrategy: { type: Type.STRING, description: "Testing strategy, tooling recommended (Jest, Vitest, Pytest), and coverage milestones" },
            testsCode: { type: Type.STRING, description: "Full copy-pasteable test suite code. Include file path comments when multiple files are needed." },
          },
          required: ["testStrategy", "testsCode"],
        },
      },
    });

    const text = response.text?.trim() || "{}";
    const data = normalizeTestOutput(JSON.parse(text));
    log(`Generated test suite. Strategy planned: ${(data.testStrategy || "").substring(0, 100)}...`);
    return data;
  },
};

// 9. Deployment Agent
export const deploymentAgent: BaseAgent = {
  id: "deployment_helper",
  name: "Deployment Agent",
  description: "Generates multi-stage Dockerfiles, Docker Compose files, and automated GitHub Actions CI pipelines.",
  async execute(files, inputs, log) {
    const understanding = inputs.repo_understanding || {};
    const deps = inputs.dependency_analyzer || {};
    log("Analyzing runtime dependencies to configure multi-stage Docker builds and automated CI workflows...");

    const fileSummary = getFilesTextSummary(files);
    const ai = getOrchestratorAi();
    const response = await ai.models.generateContent({
      model: GROQ_MODEL_NAME,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are the Deployment Agent. Generate production-grade deployment scripts.
Analyze the codebase stack, dependencies, and entrypoint to draft a multi-stage Dockerfile, docker-compose.yml configuration, and a GitHub Actions continuous integration workflow.

Stack Context:
${JSON.stringify(understanding, null, 2)}

Dependencies:
${JSON.stringify(deps, null, 2)}

Codebase:
${fileSummary}
`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            dockerfileContent: { type: Type.STRING, description: "Optimized Dockerfile content" },
            dockerComposeContent: { type: Type.STRING, description: "docker-compose.yml content supporting the application and databases" },
            githubActionsContent: { type: Type.STRING, description: "Complete GitHub Actions YAML workflow for building, linting, and running tests" },
            vercelConfig: { type: Type.STRING, description: "vercel.json content, if applicable" },
            renderConfig: { type: Type.STRING, description: "render.yaml content, if applicable" },
            detectedEnvVars: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  isSensitive: { type: Type.BOOLEAN },
                  category: { type: Type.STRING },
                  recommendedValuePlaceholder: { type: Type.STRING },
                },
                required: ["name", "description", "isSensitive", "category"],
              },
            },
            instructions: { type: Type.STRING, description: "Step-by-step instructions to deploy in production" },
          },
          required: ["dockerfileContent", "dockerComposeContent", "githubActionsContent", "instructions"],
        },
      },
    });

    const text = response.text?.trim() || "{}";
    log("Deployment configurations compiled successfully.");
    return normalizeDeploymentOutput(JSON.parse(text));
  },
};

// 10. Release Notes Agent
export const releaseNotesAgent: BaseAgent = {
  id: "release_notes_generator",
  name: "Release Notes Agent",
  description: "Synthesizes the output of all other agents into a unified release summary, changelog, and developer review.",
  async execute(files, inputs, log) {
    log("Synthesizing outputs of prior agents to compile comprehensive, high-quality release notes...");
    
    const summaryPayload = {
      featureTitle: inputs.planning?.featureTitle || "Core Upgrade",
      plannedTasks: (inputs.planning?.tasks || []).map((t: any) => ({ title: t.title, complexity: t.complexity })),
      vulnerabilitiesFound: (inputs.security_agent?.findings || []).length,
      qualityScore: inputs.code_review?.qualityScore,
      dependenciesAudited: (inputs.dependency_analyzer?.dependencies || []).length,
      testCoverageProposed: inputs.test_generator?.testStrategy,
    };

    const ai = getOrchestratorAi();
    const response = await ai.models.generateContent({
      model: GROQ_MODEL_NAME,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are the Release Notes Agent. Synthesize the findings and results of the previous agent analyses below to generate professional release notes.
Write a comprehensive markdown changelog, list key improvements, and summarize the safety and test quality audits.

Pipeline Execution Results:
${JSON.stringify(summaryPayload, null, 2)}
`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            version: { type: Type.STRING, description: "Generated release semver version code (e.g. v1.1.0)" },
            changelogMarkdown: { type: Type.STRING, description: "Rich markdown changelog with lists of completed features, bugs addressed, and configuration changes" },
            majorImprovements: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Key features or structural benefits of this release" },
            securityAuditsSummary: { type: Type.STRING, description: "A high-level summary of the safety check rating, vulnerabilities detected, and actions taken" },
            testingStatusSummary: { type: Type.STRING, description: "A summary of the generated unit test suite and proposed execution roadmap" },
          },
          required: ["version", "changelogMarkdown", "majorImprovements", "securityAuditsSummary", "testingStatusSummary"],
        },
      },
    });

    const text = response.text?.trim() || "{}";
    log("Release notes compiled and structured successfully.");
    return JSON.parse(text);
  },
};

// Registry of available agents
export const AGENTS_REGISTRY: Record<string, BaseAgent> = {
  [repoUnderstandingAgent.id]: repoUnderstandingAgent,
  [architectureAnalyzer.id]: architectureAnalyzer,
  [dependencyAnalyzer.id]: dependencyAnalyzer,
  [planningAgent.id]: planningAgent,
  [securityAgent.id]: securityAgent,
  [codeReviewAgent.id]: codeReviewAgent,
  [documentationAgent.id]: documentationAgent,
  [testGenerator.id]: testGenerator,
  [deploymentAgent.id]: deploymentAgent,
  [releaseNotesAgent.id]: releaseNotesAgent,
};

// ==========================================
// NATIVE LANGGRAPH ORCHESTRATION GRAPH
// ==========================================

async function routeTasksNode(state: { runId: string, taskId: string }) {
  const run = Database.getOrchestration(state.runId);
  if (!run) return {};

  const tasks = run.tasks;
  const totalCount = tasks.length;
  const completedCount = tasks.filter(t => t.status === "completed").length;
  const failedCount = tasks.filter(t => t.status === "failed").length;
  const cancelledCount = tasks.filter(t => t.status === "cancelled").length;

  const progress = Math.min(Math.round(((completedCount + failedCount + cancelledCount) / totalCount) * 100), 100);
  Database.updateOrchestration(state.runId, { progress });

  if (completedCount + failedCount + cancelledCount === totalCount) {
    const finalStatus = failedCount > 0 ? "failed" : "completed";
    Database.updateOrchestration(state.runId, {
      status: finalStatus,
      completedAt: new Date().toISOString(),
    });
    const repo = Database.getRepository(run.repositoryId);
    if (repo) {
      Database.createNotification(
        repo.userId,
        `Multi-Agent Orchestration ${finalStatus.toUpperCase()}: ${completedCount}/${totalCount} completed successfully on "${repo.name}"`,
        finalStatus === "completed" ? "success" : "error",
        `/repository/${repo.id}?tab=orchestrator`
      );
    }
  }

  return {};
}

async function executeTaskNode(state: { runId: string, taskId: string }) {
  if (!state.taskId) return {};

  const run = Database.getOrchestration(state.runId);
  if (!run) return {};
  const repo = Database.getRepository(run.repositoryId);
  if (!repo) return {};
  
  const files = await StorageService.getFiles(repo.id, repo.files);
  const task = run.tasks.find(t => t.id === state.taskId);
  if (task) {
    await executeSingleTaskWithRetry(state.runId, task, files, run.userInput);
  }
  return {};
}

const orchestratorGraph = new StateGraph(LangGraphWorkflowState)
  .addNode("route_tasks", routeTasksNode)
  .addNode("execute_task", executeTaskNode)
  .addConditionalEdges("route_tasks", (state) => {
    const run = Database.getOrchestration(state.runId);
    if (!run || run.status === "cancelled" || run.status === "failed") return END;

    const tasks = run.tasks;
    const completedCount = tasks.filter(t => t.status === "completed").length;
    const failedCount = tasks.filter(t => t.status === "failed").length;
    const cancelledCount = tasks.filter(t => t.status === "cancelled").length;
    if (completedCount + failedCount + cancelledCount === tasks.length) return END;

    const candidateTasks = tasks.filter((task) => {
      if (task.status !== "queued") return false;
      return task.dependencies.every((depAgentId) => {
        const depTask = tasks.find(t => t.agentId === depAgentId);
        return depTask && depTask.status === "completed";
      });
    });

    const runningCount = tasks.filter(t => t.status === "running").length;
    if (candidateTasks.length === 0) {
      if (runningCount === 0) {
        logToAllTasks(state.runId, "[System Error] Scheduling deadlock detected. Downstream tasks cancelled.");
        cancelQueuedTasks(state.runId, "Scheduling deadlock (dependencies failed or cancelled)");
        Database.updateOrchestration(state.runId, {
          status: "failed",
          progress: 100,
          completedAt: new Date().toISOString(),
        });
      }
      return END;
    }

    logger.info(`LangGraph scheduling parallel execution for ${candidateTasks.length} agents...`);
    return candidateTasks.map(task => new Send("execute_task", { runId: state.runId, taskId: task.id }));
  })
  .addEdge("execute_task", "route_tasks")
  .addEdge(START, "route_tasks");

const compiledOrchestratorGraph = orchestratorGraph.compile();

// ==========================================
// CENTRAL ORCHESTRATOR ENGINE
// ==========================================

export class Orchestrator {
  // Track active orchestration runs for cancellation
  private static activeRuns = new Map<string, boolean>();

  public static canExecuteAi(): boolean {
    return hasConfiguredAiProvider();
  }

  /**
   * Initializes and schedules a new Orchestration run.
   */
  public static initRun(repositoryId: string, userId: string, userInput?: string): OrchestrationRun {
    // Define the 10 tasks in the DAG with their dependency hierarchies
    const taskDefinitions: TaskDefinition[] = [
      { agentId: "repo_understanding", name: "Repository Understanding", dependencies: [] },
      { agentId: "dependency_analyzer", name: "Dependency Analyzer", dependencies: [] },
      { agentId: "architecture_analyzer", name: "Architecture Analyzer", dependencies: ["repo_understanding"] },
      { agentId: "planning", name: "Planning Agent", dependencies: ["repo_understanding"] },
      { agentId: "security_agent", name: "Security Auditor", dependencies: ["architecture_analyzer", "dependency_analyzer"] },
      { agentId: "code_review", name: "Code Reviewer", dependencies: ["planning"] },
      { agentId: "documentation_writer", name: "Documentation Agent", dependencies: ["repo_understanding", "architecture_analyzer"] },
      { agentId: "test_generator", name: "Test Generator", dependencies: ["planning", "code_review"] },
      { agentId: "deployment_helper", name: "Deployment Helper", dependencies: ["repo_understanding", "dependency_analyzer"] },
      { agentId: "release_notes_generator", name: "Release Notes Compiler", dependencies: [
          "repo_understanding", "dependency_analyzer", "architecture_analyzer", "planning", 
          "security_agent", "code_review", "documentation_writer", "test_generator", "deployment_helper"
        ] 
      },
    ];

    const workflowSummary = getLangGraphWorkflowSummary(taskDefinitions);
    logger.info(workflowSummary);

    const tasks: AgentTask[] = taskDefinitions.map((t, idx) => ({
      id: `task-${idx + 1}`,
      agentId: t.agentId,
      name: t.name,
      status: "queued",
      dependencies: t.dependencies,
      logs: [`[System] Scheduled agent: ${t.name}`, workflowSummary],
      retryCount: 0,
    }));

    return Database.createOrchestration(repositoryId, userId, tasks, userInput);
  }

  /**
   * Cancels a currently running orchestration.
   */
  public static cancelRun(runId: string): void {
    this.activeRuns.set(runId, false);
    const run = Database.getOrchestration(runId);
    if (!run || run.status === "completed" || run.status === "failed" || run.status === "cancelled") {
      return;
    }

    const updatedTasks = run.tasks.map((task) => {
      if (task.status === "running" || task.status === "queued") {
        return {
          ...task,
          status: "cancelled" as const,
          logs: [...task.logs, `[System] Task was cancelled by user.`],
          completedAt: new Date().toISOString(),
        };
      }
      return task;
    });

    Database.updateOrchestration(runId, {
      status: "cancelled",
      tasks: updatedTasks,
      completedAt: new Date().toISOString(),
    });

    Database.createNotification(
      run.userId,
      `Orchestration Run Cancelled for repository`,
      "info",
      `/repository/${run.repositoryId}?tab=orchestrator`
    );
  }

  /**
   * Ensures a queued/running run has a live worker after refreshes or server restarts.
   */
  public static ensureRunExecuting(runId: string): void {
    const run = Database.getOrchestration(runId);
    if (!run || (run.status !== "queued" && run.status !== "running")) {
      return;
    }

    if (!hasConfiguredAiProvider()) {
      this.failRunDueToMissingAiProvider(run);
      return;
    }

    if (this.activeRuns.get(runId)) {
      return;
    }

    this.executeRun(runId).catch((err) => {
      logger.error(`Orchestrator resume failed asynchronously for run: ${runId}`, err);
    });
  }

  /**
   * Core DAG Scheduling & Execution Engine
   */
  public static async executeRun(runId: string): Promise<void> {
    if (this.activeRuns.get(runId)) {
      return;
    }

    const run = Database.getOrchestration(runId);
    if (!run) {
      logger.error(`Orchestration execution failed: run ${runId} not found`);
      return;
    }

    if (!hasConfiguredAiProvider()) {
      this.failRunDueToMissingAiProvider(run);
      return;
    }

    const repo = Database.getRepository(run.repositoryId);
    if (!repo) {
      logger.error(`Orchestration execution failed: repo ${run.repositoryId} not found`);
      Database.updateOrchestration(runId, {
        status: "failed",
        completedAt: new Date().toISOString(),
      });
      return;
    }

    const resumedTasks = run.tasks.map((task) => {
      if (task.status !== "running") {
        return task;
      }
      return {
        ...task,
        status: "queued" as const,
        logs: [...task.logs, "[System] Resuming task after interrupted execution."],
      };
    });

    this.activeRuns.set(runId, true);
    Database.updateOrchestration(runId, {
      status: "running",
      startedAt: run.startedAt || new Date().toISOString(),
      tasks: resumedTasks,
    });

    logger.info(`Started Native LangGraph Orchestrator run: ${runId} for repo: ${repo.name}`);

    try {
      await compiledOrchestratorGraph.invoke({ runId });
    } catch (err: any) {
      logger.error(`Fatal crash in LangGraph Orchestrator engine run ${runId}`, err);
      Database.updateOrchestration(runId, {
        status: "failed",
        completedAt: new Date().toISOString(),
      });
    } finally {
      this.activeRuns.delete(runId);
    }
  }

  private static failRunDueToMissingAiProvider(run: OrchestrationRun): void {
    const message = "AI provider is not configured. Set GROQ_API_KEY in .env and restart the server.";
    const now = new Date().toISOString();
    const tasks = run.tasks.map((task) => {
      if (task.status !== "queued" && task.status !== "running") {
        return task;
      }

      return {
        ...task,
        status: "failed" as const,
        error: message,
        logs: [...task.logs, `[System Error] ${message}`],
        completedAt: now,
      };
    });

    Database.updateOrchestration(run.id, {
      status: "failed",
      progress: 100,
      tasks,
      completedAt: now,
    });
  }
}

/**
 * Executes a single agent task with retry logic and logs persistence.
 */
async function executeSingleTaskWithRetry(
  runId: string,
  task: AgentTask,
  files: RepoFile[],
  userInput?: string
): Promise<void> {
  const maxRetries = 2;
  const agent = AGENTS_REGISTRY[task.agentId];

  if (!agent) {
    updateTaskState(runId, task.id, {
      status: "failed",
      error: `Agent code for '${task.agentId}' is missing in registry.`,
      logs: [`[Error] Agent registry is missing '${task.agentId}'. Task aborted.`],
      completedAt: new Date().toISOString(),
    });
    return;
  }

  // Update state to running
  updateTaskState(runId, task.id, {
    status: "running",
    startedAt: new Date().toISOString(),
    logs: [`[System] Launching ${agent.name}...`, `[System] Executing with isolated state context.`],
  });

  const logFn = (msg: string) => {
    appendTaskLog(runId, task.id, `[${agent.name}] ${msg}`);
  };

  while (task.retryCount < maxRetries) {
    try {
      // Build structured inputs from completed dependency tasks (Agent Communication!)
      const inputs: Record<string, any> = { userInput };
      const currentRun = Database.getOrchestration(runId);
      if (currentRun) {
        currentRun.tasks.forEach((t) => {
          if (t.status === "completed" && t.output) {
            inputs[t.agentId] = t.output;
          }
        });
      }

      // Isolated execution
      const outputJson = await withTimeout(
        agent.execute(files, inputs, logFn),
        AGENT_TIMEOUT_MS,
        agent.name
      );

      // Validate structured output is returned
      if (!outputJson || typeof outputJson !== "object") {
        throw new Error("Agent failed to return structured JSON output.");
      }

      // Complete successfully
      updateTaskState(runId, task.id, {
        status: "completed",
        output: outputJson,
        completedAt: new Date().toISOString(),
        logs: [`[System] Completed task successfully in attempt ${task.retryCount + 1}.`],
      });
      return;
    } catch (err: any) {
      task.retryCount++;
      const errMsg = err?.message || JSON.stringify(err);
      const canUseLocalFallback = shouldCompleteWithLocalFallback(err);
      updateTaskState(runId, task.id, { retryCount: task.retryCount });
      logFn(
        canUseLocalFallback
          ? `[Provider Warning] Attempt ${task.retryCount} used local fallback path: ${errMsg}`
          : `[Error] Attempt ${task.retryCount} failed: ${errMsg}`
      );

      if (canUseLocalFallback) {
        const currentRun = Database.getOrchestration(runId);
        const inputs: Record<string, any> = { userInput };
        currentRun?.tasks.forEach((t) => {
          if (t.status === "completed" && t.output) {
            inputs[t.agentId] = t.output;
          }
        });

        const fallbackOutput = buildLocalAgentOutput(task.agentId, files, inputs, userInput);
        if (fallbackOutput) {
          logFn("[System] Groq is unavailable or rate-limited. Completing this agent with local repository-grounded analysis.");
          updateTaskState(runId, task.id, {
            status: "completed",
            output: fallbackOutput,
            completedAt: new Date().toISOString(),
            logs: [`[System] Completed task with local fallback in attempt ${task.retryCount}.`],
          });
          return;
        }
      }

      if (task.retryCount < maxRetries) {
        const backoff = 500 * task.retryCount + Math.random() * 250;
        logFn(`[System] Retrying in ${Math.round(backoff)}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoff));
      } else {
        // Exhausted retries (Error Recovery)
        logFn(`[Critical Error] Retries exhausted. Task failed.`);
        updateTaskState(runId, task.id, {
          status: "failed",
          error: errMsg,
          completedAt: new Date().toISOString(),
        });
        
        // Propagate failure to all downstream tasks that depend on this agent (Cascade Cancellation)
        cascadeCancelDownstream(runId, task.agentId, errMsg);
      }
    }
  }
}

function shouldCompleteWithLocalFallback(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || "");
  return (
    message.includes("rate limit") ||
    message.includes("429") ||
    message.includes("Could not reach Groq") ||
    message.includes("fetch failed") ||
    message.includes("temporarily unavailable") ||
    message.includes("Groq request failed") ||
    message.includes("Groq rejected") ||
    message.includes("Failed to contact Groq")
  );
}

function buildLocalAgentOutput(
  agentId: string,
  files: RepoFile[],
  inputs: Record<string, any>,
  userInput?: string
): any | null {
  if (agentId === "repo_understanding") {
    return {
      ...runLocalRepoUnderstanding(files),
      architectureStyle: "Layered architecture inferred from repository files",
      keyFiles: files.slice(0, 12).map((file) => file.path),
    };
  }

  if (agentId === "dependency_analyzer") {
    const result = runLocalDependencyAnalysis(files);
    return {
      dependencies: result.dependencies,
      vulnerabilityCount: result.dependencies.filter((dep) => dep.vulnerable).length,
    };
  }

  if (agentId === "architecture_analyzer") {
    return {
      designPattern: "Layered architecture",
      dataFlow: "Requests enter through the presentation/API layer, flow through service modules, and persist analysis or domain data in the detected storage layer.",
      mermaidDiagram: buildLocalArchitectureDiagram(files),
      strengths: ["Repository-grounded layer separation", "Detected services and storage are represented directly"],
      bottlenecks: ["External AI/provider calls should remain resilient with retries and local fallbacks"],
    };
  }

  if (agentId === "planning") {
    const result = runLocalPlanning(files, userInput || "Improve this codebase");
    return {
      featureTitle: userInput || "Local execution plan",
      tasks: result.tasks.map((task, index) => ({
        id: `task-${index + 1}`,
        title: task.title,
        complexity: task.complexity,
        description: task.description,
        filesToModify: "filesToModify" in task && Array.isArray(task.filesToModify) ? task.filesToModify : [],
      })),
      architecturalImpact: "Local fallback plan generated from detected repository structure.",
    };
  }

  if (agentId === "security_agent") {
    return runLocalSecurityAnalysis(files);
  }

  if (agentId === "code_review") {
    const result = runLocalCodeReview(files);
    return {
      qualityScore: result.annotations.length ? 72 : 86,
      summary: result.resultSummary,
      resultSummary: result.resultSummary,
      annotations: result.annotations,
    };
  }

  if (agentId === "documentation_writer") {
    const result = runLocalDocumentation(files);
    return {
      readmeMarkdown: result.readmeMarkdown,
      setupGuide: "Install dependencies, configure required environment variables, start the server, and verify the health endpoint.",
      apiReference: "Generated locally from detected routes and repository files.",
    };
  }

  if (agentId === "test_generator") {
    const target = files.find((file) => /\.(ts|tsx|js|jsx|py|java)$/i.test(file.path))?.path || files[0]?.path || "target.ts";
    const result = runLocalTestGeneration(files, target);
    return {
      testsCode: result.testsCode,
      testStrategy: "Local fallback generated a scaffold for the most relevant detected source file.",
    };
  }

  if (agentId === "deployment_helper") {
    return runLocalDeployment(files);
  }

  if (agentId === "release_notes_generator") {
    return {
      version: "v0.1.0-local",
      changelogMarkdown: [
        "# Local Orchestration Summary",
        "",
        "- Repository understanding completed with local fallback.",
        "- Dependency, architecture, security, code review, documentation, testing, and deployment agents produced repository-grounded results where available.",
      ].join("\n"),
      majorImprovements: ["Pipeline completed despite AI provider rate limits"],
      securityAuditsSummary: `${inputs.security_agent?.findings?.length || 0} local security findings recorded.`,
      testingStatusSummary: "Local test scaffolding generated for follow-up implementation.",
    };
  }

  return null;
}

// ==========================================
// ORCHESTRATION HELPERS & DB INTEGRATIONS
// ==========================================

function updateTaskState(runId: string, taskId: string, updates: Partial<AgentTask>): void {
  const run = Database.getOrchestration(runId);
  if (!run) return;

  const idx = run.tasks.findIndex(t => t.id === taskId);
  if (idx !== -1) {
    const currentTask = run.tasks[idx];
    const updatedLogs = updates.logs 
      ? [...currentTask.logs, ...updates.logs] 
      : currentTask.logs;

    run.tasks[idx] = {
      ...currentTask,
      ...updates,
      logs: updatedLogs,
    } as AgentTask;

    Database.updateOrchestration(runId, { tasks: run.tasks });
  }
}

function appendTaskLog(runId: string, taskId: string, message: string): void {
  const run = Database.getOrchestration(runId);
  if (!run) return;

  const idx = run.tasks.findIndex(t => t.id === taskId);
  if (idx !== -1) {
    run.tasks[idx].logs.push(`[${new Date().toLocaleTimeString()}] ${message}`);
    Database.updateOrchestration(runId, { tasks: run.tasks });
  }
}

function logToAllTasks(runId: string, message: string): void {
  const run = Database.getOrchestration(runId);
  if (!run) return;

  const updatedTasks = run.tasks.map(t => ({
    ...t,
    logs: [...t.logs, `[${new Date().toLocaleTimeString()}] ${message}`]
  }));
  Database.updateOrchestration(runId, { tasks: updatedTasks });
}

function cancelQueuedTasks(runId: string, reason: string): void {
  const run = Database.getOrchestration(runId);
  if (!run) return;

  const updatedTasks = run.tasks.map(t => {
    if (t.status === "queued" || t.status === "running") {
      return {
        ...t,
        status: "cancelled" as const,
        logs: [...t.logs, `[System] Cancelled: ${reason}`],
        completedAt: new Date().toISOString()
      };
    }
    return t;
  });

  Database.updateOrchestration(runId, { tasks: updatedTasks });
}

function cascadeCancelDownstream(runId: string, failedAgentId: string, errorMsg: string): void {
  const run = Database.getOrchestration(runId);
  if (!run) return;

  let changed = false;
  const updatedTasks = run.tasks.map(t => {
    if (t.status === "queued" && t.dependencies.includes(failedAgentId)) {
      changed = true;
      return {
        ...t,
        status: "cancelled" as const,
        logs: [...t.logs, `[System Alert] Dependent agent '${failedAgentId}' failed. Downstream execution aborted. Error context: ${errorMsg}`],
        completedAt: new Date().toISOString()
      };
    }
    return t;
  });

  if (changed) {
    Database.updateOrchestration(runId, { tasks: updatedTasks });
    
    // Recurse to handle nested dependencies
    updatedTasks.forEach(t => {
      if (t.status === "cancelled" as const) {
        cascadeCancelDownstream(runId, t.agentId, "Upstream cancellation.");
      }
    });
  }
}


