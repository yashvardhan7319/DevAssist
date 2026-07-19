import { config } from "./config/env";
import { RepoFile, CodeReviewAnnotation, SecurityReport } from "./db";
import {
  buildArchitecturePromptContext,
  buildLocalArchitectureDiagram,
} from "../agents/architecture-inspector";
import { getDependencyManifestFiles } from "./services/dependency-parser";
import { getGroqPublicError } from "./utils/public-errors";

export function getGroqApiKey(): string {
  const apiKey = config.groqApiKey || process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY environment variable is required. Please set it in settings/environment."
    );
  }
  return apiKey;
}

const GROQ_MODEL = "llama-3.3-70b-versatile";

function getFilesTextSummary(files: RepoFile[]): string {
  // Truncate to prevent exceeding Groq TPM / Context limits
  const maxFiles = files.slice(0, 40);
  return maxFiles
    .map((f) => {
      // truncate long files to first 150 lines
      const lines = f.content.split("\n");
      const truncated = lines.length > 150 ? lines.slice(0, 150).join("\n") + "\n...[TRUNCATED]" : f.content;
      return `--- File: ${f.path} ---\n${truncated}\n`;
    })
    .join("\n\n");
}

async function callGroq(prompt: string, systemPrompt?: string, jsonMode = true): Promise<string> {
  const apiKey = getGroqApiKey();
  const maxRetries = 6;
  let delay = 3000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const messages: any[] = [];
      if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
      }
      messages.push({ role: "user", content: prompt });

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages,
          temperature: 0.1,
          response_format: jsonMode ? { type: "json_object" } : undefined,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        const publicMessage = getGroqPublicError(response.status, errText);
        const retryable = response.status === 429 || response.status >= 500;
        if (retryable && attempt < maxRetries) {
          let backoff = delay * Math.pow(2, attempt - 1) + Math.random() * 500;
          const retryAfter = response.headers.get("retry-after");
          if (retryAfter) {
            const parsed = parseInt(retryAfter, 10);
            if (!isNaN(parsed) && parsed > 0) {
              backoff = parsed * 1000 + 500;
            }
          }
          console.warn(`[Groq API] Retry warning: ${publicMessage}. Attempt ${attempt}/${maxRetries} in ${Math.round(backoff)}ms...`);
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue;
        }
        throw new Error(publicMessage);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Empty response content received from Groq API.");
      }
      return content;
    } catch (error: any) {
      const message = String(error.message || "");
      const nonRetryable =
        message.includes("GROQ_API_KEY") ||
        message.includes("invalid or expired") ||
        message.includes("Groq rejected") ||
        message.includes("rejected the generated request");

      if (attempt < maxRetries && !nonRetryable) {
        const backoff = delay * Math.pow(2, attempt - 1) + Math.random() * 500;
        console.warn(`[Groq API] Retry warning: ${error.message}. Attempt ${attempt}/${maxRetries} in ${Math.round(backoff)}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoff));
      } else {
        if (message.includes("fetch")) {
          throw new Error("Could not reach Groq. Check your internet connection and try again.");
        }
        throw error;
      }
    }
  }
  throw new Error("Failed to contact Groq API after multiple retries.");
}

export async function runRepoUnderstanding(files: RepoFile[]): Promise<{
  language: string;
  framework: string;
  summary: string;
  mermaidDiagram: string;
}> {
  const fileSummary = getFilesTextSummary(files);
  const architectureSignals = buildArchitecturePromptContext(files);
  const systemPrompt = `You are the Repository Understanding Agent and a senior software architect.
Return valid JSON matching this schema:
{
  "language": "string",
  "framework": "string",
  "summary": "string",
  "mermaidDiagram": "string"
}

The mermaidDiagram must be an accurate High-Level System Architecture map of THIS repository, not a generic diagram.

Mermaid requirements:
- Return Mermaid code only in mermaidDiagram, no markdown fence.
- Start with this exact Mermaid init block (must use double quotes for valid JSON):
%%{init: {"theme": "base", "themeVariables": { "background": "#FFFFFF", "primaryColor": "#FFFFFF", "secondaryColor": "#FFFFFF", "tertiaryColor": "#FFFFFF", "clusterBkg": "#FFFFFF", "clusterBorder": "#CBD5E1", "mainBkg": "#FFFFFF", "nodeBorder": "#CBD5E1", "lineColor": "#64748B", "fontFamily": "Inter", "fontSize": "14px", "textColor": "#1E293B", "edgeLabelBackground": "#FFFFFF"}}}%%
- Use a Top-to-Bottom (TB) layout (flowchart TB). Do NOT create a long horizontal diagram.
- Build a clean vertical layered architecture. Separate every layer using Mermaid subgraphs. Every layer must have a clear title.
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
- Avoid Mermaid grey backgrounds, raw HTML, markdown fences, file-path-heavy labels, unescaped quotes, and parentheses in labels.`;
  const prompt = `Analyze this repository's codebase and provide a structured summary.
Identify the primary programming language and framework. Explain the repository purpose and architectural style.
Then, generate a detailed renderer-safe Mermaid architecture diagram grounded in the extracted architecture signals.

${architectureSignals}

Repository Codebase:
${fileSummary}
`;

  const responseText = await callGroq(prompt, systemPrompt);
  const parsed = JSON.parse(responseText.trim());
  return {
    ...parsed,
    mermaidDiagram: ensureDetailedArchitectureDiagram(parsed.mermaidDiagram, files),
  };
}

export async function runPlanning(
  files: RepoFile[],
  requestText: string
): Promise<{
  tasks: Array<{ title: string; complexity: "S" | "M" | "L"; description: string }>;
}> {
  const fileSummary = getFilesTextSummary(files);
  const systemPrompt = "You are the Planning Agent. You MUST return valid JSON matching this schema: {\n  \"tasks\": [\n    {\n      \"title\": \"string\",\n      \"complexity\": \"S | M | L\",\n      \"description\": \"string\"\n    }\n  ]\n}";
  const prompt = `Break down the following user feature request/ticket based on the existing codebase files.
Create an ordered development task list with estimated complexity (S, M, L) and detailed sub-tasks.

User Feature Request:
${requestText}

Existing Codebase:
${fileSummary}
`;

  const responseText = await callGroq(prompt, systemPrompt);
  return JSON.parse(responseText.trim());
}

export async function runCodeReview(files: RepoFile[]): Promise<{
  resultSummary: string;
  annotations: CodeReviewAnnotation[];
}> {
  const fileSummary = getFilesTextSummary(files);
  const systemPrompt = "You are the Code Review & Security Audit Agent. You MUST return valid JSON matching this schema: {\n  \"resultSummary\": \"string\",\n  \"annotations\": [\n    {\n      \"filePath\": \"string\",\n      \"lineNumber\": 123,\n      \"severity\": \"info | warning | critical\",\n      \"category\": \"string\",\n      \"comment\": \"string\"\n    }\n  ]\n}";
  const prompt = `Analyze the repository's files for logic bugs, security vulnerabilities, and style issues.
Provide specific line-by-line annotations pointing directly to issues with clear reasoning and recommend a fix.

Codebase to Review:
${fileSummary}
`;

  const responseText = await callGroq(prompt, systemPrompt);
  return JSON.parse(responseText.trim());
}

export async function runDependencyAnalysis(files: RepoFile[]): Promise<{
  dependencies: Array<{
    name: string;
    current: string;
    latest: string;
    outdated: boolean;
    vulnerable: boolean;
    vulnerabilityDetails?: string;
  }>;
}> {
  const manifestFiles = getDependencyManifestFiles(files);
  const manifestSummary = getFilesTextSummary(manifestFiles);
  const systemPrompt = "You are the Dependency Analyzer Agent. You MUST return valid JSON matching this schema: {\n  \"dependencies\": [\n    {\n      \"name\": \"string\",\n      \"current\": \"string\",\n      \"latest\": \"string\",\n      \"outdated\": true,\n      \"vulnerable\": true,\n      \"vulnerabilityDetails\": \"string (optional)\"\n    }\n  ]\n}";
  const prompt = `Parse the following package manifests to extract dependencies.
Cross-reference them against modern package versions and check if any are outdated or have known security vulnerabilities.

Manifest Files (package.json, requirements.txt, pyproject.toml, pom.xml, Gradle, go.mod, Cargo.toml, Gemfile):
${manifestSummary || "No package manifests found. Provide empty dependencies list."}
`;

  const responseText = await callGroq(prompt, systemPrompt);
  return JSON.parse(responseText.trim());
}

export async function runTestGeneration(
  files: RepoFile[],
  filePath: string
): Promise<{ testsCode: string }> {
  const fileSummary = getFilesTextSummary(files);
  const targetFile = files.find((f) => f.path === filePath);
  const systemPrompt = "You are the Test Generator Agent. You MUST return valid JSON matching this schema: {\n  \"testsCode\": \"string\"\n}";
  const prompt = `Generate exhaustive, clean, and professional unit/integration tests for the file "${filePath}".
Make sure the tests use standard test frameworks based on the language. Include mocks and setup context.

Target File content:
${targetFile ? targetFile.content : "File not found"}

Entire Codebase context:
${fileSummary}
`;

  const responseText = await callGroq(prompt, systemPrompt);
  return JSON.parse(responseText.trim());
}

export async function runDocumentation(files: RepoFile[]): Promise<{
  readmeMarkdown: string;
}> {
  const fileSummary = getFilesTextSummary(files);
  const systemPrompt = "You are the Documentation Writer Agent. You MUST return valid JSON matching this schema: {\n  \"readmeMarkdown\": \"string\"\n}";
  const prompt = `Write a highly professional, comprehensive README.md file in Markdown for this codebase.
Include a clean project description, key features, directory walkthrough, how to install, and development scripts.

Codebase context:
${fileSummary}
`;

  const responseText = await callGroq(prompt, systemPrompt);
  return JSON.parse(responseText.trim());
}

export async function runDeployment(files: RepoFile[]): Promise<{
  dockerfileContent: string;
  dockerComposeContent: string;
  githubActionsContent: string;
  vercelConfig: string;
  renderConfig: string;
  detectedEnvVars: Array<{ name: string; description: string; isSensitive: boolean; category: string; recommendedValuePlaceholder?: string }>;
  compatibilityReport: {
    render: { compatible: boolean; issues: string[]; tips: string[] };
    vercel: { compatible: boolean; issues: string[]; tips: string[] };
  };
  productionReadinessScore: number;
  productionReadinessChecklist: Array<{ category: string; item: string; passed: boolean; recommendation: string }>;
}> {
  const fileSummary = getFilesTextSummary(files);
  const systemPrompt = "You are the Deployment Assistant Agent. You MUST return valid JSON conforming to the requested complex deployment schema containing dockerfileContent, dockerComposeContent, githubActionsContent, vercelConfig, renderConfig, detectedEnvVars, compatibilityReport, productionReadinessScore, and productionReadinessChecklist.";
  const prompt = `Analyze this codebase and generate optimal, production-grade deployment configurations, detect required/optional environment variables, verify compatibility with Render and Vercel, and grade the project's production readiness.

Generate:
1. Dockerfile: Multistage build, non-root user, clean cache.
2. docker-compose.yml: App container + standard dependent services (like PostgreSQL, Redis) if needed.
3. GitHub Actions CI/CD YAML (.github/workflows/ci.yml).
4. vercel.json.
5. render.yaml (Blueprint Spec).
6. detectedEnvVars: list of name, description, isSensitive, category.
7. compatibilityReport: render and vercel compatible, issues, tips.
8. productionReadinessScore and Checklist: category, item, passed, recommendation.

Codebase context:
${fileSummary}
`;

  const responseText = await callGroq(prompt, systemPrompt);
  return JSON.parse(responseText.trim());
}

export async function runLogAnalysis(
  files: RepoFile[],
  logs: string
): Promise<{
  rootCause: string;
  errorType: string;
  resolutionSteps: string[];
  recommendedFixCode?: string;
}> {
  const fileSummary = getFilesTextSummary(files);
  const systemPrompt = "You are the Deployment Log and Error Diagnostics Agent. You MUST return valid JSON matching this schema: {\n  \"rootCause\": \"string\",\n  \"errorType\": \"string\",\n  \"resolutionSteps\": [\"string\"],\n  \"recommendedFixCode\": \"string (optional)\"\n}";
  const prompt = `Analyze the logs within the context of this repository. Provide rootCause, errorType, resolutionSteps, and optional recommendedFixCode.

Logs/Error Stack:
${logs}

Codebase context summary:
${fileSummary}
`;

  const responseText = await callGroq(prompt, systemPrompt);
  return JSON.parse(responseText.trim());
}

export async function runSecurityAnalysis(files: RepoFile[]): Promise<SecurityReport> {
  const fileSummary = getFilesTextSummary(files);
  const systemPrompt = "You are the Security Agent. You MUST return valid JSON conforming to the SecurityReport schema containing overallRiskScore, summary, findings (id, category, title, severity, description, remediation, filePath, lineNumber, snippet), and stats (critical, high, medium, low, info).";
  const prompt = `Thoroughly audit the provided repository for security vulnerabilities across secrets, api_keys, jwt, authentication, authorization, sql_injection, xss, csrf, ssrf, dependency, env_vars, cors, headers.

Repository Codebase:
${fileSummary}
`;

  const responseText = await callGroq(prompt, systemPrompt);
  const report = JSON.parse(responseText.trim());
  report.scannedAt = new Date().toISOString();
  return report;
}

export async function runKnowledgeBaseEngine(files: RepoFile[]): Promise<any> {
  const fileSummary = getFilesTextSummary(files);
  const architectureSignals = buildArchitecturePromptContext(files);
  const systemPrompt = `You are the Project Knowledge Base Engine.
Return valid JSON conforming to the requested database schema with folderTree, dependencyGraph, importGraph, callGraph, architectureGraph, serviceGraph, frameworkDetection, languageDetection, apiDetection, configurationDetection, databaseDetection, projectSummary, technologyStackSummary, and architectureSummary.

The architectureGraph field must be Mermaid code only, no markdown fence.
Make architectureGraph a detailed file-grounded system map:
- Start with a Mermaid init block using theme base and white themeVariables.
- Use flowchart TB for an enterprise layered High-Level System Architecture view.
- Use subgraphs for layers and keep all layer backgrounds white or transparent.
- Show high-level runtime components instead of a crowded file tree.
- Include only real application layers, stores, external services, and agent modules from the architecture signals.
- Include AI or RAG layers only when the repository contains those signals.
- Show real flow between UI, API, AI, persistence, and deployment pieces.
- Use classDef and :::className for visually distinct node types.
- Keep node ids simple and labels short, quoted in square brackets, with 1-3 responsibility lines per node.`;
  const prompt = `Analyze this repository's codebase and generate a comprehensive knowledge base dataset.

For architectureGraph, generate a detailed renderer-safe Mermaid flowchart grounded in the extracted architecture signals.

${architectureSignals}

Repository Codebase:
${fileSummary}
`;

  const responseText = await callGroq(prompt, systemPrompt);
  const parsed = JSON.parse(responseText.trim());
  return {
    ...parsed,
    architectureGraph: ensureDetailedArchitectureDiagram(parsed.architectureGraph, files),
  };
}

export async function explainFileGrounded(
  files: RepoFile[],
  filePath: string
): Promise<string> {
  const target = files.find((f) => f.path === filePath);
  if (!target) {
    return "The requested file was not found in this repository.";
  }

  const fileSummary = getFilesTextSummary(files.filter((f) => f.path !== filePath));
  const prompt = `Explain the behavior, dependencies, and core responsibilities of this file "${filePath}" in detail. Ground your answer completely in the code context below.
            
Target File to Explain:
${target.content}

Rest of Codebase context:
${fileSummary}
`;

  return await callGroq(prompt, "You are a senior software engineer explaining code.", false);
}

export async function answerKnowledgeBaseQuestion(query: string, context: string): Promise<string> {
  const systemPrompt = `You are an expert project assistant with direct access to the repository's Knowledge Base.
Answer the user's technical question based strictly on the retrieved context below.
If the retrieved context does not contain enough details, explain what is missing while still using available clues.
Be concise, accurate, and use markdown where it improves readability.

Retrieved Knowledge Base Context:
${context}`;

  return callGroq(query, systemPrompt, false);
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
