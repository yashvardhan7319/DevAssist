export interface User {
  id: string;
  username: string;
  email: string;
  role: "admin" | "developer" | "viewer";
  githubUsername?: string;
  hasGithubToken?: boolean;
  hasSystemGithubToken?: boolean;
  systemGithubUsername?: string | null;
}

export interface RepoFile {
  path: string;
  content: string;
  size: number;
}

export interface Repository {
  id: string;
  userId: string;
  name: string;
  sourceType: "github" | "zip";
  githubUrl?: string;
  localPath: string;
  branch: string;
  language: string;
  framework: string;
  status: "pending" | "ready" | "error";
  connectedAt: string;
  lastAnalyzedAt?: string;
  files: RepoFile[];
}

export interface CodeReviewAnnotation {
  filePath: string;
  lineNumber?: number;
  severity: "info" | "warning" | "critical";
  category: string;
  comment: string;
}

export interface SecurityFinding {
  id: string;
  category: "secrets" | "api_keys" | "jwt" | "authentication" | "authorization" | "sql_injection" | "xss" | "csrf" | "ssrf" | "dependency" | "env_vars" | "cors" | "headers";
  title: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  description: string;
  filePath?: string;
  lineNumber?: number;
  snippet?: string;
  remediation: string;
}

export interface SecurityReport {
  overallRiskScore: number;
  summary: string;
  findings: SecurityFinding[];
  scannedAt: string;
  stats: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
}

export interface Analysis {
  id: string;
  repositoryId: string;
  analysisType: "repo_understanding" | "planning" | "code_review" | "dependency" | "testing" | "documentation" | "deployment" | "security";
  status: "queued" | "running" | "completed" | "failed";
  resultSummary?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
  // Specific results
  annotations?: CodeReviewAnnotation[];
  mermaidDiagram?: string;
  tasks?: Array<{ title: string; complexity: "S" | "M" | "L"; description: string }>;
  dependencies?: Array<{ name: string; current: string; latest: string; outdated: boolean; vulnerable: boolean; vulnerabilityDetails?: string }>;
  testsCode?: string;
  readmeMarkdown?: string;
  dockerfileContent?: string;
  dockerComposeContent?: string;
  githubActionsContent?: string;
  vercelConfig?: string;
  renderConfig?: string;
  detectedEnvVars?: Array<{ name: string; description: string; isSensitive: boolean; category: string; recommendedValuePlaceholder?: string }>;
  compatibilityReport?: {
    render: { compatible: boolean; issues: string[]; tips: string[] };
    vercel: { compatible: boolean; issues: string[]; tips: string[] };
  };
  productionReadinessScore?: number;
  productionReadinessChecklist?: Array<{ category: string; item: string; passed: boolean; recommendation: string }>;
  securityReport?: SecurityReport;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: "info" | "success" | "error";
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface AgentTask {
  id: string;
  agentId: string;
  name: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  dependencies: string[];
  input?: any;
  output?: any;
  error?: string;
  logs: string[];
  retryCount: number;
  startedAt?: string;
  completedAt?: string;
}

export interface OrchestrationRun {
  id: string;
  repositoryId: string;
  userId: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  tasks: AgentTask[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  userInput?: string;
}
