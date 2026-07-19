import React, { useState } from "react";
import { useParams, useNavigate, Link, Routes, Route } from "react-router-dom";
import { motion } from "motion/react";
import {
  ChevronLeft,
  Cpu,
  FileCode,
  AlertTriangle,
  FileText,
  ShieldAlert,
  Terminal,
  Activity,
  Code,
  Network,
  ClipboardList,
  Flame,
  CheckCircle2,
  AlertCircle,
  Copy,
  Download,
  Database,
  Sparkles,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Repository, Analysis } from "../types";
import { useAppStore } from "../store/useAppStore";

const CodeViewer = React.lazy(() => import("./CodeViewer"));
const MermaidRenderer = React.lazy(() => import("./MermaidRenderer"));
const OrchestratorDashboard = React.lazy(() => import("./OrchestratorDashboard"));
const DeploymentAssistant = React.lazy(() => import("./DeploymentAssistant").then(m => ({ default: m.DeploymentAssistant })));
const KnowledgeBase = React.lazy(() => import("./KnowledgeBase").then(m => ({ default: m.KnowledgeBase })));
const SecurityAudit = React.lazy(() => import("./SecurityAudit").then(m => ({ default: m.SecurityAudit })));

const TabLoadingPlaceholder = () => (
  <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
    <Loader2 className="animate-spin text-indigo-500" size={36} />
    <p className="text-xs font-mono">Loading component module...</p>
  </div>
);

export default function RepositoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const {
    authToken,
    repositories,
    activeAnalyses: analyses,
    handleTriggerAnalysis: onTriggerAnalysis,
    handleSaveFile: onSaveFile,
    handleDeleteFile: onDeleteFile,
  } = useAppStore();

  const repository = repositories.find((r) => r.id === id);

  const onBack = () => navigate('/');
  const params = useParams();
  const validTabs = ["files", "overview", "code_review", "security", "dependency", "planning", "testing", "documentation", "deployment", "orchestrator", "knowledge_base"];
  const urlTab = params["*"]?.split('/')[0] || "files";
  const activeTab = validTabs.includes(urlTab) ? urlTab as any : "files";

  const [planningInput, setPlanningInput] = useState("");
  const [testTargetFile, setTestTargetFile] = useState(
    repository?.files?.length ? repository.files[0].path : ""
  );
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [diagramMode, setDiagramMode] = useState<"visual" | "raw">("visual");

  // Get active analysis of a specific type
  const getLatestAnalysis = (type: string) => {
    return analyses
      .filter((a) => a.analysisType === type && a.repositoryId === repository?.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  };

  const handleTrigger = async (type: string, extraPayload: any = {}) => {
    if (!repository) return;
    setLoadingMap((prev) => ({ ...prev, [type]: true }));
    try {
      await onTriggerAnalysis(repository.id, type, extraPayload);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMap((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleSaveFile = async (path: string, content: string) => {
    if (!repository) return;
    await onSaveFile(repository.id, path, content);
  };

  const handleDeleteFile = async (path: string) => {
    if (!repository) return;
    await onDeleteFile(repository.id, path);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(id);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const activeOverview = getLatestAnalysis("repo_understanding");
  const activeReview = getLatestAnalysis("code_review");
  const activeDeps = getLatestAnalysis("dependency");
  const activePlanning = getLatestAnalysis("planning");
  const activeTesting = getLatestAnalysis("testing");
  const activeDocs = getLatestAnalysis("documentation");
  const activeDeploy = getLatestAnalysis("deployment");
  const activeSecurity = getLatestAnalysis("security");

  if (!repository) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8">
          <div className="flex items-center gap-4">
            <Loader2 className="animate-spin text-indigo-500 shrink-0" size={28} />
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Loading repository...</h2>
              <p className="text-xs text-slate-400 mt-1">
                Loading repository data and reopening the selected tab.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Top Breadcrumb & Title banner */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="text-slate-400 hover:text-white p-2 hover:bg-slate-800/80 rounded-xl transition-all focus:outline-none border border-slate-800"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <span className="text-xs text-indigo-400 font-mono tracking-wider font-semibold uppercase">
            Workspace Project
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight">{repository.name}</h1>
        </div>
      </div>

      {/* Main Framework and language bar */}
      <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Language</div>
            <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-lg text-xs font-mono font-bold">
              {repository.language}
            </span>
          </div>

          <div>
            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Framework</div>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-lg text-xs font-mono font-bold">
              {repository.framework}
            </span>
          </div>

          <div>
            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">AI Framework</div>
            <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-lg text-xs font-mono font-bold">
              LangGraph
            </span>
          </div>

          <div>
            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Status</div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Agent Ready
            </span>
          </div>

          {repository.lastAnalyzedAt && (
            <div>
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Last AI Audit</div>
              <span className="text-xs font-mono text-slate-400 font-medium">
                {new Date(repository.lastAnalyzedAt).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => handleTrigger("repo_understanding")}
          disabled={loadingMap["repo_understanding"]}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl px-5 py-3 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 text-xs focus:outline-none disabled:opacity-50"
        >
          {loadingMap["repo_understanding"] ? (
            <Loader2 size={14} className="animate-spin text-white" />
          ) : (
            <Sparkles size={14} />
          )}
          <span>Full AI Structural Audit</span>
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800 mb-8 overflow-x-auto gap-1 pb-1">
        {[
          { id: "files", label: "Files", icon: Code },
          { id: "knowledge_base", label: "Knowledge Base", icon: Database },
          { id: "overview", label: "Architecture", icon: Network },
          { id: "code_review", label: "Code Review", icon: ShieldAlert },
          { id: "security", label: "Security Audit", icon: ShieldAlert },
          { id: "dependency", label: "Dependency Audit", icon: Cpu },
          { id: "planning", label: "Task Planner", icon: ClipboardList },
          { id: "testing", label: "Unit Tests", icon: FileCode },
          { id: "documentation", label: "Docs Writer", icon: FileText },
          { id: "deployment", label: "DevOps Pipeline", icon: Terminal },
          { id: "orchestrator", label: "Orchestrator", icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                const basePath = `/repo/${encodeURIComponent(repository.id)}`;
                navigate(tab.id === "files" ? basePath : `${basePath}/${tab.id}`);
              }}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg text-xs font-bold transition-all focus:outline-none shrink-0 ${
                activeTab === tab.id
                  ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/50"
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Tab Views */}
      <div className="min-h-[400px]">
        <React.Suspense fallback={<TabLoadingPlaceholder />}>
          {/* TAB 1: FILES WORKSPACE */}
        {activeTab === "files" && (
          <CodeViewer
            files={repository.files}
            onSaveFile={handleSaveFile}
            onDeleteFile={handleDeleteFile}
            repoId={repository.id}
            authToken={authToken}
          />
        )}

        {/* TAB: KNOWLEDGE BASE */}
        {activeTab === "knowledge_base" && (
          <KnowledgeBase
            repoId={repository.id}
            authToken={authToken}
            onRefreshRepo={() => {}}
            analyses={analyses}
          />
        )}

        {/* TAB 2: OVERVIEW ARCHITECTURE */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {!activeOverview ? (
              <div className="text-center py-16 bg-slate-900/10 border border-dashed border-slate-800 rounded-2xl">
                <Network size={40} className="text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400">No architecture diagram created yet</p>
                <button
                  onClick={() => handleTrigger("repo_understanding")}
                  className="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 font-semibold rounded-lg px-4 py-2 mt-4 text-xs border border-indigo-500/20 focus:outline-none"
                >
                  Generate Architecture Insights
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800/60">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={16} className="text-indigo-400" />
                      Structural Overview & Design
                    </h3>
                    <span className="text-[10px] font-mono text-slate-500">
                      Status: {activeOverview.status}
                    </span>
                  </div>

                  {activeOverview.status === "running" ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
                      <Loader2 size={32} className="text-indigo-500 animate-spin" />
                      <p className="text-xs font-mono">Running Architecture Agent...</p>
                    </div>
                  ) : activeOverview.status === "failed" ? (
                    <p className="text-xs text-red-400 p-4 border border-red-950 bg-red-950/20 rounded-xl">
                      {activeOverview.errorMessage}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-300 font-sans leading-relaxed whitespace-pre-line">
                      {activeOverview.resultSummary}
                    </p>
                  )}
                </div>

                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex flex-col min-w-0">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800/60 flex-wrap gap-2">
                    <div className="flex items-center gap-4 flex-wrap">
                      <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-1.5">
                        <Terminal size={16} className="text-indigo-400" />
                        High-Level System Architecture
                      </h3>
                      {activeOverview.mermaidDiagram && activeOverview.status !== "running" && (
                        <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[10px] font-semibold">
                          <button
                            type="button"
                            onClick={() => setDiagramMode("visual")}
                            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                              diagramMode === "visual"
                                ? "bg-indigo-600 text-white"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            Visual Map
                          </button>
                          <button
                            type="button"
                            onClick={() => setDiagramMode("raw")}
                            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                              diagramMode === "raw"
                                ? "bg-indigo-600 text-white"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            Raw Code
                          </button>
                        </div>
                      )}
                    </div>
                    {activeOverview.mermaidDiagram && (
                      <button
                        onClick={() =>
                          handleCopyText(activeOverview.mermaidDiagram || "", "mermaid")
                        }
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold focus:outline-none flex items-center gap-1 cursor-pointer"
                      >
                        <Copy size={12} />
                        <span>{copySuccess === "mermaid" ? "Copied!" : "Copy Code"}</span>
                      </button>
                    )}
                  </div>

                  {activeOverview.status === "running" ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
                      <Loader2 size={32} className="text-indigo-500 animate-spin" />
                      <p className="text-xs font-mono">Generating Mermaid representation...</p>
                    </div>
                  ) : activeOverview.status === "failed" ? (
                    <p className="text-xs text-red-400 p-4 border border-red-950 bg-red-950/20 rounded-xl">
                      {activeOverview.errorMessage}
                    </p>
                  ) : diagramMode === "visual" ? (
                    <MermaidRenderer chart={activeOverview.mermaidDiagram || ""} />
                  ) : (
                    <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto max-h-[400px]">
                      {activeOverview.mermaidDiagram}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CODE REVIEW & SECURITY */}
        {activeTab === "code_review" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldAlert size={20} className="text-red-400 animate-pulse" />
                Line Audit & Vulnerability Scanner
              </h2>
              <button
                onClick={() => handleTrigger("code_review")}
                disabled={loadingMap["code_review"] || activeReview?.status === "running"}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl px-4 py-2 text-xs flex items-center gap-1.5 focus:outline-none disabled:opacity-50"
              >
                {loadingMap["code_review"] ? (
                  <Loader2 size={12} className="animate-spin text-white" />
                ) : (
                  <Sparkles size={12} />
                )}
                <span>Run Code Audit</span>
              </button>
            </div>

            {!activeReview ? (
              <div className="text-center py-16 bg-slate-900/10 border border-dashed border-slate-800 rounded-2xl">
                <ShieldAlert size={40} className="text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Code Audit has not been executed yet</p>
                <p className="text-xs text-slate-600 mt-1">Audit your codebase for logic flaws, sql injection, or secrets leakage</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
                  <h3 className="font-bold text-white text-xs uppercase tracking-wider border-b border-slate-800 pb-2 mb-3">
                    High-Level Scan Outcome
                  </h3>
                  {activeReview.status === "running" ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-3 text-slate-500">
                      <Loader2 size={24} className="text-indigo-500 animate-spin" />
                      <p className="text-xs font-mono">Auditing code and secrets...</p>
                    </div>
                  ) : activeReview.status === "failed" ? (
                    <p className="text-xs text-red-400">{activeReview.errorMessage}</p>
                  ) : (
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {activeReview.resultSummary}
                    </p>
                  )}
                </div>

                {activeReview.status !== "running" && activeReview.annotations && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-white text-xs uppercase tracking-wider mb-2">
                      Line Annotations ({activeReview.annotations.length})
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {activeReview.annotations.map((ann, idx) => {
                        const isCrit = ann.severity === "critical";
                        const isWarn = ann.severity === "warning";
                        return (
                          <div
                            key={idx}
                            className={`border rounded-xl p-4 flex gap-4 items-start ${
                              isCrit
                                ? "border-red-900/40 bg-red-950/10"
                                : isWarn
                                ? "border-yellow-900/40 bg-yellow-950/10"
                                : "border-blue-900/40 bg-blue-950/10"
                            }`}
                          >
                            <div className="shrink-0 mt-0.5">
                              {isCrit ? (
                                <Flame className="text-red-400" size={18} />
                              ) : isWarn ? (
                                <AlertTriangle className="text-yellow-400" size={18} />
                              ) : (
                                <AlertCircle className="text-blue-400" size={18} />
                              )}
                            </div>

                            <div className="flex-grow min-w-0">
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                <span className="font-mono text-xs font-bold text-slate-200 truncate">
                                  {ann.filePath}
                                  {ann.lineNumber && <span className="text-indigo-400 font-semibold">:L{ann.lineNumber}</span>}
                                </span>
                                <div className="flex gap-2 shrink-0">
                                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${
                                    isCrit ? "bg-red-500/20 text-red-400" : isWarn ? "bg-yellow-500/20 text-yellow-400" : "bg-blue-500/20 text-blue-400"
                                  }`}>
                                    {ann.severity}
                                  </span>
                                  <span className="text-[10px] font-mono bg-slate-950 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-md">
                                    {ann.category}
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-slate-300 leading-relaxed font-sans">{ann.comment}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: DEPENDENCY AUDIT */}
        {activeTab === "dependency" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Cpu size={20} className="text-amber-400" />
                Vulnerability & Manifest Audit
              </h2>
              <button
                onClick={() => handleTrigger("dependency")}
                disabled={loadingMap["dependency"] || activeDeps?.status === "running"}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl px-4 py-2 text-xs flex items-center gap-1.5 focus:outline-none disabled:opacity-50"
              >
                {loadingMap["dependency"] ? (
                  <Loader2 size={12} className="animate-spin text-white" />
                ) : (
                  <Sparkles size={12} />
                )}
                <span>Audit Dependencies</span>
              </button>
            </div>

            {!activeDeps ? (
              <div className="text-center py-16 bg-slate-900/10 border border-dashed border-slate-800 rounded-2xl">
                <Cpu size={40} className="text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Dependency audit has not been conducted yet</p>
                <p className="text-xs text-slate-600 mt-1">Check package.json, requirements.txt, pyproject.toml, pom.xml, Gradle, go.mod, Cargo.toml, and Gemfile manifests</p>
              </div>
            ) : (
              <div className="space-y-6">
                {activeDeps.status === "running" ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
                    <Loader2 size={32} className="text-indigo-500 animate-spin" />
                    <p className="text-xs font-mono">Scanning packages and resolving advisories...</p>
                  </div>
                ) : activeDeps.status === "failed" ? (
                  <p className="text-xs text-red-400">{activeDeps.errorMessage}</p>
                ) : !activeDeps.dependencies?.length ? (
                  <div className="text-center py-16 bg-slate-900/10 border border-dashed border-slate-800 rounded-2xl">
                    <Cpu size={40} className="text-slate-600 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">No supported dependencies were found in this repository.</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Supported manifests include package.json, requirements.txt, pyproject.toml, pom.xml, Gradle, go.mod, Cargo.toml, and Gemfile.
                    </p>
                    {activeDeps.resultSummary && (
                      <p className="text-[11px] text-slate-500 mt-3 font-mono">{activeDeps.resultSummary}</p>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/30 flex items-center justify-between gap-3">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                        {activeDeps.dependencies.length} dependencies found
                      </span>
                      {activeDeps.resultSummary && (
                        <span className="text-[10px] text-slate-500 font-mono truncate">
                          {activeDeps.resultSummary}
                        </span>
                      )}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 uppercase tracking-wider font-bold">
                            <th className="p-4 font-semibold">Package Name</th>
                            <th className="p-4 font-semibold">Current Constraint</th>
                            <th className="p-4 font-semibold">Latest Version</th>
                            <th className="p-4 font-semibold">Upgrade Status</th>
                            <th className="p-4 font-semibold">Vulnerability status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850">
                          {activeDeps.dependencies?.map((dep, idx) => (
                            <tr key={idx} className="hover:bg-slate-900/20 text-slate-300 font-mono">
                              <td className="p-4 font-bold text-white">{dep.name}</td>
                              <td className="p-4">{dep.current}</td>
                              <td className="p-4">{dep.latest}</td>
                              <td className="p-4">
                                {dep.outdated ? (
                                  <span className="text-yellow-400 font-semibold">Outdated</span>
                                ) : (
                                  <span className="text-emerald-400 font-semibold">Current</span>
                                )}
                              </td>
                              <td className="p-4">
                                {dep.vulnerable ? (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-red-400 font-semibold uppercase text-[10px] bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-md inline-block w-max">
                                      Vulnerable
                                    </span>
                                    {dep.vulnerabilityDetails && (
                                      <span className="font-sans text-[10px] text-slate-400 break-words max-w-xs">
                                        {dep.vulnerabilityDetails}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-emerald-400 font-semibold uppercase text-[10px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md inline-block w-max">
                                    Clean
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: PLANNING FEATURE WORK */}
        {activeTab === "planning" && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ClipboardList size={20} className="text-indigo-400" />
              Ticket/Feature Development Planner
            </h2>

            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider pb-3 mb-4 border-b border-slate-800">
                Explain Feature specs / Ticket requirement
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleTrigger("planning", { requestText: planningInput });
                }}
                className="space-y-4"
              >
                <textarea
                  required
                  value={planningInput}
                  onChange={(e) => setPlanningInput(e.target.value)}
                  placeholder="e.g. Build an API endpoint /tasks/search/ that performs case-insensitive database lookups by task title, including unit validation."
                  className="w-full h-24 bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs font-sans text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all resize-none"
                />
                <button
                  type="submit"
                  disabled={loadingMap["planning"] || !planningInput.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl px-4 py-2.5 text-xs flex items-center gap-1.5 focus:outline-none disabled:opacity-50 ml-auto"
                >
                  {loadingMap["planning"] ? (
                    <Loader2 size={12} className="animate-spin text-white" />
                  ) : (
                    <Sparkles size={12} />
                  )}
                  <span>Generate Development Checklist</span>
                </button>
              </form>
            </div>

            {activePlanning && (
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800/60">
                  <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    AI Action Plan
                  </h3>
                </div>

                {activePlanning.status === "running" ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-3 text-slate-500">
                    <Loader2 size={24} className="text-indigo-500 animate-spin" />
                    <p className="text-xs font-mono">Decomposing features and planning steps...</p>
                  </div>
                ) : activePlanning.status === "failed" ? (
                  <p className="text-xs text-red-400">{activePlanning.errorMessage}</p>
                ) : (
                  <div className="space-y-4">
                    {activePlanning.tasks?.map((task, idx) => (
                      <div key={idx} className="bg-slate-950/50 border border-slate-850 p-4 rounded-xl flex gap-3 items-start">
                        <span className="bg-slate-900 border border-slate-800 text-slate-500 font-mono text-[10px] font-bold px-2 py-1 rounded-md mt-0.5 shrink-0">
                          Step {idx + 1}
                        </span>

                        <div className="flex-grow min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <h4 className="text-xs font-bold text-white truncate">{task.title}</h4>
                            <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md ${
                              task.complexity === "L" ? "bg-red-500/20 text-red-400" : task.complexity === "M" ? "bg-yellow-500/20 text-yellow-400" : "bg-blue-500/20 text-blue-400"
                            }`}>
                              Complexity {task.complexity}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-sans leading-relaxed">{task.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: UNIT TESTING */}
        {activeTab === "testing" && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileCode size={20} className="text-indigo-400" />
              Automated Unit Test Generator
            </h2>

            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider pb-3 mb-4 border-b border-slate-800">
                Select Source File & Build Suite
              </h3>
              <div className="flex flex-col sm:flex-row items-end gap-4">
                <div className="flex-grow">
                  <label className="block text-xs text-slate-400 mb-2">Target File Path</label>
                  <select
                    value={testTargetFile}
                    onChange={(e) => setTestTargetFile(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
                  >
                    {repository.files?.map((f) => (
                      <option key={f.path} value={f.path}>
                        {f.path}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => handleTrigger("testing", { targetPath: testTargetFile })}
                  disabled={loadingMap["testing"] || !testTargetFile}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl px-4 py-3 text-xs flex items-center gap-1.5 focus:outline-none disabled:opacity-50 shrink-0"
                >
                  {loadingMap["testing"] ? (
                    <Loader2 size={12} className="animate-spin text-white" />
                  ) : (
                    <Sparkles size={12} />
                  )}
                  <span>Generate Test Suite</span>
                </button>
              </div>
            </div>

            {activeTesting && (
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex flex-col">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800/60">
                  <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Code size={16} className="text-indigo-400" />
                    Generated Test Code
                  </h3>
                  {activeTesting.testsCode && (
                    <button
                      onClick={() => handleCopyText(activeTesting.testsCode || "", "tests")}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold focus:outline-none flex items-center gap-1"
                    >
                      <Copy size={12} />
                      <span>{copySuccess === "tests" ? "Copied!" : "Copy Suite"}</span>
                    </button>
                  )}
                </div>

                {activeTesting.status === "running" ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
                    <Loader2 size={24} className="text-indigo-500 animate-spin" />
                    <p className="text-xs font-mono">Writing mock suites and decorators...</p>
                  </div>
                ) : activeTesting.status === "failed" ? (
                  <p className="text-xs text-red-400">{activeTesting.errorMessage}</p>
                ) : (
                  <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto max-h-[350px]">
                    {activeTesting.testsCode}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 7: DOCUMENTATION WRITER */}
        {activeTab === "documentation" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText size={20} className="text-indigo-400" />
                Automated Documentation Writer
              </h2>
              <button
                onClick={() => handleTrigger("documentation")}
                disabled={loadingMap["documentation"] || activeDocs?.status === "running"}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl px-4 py-2 text-xs flex items-center gap-1.5 focus:outline-none disabled:opacity-50"
              >
                {loadingMap["documentation"] ? (
                  <Loader2 size={12} className="animate-spin text-white" />
                ) : (
                  <Sparkles size={12} />
                )}
                <span>Generate README.md</span>
              </button>
            </div>

            {!activeDocs ? (
              <div className="text-center py-16 bg-slate-900/10 border border-dashed border-slate-800 rounded-2xl">
                <FileText size={40} className="text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Documentation README.md has not been drafted yet</p>
                <p className="text-xs text-slate-600 mt-1">AI documentation agent will analyze structure to compile installation steps</p>
              </div>
            ) : (
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex flex-col">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800/60">
                  <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={16} className="text-indigo-400" />
                    README.md Content
                  </h3>
                  {activeDocs.readmeMarkdown && (
                    <button
                      onClick={() => handleCopyText(activeDocs.readmeMarkdown || "", "readme")}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold focus:outline-none flex items-center gap-1"
                    >
                      <Copy size={12} />
                      <span>{copySuccess === "readme" ? "Copied!" : "Copy Markdown"}</span>
                    </button>
                  )}
                </div>

                {activeDocs.status === "running" ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
                    <Loader2 size={24} className="text-indigo-500 animate-spin" />
                    <p className="text-xs font-mono">Writing and structuring markdown files...</p>
                  </div>
                ) : activeDocs.status === "failed" ? (
                  <p className="text-xs text-red-400">{activeDocs.errorMessage}</p>
                ) : (
                  <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 text-xs font-sans text-slate-300 overflow-x-auto max-h-[400px] leading-relaxed whitespace-pre-line">
                    {activeDocs.readmeMarkdown}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 8: DEPLOYMENT DEVOPS ASSISTANT */}
        {activeTab === "deployment" && (
          <DeploymentAssistant
            repository={repository}
            activeDeploy={activeDeploy}
            onTriggerDeployment={() => handleTrigger("deployment")}
            loadingDeployment={loadingMap["deployment"] || activeDeploy?.status === "running"}
            authToken={authToken}
          />
        )}

        {/* TAB 8.5: SECURITY AUDIT */}
        {activeTab === "security" && (
          <SecurityAudit
            repository={repository}
            activeSecurityAnalysis={activeSecurity}
            onTriggerAudit={() => handleTrigger("security")}
            loadingAudit={loadingMap["security"]}
          />
        )}

        {/* TAB 9: MULTI-AGENT ORCHESTRATOR */}
        {activeTab === "orchestrator" && (
          <OrchestratorDashboard repositoryId={repository.id} authToken={authToken} />
        )}

        </React.Suspense>
      </div>
    </div>
  );
}
