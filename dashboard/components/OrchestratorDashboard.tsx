import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import {
  Play,
  StopCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Code,
  Activity,
  ClipboardList,
  Copy,
  ChevronRight,
  Database,
  Terminal as TermIcon,
  HelpCircle,
  RefreshCw,
  Sparkles,
  Network,
} from "lucide-react";
import { api } from "../services/api";
import { OrchestrationRun, AgentTask } from "../types";

interface OrchestratorDashboardProps {
  repositoryId: string;
  authToken: string;
}

export default function OrchestratorDashboard({
  repositoryId,
  authToken,
}: OrchestratorDashboardProps) {
  const [orchestrations, setOrchestrations] = useState<OrchestrationRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<OrchestrationRun | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [userInput, setUserInput] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const logsContainerRef = useRef<HTMLDivElement | null>(null);

  // Suggested pre-filled prompts for convenience
  const SUGGESTIONS = [
    "Perform fully autonomous architecture, security audits, and test suite generation.",
    "Draft a complete REST API specification and DevOps deployment scripts for this codebase.",
    "Plan a new database synchronization module and identify potential performance bottlenecks.",
  ];

  // Fetch all runs
  const fetchOrchestrations = async (autoSelect = false) => {
    try {
      const data = await api.getOrchestrationsForRepo(authToken, repositoryId);
      setOrchestrations(data.orchestrations);
      
      setSelectedRun((current) => {
        if (autoSelect || !current) {
          return data.orchestrations[0] || null;
        }

        return data.orchestrations.find((run) => run.id === current.id) || data.orchestrations[0] || null;
      });

      const nextSelected = autoSelect || !selectedRun
        ? data.orchestrations[0]
        : data.orchestrations.find((run) => run.id === selectedRun.id) || data.orchestrations[0];

      if (nextSelected?.tasks.length) {
        const currentAgentStillExists = nextSelected.tasks.some((task) => task.agentId === selectedAgentId);
        if (autoSelect || !currentAgentStillExists) {
          setSelectedAgentId(chooseDefaultAgentId(nextSelected));
        }
      }

      return data.orchestrations;
    } catch (error) {
      console.error("Failed to fetch orchestrations", error);
      throw error;
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchOrchestrations();
      toast.success("Orchestrator status refreshed.");
    } catch (error: any) {
      toast.error(error.message || "Failed to refresh orchestrator status.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Poll active run
  useEffect(() => {
    fetchOrchestrations(true);
  }, [repositoryId]);

  // Find currently selected agent details in selectedRun
  const currentTask = selectedRun?.tasks.find((t) => t.agentId === selectedAgentId);
  const hasActiveRun = orchestrations.some(
    (o) => o.status === "running" || o.status === "queued"
  );

  function hasLocalFallback(task?: AgentTask | null) {
    return Boolean(task?.logs.some((log) => /local fallback|repository-grounded analysis|Groq is unavailable|rate-limited/i.test(log)));
  }

  function chooseDefaultAgentId(run?: OrchestrationRun | null) {
    if (!run?.tasks.length) return null;
    const goal = (run.userInput || "").toLowerCase();
    const preferredAgent =
      /\b(plan|database|db|sync|synchronization|performance|bottleneck)\b/.test(goal)
        ? "planning"
        : /\barchitecture|diagram|system design\b/.test(goal)
          ? "architecture_analyzer"
          : /\bsecurity|vulnerabilit|audit\b/.test(goal)
            ? "security_agent"
            : null;

    return (
      (preferredAgent && run.tasks.find((task) => task.agentId === preferredAgent)?.agentId) ||
      run.tasks.find((task) => task.status === "completed")?.agentId ||
      run.tasks[0].agentId
    );
  }

  // Handle active polling for queued/running states
  useEffect(() => {
    if (!hasActiveRun && selectedRun?.status !== "running" && selectedRun?.status !== "queued") return;

    const interval = setInterval(async () => {
      // Refresh list
      try {
        const data = await api.getOrchestrationsForRepo(authToken, repositoryId);
        setOrchestrations(data.orchestrations);

        // If we have a selected run, update its details
        setSelectedRun((current) => {
          if (!current) return data.orchestrations[0] || null;
          return data.orchestrations.find((o) => o.id === current.id) || current;
        });
      } catch (err) {
        console.error("Polling error in orchestrator", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [authToken, hasActiveRun, repositoryId, selectedRun?.id, selectedRun?.status]);

  useEffect(() => {
    if (!selectedRun?.tasks.length) return;
    if (!selectedAgentId || !selectedRun.tasks.some((task) => task.agentId === selectedAgentId)) {
      setSelectedAgentId(selectedRun.tasks[0].agentId);
    }
  }, [selectedAgentId, selectedRun]);

  // Keep the log panel pinned only when the user is already near its bottom.
  useEffect(() => {
    const logPanel = logsContainerRef.current;
    if (!logPanel || !currentTask) return;

    const distanceFromBottom = logPanel.scrollHeight - logPanel.scrollTop - logPanel.clientHeight;
    if (distanceFromBottom <= 96) {
      requestAnimationFrame(() => {
        logPanel.scrollTop = logPanel.scrollHeight;
      });
    }
  }, [currentTask?.logs.length, selectedAgentId]);

  // Handle trigger run
  const handleStartOrchestration = async () => {
    setIsStarting(true);
    try {
      const data = await api.startOrchestration(authToken, repositoryId, userInput || undefined);
      setUserInput("");
      setOrchestrations((current) => [
        data.orchestration,
        ...current.filter((run) => run.id !== data.orchestration.id),
      ]);
      setSelectedRun(data.orchestration);
      if (data.orchestration.tasks.length > 0) {
        setSelectedAgentId(data.orchestration.tasks[0].agentId);
      }
    } catch (error: any) {
      console.error("Orchestration start failed:", error);
      toast.error(error.message || "Failed to start multi-agent orchestration.");
    } finally {
      setIsStarting(false);
    }
  };

  // Handle cancel run
  const handleCancelOrchestration = async (runId: string) => {
    if (!confirm("Are you sure you want to cancel the entire running orchestration? All remaining agent tasks will be aborted.")) {
      return;
    }
    setIsCancelling(true);
    try {
      await api.cancelOrchestration(authToken, runId);
      await fetchOrchestrations();
    } catch (error: any) {
      console.error("Orchestration cancel failed:", error);
      toast.error(error.message || "Failed to cancel run.");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20";
      case "running":
        return "bg-blue-500/15 text-blue-400 border border-blue-500/20 animate-pulse";
      case "queued":
        return "bg-purple-500/15 text-purple-400 border border-purple-500/20";
      case "failed":
        return "bg-red-500/15 text-red-400 border border-red-500/20";
      case "cancelled":
        return "bg-slate-500/15 text-slate-400 border border-slate-500/20";
      default:
        return "bg-slate-500/10 text-slate-400";
    }
  };

  const getAgentIcon = (agentId: string, status: string) => {
    if (status === "running") {
      return <Loader2 size={16} className="text-blue-400 animate-spin" />;
    }
    switch (status) {
      case "completed":
        return <CheckCircle2 size={16} className="text-emerald-400" />;
      case "failed":
        return <XCircle size={16} className="text-red-400" />;
      case "cancelled":
        return <AlertCircle size={16} className="text-slate-400" />;
      default:
        return <Clock size={16} className="text-slate-500" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* HUB HEADER */}
      <div className="bg-slate-900/20 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity size={24} className="text-indigo-400 animate-pulse" />
              Multi-Agent Orchestration Hub
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Define a custom development goal or run the autonomous suite. The central **Orchestrator** maps structured JSON parameters, schedules parallel chains, audits security/dependencies, codes test cases, writes technical manuals, and generates final release changelogs.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 text-slate-300 p-3 rounded-xl border border-slate-700 hover:text-white transition-all focus:outline-none disabled:cursor-wait disabled:text-slate-600"
              title={isRefreshing ? "Refreshing status" : "Refresh status"}
              aria-label={isRefreshing ? "Refreshing orchestrator status" : "Refresh orchestrator status"}
            >
              <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* INPUT PROMPT CONFIG BOX */}
        <div className="mt-6 pt-6 border-t border-slate-800/60">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">
                Provide Orchestration Input Goal / Developer Task ticket (Optional)
              </label>
              <div className="relative">
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="e.g. Conduct deep static code review, plan a task table model, write dockerfiles, and generate copy-pasteable vitest scripts..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-xs text-slate-300 placeholder-slate-600 focus:outline-none min-h-[70px] pr-36 leading-relaxed"
                />
                <div className="absolute right-3 bottom-3">
                  <button
                    onClick={handleStartOrchestration}
                    disabled={isStarting || hasActiveRun}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold rounded-lg px-4 py-2 text-xs flex items-center gap-1.5 focus:outline-none transition-all disabled:text-slate-500 disabled:opacity-50 shadow-md shadow-indigo-600/20"
                  >
                    {isStarting ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Play size={12} fill="currentColor" />
                    )}
                    <span>Launch Pipeline</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Prompt Suggestions */}
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-2">
                Quick-fill Prompt Recommendations:
              </span>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => setUserInput(s)}
                    className="bg-slate-900/60 hover:bg-slate-900 text-left px-3 py-2 rounded-lg text-[10px] text-slate-400 border border-slate-800 hover:text-indigo-400 hover:border-indigo-500/20 transition-all max-w-sm truncate"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* THREE PANEL DASHBOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* PANEL 1: HISTORY SELECTOR */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900/20 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <Database size={12} className="text-indigo-400" />
              Execution History
            </h3>

            {orchestrations.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
                <Clock size={24} className="text-slate-700 mx-auto mb-2" />
                <p className="text-[11px] text-slate-500">No orchestration history found.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                {orchestrations.map((run) => {
                  const isActive = selectedRun?.id === run.id;
                  const isRunning = run.status === "running" || run.status === "queued";
                  return (
                    <div
                      key={run.id}
                      onClick={() => {
                        setSelectedRun(run);
                        if (run.tasks.length > 0 && !selectedAgentId) {
                          setSelectedAgentId(run.tasks[0].agentId);
                        }
                      }}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        isActive
                          ? "bg-slate-900 border-indigo-500/50 shadow-md shadow-indigo-500/5"
                          : "bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-mono text-slate-500 font-semibold">
                          {run.id.substring(0, 8)}...
                        </span>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${getStatusColor(
                            run.status
                          )}`}
                        >
                          {run.status}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-300 font-medium line-clamp-1 mb-2">
                        {run.userInput || "Autonomous Audit Pipeline"}
                      </p>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] text-slate-500 font-semibold font-mono">
                          <span>Pipeline progress</span>
                          <span>{run.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-1 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              run.status === "failed"
                                ? "bg-red-500"
                                : run.status === "cancelled"
                                ? "bg-slate-500"
                                : "bg-indigo-500"
                            }`}
                            style={{ width: `${run.progress}%` }}
                          />
                        </div>
                      </div>

                      {isRunning && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelOrchestration(run.id);
                          }}
                          disabled={isCancelling}
                          className="mt-3 w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold border border-red-500/20 py-1.5 rounded-lg text-[9px] flex items-center justify-center gap-1 focus:outline-none transition-all"
                        >
                          <StopCircle size={10} />
                          <span>Cancel Run</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* PANEL 2: CURRENT RUN DAG & METRICS */}
        <div className="lg:col-span-3 space-y-6">
          {!selectedRun ? (
            <div className="bg-slate-900/10 border border-dashed border-slate-800 rounded-2xl py-24 text-center">
              <Sparkles size={48} className="text-slate-700 mx-auto mb-4 animate-pulse" />
              <h3 className="text-sm font-bold text-slate-300">No Orchestration Selected</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Select an execution history run from the list or press **Launch Pipeline** above to trigger a new multi-agent run.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* RUN OVERVIEW CARD */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
                <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
                  <div>
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500">
                      Orchestration Run Context
                    </span>
                    <h3 className="text-sm font-bold text-slate-200 mt-1">
                      {selectedRun.userInput || "Full Autonomous Analysis Suite"}
                    </h3>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium font-mono mt-2">
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        Started: {new Date(selectedRun.createdAt).toLocaleTimeString()}
                      </span>
                      <span>Run ID: {selectedRun.id}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="text-right font-mono text-xs font-bold text-slate-300 shrink-0">
                      {selectedRun.tasks.filter((t) => t.status === "completed").length} /{" "}
                      {selectedRun.tasks.length} Done
                    </div>
                    <div className="w-24 bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className="bg-indigo-500 h-full transition-all duration-300"
                        style={{ width: `${selectedRun.progress}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono font-bold text-indigo-400">
                      {selectedRun.progress}%
                    </span>
                  </div>
                </div>
              </div>

              {/* DAG DIRECTED ACYCLIC GRAPH FLOW */}
              <div className="bg-slate-900/20 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-xs font-bold text-slate-400 mb-5 uppercase tracking-wider flex items-center gap-2">
                  <Network size={14} className="text-indigo-400" />
                  Scheduled Agent Dependency DAG
                </h3>

                {/* VISUAL STEPS TIMELINE/DAG */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {selectedRun.tasks.map((task) => {
                    const isSelected = selectedAgentId === task.agentId;
                    const isRunning = task.status === "running";
                    const isCompleted = task.status === "completed";
                    const isFailed = task.status === "failed";
                    const usedFallback = hasLocalFallback(task);

                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedAgentId(task.agentId)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-indigo-600/10 border-indigo-500"
                            : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-900/40 hover:border-slate-700"
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            {getAgentIcon(task.agentId, task.status)}
                            <h4 className="text-xs font-bold text-slate-200 truncate" title={task.name}>
                              {task.name}
                            </h4>
                          </div>
                          
                          <p className="text-[9px] font-mono text-slate-500 truncate" title={task.dependencies.length > 0 ? `Depends on: ${task.dependencies.join(", ")}` : "No upstream dependencies"}>
                            {task.dependencies.length > 0
                              ? `Depends: ${task.dependencies.map(d => d.replace("_", " ")).join(", ")}`
                              : "Root Independent Node"}
                          </p>
                        </div>

                        <div className="shrink-0 text-right space-y-1">
                          <span
                            className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              isCompleted
                                ? "bg-emerald-500/10 text-emerald-400"
                                : isRunning
                                ? "bg-blue-500/15 text-blue-400 animate-pulse"
                                : isFailed
                                ? "bg-red-500/10 text-red-400 font-semibold"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {task.status}
                          </span>
                          {(task.retryCount > 0 || usedFallback) && (
                            <div className={`text-[8px] font-mono ${usedFallback && isCompleted ? "text-sky-400" : "text-amber-500"}`}>
                              {usedFallback && isCompleted
                                ? "fallback used"
                                : `${task.retryCount} ${task.retryCount === 1 ? "retry" : "retries"}`}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AGENT DETAIL INSPECTOR (LOGS & JSON) */}
              {currentTask && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* LEFT: LOGS STREAM */}
                  <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                      <div className="flex items-center gap-2">
                        <TermIcon size={14} className="text-indigo-400" />
                        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                          {currentTask.name} logs
                        </h4>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {currentTask.logs.length} entries
                      </div>
                    </div>

                    <div
                      ref={logsContainerRef}
                      className="bg-slate-950 p-4 rounded-xl border border-slate-800 h-80 overflow-y-auto font-mono text-[10px] text-slate-400 leading-relaxed space-y-1.5 shadow-inner"
                    >
                      {currentTask.logs.map((logStr, i) => {
                        const recoveredByFallback = hasLocalFallback(currentTask);
                        const isSystem = logStr.includes("[System");
                        const isError = logStr.includes("[Error") || logStr.includes("[Critical");
                        const isRecoveredProviderIssue =
                          recoveredByFallback &&
                          /Groq|rate limit|rate-limited|fetch failed|Attempt \d+ failed/i.test(logStr);
                        return (
                          <div
                            key={i}
                            className={
                              isRecoveredProviderIssue
                                ? "text-amber-300 font-medium"
                                : isError
                                ? "text-red-400 font-semibold"
                                : isSystem
                                ? "text-indigo-400 font-medium"
                                : "text-slate-300"
                            }
                          >
                            {logStr}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* RIGHT: STRUCTURED COMMUNICATOR (JSON) */}
                  <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                      <div className="flex items-center gap-2">
                        <Code size={14} className="text-emerald-400" />
                        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                          Structured JSON Data
                        </h4>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* JSON OUTPUT */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">
                            JSON Output
                          </span>
                          {currentTask.output && (
                            <button
                              onClick={() =>
                                handleCopy(
                                  JSON.stringify(currentTask.output, null, 2),
                                  "output"
                                )
                              }
                              className="text-[10px] text-indigo-400 hover:text-indigo-300 focus:outline-none flex items-center gap-1 font-semibold"
                            >
                              <Copy size={10} />
                              <span>{copiedId === "output" ? "Copied!" : "Copy Output"}</span>
                            </button>
                          )}
                        </div>

                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 h-[280px] overflow-y-auto font-mono text-[10px] text-emerald-400 leading-relaxed">
                          {currentTask.status === "completed" && currentTask.output ? (
                            <pre>{JSON.stringify(currentTask.output, null, 2)}</pre>
                          ) : currentTask.status === "failed" ? (
                            <div className="text-red-400">
                              <p className="font-bold">Execution Failed:</p>
                              <p className="mt-1">{currentTask.error || "Unknown agent runtime error."}</p>
                            </div>
                          ) : currentTask.status === "cancelled" ? (
                            <div className="text-slate-500">
                              <p className="font-bold">Aborted / Cancelled</p>
                              <p className="mt-1">This task was aborted due to upstream failure or user cancellation.</p>
                            </div>
                          ) : (
                            <div className="text-slate-600 flex flex-col items-center justify-center h-full gap-2 font-sans">
                              {currentTask.status === "running" ? (
                                <>
                                  <Loader2 size={16} className="animate-spin text-indigo-500" />
                                  <p className="text-[11px]">Executing agent reasoning engine...</p>
                                </>
                              ) : (
                                <>
                                  <Clock size={16} />
                                  <p className="text-[11px]">Awaiting dependencies completion</p>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
