import React, { useState } from "react";
import { motion } from "motion/react";
import {
  FileCode,
  Plus,
  Trash2,
  Save,
  HelpCircle,
  File,
  Code,
  Terminal,
  Loader2,
  Sparkles,
} from "lucide-react";
import { RepoFile } from "../types";
import { api } from "../services/api";

interface CodeViewerProps {
  files: RepoFile[];
  onSaveFile: (path: string, content: string) => Promise<void>;
  onDeleteFile: (path: string) => Promise<void>;
  repoId: string;
  authToken: string;
}

export default function CodeViewer({
  files,
  onSaveFile,
  onDeleteFile,
  repoId,
  authToken,
}: CodeViewerProps) {
  const [activeFile, setActiveFile] = useState<RepoFile | null>(
    files.length > 0 ? files[0] : null
  );
  const [editedContent, setEditedContent] = useState("");
  const [newFilePath, setNewFilePath] = useState("");
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);

  React.useEffect(() => {
    if (activeFile) {
      setEditedContent(activeFile.content);
      setExplanation(null);
    } else {
      setEditedContent("");
    }
  }, [activeFile]);

  // Handle active file change on files list update
  React.useEffect(() => {
    if (files.length > 0 && !activeFile) {
      setActiveFile(files[0]);
    }
  }, [files, activeFile]);

  const handleSelectFile = (file: RepoFile) => {
    setActiveFile(file);
  };

  const handleSave = async () => {
    if (!activeFile) return;
    setSaveLoading(true);
    try {
      await onSaveFile(activeFile.path, editedContent);
      // Update local state
      setActiveFile({ ...activeFile, content: editedContent, size: editedContent.length });
    } catch (e) {
      console.error(e);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFilePath.trim()) return;

    try {
      await onSaveFile(newFilePath.trim(), "// New module code starts here\n");
      const created = {
        path: newFilePath.trim(),
        content: "// New module code starts here\n",
        size: 31,
      };
      setActiveFile(created);
      setNewFilePath("");
      setIsCreatingFile(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (filePath: string) => {
    if (confirm(`Are you sure you want to delete ${filePath}?`)) {
      try {
        await onDeleteFile(filePath);
        if (activeFile?.path === filePath) {
          const remaining = files.filter((f) => f.path !== filePath);
          setActiveFile(remaining.length > 0 ? remaining[0] : null);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleExplain = async () => {
    if (!activeFile) return;
    setExplainLoading(true);
    setExplanation(null);
    try {
      const data = await api.explainFile(authToken, repoId, activeFile.path);
      setExplanation(data.explanation);
    } catch (e: any) {
      setExplanation(`Error: ${e.message || "Failed to run explanation"}`);
    } finally {
      setExplainLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 bg-[#090d16] border border-slate-800 rounded-2xl overflow-hidden min-h-[550px]">
      {/* File Sidebar Explorer */}
      <div className="lg:col-span-1 border-r border-slate-800 p-4 flex flex-col bg-slate-950/20">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/60">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Terminal size={14} className="text-indigo-400" />
            File Explorer
          </span>
          <button
            onClick={() => setIsCreatingFile(!isCreatingFile)}
            className="text-slate-400 hover:text-white hover:bg-slate-800 p-1 rounded-md transition-all focus:outline-none"
            title="Create New File"
          >
            <Plus size={16} />
          </button>
        </div>

        {isCreatingFile && (
          <form onSubmit={handleCreateFile} className="mb-4">
            <input
              type="text"
              required
              value={newFilePath}
              onChange={(e) => setNewFilePath(e.target.value)}
              placeholder="e.g. src/utils.ts"
              className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all mb-2"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-md px-2 py-1 text-[10px] transition-colors uppercase tracking-wider"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingFile(false)}
                className="bg-slate-800 text-slate-400 font-semibold rounded-md px-2 py-1 text-[10px] transition-colors uppercase tracking-wider"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="flex-grow space-y-1 overflow-y-auto max-h-[420px]">
          {files.map((file) => (
            <div
              key={file.path}
              className={`group flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-all cursor-pointer ${
                activeFile?.path === file.path
                  ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20"
                  : "text-slate-400 hover:bg-slate-800/40 hover:text-white border border-transparent"
              }`}
            >
              <div
                className="flex items-center gap-2 truncate flex-grow"
                onClick={() => handleSelectFile(file)}
              >
                <FileCode size={14} className={activeFile?.path === file.path ? "text-indigo-400" : "text-slate-500"} />
                <span className="truncate font-mono">{file.path}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(file.path);
                }}
                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1 rounded transition-all focus:outline-none ml-2 shrink-0"
                title="Delete File"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Workspace Monospace Editor */}
      <div className="lg:col-span-3 flex flex-col p-4">
        {activeFile ? (
          <>
            {/* Header toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Code size={18} className="text-indigo-400" />
                <span className="font-mono text-sm font-bold text-white truncate">{activeFile.path}</span>
                <span className="text-[10px] font-mono text-slate-500">({(activeFile.size / 1024).toFixed(2)} KB)</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExplain}
                  disabled={explainLoading}
                  className="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 font-semibold rounded-lg px-3 py-1.5 transition-all text-xs border border-indigo-500/20 flex items-center gap-1.5 focus:outline-none"
                >
                  {explainLoading ? (
                    <Loader2 size={13} className="animate-spin text-indigo-400" />
                  ) : (
                    <Sparkles size={13} />
                  )}
                  <span>{explainLoading ? "Grounding..." : "Explain File"}</span>
                </button>

                <button
                  onClick={handleSave}
                  disabled={saveLoading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg px-3 py-1.5 transition-all text-xs flex items-center gap-1.5 focus:outline-none"
                >
                  {saveLoading ? (
                    <Loader2 size={13} className="animate-spin text-white" />
                  ) : (
                    <Save size={13} />
                  )}
                  <span>Save Code Changes</span>
                </button>
              </div>
            </div>

            {/* Editor Area & Explanation split panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow">
              {/* Monospace Code Editor */}
              <div className="flex flex-col min-h-[300px]">
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full h-full min-h-[350px] bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 placeholder-slate-700 focus:outline-none focus:border-indigo-500/50 transition-all resize-none leading-relaxed"
                  style={{ whiteSpace: "pre", overflowWrap: "normal" }}
                />
              </div>

              {/* Real-time agent explanation card */}
              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 flex flex-col justify-between overflow-y-auto max-h-[400px]">
                <div>
                  <div className="flex items-center gap-1.5 pb-2 border-b border-slate-800/40 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    <Sparkles size={14} className="text-indigo-400" />
                    AI Agent Explanation
                  </div>
                  {explanation ? (
                    <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line">
                      {explanation}
                    </p>
                  ) : explainLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
                      <Loader2 size={32} className="text-indigo-500 animate-spin" />
                      <p className="text-xs font-mono">Running RAG explanation agent...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-600 gap-2 text-center px-4">
                      <HelpCircle size={32} className="text-slate-700 mb-1" />
                      <p className="text-xs font-medium">Want to quickly understand this file's imports, methods, or security logic?</p>
                      <p className="text-[10px] text-slate-700">Click the "Explain File" trigger above for a live grounded summary.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-600 gap-3">
            <File size={48} className="text-slate-800" />
            <p className="text-xs font-semibold">Your repository has no files inside</p>
            <p className="text-[10px] text-slate-700">Create a new module in the Explorer sidebar to start writing code!</p>
          </div>
        )}
      </div>
    </div>
  );
}
