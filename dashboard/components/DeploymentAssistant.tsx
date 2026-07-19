import React, { useState } from "react";
import {
  Terminal,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  ExternalLink,
  Loader2,
  ShieldAlert,
  Sparkles,
  Cpu,
  FileCode,
  Settings,
  HelpCircle,
  Activity,
  Wrench,
  Check,
  Zap,
  Info,
  Search,
  Download,
  Filter,
  Clock,
  FileText,
  AlertCircle,
  Sliders,
  Database,
  Cloud,
  ChevronRight,
  ListFilter
} from "lucide-react";
import { motion } from "motion/react";
import { Repository, Analysis } from "../types";

// ====================================================
// STATIC MOCK LOGS GENERATOR FOR INTERACTIVE VIEWER
// ====================================================
interface LogItem {
  timestamp: string;
  level: "info" | "warning" | "error";
  category: "build" | "runtime" | "system";
  message: string;
}

const generateMockLogs = (repoName: string, framework: string): LogItem[] => {
  const isReact = framework?.toLowerCase().includes("react") || framework?.toLowerCase().includes("vite");
  const now = new Date();
  const logs: LogItem[] = [];
  
  const getPastTime = (minutesAgo: number) => {
    const d = new Date(now.getTime() - minutesAgo * 60 * 1000);
    return d.toISOString().replace("T", " ").substring(0, 19);
  };

  logs.push({ timestamp: getPastTime(15), level: "info", category: "build", message: `[CI/CD] Triggered deployment build pipeline for branch: main` });
  logs.push({ timestamp: getPastTime(14.8), level: "info", category: "build", message: `[CI/CD] Container image cache hit for node:20-alpine` });
  logs.push({ timestamp: getPastTime(14.5), level: "info", category: "build", message: `[Build] npm ci --prefer-offline --no-audit` });
  logs.push({ timestamp: getPastTime(14), level: "info", category: "build", message: `[Build] added 842 packages in 12.4s` });
  logs.push({ timestamp: getPastTime(13.5), level: "info", category: "build", message: `[Build] Running production compilation: npm run build` });
  
  if (isReact) {
    logs.push({ timestamp: getPastTime(13), level: "info", category: "build", message: `[Build] vite v5.1.0 building for production...` });
    logs.push({ timestamp: getPastTime(12), level: "info", category: "build", message: `[Build] ✓ 512 modules transformed.` });
    logs.push({ timestamp: getPastTime(11.5), level: "info", category: "build", message: `[Build] dist/index.html                  0.54 kB │ gzip:  0.32 kB` });
    logs.push({ timestamp: getPastTime(11.4), level: "info", category: "build", message: `[Build] dist/assets/index-D_nOQ_mI.css  94.20 kB │ gzip: 14.10 kB` });
    logs.push({ timestamp: getPastTime(11.2), level: "info", category: "build", message: `[Build] dist/assets/index-B-C4T6Ie.js  612.45 kB │ gzip: 182.50 kB` });
    logs.push({ timestamp: getPastTime(11), level: "info", category: "build", message: `[Build] ✓ built in 5.82s` });
  } else {
    logs.push({ timestamp: getPastTime(13), level: "info", category: "build", message: `[Build] tsc --project tsconfig.json` });
    logs.push({ timestamp: getPastTime(11), level: "info", category: "build", message: `[Build] Compilation completed successfully in 3.42s` });
  }

  logs.push({ timestamp: getPastTime(10), level: "info", category: "build", message: `[Docker] Sending build context to Docker daemon` });
  logs.push({ timestamp: getPastTime(9.5), level: "info", category: "build", message: `[Docker] Step 1/6 : FROM node:20-alpine AS builder` });
  logs.push({ timestamp: getPastTime(9.2), level: "info", category: "build", message: `[Docker] Step 2/6 : WORKDIR /app` });
  logs.push({ timestamp: getPastTime(8.5), level: "info", category: "build", message: `[Docker] Step 3/6 : COPY package*.json ./` });
  logs.push({ timestamp: getPastTime(7.8), level: "info", category: "build", message: `[Docker] Step 4/6 : RUN npm ci --only=production` });
  logs.push({ timestamp: getPastTime(6.5), level: "info", category: "build", message: `[Docker] Step 5/6 : COPY . .` });
  logs.push({ timestamp: getPastTime(6), level: "info", category: "build", message: `[Docker] Step 6/6 : CMD ["node", "dist/server.cjs"]` });
  logs.push({ timestamp: getPastTime(5.8), level: "info", category: "build", message: `[Docker] Successfully tagged ${repoName.toLowerCase()}:latest` });

  logs.push({ timestamp: getPastTime(5.5), level: "info", category: "runtime", message: `[System] Orchestration agent initiating rolling release on target cluster` });
  logs.push({ timestamp: getPastTime(5.2), level: "info", category: "runtime", message: `[System] Scaling replica set to 2 containers...` });
  logs.push({ timestamp: getPastTime(4.8), level: "info", category: "runtime", message: `[Runtime] Container instance running at node_id: c7cc4a-node-1` });
  logs.push({ timestamp: getPastTime(4.5), level: "info", category: "runtime", message: `[Runtime] Node.js environment detected production. Stripping debug flags.` });
  logs.push({ timestamp: getPastTime(4.2), level: "info", category: "runtime", message: `[Runtime] Server listening on port: 3000 (ingress binding successful)` });
  logs.push({ timestamp: getPastTime(4.0), level: "info", category: "runtime", message: `[Runtime] Connecting to relational data layer...` });
  logs.push({ timestamp: getPastTime(3.8), level: "info", category: "runtime", message: `[Runtime] Connection successful. Database client active (pool size: 10)` });
  logs.push({ timestamp: getPastTime(3.5), level: "warning", category: "runtime", message: `[Runtime] High memory warning during loading index: RSS 212MB (41% threshold)` });
  logs.push({ timestamp: getPastTime(3.2), level: "info", category: "runtime", message: `[Runtime] Cache warm up initiated for static assets` });
  logs.push({ timestamp: getPastTime(2.8), level: "info", category: "runtime", message: `[Runtime] Cache warm up completed in 420ms` });
  logs.push({ timestamp: getPastTime(2.5), level: "info", category: "runtime", message: `[Runtime] Health checks reporting 200 OK on endpoint: /api/health` });
  logs.push({ timestamp: getPastTime(2.0), level: "info", category: "runtime", message: `[System] Port 3000 successfully bound to internal routing table` });
  logs.push({ timestamp: getPastTime(1.5), level: "info", category: "runtime", message: `[System] Release completed. Active container: c7cc4a-node-1, standby: offline` });
  logs.push({ timestamp: getPastTime(1.0), level: "info", category: "runtime", message: `[System] Deployment successfully finalized` });

  return logs;
};

// ====================================================
// COMMON DEPLOYMENT FAILURES & RECOMMENDATIONS
// ====================================================
interface CommonFailure {
  id: number;
  title: string;
  severity: "Critical" | "High" | "Medium";
  description: string;
  causes: string[];
  fixes: string[];
  sampleLog: string;
}

const COMMON_FAILURES: CommonFailure[] = [
  {
    id: 1,
    title: "Build Failure",
    severity: "Critical",
    description: "Production compilation fails due to linting issues, type mismatches, or missing build targets.",
    causes: [
      "Non-compilable React or Node.js code files",
      "Missing TypeScript declarations or interface imports",
      "Broken third-party package dependency version mismatch"
    ],
    fixes: [
      "Run 'npm run lint' and 'tsc --noEmit' locally to capture static compilation errors",
      "Ensure all import statements use named imports and correct relative paths",
      "Confirm 'dist/' output directory is correctly compiled inside the builder stage"
    ],
    sampleLog: `Error: src/components/Dashboard.tsx:21:10 - error TS2307: Cannot find module './NonExistentComponent' or its corresponding type declarations.`
  },
  {
    id: 2,
    title: "Missing Environment Variable",
    severity: "High",
    description: "Application fails to start or crashes on boot because a required secret or configuration variable is not found.",
    causes: [
      "Forgetting to declare a new secret in the hosting provider dashboard (e.g. Render/Vercel)",
      "Accessing 'process.env' variables in client-side code without prefixing them with 'VITE_'"
    ],
    fixes: [
      "Cross-reference with '.env.example' and verify all keys are fully provisioned",
      "Define the variable in your Render or Vercel environment configurations console",
      "Throw explicit, descriptive errors on startup if vital variables are missing"
    ],
    sampleLog: `Error: STRIPE_SECRET_KEY environment variable is required. Process exited with code 1.`
  },
  {
    id: 3,
    title: "Module Resolution Errors",
    severity: "Critical",
    description: "The bundler cannot locate an imported package during the compilation phase, or node crashes with a 'Cannot find module' error at runtime.",
    causes: [
      "Submitting code referencing packages that are not declared in 'package.json'",
      "Case-sensitive path mismatch (e.g. importing './utils' instead of './Utils' on case-sensitive Linux host servers)"
    ],
    fixes: [
      "Run 'npm install <package-name>' to add it to your package.json dependencies list",
      "Double check import string casing matches the file on disk exactly",
      "Ensure your bundler setup (Vite/Webpack) resolves imports correctly"
    ],
    sampleLog: `Error: Cannot find module 'lucide-react' from '/app/src/components/Sidebar.tsx'`
  },
  {
    id: 4,
    title: "Database Connection Errors",
    severity: "Critical",
    description: "The application service boots successfully but is unable to establish a secure database link or connection pool.",
    causes: [
      "Incorrect relational database connection URL or credentials",
      "Hosting firewalls/ingress rules blocking outbound database traffic",
      "SSL verification failures on server certificates"
    ],
    fixes: [
      "Ensure your DATABASE_URL is correct and has the appropriate passwords",
      "Append '?sslmode=require' or disable strict certificate checking based on host requirements",
      "Verify the target database cluster is online and accepting connections"
    ],
    sampleLog: `Error: connect ETIMEDOUT 10.240.0.3:5432 at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1494:16)`
  },
  {
    id: 5,
    title: "Port Binding Issues",
    severity: "High",
    description: "The docker container runs successfully, but the host's router is unable to complete port forward tables, triggering failed health checks.",
    causes: [
      "Hardcoding a port that is different from the hosting router's ingress expectations",
      "Failing to bind to host '0.0.0.0' inside a Docker container (listening only on localhost/127.0.0.1)"
    ],
    fixes: [
      "Dynamically bind the server port using process.env.PORT || 3000",
      "Configure the Docker container to listen on '0.0.0.0' instead of '127.0.0.1'",
      "Verify Render service setup is expecting the same port as the server"
    ],
    sampleLog: `Error: listen EADDRINUSE: address already in use :::3000`
  },
  {
    id: 6,
    title: "Node Version Mismatch",
    severity: "Medium",
    description: "Application relies on modern engine features, but the remote cloud environment defaults to legacy Node.js runtimes.",
    causes: [
      "Failing to specify node versions inside configuration descriptors or package configurations"
    ],
    fixes: [
      "Add 'engines' specs with node >= 20.0.0 directly inside package.json",
      "Set the 'NODE_VERSION' environment variable in your Render or Vercel dashboard"
    ],
    sampleLog: `SyntaxError: Unexpected token '?' at Module._compile (node:internal/modules/cjs/loader:1101:14)`
  },
  {
    id: 7,
    title: "Memory Limits",
    severity: "Critical",
    description: "The container is suddenly terminated during compilation or heavy run phases due to Out Of Memory (OOM) triggers.",
    causes: [
      "Compiling large React bundles in tiny, resource-constrained container tiers (like 512MB RAM free plans)",
      "Express memory leaks during persistent server uptime"
    ],
    fixes: [
      "Instruct Vite to run build processes in limited memory zones using NODE_OPTIONS='--max-old-space-size=450'",
      "Prune unused heavy developer libraries before compiling production targets",
      "Enable container swap spaces or upgrade memory tiers if necessary"
    ],
    sampleLog: `FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory. Killed`
  },
  {
    id: 8,
    title: "Timeouts",
    severity: "High",
    description: "The hosting build system aborts the process because compiling or startup routines took longer than allowed thresholds.",
    causes: [
      "Running slow, non-parallelized unit tests inside the build pipeline",
      "Infinite startup loops during file pre-indexing or static site generation"
    ],
    fixes: [
      "Remove heavy test suites or integration audits from the release build pipeline",
      "Optimize local static files fetching and caching during start up",
      "Avoid synchronous blocks of CPU-bound logic on the main event thread"
    ],
    sampleLog: `Build timed out after 10 minutes. Cancelling deploy.`
  },
  {
    id: 9,
    title: "Missing Dependencies",
    severity: "High",
    description: "Server runs into immediate crashes during runtime because tool dependencies (like 'tsx' or 'esbuild') were trimmed during production prunes.",
    causes: [
      "Running development command utilities in production 'start' commands when devDependencies are pruned"
    ],
    fixes: [
      "Ensure production 'start' scripts compile files during the build stage and run standard JS: 'node dist/server.cjs'",
      "Place vital server runner packages inside dependencies instead of devDependencies"
    ],
    sampleLog: `sh: tsx: command not found. Process exited with status 127.`
  }
];

// ====================================================
// MARKDOWN REPORTS COMPILER FUNCTIONS
// ====================================================
const generateDeploymentAnalysisMd = (repo: Repository, deploy: any) => {
  return `# DEPLOYMENT_ANALYSIS - ${repo.name}
Generated on: ${new Date().toISOString().substring(0, 10)}
Readiness Score: ${deploy.productionReadinessScore || 0} / 100

## Executive Summary
This report analyzes the repository "${repo.name}" and provides structured recommendations for containerization, continuous integration, environmental security, and target cloud hosts.

## Tech Stack Overview
- **Detected Language**: ${repo.language || "TypeScript / JavaScript"}
- **Detected Framework**: ${repo.framework || "React / Express / Vite"}
- **Production Host Recommendation**: Render (Web Service Backend) + Vercel (Static Frontend SPA)

## Environment Variables
Here are the scanned environment variables required to deploy this service securely:

| Variable Name | Category | Sensitivity | Recommended Placeholder |
|---|---|---|---|
${(deploy.detectedEnvVars || []).map((v: any) => `| \`${v.name}\` | ${v.category} | ${v.isSensitive ? "High (Secret)" : "Low"} | \`${v.recommendedValuePlaceholder || "Dynamic"}\` |`).join("\n")}

## Cloud Compatibility Status
- **Render.com Compatibility**: ${deploy.compatibilityReport?.render?.compatible ? "Compatible (Ready)" : "Warning (Action Required)"}
- **Vercel Compatibility**: ${deploy.compatibilityReport?.vercel?.compatible ? "Compatible (Ready)" : "Warning (Action Required)"}

---
*Prepared by AI Software Engineering Assistant - Deployment Module*`;
};

const generateDockerAnalysisMd = (repo: Repository, deploy: any) => {
  return `# DOCKER_ANALYSIS - ${repo.name}
Generated on: ${new Date().toISOString().substring(0, 10)}

## 1. Multi-Stage Dockerfile
This optimized, production-grade Dockerfile utilizes multi-stage compilation to keep final image sizes under 150MB, runs on a secure, non-root user account, and prunes unused devDependencies:

\`\`\`dockerfile
${deploy.dockerfileContent || "No Dockerfile generated."}
\`\`\`

### Dockerfile Breakdown & Recommendations
- **Base Image**: Utilizing Alpine-based Node images to reduce vulnerable surface area.
- **Security**: Port mapping binds strictly to non-privileged ports (>1024), and executes via \`USER node\`.
- **Optimization**: Layer caching is preserved by copying dependency locks before copying source directories.

## 2. Docker Compose Infrastructure
For localized replication and development services, this Blueprint defines independent, connected containers:

\`\`\`yaml
${deploy.dockerComposeContent || "No Docker Compose generated."}
\`\`\`

### Docker Compose Services:
- **web**: Main server running Express and serving client assets.
- **db**: Relational storage (PostgreSQL) configured with restart policies and persistent volumes.
- **ingress**: Port forwarding table.

---
*Prepared by AI Software Engineering Assistant - Deployment Module*`;
};

const generateVercelReportMd = (repo: Repository, deploy: any) => {
  return `# VERCEL_REPORT - ${repo.name}
Generated on: ${new Date().toISOString().substring(0, 10)}
Status: ${deploy.compatibilityReport?.vercel?.compatible ? "READY (COMPATIBLE)" : "ACTION REQUIRED"}

## 1. Target Vercel JSON Spec
This configuration handles Single Page Application routing, enabling React Router paths to resolve correctly on the edge:

\`\`\`json
${deploy.vercelConfig || "No Vercel JSON generated."}
\`\`\`

## 2. Compatibility Analysis
${deploy.compatibilityReport?.vercel?.issues.length > 0 ? "### Identified Potential Issues:\n" + deploy.compatibilityReport.vercel.issues.map((i: string) => `- ${i}`).join("\n") : "### No critical bottlenecks identified. Full Vercel compatibility verified."}

## 3. Platform Integration Tips:
${deploy.compatibilityReport?.vercel?.tips.map((t: string) => `- ${t}`).join("\n")}

---
*Prepared by AI Software Engineering Assistant - Deployment Module*`;
};

const generateRenderReportMd = (repo: Repository, deploy: any) => {
  return `# RENDER_REPORT - ${repo.name}
Generated on: ${new Date().toISOString().substring(0, 10)}
Status: ${deploy.compatibilityReport?.render?.compatible ? "READY (COMPATIBLE)" : "ACTION REQUIRED"}

## 1. Render Blueprint Specification (render.yaml)
Deploy your backend Express service, persistent PostgreSQL clusters, and static assets in one cohesive step:

\`\`\`yaml
${deploy.renderConfig || "No Render Blueprint generated."}
\`\`\`

## 2. Compatibility Analysis
${deploy.compatibilityReport?.render?.issues.length > 0 ? "### Identified Potential Issues:\n" + deploy.compatibilityReport.render.issues.map((i: string) => `- ${i}`).join("\n") : "### No critical bottlenecks identified. Full Render Blueprint compatibility verified."}

## 3. Platform Integration Tips:
${deploy.compatibilityReport?.render?.tips.map((t: string) => `- ${t}`).join("\n")}

---
*Prepared by AI Software Engineering Assistant - Deployment Module*`;
};

const generateCicdReportMd = (repo: Repository, deploy: any) => {
  return `# CICD_REPORT - ${repo.name}
Generated on: ${new Date().toISOString().substring(0, 10)}

## 1. Recommended GitHub Actions CI/CD Workflow (.github/workflows/ci.yml)
Automate code safety checks, TypeScript compilation, security audits, and multi-platform compilation stages on every push to main:

\`\`\`yaml
${deploy.githubActionsContent || "No GitHub Actions config generated."}
\`\`\`

## 2. Core CI/CD Stages:
1. **Lint Phase**: Asserts style consistency using \`npm run lint\`.
2. **Type Check Phase**: Verifies interface alignments using \`tsc --noEmit\`.
3. **Unit Tests Phase**: Runs the automated Vitest/Jest suite on changes.
4. **Container Build Verification**: Confirms Dockerfiles compile cleanly on runner machines.

## 3. Recommended Rollback & Release Strategies
- **Caching**: Ensure caching directories are set up for \`~/.npm\` and \`node_modules\` to cut build times in half.
- **Rollbacks**: Implement automatic image tagging (e.g. \`sha-\${{ github.sha }}\`) to redeploy previous images in under 10 seconds in case of live production failures.

---
*Prepared by AI Software Engineering Assistant - Deployment Module*`;
};

const generateProductionReadinessReportMd = (repo: Repository, deploy: any) => {
  return `# PRODUCTION_READINESS_REPORT - ${repo.name}
Generated on: ${new Date().toISOString().substring(0, 10)}
Overall Readiness Score: ${deploy.productionReadinessScore || 0} / 100

## 1. Audit Summary
An intensive checklist grading has been run on "${repo.name}" checking container specs, continuous integration hooks, safety configurations, environment scopes, and static vs dynamic layers.

## 2. Granular Scorecard Checklist
${(deploy.productionReadinessChecklist || []).map((check: any) => `### [${check.passed ? "✓ PASS" : "✗ FAIL"}] ${check.item}
- **Category**: ${check.category}
- **Assessment**: ${check.passed ? "Meets strict production criteria." : "Requires modification."}
- **Recommendation**: ${check.recommendation}
`).join("\n")}

## 3. Immediate Action Plan
1. Fix any failed checklist items to avoid live runtime container crashes.
2. Ensure environment secrets are declared in Vercel and Render consoles.
3. Download appropriate Docker or CI/CD configuration files.

---
*Prepared by AI Software Engineering Assistant - Deployment Module*`;
};

// ====================================================
// DEPLOYMENT ASSISTANT REACT COMPONENT
// ====================================================
interface DeploymentAssistantProps {
  repository: Repository;
  activeDeploy: Analysis | undefined;
  onTriggerDeployment: () => void;
  loadingDeployment: boolean;
  authToken: string;
}

export const DeploymentAssistant: React.FC<DeploymentAssistantProps> = ({
  repository,
  activeDeploy,
  onTriggerDeployment,
  loadingDeployment,
  authToken,
}) => {
  // Navigation Tabs
  const [mainTab, setMainTab] = useState<"dashboard" | "logs" | "analyzer" | "reports">("dashboard");

  // Tabs for configuration viewing
  const [activeConfigTab, setActiveConfigTab] = useState<"docker" | "compose" | "github" | "render" | "vercel">("docker");
  
  // Paste Area state for logs
  const [logInput, setLogInput] = useState("");
  const [analyzingLogs, setAnalyzingLogs] = useState(false);
  const [logError, setLogError] = useState("");
  const [logResult, setLogResult] = useState<{
    rootCause: string;
    errorType: string;
    resolutionSteps: string[];
    recommendedFixCode?: string;
  } | null>(null);

  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Logs Viewer states
  const [selectedLogTab, setSelectedLogTab] = useState<"all" | "build" | "runtime" | "error" | "warning">("all");
  const [logSearchQuery, setLogSearchQuery] = useState("");

  // Error Analyzer Selected item
  const [selectedError, setSelectedError] = useState<number | null>(0);

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleAnalyzeLogs = async () => {
    if (!logInput.trim()) {
      setLogError("Please paste some logs or error outputs first.");
      return;
    }
    setLogError("");
    setAnalyzingLogs(true);
    setLogResult(null);

    try {
      const response = await fetch(`/api/repositories/${repository.id}/analyze-logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ logs: logInput }),
      });

      if (!response.ok) {
        throw new Error("Failed to process logs. Ensure the server is online.");
      }

      const data = await response.json();
      setLogResult(data.result);
    } catch (err: any) {
      setLogError(err.message || "An error occurred during log diagnosis.");
    } finally {
      setAnalyzingLogs(false);
    }
  };

  const getReadinessColor = (score: number) => {
    if (score >= 85) return "text-emerald-400 border-emerald-500/30 bg-emerald-500/5";
    if (score >= 60) return "text-amber-400 border-amber-500/30 bg-amber-500/5";
    return "text-red-400 border-red-500/30 bg-red-500/5";
  };

  const currentConfigContent = () => {
    if (!activeDeploy) return "";
    switch (activeConfigTab) {
      case "docker":
        return activeDeploy.dockerfileContent || "No Dockerfile generated.";
      case "compose":
        return activeDeploy.dockerComposeContent || "No Docker Compose generated.";
      case "github":
        return activeDeploy.githubActionsContent || "No GitHub Actions config generated.";
      case "render":
        return activeDeploy.renderConfig || "No Render Blueprint generated.";
      case "vercel":
        return activeDeploy.vercelConfig || "No Vercel JSON generated.";
      default:
        return "";
    }
  };

  // Generate logs dynamically based on the project framework
  const logsList = React.useMemo(() => {
    return generateMockLogs(repository.name, repository.framework || "React with Express");
  }, [repository.name, repository.framework]);

  // Filter logs for viewer
  const filteredLogs = React.useMemo(() => {
    return logsList.filter(log => {
      // category/level filter
      if (selectedLogTab === "build" && log.category !== "build") return false;
      if (selectedLogTab === "runtime" && log.category !== "runtime") return false;
      if (selectedLogTab === "error" && log.level !== "error") return false;
      if (selectedLogTab === "warning" && log.level !== "warning") return false;

      // search filter
      if (logSearchQuery.trim()) {
        const query = logSearchQuery.toLowerCase();
        return (
          log.message.toLowerCase().includes(query) ||
          log.category.toLowerCase().includes(query) ||
          log.level.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [logsList, selectedLogTab, logSearchQuery]);

  // Export logs to txt
  const handleExportLogs = () => {
    const logsText = filteredLogs.map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.category.toUpperCase()}] ${l.message}`).join("\n");
    const blob = new Blob([logsText], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${repository.name.toLowerCase()}_deployment_logs.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download reports
  const handleDownloadReport = (reportType: string) => {
    if (!activeDeploy) return;
    let filename = "";
    let content = "";

    switch (reportType) {
      case "deployment_analysis":
        filename = "DEPLOYMENT_ANALYSIS.md";
        content = generateDeploymentAnalysisMd(repository, activeDeploy);
        break;
      case "docker_analysis":
        filename = "DOCKER_ANALYSIS.md";
        content = generateDockerAnalysisMd(repository, activeDeploy);
        break;
      case "vercel_report":
        filename = "VERCEL_REPORT.md";
        content = generateVercelReportMd(repository, activeDeploy);
        break;
      case "render_report":
        filename = "RENDER_REPORT.md";
        content = generateRenderReportMd(repository, activeDeploy);
        break;
      case "cicd_report":
        filename = "CICD_REPORT.md";
        content = generateCicdReportMd(repository, activeDeploy);
        break;
      case "production_readiness_report":
        filename = "PRODUCTION_READINESS_REPORT.md";
        content = generateProductionReadinessReportMd(repository, activeDeploy);
        break;
      default:
        return;
    }

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Populate testing terminal with a sample log from failure analyzer
  const testWithSampleLog = (log: string) => {
    setLogInput(log);
    setMainTab("dashboard");
    // Scroll to the Troubleshooting element
    setTimeout(() => {
      const el = document.getElementById("log-diagnostician-panel");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  return (
    <div id="deployment-assistant-root" className="space-y-8">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              DevOps Suite
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
            <Terminal size={22} className="text-indigo-400" />
            Deployment Assistant
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Production validation, environment audits, cloud targets analysis, interactive log viewer, and downloadable reports.
          </p>
        </div>
        <button
          onClick={onTriggerDeployment}
          disabled={loadingDeployment || activeDeploy?.status === "running"}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl px-5 py-2.5 text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/15 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {loadingDeployment ? (
            <>
              <Loader2 size={14} className="animate-spin text-white" />
              <span>Analyzing Architecture...</span>
            </>
          ) : (
            <>
              <Sparkles size={14} className="text-indigo-200" />
              <span>{activeDeploy ? "Regenerate DevOps Suite" : "Initialize Deployment Suite"}</span>
            </>
          )}
        </button>
      </div>

      {!activeDeploy ? (
        <div className="text-center py-20 bg-slate-900/10 border border-dashed border-slate-800 rounded-3xl p-8">
          <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
            <Cpu size={32} className="text-indigo-400" />
          </div>
          <h3 className="text-base font-bold text-slate-200">DevOps Blueprint Not Initialized</h3>
          <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">
            Kickstart full-stack container configurations, Render and Vercel compatibility maps, and a production readiness checklist tailored specifically to this project's technologies.
          </p>
          <button
            onClick={onTriggerDeployment}
            className="mt-6 bg-slate-850 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 hover:border-slate-600 text-xs font-semibold px-5 py-2.5 rounded-xl cursor-pointer transition-all"
          >
            Run Deployment Analysis
          </button>
        </div>
      ) : activeDeploy.status === "running" ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 bg-slate-900/10 border border-slate-800/60 rounded-3xl">
          <Loader2 size={40} className="text-indigo-500 animate-spin" />
          <div className="text-center">
            <h4 className="text-sm font-bold text-slate-200 animate-pulse">Running Deployment & Architecture Diagnostics</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Analyzing dependencies, port configurations, start scripts, and scanning environment scopes...
            </p>
          </div>
        </div>
      ) : activeDeploy.status === "failed" ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
          <XCircle size={36} className="text-red-400 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-red-400">Analysis Pipeline Failed</h4>
          <p className="text-xs text-slate-300 mt-2 max-w-lg mx-auto">{activeDeploy.errorMessage}</p>
          <button
            onClick={onTriggerDeployment}
            className="mt-4 bg-red-950/40 hover:bg-red-950 text-red-400 border border-red-500/30 text-xs px-4 py-2 rounded-xl transition-all font-semibold"
          >
            Retry Architecture Scan
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* INTERACTIVE NAVIGATION TAB-BAR */}
          <div className="flex flex-wrap border-b border-slate-800 gap-1.5 bg-slate-900/20 p-1 rounded-xl">
            <button
              onClick={() => setMainTab("dashboard")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                mainTab === "dashboard"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Activity size={14} />
              <span>Deployment Dashboard</span>
            </button>
            <button
              onClick={() => setMainTab("logs")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                mainTab === "logs"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Terminal size={14} />
              <span>Deployment Logs Viewer</span>
            </button>
            <button
              onClick={() => setMainTab("analyzer")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                mainTab === "analyzer"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <ShieldAlert size={14} />
              <span>Common Failures Index</span>
            </button>
            <button
              onClick={() => setMainTab("reports")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                mainTab === "reports"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <FileCode size={14} />
              <span>DevOps Reports (6)</span>
            </button>
          </div>

          {/* ====================================================
              TAB 1: DEPLOYMENT DASHBOARD VIEW
              ==================================================== */}
          {mainTab === "dashboard" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* LEFT COLUMN: SPECS, SCRIPTS, AND TERMINALS */}
              <div className="lg:col-span-7 space-y-8">
                
                {/* DEPLOYMENT OVERVIEW / SPECS SPECIFIC PANEL */}
                <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <Sliders size={18} className="text-indigo-400" />
                      Deployment Specifications Overview
                    </h3>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-mono font-bold uppercase">
                      ACTIVE SPEC
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-850/80 space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Frontend Engine</span>
                      <p className="text-xs font-bold text-slate-200">React 18 + Vite Production bundle</p>
                      <p className="text-[10px] text-slate-400">Build: <code className="text-indigo-300">npm run build</code></p>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-850/80 space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Backend Service</span>
                      <p className="text-xs font-bold text-slate-200">NodeJS / Express Server</p>
                      <p className="text-[10px] text-slate-400">Entrypoint: <code className="text-indigo-300">node dist/server.cjs</code></p>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-850/80 space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Database Link</span>
                      <p className="text-xs font-bold text-slate-200">Relational Database (PostgreSQL)</p>
                      <p className="text-[10px] text-slate-400">ORM: <code className="text-indigo-300">Drizzle / PostgreSQL Driver</code></p>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-850/80 space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Target Platforms</span>
                      <p className="text-xs font-bold text-slate-200">Docker, Render (Backend), Vercel (SPA)</p>
                      <p className="text-[10px] text-slate-400">Health Endpoint: <code className="text-indigo-300">/api/health</code></p>
                    </div>
                  </div>
                </div>

                {/* CONTAINER CONFIGURATIONS PANEL */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="p-5 border-b border-slate-800/80 bg-slate-900/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <FileCode size={18} className="text-emerald-400" />
                      <h3 className="text-sm font-bold text-slate-200">DevOps Scaffoldings Preview</h3>
                    </div>
                    {currentConfigContent() && (
                      <button
                        onClick={() => handleCopy(currentConfigContent(), "scaffold")}
                        className="self-start sm:self-auto text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold focus:outline-none flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20 transition-all cursor-pointer"
                      >
                        <Copy size={11} />
                        <span>{copiedSection === "scaffold" ? "Copied!" : "Copy Configuration"}</span>
                      </button>
                    )}
                  </div>

                  {/* TABS */}
                  <div className="flex overflow-x-auto border-b border-slate-800 bg-slate-900/10">
                    <button
                      onClick={() => setActiveConfigTab("docker")}
                      className={`px-4 py-3 text-xs font-mono border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                        activeConfigTab === "docker"
                          ? "border-emerald-500 text-emerald-400 bg-slate-850/20"
                          : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-850/10"
                      }`}
                    >
                      Dockerfile
                    </button>
                    <button
                      onClick={() => setActiveConfigTab("compose")}
                      className={`px-4 py-3 text-xs font-mono border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                        activeConfigTab === "compose"
                          ? "border-emerald-500 text-emerald-400 bg-slate-850/20"
                          : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-850/10"
                      }`}
                    >
                      docker-compose.yml
                    </button>
                    <button
                      onClick={() => setActiveConfigTab("github")}
                      className={`px-4 py-3 text-xs font-mono border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                        activeConfigTab === "github"
                          ? "border-emerald-500 text-emerald-400 bg-slate-850/20"
                          : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-850/10"
                      }`}
                    >
                      CI/CD Workflow
                    </button>
                    <button
                      onClick={() => setActiveConfigTab("render")}
                      className={`px-4 py-3 text-xs font-mono border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                        activeConfigTab === "render"
                          ? "border-emerald-500 text-emerald-400 bg-slate-850/20"
                          : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-850/10"
                      }`}
                    >
                      render.yaml
                    </button>
                    <button
                      onClick={() => setActiveConfigTab("vercel")}
                      className={`px-4 py-3 text-xs font-mono border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                        activeConfigTab === "vercel"
                          ? "border-emerald-500 text-emerald-400 bg-slate-850/20"
                          : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-850/10"
                      }`}
                    >
                      vercel.json
                    </button>
                  </div>

                  {/* CONTENT PANEL */}
                  <div className="bg-slate-950 p-5 overflow-hidden">
                    <pre className="text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-[300px] leading-relaxed custom-scrollbar">
                      <code>{currentConfigContent()}</code>
                    </pre>
                  </div>
                </div>

                {/* ENVIRONMENT VARIABLES AUDITOR */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <Settings size={18} className="text-cyan-400" />
                      Environment Variable Validator
                    </h3>
                    <span className="text-[10px] text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-2 py-0.5 rounded-full font-mono font-semibold">
                      {activeDeploy.detectedEnvVars?.length || 0} variables detected
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Automatically scanned from configuration files and secrets templates. These variables must be configured in your remote hosting dashboard. (Values are hidden for security reasons).
                  </p>

                  {activeDeploy.detectedEnvVars && activeDeploy.detectedEnvVars.length > 0 ? (
                    <div className="overflow-x-auto border border-slate-800/80 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs text-slate-300">
                        <thead>
                          <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-mono text-[10px]">
                            <th className="py-2.5 px-3">Variable Name</th>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3">Sensitivity</th>
                            <th className="py-2.5 px-3">Recommended Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 bg-slate-900/20">
                          {activeDeploy.detectedEnvVars.map((v, i) => (
                            <tr key={i} className="hover:bg-slate-850/15">
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-200 break-all">{v.name}</td>
                              <td className="py-2.5 px-3">
                                <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md font-medium">
                                  {v.category}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                {v.isSensitive ? (
                                  <span className="text-[10px] text-red-400 bg-red-400/10 border border-red-500/10 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 w-fit">
                                    <ShieldAlert size={10} />
                                    Sensitive (Secret)
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md font-medium">
                                    Low Risk
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px] italic">
                                {v.recommendedValuePlaceholder || "Dynamic config"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-slate-900/20 rounded-xl border border-dashed border-slate-800">
                      <p className="text-xs text-slate-500">No specific environment variables detected in the current code scope.</p>
                    </div>
                  )}
                </div>

                {/* LIVE TROUBLESHOOTING TERMINAL */}
                <div id="log-diagnostician-panel" className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <Terminal size={18} className="text-rose-400" />
                      Troubleshooting Terminal & Log Diagnostician
                    </h3>
                    <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Real-Time Trace Hotfixes</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Paste build errors, runtime stack traces, database connectivity timeouts, or Docker compiler failures from Vercel/Render below. The assistant will diagnose the root cause and generate step-by-step hotfixes.
                  </p>

                  <div className="space-y-3">
                    <div className="relative rounded-xl overflow-hidden border border-slate-800 focus-within:border-indigo-500/50">
                      <div className="absolute top-3 left-3 flex items-center gap-1 text-[10px] font-mono text-slate-500 select-none">
                        <span>$ cat error_log.txt</span>
                      </div>
                      <textarea
                        value={logInput}
                        onChange={(e) => setLogInput(e.target.value)}
                        placeholder="Paste deployment logs, Docker pipeline crashes, or connection timeouts here..."
                        className="w-full h-40 bg-slate-950 p-4 pt-10 text-xs font-mono text-slate-300 border-none outline-none resize-y placeholder:text-slate-600 custom-scrollbar leading-relaxed"
                      />
                    </div>

                    {logError && <p className="text-xs text-red-400">{logError}</p>}

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handleAnalyzeLogs}
                        disabled={analyzingLogs}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                      >
                        {analyzingLogs ? (
                          <>
                            <Loader2 size={13} className="animate-spin text-white" />
                            <span>Diagnosing stack trace...</span>
                          </>
                        ) : (
                          <>
                            <Wrench size={13} className="text-rose-200" />
                            <span>Diagnose pasted logs</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setLogInput("")}
                        className="bg-slate-850 hover:bg-slate-850/80 text-slate-300 border border-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl"
                      >
                        Clear Terminal
                      </button>
                    </div>
                  </div>

                  {/* LOG DIAGNOSIS RESULT */}
                  {logResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-950 rounded-xl border border-slate-800 p-5 space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/60">
                        <div className="flex items-center gap-2">
                          <ShieldAlert size={16} className="text-rose-400" />
                          <span className="text-xs font-mono font-bold text-slate-300">AI Stack Trace Diagnosis</span>
                        </div>
                        <span className="text-[10px] text-rose-400 bg-rose-400/10 border border-rose-400/20 px-2.5 py-0.5 rounded-full font-mono font-semibold">
                          {logResult.errorType}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Root Cause Detected</span>
                        <p className="text-xs text-rose-300 leading-relaxed mt-1 font-sans">{logResult.rootCause}</p>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Recommended Troubleshooting Steps</span>
                        <ul className="space-y-1.5 pl-4 list-decimal text-xs text-slate-300 leading-relaxed">
                          {logResult.resolutionSteps.map((step, sIdx) => (
                            <li key={sIdx} className="pl-1">{step}</li>
                          ))}
                        </ul>
                      </div>

                      {logResult.recommendedFixCode && (
                        <div className="space-y-2 pt-2 border-t border-slate-800/60">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Suggested Fix / Config patch</span>
                            <button
                              onClick={() => handleCopy(logResult.recommendedFixCode || "", "fix-code")}
                              className="text-[9px] text-indigo-400 hover:text-indigo-300 font-semibold focus:outline-none flex items-center gap-1 bg-indigo-500/10 px-2 py-0.5 rounded"
                            >
                              <Copy size={9} />
                              <span>{copiedSection === "fix-code" ? "Copied!" : "Copy Code"}</span>
                            </button>
                          </div>
                          <pre className="bg-slate-900/60 p-3.5 rounded-lg text-[10px] font-mono text-cyan-400 overflow-x-auto leading-relaxed border border-slate-850">
                            <code>{logResult.recommendedFixCode}</code>
                          </pre>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

              </div>

              {/* RIGHT COLUMN: READINESS SCORE & PLATFORM COMPATIBILITY */}
              <div className="lg:col-span-5 space-y-8">

                {/* SCORECARD */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-6">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <Activity size={18} className="text-indigo-400" />
                      Production Readiness score
                    </h3>
                    <span className="text-[9px] uppercase tracking-wider font-bold text-indigo-400 font-mono">Engine v1.0</span>
                  </div>

                  <div className="flex items-center gap-5 bg-slate-950 p-5 rounded-2xl border border-slate-850">
                    <div className={`w-18 h-18 rounded-full border-2 flex flex-col items-center justify-center font-mono ${getReadinessColor(activeDeploy.productionReadinessScore || 0)}`}>
                      <span className="text-2xl font-bold">{activeDeploy.productionReadinessScore || 0}</span>
                      <span className="text-[8px] text-slate-500">/ 100</span>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-200">
                        {activeDeploy.productionReadinessScore && activeDeploy.productionReadinessScore >= 85
                          ? "Production Ready"
                          : activeDeploy.productionReadinessScore && activeDeploy.productionReadinessScore >= 60
                          ? "In Progress / Warning"
                          : "Action Required"}
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Evaluated across container efficiency, multi-stage builders, CI pipelines configurations, and environment validations.
                      </p>
                    </div>
                  </div>

                  {/* GRANULAR AUDIT CHECKLIST */}
                  <div className="space-y-3.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Audits Scorecard Verification</span>
                    {activeDeploy.productionReadinessChecklist && activeDeploy.productionReadinessChecklist.length > 0 ? (
                      <div className="space-y-3">
                        {activeDeploy.productionReadinessChecklist.map((check, cIdx) => (
                          <div key={cIdx} className="bg-slate-900/20 border border-slate-800/60 p-3 rounded-xl flex items-start gap-3">
                            <div className="mt-0.5">
                              {check.passed ? (
                                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle size={14} className="text-rose-400 shrink-0" />
                              )}
                            </div>
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-slate-200">{check.item}</span>
                                <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono uppercase">
                                  {check.category}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 leading-relaxed">{check.recommendation}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">No checklists generated for the current profile.</p>
                    )}
                  </div>
                </div>

                {/* PLATFORM COMPATIBILITY MAPS */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-6">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <Zap size={18} className="text-amber-400" />
                      Platform Compatibility Index
                    </h3>
                    <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Render & Vercel</span>
                  </div>

                  {activeDeploy.compatibilityReport ? (
                    <div className="space-y-6">
                      {/* RENDER COMPATIBILITY CARD */}
                      <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-850">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                            <span className="text-xs font-bold text-slate-200 font-mono">Render.com Blueprints</span>
                          </div>
                          {activeDeploy.compatibilityReport.render.compatible ? (
                            <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              COMPATIBLE
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              WARN
                            </span>
                          )}
                        </div>

                        {activeDeploy.compatibilityReport.render.issues.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider block">Potential Bottlenecks</span>
                            <ul className="space-y-1 text-[10px] text-slate-400 leading-relaxed pl-3 list-disc">
                              {activeDeploy.compatibilityReport.render.issues.map((iss, iIdx) => (
                                <li key={iIdx}>{iss}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="space-y-1 pt-1">
                          <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider block flex items-center gap-1">
                            <Info size={10} />
                            Deploying backend Web Services
                          </span>
                          <ul className="space-y-1 text-[10px] text-slate-300 leading-relaxed pl-3 list-decimal">
                            {activeDeploy.compatibilityReport.render.tips.map((tip, tIdx) => (
                              <li key={tIdx} className="pl-0.5">{tip}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* VERCEL COMPATIBILITY CARD */}
                      <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-850">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                            <span className="text-xs font-bold text-slate-200 font-mono">Vercel Serverless</span>
                          </div>
                          {activeDeploy.compatibilityReport.vercel.compatible ? (
                            <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              COMPATIBLE
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              WARN
                            </span>
                          )}
                        </div>

                        {activeDeploy.compatibilityReport.vercel.issues.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider block">Potential Bottlenecks</span>
                            <ul className="space-y-1 text-[10px] text-slate-400 leading-relaxed pl-3 list-disc">
                              {activeDeploy.compatibilityReport.vercel.issues.map((iss, iIdx) => (
                                <li key={iIdx}>{iss}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="space-y-1 pt-1">
                          <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider block flex items-center gap-1">
                            <Info size={10} />
                            Deploying static assets / functions
                          </span>
                          <ul className="space-y-1 text-[10px] text-slate-300 leading-relaxed pl-3 list-decimal">
                            {activeDeploy.compatibilityReport.vercel.tips.map((tip, tIdx) => (
                              <li key={tIdx} className="pl-0.5">{tip}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Compatibility index is currently unavailable.</p>
                  )}
                </div>

              </div>
            </motion.div>
          )}

          {/* ====================================================
              TAB 2: DEPLOYMENT LOGS VIEWER
              ==================================================== */}
          {mainTab === "logs" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden p-6 space-y-6"
            >
              {/* TOP HEADER CONTROLS */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Terminal size={18} className="text-indigo-400" />
                    Interactive Deployment Logs Viewer
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Displays production timelines, compiler cycles, containerization triggers, and database links.
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-60">
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      value={logSearchQuery}
                      onChange={(e) => setLogSearchQuery(e.target.value)}
                      placeholder="Search deployment logs..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  <button
                    onClick={handleExportLogs}
                    className="bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Export Logs</span>
                  </button>
                </div>
              </div>

              {/* TIMELINE & LOGS CONTAINER */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* TIMELINE SIDEBAR (1 COL) */}
                <div className="lg:col-span-1 bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-4">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block flex items-center gap-1.5">
                    <Clock size={12} />
                    Deployment Timeline
                  </span>

                  <div className="space-y-4 pl-2 relative border-l border-slate-800">
                    <div className="relative pl-4">
                      <span className="absolute -left-[13px] top-1.5 w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-[9px] text-slate-500 font-mono block">10 mins ago</span>
                      <span className="text-xs font-semibold text-slate-200 block">Repository Cloned</span>
                      <p className="text-[10px] text-slate-400">Pulled branch: main</p>
                    </div>

                    <div className="relative pl-4">
                      <span className="absolute -left-[13px] top-1.5 w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-[9px] text-slate-500 font-mono block">8 mins ago</span>
                      <span className="text-xs font-semibold text-slate-200 block">Production Compiled</span>
                      <p className="text-[10px] text-slate-400">SPA compiled successfully</p>
                    </div>

                    <div className="relative pl-4">
                      <span className="absolute -left-[13px] top-1.5 w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-[9px] text-slate-500 font-mono block">5 mins ago</span>
                      <span className="text-xs font-semibold text-slate-200 block">Docker Stage Finished</span>
                      <p className="text-[10px] text-slate-400">Tagged container image</p>
                    </div>

                    <div className="relative pl-4">
                      <span className="absolute -left-[13px] top-1.5 w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                      <span className="text-[9px] text-indigo-400 font-mono block">1 min ago</span>
                      <span className="text-xs font-semibold text-indigo-300 block">Routing Port Bound</span>
                      <p className="text-[10px] text-slate-400">Ingress mapping OK on :3000</p>
                    </div>
                  </div>
                </div>

                {/* INTERACTIVE TERMINAL VIEWER (3 COLS) */}
                <div className="lg:col-span-3 space-y-3">
                  {/* LOG CATEGORIES SWITCHER */}
                  <div className="flex flex-wrap gap-1 bg-slate-950 p-1 rounded-xl border border-slate-850">
                    {(["all", "build", "runtime", "error", "warning"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setSelectedLogTab(tab)}
                        className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-all cursor-pointer ${
                          selectedLogTab === tab
                            ? "bg-slate-800 text-white font-semibold"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {tab === "all" ? "All Levels" : `${tab} logs`}
                      </button>
                    ))}
                  </div>

                  {/* TERMINAL CONTENT */}
                  <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 font-mono text-[11px] leading-relaxed overflow-hidden">
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-900 text-slate-500">
                      <span>STDOUT / STDERR PIPE ACTIVE</span>
                      <span>Lines: {filteredLogs.length}</span>
                    </div>

                    <div className="overflow-y-auto max-h-[350px] space-y-1.5 custom-scrollbar">
                      {filteredLogs.length > 0 ? (
                        filteredLogs.map((log, index) => (
                          <div key={index} className="flex gap-4">
                            <span className="text-slate-600 shrink-0 select-none">[{log.timestamp}]</span>
                            <span className={`shrink-0 select-none font-bold uppercase w-14 ${
                              log.level === "error" ? "text-red-400" : log.level === "warning" ? "text-amber-400" : "text-sky-400"
                            }`}>
                              {log.level}
                            </span>
                            <span className={`shrink-0 select-none text-slate-500 font-bold uppercase w-16`}>
                              [{log.category}]
                            </span>
                            <span className={
                              log.level === "error" ? "text-red-300 font-semibold" : log.level === "warning" ? "text-amber-300" : "text-slate-300"
                            }>
                              {log.message}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-600 italic py-6 text-center">No logs matched your query / filters.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ====================================================
              TAB 3: COMMON FAILURES ANALYZER INDEX
              ==================================================== */}
          {mainTab === "analyzer" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-6"
            >
              <div>
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <ShieldAlert size={18} className="text-indigo-400" />
                  Common Deployment Failures Index
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Read through common failure triggers, immediate diagnostics, and possible fixes. Try testing them inside our Log Diagnostician!
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* LEFT COLLAPSIBLE LIST */}
                <div className="md:col-span-4 space-y-2">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block pb-1 border-b border-slate-800/60">
                    Failure Categories
                  </span>

                  <div className="space-y-1.5 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {COMMON_FAILURES.map((fail, fIdx) => (
                      <button
                        key={fail.id}
                        onClick={() => setSelectedError(fIdx)}
                        className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          selectedError === fIdx
                            ? "bg-indigo-600/10 border-indigo-500 text-indigo-400"
                            : "bg-slate-950/40 border-slate-850 hover:bg-slate-950 text-slate-300"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold block">{fail.title}</span>
                          <span className={`text-[8px] font-bold font-mono px-1.5 py-0.5 rounded uppercase ${
                            fail.severity === "Critical" ? "bg-red-400/10 text-red-400" : fail.severity === "High" ? "bg-amber-400/10 text-amber-400" : "bg-slate-800 text-slate-400"
                          }`}>
                            {fail.severity}
                          </span>
                        </div>
                        <ChevronRight size={14} className="text-slate-500" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* RIGHT SPECIFICATION SHEET */}
                <div className="md:col-span-8 bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-5">
                  {selectedError !== null && COMMON_FAILURES[selectedError] ? (
                    (() => {
                      const err = COMMON_FAILURES[selectedError];
                      return (
                        <div className="space-y-5">
                          <div className="flex justify-between items-start pb-3 border-b border-slate-900">
                            <div>
                              <h4 className="text-sm font-bold text-slate-200">{err.title}</h4>
                              <p className="text-xs text-slate-400 mt-1">{err.description}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                              err.severity === "Critical" ? "bg-red-500/10 text-red-400 border border-red-500/10" : "bg-amber-500/10 text-amber-400 border border-amber-500/10"
                            }`}>
                              {err.severity}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <div className="space-y-1.5 bg-slate-900/20 p-3 rounded-xl border border-slate-900">
                              <span className="text-[10px] text-rose-400 font-mono font-bold block">POSSIBLE CAUSES:</span>
                              <ul className="list-disc pl-4 space-y-1 text-slate-400 leading-relaxed">
                                {err.causes.map((c, cIdx) => (
                                  <li key={cIdx}>{c}</li>
                                ))}
                              </ul>
                            </div>

                            <div className="space-y-1.5 bg-slate-900/20 p-3 rounded-xl border border-slate-900">
                              <span className="text-[10px] text-emerald-400 font-mono font-bold block">RECOMMENDED RESOLUTIONS:</span>
                              <ul className="list-disc pl-4 space-y-1 text-slate-300 leading-relaxed">
                                {err.fixes.map((f, fIdx) => (
                                  <li key={fIdx}>{f}</li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* RAW ERROR STACK / LOG VIEW */}
                          <div className="space-y-2">
                            <span className="text-[10px] text-slate-500 font-bold font-mono uppercase block">SIMULATED FAIL LOG:</span>
                            <pre className="bg-slate-900/60 p-4 rounded-xl text-[10px] font-mono text-rose-300 border border-slate-900 overflow-x-auto leading-relaxed max-h-36">
                              <code>{err.sampleLog}</code>
                            </pre>
                          </div>

                          {/* ACTION BUTTON */}
                          <div className="pt-2 border-t border-slate-900 flex justify-end">
                            <button
                              onClick={() => testWithSampleLog(err.sampleLog)}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Wrench size={12} />
                              <span>Import Log & Test Diagnostician</span>
                            </button>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="text-center py-20 text-slate-500">Select a failure category on the left to review.</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ====================================================
              TAB 4: DOWNLOADABLE DEPLOYMENT REPORTS
              ==================================================== */}
          {mainTab === "reports" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-6"
            >
              <div>
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <FileText size={18} className="text-indigo-400" />
                  Downloadable DevOps & Cloud Reports
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Download production-ready Markdown (.md) reports on deployment specifications, container security, Vercel structures, and Render.com integration profiles.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* CARD 1 */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 flex flex-col justify-between h-48 hover:border-slate-800 transition-all">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-full uppercase">DEPLOYMENT_ANALYSIS.md</span>
                    <h4 className="text-xs font-bold text-slate-200 mt-2">Overall Deployment Specifications</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Detailed assessment of the workspace architecture, recommended cloud hosting, environment setups, and secrets validations.
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownloadReport("deployment_analysis")}
                    className="mt-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-200 font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Download size={11} />
                    <span>Download Report</span>
                  </button>
                </div>

                {/* CARD 2 */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 flex flex-col justify-between h-48 hover:border-slate-800 transition-all">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-full uppercase">DOCKER_ANALYSIS.md</span>
                    <h4 className="text-xs font-bold text-slate-200 mt-2">Docker & Compose Validation</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      In-depth audit of the multi-stage Dockerfile, container networks, mount volumes, dependency trims, and Alpine base image setups.
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownloadReport("docker_analysis")}
                    className="mt-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-200 font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Download size={11} />
                    <span>Download Report</span>
                  </button>
                </div>

                {/* CARD 3 */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 flex flex-col justify-between h-48 hover:border-slate-800 transition-all">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-full uppercase">VERCEL_REPORT.md</span>
                    <h4 className="text-xs font-bold text-slate-200 mt-2">Vercel Compatibility Spec</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Validates Vercel router configs, SPA redirects / rewrite paths, edge functions, serverless compatibility, and cache specs.
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownloadReport("vercel_report")}
                    className="mt-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-200 font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Download size={11} />
                    <span>Download Report</span>
                  </button>
                </div>

                {/* CARD 4 */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 flex flex-col justify-between h-48 hover:border-slate-800 transition-all">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-full uppercase">RENDER_REPORT.md</span>
                    <h4 className="text-xs font-bold text-slate-200 mt-2">Render.com Blueprint Report</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Covers the Render Blueprint specification yaml configuration, disk volumes, databases connection pools, and port limits.
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownloadReport("render_report")}
                    className="mt-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-200 font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Download size={11} />
                    <span>Download Report</span>
                  </button>
                </div>

                {/* CARD 5 */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 flex flex-col justify-between h-48 hover:border-slate-800 transition-all">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-full uppercase">CICD_REPORT.md</span>
                    <h4 className="text-xs font-bold text-slate-200 mt-2">Continuous Integration Actions</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Detailed review of continuous integration stages (lint, build, test), container compilation checks, caching, and release pipelines.
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownloadReport("cicd_report")}
                    className="mt-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-200 font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Download size={11} />
                    <span>Download Report</span>
                  </button>
                </div>

                {/* CARD 6 */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 flex flex-col justify-between h-48 hover:border-slate-800 transition-all">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-full uppercase">PRODUCTION_READINESS_REPORT.md</span>
                    <h4 className="text-xs font-bold text-slate-200 mt-2">Production Readiness checklist</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Detailed audits scorecard check items with pass/fail indices, granular assessments, and immediate remediation recommendations.
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownloadReport("production_readiness_report")}
                    className="mt-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-200 font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Download size={11} />
                    <span>Download Report</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};
