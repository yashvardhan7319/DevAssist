import React, { useState } from "react";
import { motion } from "motion/react";
import {
  GitFork,
  FolderPlus,
  ArrowRight,
  Terminal,
  Activity,
  Code2,
  Clock,
  Trash2,
  Cpu,
  BookOpen,
  Github,
  Globe,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { Repository } from "../types";
import { useAppStore } from "../store/useAppStore";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const {
    repositories,
    handleConnectRepo,
    handleDeleteRepo,
    user
  } = useAppStore();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [createType, setCreateType] = useState<"github" | "zip">("zip");
  const [name, setName] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [language, setLanguage] = useState("TypeScript");
  const [framework, setFramework] = useState("React");
  const [loading, setLoading] = useState(false);

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (createType === "github" && !githubUrl.trim()) return;
    if (createType === "zip" && !name.trim()) return;

    setLoading(true);
    try {
      if (createType === "github") {
        await handleConnectRepo({
          sourceType: "github",
          githubUrl: githubUrl.trim(),
          githubToken: githubToken.trim() || undefined,
        });
      } else {
        await handleConnectRepo({
          name,
          language,
          framework,
          sourceType: "zip",
        });
      }
      setName("");
      setGithubUrl("");
      setGithubToken("");
      setIsCreating(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getLanguageColor = (lang: string) => {
    const l = lang.toLowerCase();
    if (l === "typescript" || l === "ts") return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    if (l === "python" || l === "py") return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    if (l === "javascript" || l === "js") return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  };

  const getFrameworkColor = (fw: string) => {
    const f = fw.toLowerCase();
    if (f === "react") return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
    if (f === "fastapi") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (f === "express" || f === "node") return "bg-green-500/10 text-green-400 border-green-500/20";
    return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  };

  // Stats calculation
  const totalFiles = repositories.reduce((sum, r) => sum + (r.files?.length || 0), 0);
  const totalAnalyzed = repositories.filter((r) => r.lastAnalyzedAt).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Top Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Cpu className="text-indigo-500" size={32} />
            Workspace Dashboard
          </h1>
          <p className="text-slate-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Logged in as <span className="text-indigo-400 font-mono font-medium">{user?.username}</span> • Role: user</span>
          </p>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl px-5 py-3 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 text-sm"
        >
          <FolderPlus size={18} />
          <span>New Workspace Project</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <div className="bg-slate-900/50 border border-indigo-500/20 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl border bg-indigo-500/10 border-indigo-500/20 text-indigo-400">
              <UserCog size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">User Panel</h2>
              <p className="text-xs text-slate-400 mt-1">
                Developer workspace for importing repositories, running agents, and reviewing generated outputs.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-mono">
                <span className="px-2 py-1 rounded border border-indigo-500/30 text-indigo-300 bg-indigo-500/10">
                  {user?.username}
                </span>
                <span className={`px-2 py-1 rounded border ${user?.hasGithubToken ? "border-emerald-500/30 text-emerald-300 bg-emerald-500/10" : "border-slate-800 text-slate-500 bg-slate-950/60"}`}>
                  GitHub: {user?.githubUsername || (user?.hasGithubToken ? "connected" : "not connected")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
            <GitFork size={22} />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">{repositories.length}</div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-0.5">Projects</div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <Code2 size={22} />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">{totalFiles}</div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-0.5">Files Indexed</div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
            <Activity size={22} />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">{totalAnalyzed}</div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-0.5">Analyses Completed</div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 flex items-center gap-4">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
            <Clock size={22} />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Active</div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-1">Multi-Agent State</div>
          </div>
        </div>
      </div>

      {/* Slide-out or Drop-down Connection Wizard */}
      {isCreating && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-slate-900/40 border border-indigo-500/20 rounded-2xl p-6 mb-10 overflow-hidden font-sans"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-800/60">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FolderPlus size={20} className="text-indigo-400" />
              Establish AI Assistant Workspace
            </h2>
          </div>

          <form onSubmit={handleConnectSubmit} className="space-y-6">
            <div className="inline-flex rounded-xl border border-slate-800 bg-slate-950/60 p-1">
              <button
                type="button"
                onClick={() => setCreateType("zip")}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
                  createType === "zip" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                <FolderPlus size={16} />
                <span>Starter</span>
              </button>
              <button
                type="button"
                onClick={() => setCreateType("github")}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
                  createType === "github" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                <Github size={16} />
                <span>GitHub</span>
              </button>
            </div>

            {createType === "github" ? (
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-6 items-end">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    GitHub Repository URL <span className="text-indigo-400">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/owner/repository"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Access Token
                  </label>
                  <input
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="Required for private repos"
                    autoComplete="off"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl py-3 px-5 transition-colors focus:outline-none disabled:opacity-50 text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/15"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Import</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Project Name <span className="text-indigo-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. weather-microservice"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all text-sm"
                />
                <p className="text-[10px] text-slate-500 mt-1.5">
                  Initialize a clean template codebase to write custom logic from scratch.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Programming Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all text-sm"
                >
                  <option value="TypeScript">TypeScript</option>
                  <option value="Python">Python</option>
                  <option value="JavaScript">JavaScript</option>
                  <option value="Go">Go</option>
                  <option value="Rust">Rust</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Framework Stack
                </label>
                <select
                  value={framework}
                  onChange={(e) => setFramework(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all text-sm"
                >
                  <option value="React">React</option>
                  <option value="FastAPI">FastAPI</option>
                  <option value="Express">Express</option>
                  <option value="Gin">Gin</option>
                  <option value="Next.js">Next.js</option>
                </select>
              </div>

              <div className="md:col-span-1 md:ml-auto w-full">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl py-3 px-4 transition-colors focus:outline-none disabled:opacity-50 text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/15"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Initialize</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
            )}
          </form>
        </motion.div>
      )}

      {/* Connected Codebases list */}
      <div>
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Terminal size={20} className="text-indigo-400" />
          Tracked Developer Workspaces
        </h2>

        {repositories.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl">
            <Code2 size={48} className="text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">No projects linked to this account yet</p>
            <p className="text-slate-600 text-sm mt-1">Create a new project workspace above or load standard templates</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {repositories.map((repo) => (
              <motion.div
                key={repo.id}
                whileHover={{ y: -4 }}
                onClick={() => navigate(`/repo/${encodeURIComponent(repo.id)}`)}
                className="group relative bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/50 hover:border-indigo-500/30 rounded-2xl p-6 transition-all cursor-pointer backdrop-blur-sm overflow-hidden"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2 min-w-0">
                      {repo.sourceType === "github" ? (
                        <Github className="text-indigo-400 shrink-0" size={16} />
                      ) : (
                        <Globe className="text-indigo-400 shrink-0" size={16} />
                      )}
                      <h3 className="text-lg font-bold text-white tracking-tight truncate" title={repo.name}>
                        {repo.name}
                      </h3>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${getLanguageColor(repo.language)}`}>
                        {repo.language}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${getFrameworkColor(repo.framework)}`}>
                        {repo.framework}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 flex items-center gap-1 mb-2">
                    <Clock size={12} />
                    Connected: {new Date(repo.connectedAt).toLocaleDateString()}
                  </p>

                  {repo.githubUrl && (
                    <p className="text-xs text-slate-500 truncate mb-2" title={repo.githubUrl}>
                      {repo.githubUrl}
                    </p>
                  )}

                  <div className="text-sm text-slate-400 font-mono bg-slate-950/50 rounded-xl p-3 mb-6 border border-slate-800/60 flex justify-between items-center">
                    <span className="text-slate-500">Tracked Files:</span>
                    <span className="text-indigo-400 font-semibold">{repo.files?.length || 0}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 border-t border-slate-800/60 pt-4">
                  <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRepo(repo.id);
                      }}
                    className="text-slate-500 hover:text-red-400 p-2 rounded-xl hover:bg-red-500/10 transition-all focus:outline-none"
                    title="Delete Project Workspace"
                  >
                    <Trash2 size={16} />
                  </button>

                  <button
                    className="bg-slate-800/80 hover:bg-indigo-600 hover:text-white text-indigo-400 font-semibold rounded-xl px-4 py-2.5 transition-all text-sm flex items-center gap-2 focus:outline-none"
                  >
                    <span>Launch Workspace</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
