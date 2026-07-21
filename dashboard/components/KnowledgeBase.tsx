import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Database,
  Sparkles,
  RefreshCw,
  Loader2,
  Search,
  BookOpen,
  ArrowRight,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  FileText,
  Network,
  Cpu,
  GitMerge,
  Workflow,
  HelpCircle,
  FileCode,
  Layers,
  History,
  Terminal,
  MessageSquare
} from "lucide-react";
import MermaidRenderer from "./MermaidRenderer";

interface KnowledgeBaseProps {
  repoId: string;
  authToken: string;
  onRefreshRepo: () => void;
  analyses: any[];
}

const safeText = (val: any, fallback = "Not available"): string => {
  if (!val && val !== 0) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    return val.summary || val.description || val.overview || val.text || JSON.stringify(val, null, 2);
  }
  return String(val);
};

export function KnowledgeBase({ repoId, authToken, onRefreshRepo, analyses }: KnowledgeBaseProps) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [kb, setKb] = useState<any | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any | null>(null);

  // Notes state
  const [noteContent, setNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<"summaries" | "graphs" | "detections" | "notes" | "history">("summaries");
  const [activeGraph, setActiveGraph] = useState<"architecture" | "dependency" | "import" | "call" | "service">("architecture");
  const [activeDetect, setActiveDetect] = useState<"frameworks" | "apis" | "configs" | "database">("frameworks");

  // Filter states
  const [apiSearch, setApiSearch] = useState("");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const handleFetchResponse = async (res: Response, fallbackMsg: string) => {
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("ais_auth_token");
        localStorage.removeItem("ais_user");
        window.dispatchEvent(new Event("ais_unauthorized"));
        throw new Error("Unauthorized session.");
      }
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const err = await res.json();
        throw new Error(err.error || fallbackMsg);
      }
      throw new Error(`${fallbackMsg} (Server status ${res.status})`);
    }
    return res;
  };

  // Load knowledge base on mount
  useEffect(() => {
    fetchKnowledgeBase();
  }, [repoId]);

  const fetchKnowledgeBase = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/repositories/${repoId}/knowledge-base`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      await handleFetchResponse(res, "Failed to fetch knowledge base");
      const data = await res.json();
      if (data.exists) {
        setKb(data.knowledgeBase);
      } else {
        setKb(null);
      }
    } catch (e) {
      console.error("Error fetching knowledge base:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/repositories/${repoId}/knowledge-base/generate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      });
      await handleFetchResponse(res, "Failed to generate knowledge base");
      const data = await res.json();
      if (data.success) {
        setKb(data.knowledgeBase);
        onRefreshRepo();
      }
    } catch (e) {
      console.error("Error generating knowledge base:", e);
    } finally {
      setGenerating(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await fetch(`/api/repositories/${repoId}/knowledge-base/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ query: searchQuery })
      });
      await handleFetchResponse(res, "Failed to perform semantic search");
      const data = await res.json();
      if (data.success) {
        setSearchResult(data);
      }
    } catch (e) {
      console.error("Semantic search failed:", e);
    } finally {
      setSearching(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/repositories/${repoId}/knowledge-base/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ content: noteContent, author: "user" })
      });
      await handleFetchResponse(res, "Failed to add note");
      setNoteContent("");
      await fetchKnowledgeBase();
    } catch (e) {
      console.error("Failed to add note:", e);
    } finally {
      setSavingNote(false);
    }
  };

  const handleSaveEditNote = async (noteId: string) => {
    if (!editingNoteContent.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/repositories/${repoId}/knowledge-base/notes/${noteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ content: editingNoteContent })
      });
      await handleFetchResponse(res, "Failed to update note");
      setEditingNoteId(null);
      setEditingNoteContent("");
      await fetchKnowledgeBase();
    } catch (e) {
      console.error("Failed to update note:", e);
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    try {
      const res = await fetch(`/api/repositories/${repoId}/knowledge-base/notes/${noteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` }
      });
      await handleFetchResponse(res, "Failed to delete note");
      await fetchKnowledgeBase();
    } catch (e) {
      console.error("Failed to delete note:", e);
    }
  };

  // Get current active diagram graph elements
  const getGraphData = () => {
    if (!kb) return null;
    switch (activeGraph) {
      case "dependency": return kb.dependencyGraph;
      case "import": return kb.importGraph;
      case "call": return kb.callGraph;
      case "service": return kb.serviceGraph;
      default: return null;
    }
  };

  const activeGraphData = getGraphData();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
        <Loader2 className="animate-spin text-indigo-500" size={36} />
        <p className="text-xs font-mono">Retrieving project knowledge base...</p>
      </div>
    );
  }

  if (!kb) {
    return (
      <div className="text-center py-16 bg-slate-900/10 border border-dashed border-slate-800 rounded-2xl max-w-2xl mx-auto">
        <Database size={44} className="text-indigo-400/80 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Build Project Knowledge Base</h3>
        <p className="text-sm text-slate-400 px-6 max-w-md mx-auto mb-6">
          Initialize a persistent understanding of this repository. This engine will analyze folder trees, dependencies, file imports, API endpoints, configurations, databases, and build a unified technical cache for semantic lookup.
        </p>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl px-6 py-3 transition-colors flex items-center justify-center gap-2 mx-auto shadow-lg shadow-indigo-600/10 text-xs focus:outline-none disabled:opacity-50 cursor-pointer"
        >
          {generating ? (
            <Loader2 size={14} className="animate-spin text-white" />
          ) : (
            <Sparkles size={14} />
          )}
          <span>{generating ? "Scanning Repository Codebase..." : "Generate Project Knowledge Base"}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* SEMANTIC SEARCH SECTION */}
      <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="text-indigo-400" size={18} />
          <h2 className="font-bold text-white text-sm uppercase tracking-wider">Semantic Retrieval & Grounded Q&A</h2>
        </div>
        
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ask anything about this codebase... (e.g. 'Where are routes handled?', 'Which database is used?')"
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl pl-11 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold px-5 rounded-xl text-xs transition-colors focus:outline-none flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            <span>{searching ? "Searching..." : "Retrieve"}</span>
          </button>
        </form>

        <AnimatePresence mode="wait">
          {searchResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 pt-2 border-t border-slate-800/60"
            >
              <div className="bg-indigo-950/20 border border-indigo-950/80 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="text-indigo-400" size={14} />
                  <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">Grounded Knowledge Base Answer</span>
                </div>
                <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans prose prose-invert">
                  {searchResult.answer}
                </div>
              </div>

              <div>
                <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2">Semantically Matched Sources ({searchResult.matches.length})</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {searchResult.matches.map((m: any, idx: number) => (
                    <div key={idx} className="bg-slate-950/50 border border-slate-800 rounded-lg p-3 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-1.5">
                          <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wide">
                            {m.category}
                          </span>
                          <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/10">
                            {m.score}% Match
                          </span>
                        </div>
                        <h5 className="text-xs font-bold text-white mb-1 truncate">{m.title}</h5>
                        <p className="text-[11px] text-slate-400 leading-normal line-clamp-3 font-mono bg-slate-950/30 p-1.5 rounded border border-slate-900">
                          {m.snippet}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* KNOWLEDGE BASE STRUCTURED TABS */}
      <div>
        <div className="flex border-b border-slate-800 mb-6 overflow-x-auto gap-1 pb-1">
          {[
            { id: "summaries", label: "Summaries & Metrics", icon: FileText },
            { id: "graphs", label: "Connection Graphs", icon: Network },
            { id: "detections", label: "Detections & Specs", icon: Layers },
            { id: "notes", label: "Project Notes", icon: MessageSquare },
            { id: "history", label: "Historical Outputs", icon: History }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-[11px] font-bold transition-all focus:outline-none shrink-0 ${
                  activeSubTab === tab.id
                    ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
          
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="ml-auto text-[10px] font-bold text-indigo-400 hover:text-white flex items-center gap-1.5 border border-indigo-500/20 hover:bg-indigo-500/10 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw size={11} className={generating ? "animate-spin" : ""} />
            <span>{generating ? "Re-Analyzing..." : "Re-Compile Knowledge"}</span>
          </button>
        </div>

        {/* SUB-TAB 1: SUMMARIES */}
        {activeSubTab === "summaries" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800/60">
                  <FileText className="text-indigo-400" size={16} />
                  <h3 className="font-bold text-white text-xs uppercase tracking-wider">Repository Summary</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                  {safeText(kb.projectSummary, "No project summary generated yet.")}
                </p>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800/60">
                  <Layers className="text-indigo-400" size={16} />
                  <h3 className="font-bold text-white text-xs uppercase tracking-wider">Technology Stack Summary</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                  {safeText(kb.technologyStackSummary, "No technology stack summary generated yet.")}
                </p>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800/60">
                  <Workflow className="text-indigo-400" size={16} />
                  <h3 className="font-bold text-white text-xs uppercase tracking-wider">Architecture Summary</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                  {safeText(kb.architectureSummary, "No architecture summary generated yet.")}
                </p>
              </div>
            </div>

            {/* Folder Tree Widget */}
            <div className="lg:col-span-3 bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800/60">
                <FileCode className="text-indigo-400" size={16} />
                <h3 className="font-bold text-white text-xs uppercase tracking-wider">File System Folder Summary Tree</h3>
              </div>
              <pre className="font-mono text-xs bg-slate-950/80 border border-slate-900/60 p-4 rounded-xl text-slate-300 max-h-96 overflow-y-auto leading-relaxed">
                {typeof kb.folderTree === "string" ? kb.folderTree : JSON.stringify(kb.folderTree, null, 2) || "No folder tree available."}
              </pre>
            </div>
          </div>
        )}

        {/* SUB-TAB 2: INTERACTIVE CONNECTION GRAPHS */}
        {activeSubTab === "graphs" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 space-y-2">
              {[
                { id: "architecture", label: "Architecture Graph", desc: "Mermaid Flowchart System", icon: Workflow },
                { id: "dependency", label: "Dependency Graph", desc: "Package constraint linkages", icon: Cpu },
                { id: "import", label: "Import Graph", desc: "File module import mapping", icon: GitMerge },
                { id: "call", label: "Call Graph", desc: "Function & handler calls", icon: Terminal },
                { id: "service", label: "Service Graph", desc: "APIs & database linkages", icon: Database }
              ].map((g) => {
                const Icon = g.icon;
                return (
                  <button
                    key={g.id}
                    onClick={() => {
                      setActiveGraph(g.id as any);
                      setSelectedNode(null);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all focus:outline-none ${
                      activeGraph === g.id
                        ? "bg-indigo-600/10 border-indigo-500/30 text-white"
                        : "bg-slate-900/30 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon size={14} className={activeGraph === g.id ? "text-indigo-400" : ""} />
                      <div>
                        <div className="text-xs font-bold">{g.label}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{g.desc}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="lg:col-span-3 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 min-h-[400px] flex flex-col justify-between">
              {activeGraph === "architecture" ? (
                <div className="flex flex-col h-full min-w-0">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800/60">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Rendered Architecture Mermaid Diagram</h4>
                    <span className="text-[10px] font-mono text-slate-500">Live SVG Canvas</span>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-6 flex items-center justify-center overflow-auto">
                    <MermaidRenderer chart={kb.architectureGraph} />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800/60">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      {activeGraph.toUpperCase()} CONNECTIONS
                    </h4>
                    <span className="text-[10px] font-mono text-slate-500">
                      Nodes: {activeGraphData?.nodes?.length || 0} | Links: {activeGraphData?.links?.length || 0}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                    {/* Node Selector List */}
                    <div>
                      <h5 className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-2">Select Node to Trace</h5>
                      <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-3 max-h-80 overflow-y-auto space-y-1">
                        {activeGraphData?.nodes?.map((node: any) => {
                          const isSelected = selectedNode === node.id;
                          return (
                            <button
                              key={node.id}
                              onClick={() => setSelectedNode(node.id)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono truncate transition-all flex items-center justify-between ${
                                isSelected
                                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/20"
                                  : "text-slate-300 hover:bg-slate-900/50"
                              }`}
                            >
                              <span>{node.label || node.id}</span>
                              {node.type && (
                                <span className="bg-slate-800 text-slate-400 text-[9px] px-1 py-0.2 rounded font-sans">
                                  {node.type}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Connection Trace Panel */}
                    <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 flex flex-col justify-between">
                      {selectedNode ? (
                        <div className="space-y-4">
                          <div>
                            <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Traced Node</span>
                            <div className="text-sm font-bold font-mono text-white mt-0.5">{selectedNode}</div>
                          </div>

                          {/* Outward links */}
                          <div>
                            <span className="text-[9px] uppercase font-bold tracking-wider text-indigo-400">Depends On / Outbound</span>
                            <div className="space-y-1 mt-1.5">
                              {activeGraphData?.links
                                ?.filter((l: any) => l.source === selectedNode)
                                .map((l: any, i: number) => (
                                  <div key={i} className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-slate-900/40 px-2 py-1.5 rounded border border-slate-900">
                                    <ArrowRight size={12} className="text-indigo-400" />
                                    <span>{l.target}</span>
                                  </div>
                                ))}
                              {activeGraphData?.links?.filter((l: any) => l.source === selectedNode).length === 0 && (
                                <div className="text-[11px] text-slate-600 font-mono italic">No outbound connections.</div>
                              )}
                            </div>
                          </div>

                          {/* Inward links */}
                          <div>
                            <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-400">Depended On By / Inbound</span>
                            <div className="space-y-1 mt-1.5">
                              {activeGraphData?.links
                                ?.filter((l: any) => l.target === selectedNode)
                                .map((l: any, i: number) => (
                                  <div key={i} className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-slate-900/40 px-2 py-1.5 rounded border border-slate-900">
                                    <ArrowRight size={12} className="text-emerald-400" />
                                    <span>{l.source}</span>
                                  </div>
                                ))}
                              {activeGraphData?.links?.filter((l: any) => l.target === selectedNode).length === 0 && (
                                <div className="text-[11px] text-slate-600 font-mono italic">No inbound connections.</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-500 text-center gap-2">
                          <HelpCircle size={24} />
                          <p className="text-[11px] font-mono">Select a node from the left list to trace component connections and structural relationships.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUB-TAB 3: DETECTIONS */}
        {activeSubTab === "detections" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 space-y-2">
              {[
                { id: "frameworks", label: "Framework & Languages", desc: "Detected engines & percentages", icon: Cpu },
                { id: "apis", label: "API Endpoints", desc: "Detected routes & descriptions", icon: Terminal },
                { id: "configs", label: "Configuration Files", desc: "Scanned configuration scope", icon: FileCode },
                { id: "database", label: "Database System", desc: "Detected database specs & ORM", icon: Database }
              ].map((d) => {
                const Icon = d.icon;
                return (
                  <button
                    key={d.id}
                    onClick={() => setActiveDetect(d.id as any)}
                    className={`w-full text-left p-3 rounded-xl border transition-all focus:outline-none ${
                      activeDetect === d.id
                        ? "bg-indigo-600/10 border-indigo-500/30 text-white"
                        : "bg-slate-900/30 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon size={14} className={activeDetect === d.id ? "text-indigo-400" : ""} />
                      <div>
                        <div className="text-xs font-bold">{d.id === "apis" ? "API Endpoints / Documentation" : d.label}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{d.desc}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="lg:col-span-3 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 min-h-[350px]">
              {/* frameworks */}
              {activeDetect === "frameworks" && (
                <div className="space-y-6">
                  <div className="pb-2 border-b border-slate-800/60">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Framework Detections</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-950/60 border border-slate-900 p-4 rounded-xl">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Framework Name</span>
                      <div className="text-base font-bold text-white mt-0.5">{kb.frameworkDetection.framework}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-1">Confidence Score: {(kb.frameworkDetection.confidence * 100).toFixed(0)}%</div>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-900 p-4 rounded-xl">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 font-mono">Framework files detected</span>
                      <ul className="space-y-1 mt-1.5 max-h-24 overflow-y-auto">
                        {kb.frameworkDetection.filesDetected?.map((file: string, idx: number) => (
                          <li key={idx} className="text-[11px] font-mono text-indigo-400 truncate">{file}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pb-2 border-b border-slate-800/60 pt-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Language Breakdowns</h4>
                  </div>
                  <div className="space-y-3">
                    {kb.languageDetection?.map((lang: any, idx: number) => (
                      <div key={idx} className="bg-slate-950/40 border border-slate-900 p-3 rounded-xl">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-white font-mono">{lang.language}</span>
                          <span className="text-xs text-indigo-400 font-mono font-bold">{lang.percentage}%</span>
                        </div>
                        {/* progress bar */}
                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${lang.percentage}%` }} />
                        </div>
                        <div className="mt-2">
                          <span className="text-[9px] font-mono font-bold text-slate-500">Files analysed:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {lang.filesDetected?.map((f: string, i: number) => (
                              <span key={i} className="text-[10px] font-mono text-slate-300 bg-slate-900/60 border border-slate-900 px-1.5 py-0.5 rounded truncate max-w-xs">{f}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* apis */}
              {activeDetect === "apis" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800/60 flex-wrap gap-2">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Scanned HTTP Endpoint Docs</h4>
                    <input
                      type="text"
                      value={apiSearch}
                      onChange={(e) => setApiSearch(e.target.value)}
                      placeholder="Filter endpoints..."
                      className="bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-[11px] font-mono text-white placeholder-slate-500 rounded-lg px-2.5 py-1 w-44"
                    />
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3">Method</th>
                          <th className="py-2.5 px-3">Path</th>
                          <th className="py-2.5 px-3">Description</th>
                          <th className="py-2.5 px-3">Handler File</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kb.apiDetection
                          ?.filter((api: any) => 
                            api.path.toLowerCase().includes(apiSearch.toLowerCase()) ||
                            api.method.toLowerCase().includes(apiSearch.toLowerCase()) ||
                            api.description.toLowerCase().includes(apiSearch.toLowerCase())
                          )
                          .map((api: any, idx: number) => {
                            const isGet = api.method.toUpperCase() === "GET";
                            const isPost = api.method.toUpperCase() === "POST";
                            const isPut = api.method.toUpperCase() === "PUT";
                            return (
                              <tr key={idx} className="border-b border-slate-900 hover:bg-slate-950/30 font-mono text-[11px] transition-colors">
                                <td className="py-3 px-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    isGet ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10" :
                                    isPost ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/10" :
                                    isPut ? "bg-amber-500/10 text-amber-400 border border-amber-500/10" :
                                    "bg-rose-500/10 text-rose-400 border border-rose-500/10"
                                  }`}>
                                    {api.method}
                                  </span>
                                </td>
                                <td className="py-3 px-3 font-bold text-white truncate max-w-xs">{api.path}</td>
                                <td className="py-3 px-3 text-slate-400 font-sans leading-normal max-w-sm">{api.description}</td>
                                <td className="py-3 px-3 text-indigo-400 truncate max-w-[150px]">{api.handlerFile}</td>
                              </tr>
                            );
                          })}
                        {kb.apiDetection?.length === 0 && (
                          <tr>
                            <td colSpan={4} className="text-center py-8 text-slate-500 font-sans italic">No API endpoints detected in this repository.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* configs */}
              {activeDetect === "configs" && (
                <div className="space-y-4">
                  <div className="pb-2 border-b border-slate-800/60">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Scanned System Configurations</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {kb.configurationDetection?.map((cfg: any, idx: number) => (
                      <div key={idx} className="bg-slate-950/60 border border-slate-900 p-4 rounded-xl flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <h5 className="text-xs font-bold text-white font-mono truncate">{cfg.file}</h5>
                            <span className="bg-slate-800 text-slate-400 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">{cfg.type}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed mt-1 font-sans">{cfg.purpose}</p>
                        </div>
                      </div>
                    ))}
                    {kb.configurationDetection?.length === 0 && (
                      <div className="col-span-2 text-center py-12 text-slate-500 font-sans italic">No custom configurations detected.</div>
                    )}
                  </div>
                </div>
              )}

              {/* database */}
              {activeDetect === "database" && (
                <div className="space-y-6">
                  <div className="pb-2 border-b border-slate-800/60">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Database Architectures</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-950/60 border border-slate-900 p-4 rounded-xl">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Database Engine</span>
                      <div className="text-base font-bold text-white mt-0.5">{kb.databaseDetection.dbType}</div>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-900 p-4 rounded-xl">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 font-mono">ORM/Driver</span>
                      <div className="text-base font-bold text-indigo-400 mt-0.5">{kb.databaseDetection.orm || "None detected"}</div>
                    </div>

                    <div className="sm:col-span-2 bg-slate-950/40 border border-slate-900 p-4 rounded-xl">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 font-mono">Database Initialization Files Scanned</span>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {kb.databaseDetection.detectedFiles?.map((file: string, idx: number) => (
                          <span key={idx} className="text-[11px] font-mono text-slate-300 bg-slate-900 border border-slate-900 px-2 py-0.5 rounded">{file}</span>
                        ))}
                        {kb.databaseDetection.detectedFiles?.length === 0 && (
                          <span className="text-[11px] font-mono text-slate-600 italic">No initialization files scanned.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUB-TAB 4: PROJECT NOTES */}
        {activeSubTab === "notes" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create note */}
            <div className="lg:col-span-1 bg-slate-900/40 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Plus size={14} className="text-indigo-400" />
                  Add Project Note
                </h4>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Record execution shortcuts, architectural warnings, custom configuration variables, or task notes..."
                  className="w-full h-44 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none resize-none transition-colors"
                />
              </div>
              <button
                onClick={handleAddNote}
                disabled={savingNote || !noteContent.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs mt-3 transition-colors focus:outline-none flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {savingNote ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                <span>Save Note</span>
              </button>
            </div>

            {/* List notes */}
            <div className="lg:col-span-2 space-y-4 max-h-[450px] overflow-y-auto pr-1">
              {kb.notes?.slice().reverse().map((note: any) => {
                const isEditing = editingNoteId === note.id;
                return (
                  <div key={note.id} className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            note.author === "agent" ? "bg-indigo-500/10 text-indigo-400" : "bg-slate-800 text-slate-300"
                          }`}>
                            {note.author}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 font-medium">
                            {new Date(note.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveEditNote(note.id)}
                                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors focus:outline-none"
                              >
                                <Save size={13} />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingNoteId(null);
                                  setEditingNoteContent("");
                                }}
                                className="text-xs text-rose-400 hover:text-rose-300 transition-colors focus:outline-none"
                              >
                                <X size={13} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setEditingNoteId(note.id);
                                  setEditingNoteContent(note.content);
                                }}
                                className="text-xs text-slate-400 hover:text-white transition-colors focus:outline-none"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="text-xs text-rose-400 hover:text-rose-300 transition-colors focus:outline-none"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        <textarea
                          value={editingNoteContent}
                          onChange={(e) => setEditingNoteContent(e.target.value)}
                          className="w-full h-24 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-2.5 text-xs text-white focus:outline-none resize-none"
                        />
                      ) : (
                        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                          {note.content}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              {kb.notes?.length === 0 && (
                <div className="text-center py-16 text-slate-500 font-mono italic bg-slate-900/10 border border-dashed border-slate-800/80 rounded-xl">
                  No custom project notes logged yet. Record some structural shortcuts above.
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUB-TAB 5: REUSE SYSTEM METRICS */}
        {activeSubTab === "history" && (
          <div className="space-y-6">
            <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <History className="text-indigo-400" size={16} />
                <h3 className="font-bold text-white text-xs uppercase tracking-wider">Historical Agent Analysis Reports</h3>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {analyses?.map((an: any) => (
                  <div key={an.id} className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-indigo-500/10 text-indigo-400 font-mono text-[9px] px-2 py-0.5 rounded border border-indigo-500/10 uppercase font-bold tracking-wider">
                          {an.analysisType.replace(/_/g, " ")}
                        </span>
                        <span className={`text-[10px] font-bold ${
                          an.status === "completed" ? "text-emerald-400" :
                          an.status === "running" ? "text-indigo-400 animate-pulse" : "text-rose-400"
                        }`}>
                          ● {an.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-normal font-sans">
                        {an.resultSummary || an.errorMessage || "No detailed output summary recorded."}
                      </p>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 shrink-0">
                      {new Date(an.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
                {analyses?.length === 0 && (
                  <div className="text-center py-12 text-slate-500 font-sans italic">No historic agent analyses found.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
