import React, { useState } from "react";
import { motion } from "motion/react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Key,
  Database,
  FileCode,
  Terminal,
  Info,
  Sparkles,
  Loader2,
  RefreshCw,
  Copy,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Repository, Analysis, SecurityFinding, SecurityReport } from "../types";

interface SecurityAuditProps {
  repository: Repository;
  activeSecurityAnalysis: Analysis | null;
  onTriggerAudit: () => Promise<void>;
  loadingAudit: boolean;
}

export function SecurityAudit({
  repository,
  activeSecurityAnalysis,
  onTriggerAudit,
  loadingAudit,
}: SecurityAuditProps) {
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [expandedFindings, setExpandedFindings] = useState<Record<string, boolean>>({});
  const [copyStates, setCopyStates] = useState<Record<string, boolean>>({});
  const [revealSecrets, setRevealSecrets] = useState<Record<string, boolean>>({});

  const report: SecurityReport | undefined = activeSecurityAnalysis?.securityReport;

  const toggleExpand = (id: string) => {
    setExpandedFindings((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopyStates((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCopyStates((prev) => ({ ...prev, [id]: false }));
    }, 2000);
  };

  const toggleRevealSecret = (id: string) => {
    setRevealSecrets((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const severityColors: Record<string, { bg: string; text: string; border: string; iconColor: string }> = {
    critical: {
      bg: "bg-red-500/10",
      text: "text-red-400",
      border: "border-red-500/20",
      iconColor: "text-red-500",
    },
    high: {
      bg: "bg-orange-500/10",
      text: "text-orange-400",
      border: "border-orange-500/20",
      iconColor: "text-orange-500",
    },
    medium: {
      bg: "bg-yellow-500/10",
      text: "text-yellow-400",
      border: "border-yellow-500/20",
      iconColor: "text-yellow-500",
    },
    low: {
      bg: "bg-blue-500/10",
      text: "text-blue-400",
      border: "border-blue-500/20",
      iconColor: "text-blue-500",
    },
    info: {
      bg: "bg-slate-500/10",
      text: "text-slate-400",
      border: "border-slate-500/20",
      iconColor: "text-slate-400",
    },
  };

  const categoryLabels: Record<string, string> = {
    secrets: "Hardcoded Secrets",
    api_keys: "API Key Security",
    jwt: "JWT Security",
    authentication: "Authentication Bypass",
    authorization: "Broken Authorization (IDOR)",
    sql_injection: "SQL Injection",
    xss: "Cross-Site Scripting (XSS)",
    csrf: "Cross-Site Request Forgery",
    ssrf: "Server-Side Request Forgery",
    dependency: "Vulnerable Dependencies",
    env_vars: "Environment Variables Audit",
    cors: "CORS Configurations",
    headers: "Missing Security Headers",
  };

  const categories = Object.keys(categoryLabels);

  const filteredFindings = report?.findings.filter((f) => {
    const sevMatch = severityFilter === "all" || f.severity === severityFilter;
    const catMatch = categoryFilter === "all" || f.category === categoryFilter;
    return sevMatch && catMatch;
  }) || [];

  // Determine risk level styling
  const getRiskLevel = (score: number) => {
    if (score >= 75) return { label: "CRITICAL RISK", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/30" };
    if (score >= 45) return { label: "MEDIUM RISK", color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/30" };
    if (score >= 15) return { label: "LOW RISK", color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30" };
    return { label: "SECURE POSTURE", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" };
  };

  const risk = report ? getRiskLevel(report.overallRiskScore) : null;

  return (
    <div className="space-y-6" id="security-agent-tab">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldAlert size={20} className="text-indigo-400" />
            AI Security Agent
          </h2>
          <p className="text-xs text-slate-400">
            Automated SAST & DAST modeling covering Secrets, SQLi, JWT, Authentication, CORS, and Headers.
          </p>
        </div>
        
        <button
          onClick={onTriggerAudit}
          disabled={loadingAudit || activeSecurityAnalysis?.status === "running"}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl px-4 py-2.5 text-xs flex items-center gap-1.5 focus:outline-none disabled:opacity-50 shrink-0 shadow-lg shadow-indigo-600/10 transition-all"
        >
          {loadingAudit || activeSecurityAnalysis?.status === "running" ? (
            <Loader2 size={12} className="animate-spin text-white" />
          ) : (
            <Sparkles size={12} />
          )}
          <span>{report ? "Restart Security Audit" : "Run Security Audit"}</span>
        </button>
      </div>

      {!activeSecurityAnalysis && (
        <div className="text-center py-16 bg-slate-900/10 border border-dashed border-slate-800 rounded-2xl">
          <ShieldAlert size={40} className="text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-300">No Security Scan Performed Yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
            Trigger the AI Security Agent to evaluate source files for hardcoded credentials, JWT signature verification flaws, injection vectors, and missing protective middlewares.
          </p>
          <button
            onClick={onTriggerAudit}
            disabled={loadingAudit}
            className="mt-5 inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl px-4 py-2 text-xs transition-all"
          >
            {loadingAudit ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Sparkles size={12} />
            )}
            <span>Begin Auditing Codebase</span>
          </button>
        </div>
      )}

      {activeSecurityAnalysis && activeSecurityAnalysis.status === "running" && (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/10 border border-slate-800 rounded-2xl gap-3 text-slate-500">
          <Loader2 size={32} className="text-indigo-500 animate-spin" />
          <h3 className="text-sm font-bold text-slate-300 font-mono">Security Agent active...</h3>
          <p className="text-xs text-slate-500 max-w-sm text-center leading-relaxed font-sans">
            Scanning modules for raw SQL constructs, examining helmet protection layouts, parsing dependencies, and hashing file blobs to isolate leaks. This will take a few moments.
          </p>
        </div>
      )}

      {activeSecurityAnalysis && activeSecurityAnalysis.status === "failed" && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
          <div className="flex gap-3">
            <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-white text-sm">Security Audit Failed</h3>
              <p className="text-xs text-red-400/90 mt-1">{activeSecurityAnalysis.errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {activeSecurityAnalysis && activeSecurityAnalysis.status === "completed" && report && (
        <div className="space-y-6">
          {/* Executive Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Risk Score */}
            <div className="lg:col-span-4 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-4">Codebase Risk Exposure</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold text-white tracking-tight">{report.overallRiskScore}</span>
                  <span className="text-slate-500 text-lg font-medium">/ 100</span>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-slate-800/60">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-medium">Posture Classification</span>
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg border tracking-wider font-mono ${risk?.color} ${risk?.bg} ${risk?.border}`}>
                    {risk?.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Finding Breakdown Stats */}
            <div className="lg:col-span-8 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-4">Vulnerability Counters</h3>
                <div className="grid grid-cols-5 gap-3">
                  {[
                    { key: "critical", label: "Critical", color: "text-red-400", count: report.stats.critical || 0 },
                    { key: "high", label: "High", color: "text-orange-400", count: report.stats.high || 0 },
                    { key: "medium", label: "Medium", color: "text-yellow-400", count: report.stats.medium || 0 },
                    { key: "low", label: "Low", color: "text-blue-400", count: report.stats.low || 0 },
                    { key: "info", label: "Info", color: "text-slate-400", count: report.stats.info || 0 },
                  ].map((stat) => (
                    <div key={stat.key} className="bg-slate-950/40 border border-slate-900 rounded-xl p-3 text-center">
                      <span className={`block text-xl font-bold font-mono ${stat.color}`}>{stat.count}</span>
                      <span className="text-[10px] text-slate-500 font-semibold">{stat.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/60 text-xs text-slate-400 flex items-center justify-between">
                <span>Completed Audit Timeline</span>
                <span className="font-mono font-medium text-slate-500">
                  {new Date(report.scannedAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-xs text-white font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Info size={14} className="text-indigo-400" />
              Executive Audit Summary
            </h3>
            <p className="text-xs text-slate-300 font-sans leading-relaxed whitespace-pre-line">
              {report.summary}
            </p>
          </div>

          {/* Filtering controls */}
          <div className="bg-slate-900/20 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full sm:w-auto flex-grow">
              <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">Filter by Severity</label>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="info">Info</option>
              </select>
            </div>

            <div className="w-full sm:w-auto flex-grow">
              <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">Filter by Vulnerability Domain</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all"
              >
                <option value="all">All Domains</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {categoryLabels[cat]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Findings List */}
          <div className="space-y-4">
            <h3 className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">
              Identified Exposures ({filteredFindings.length})
            </h3>

            {filteredFindings.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/10 border border-dashed border-slate-800 rounded-2xl">
                <ShieldCheck size={32} className="text-emerald-500 mx-auto mb-2.5" />
                <p className="text-xs text-slate-400 font-bold">No findings found matching active filters</p>
                <p className="text-[10px] text-slate-600 mt-1">Excellent job! Adjust your filters to see more issues.</p>
              </div>
            ) : (
              filteredFindings.map((finding) => {
                const sev = severityColors[finding.severity] || severityColors.info;
                const isExpanded = expandedFindings[finding.id];
                const isCopied = copyStates[finding.id];
                const isRevealed = revealSecrets[finding.id];
                const isSensitiveCategory = finding.category === "secrets" || finding.category === "api_keys";

                return (
                  <div
                    key={finding.id}
                    className="bg-slate-900/30 border border-slate-800/80 rounded-xl overflow-hidden hover:border-slate-700/80 transition-all"
                  >
                    {/* Header bar / Summary trigger */}
                    <div
                      onClick={() => toggleExpand(finding.id)}
                      className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none hover:bg-slate-900/20 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`px-2.5 py-1 text-[9px] font-extrabold uppercase font-mono rounded-lg border ${sev.bg} ${sev.text} ${sev.border}`}>
                          {finding.severity}
                        </span>
                        
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate max-w-lg">{finding.title}</h4>
                          <span className="text-[9px] text-indigo-400 font-mono font-bold uppercase tracking-wider">
                            {categoryLabels[finding.category]}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {finding.filePath && (
                          <span className="hidden md:inline-block bg-slate-950 px-2.5 py-1 text-[9px] font-mono text-slate-400 border border-slate-800 rounded-lg">
                            {finding.filePath}:{finding.lineNumber || "L"}
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp size={16} className="text-slate-500" />
                        ) : (
                          <ChevronDown size={16} className="text-slate-500" />
                        )}
                      </div>
                    </div>

                    {/* Details section */}
                    {isExpanded && (
                      <div className="border-t border-slate-800 p-5 bg-slate-950/30 space-y-4">
                        {/* Summary details */}
                        <div>
                          <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Exposure Description</span>
                          <p className="text-xs text-slate-300 leading-relaxed font-sans">{finding.description}</p>
                        </div>

                        {/* Relative code context if snippet exists */}
                        {finding.snippet && (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Code Snippet Reference</span>
                              <div className="flex items-center gap-3">
                                {isSensitiveCategory && (
                                  <button
                                    onClick={() => toggleRevealSecret(finding.id)}
                                    className="text-[10px] text-slate-400 hover:text-white font-bold flex items-center gap-1 focus:outline-none"
                                  >
                                    {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                                    <span>{isRevealed ? "Hide Secret" : "Reveal Secret"}</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleCopyText(finding.snippet || "", finding.id)}
                                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 focus:outline-none"
                                >
                                  <Copy size={12} />
                                  <span>{isCopied ? "Copied!" : "Copy Snippet"}</span>
                                </button>
                              </div>
                            </div>
                            
                            <div className="relative">
                              <pre className={`bg-slate-950 border border-slate-850 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-[250px] leading-relaxed text-slate-300 ${isSensitiveCategory && !isRevealed ? "blur-sm select-none" : ""}`}>
                                {finding.snippet}
                              </pre>
                              {isSensitiveCategory && !isRevealed && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <button
                                    onClick={() => toggleRevealSecret(finding.id)}
                                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold text-white px-4 py-2 rounded-xl flex items-center gap-1.5 focus:outline-none shadow-xl"
                                  >
                                    <Eye size={14} />
                                    <span>Reveal Exposed Credential Snippet</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Remediation suggestions */}
                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 space-y-1.5">
                          <span className="block text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <Lock size={12} />
                            Suggested Security Remediation
                          </span>
                          <p className="text-xs text-slate-300 leading-relaxed font-sans">{finding.remediation}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
