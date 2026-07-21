import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Github, Shield, Terminal } from "lucide-react";
import { api } from "../services/api";

interface AuthProps {
  onAuthSuccess: (token: string, user: any) => void;
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [error, setError] = useState<string | null>(null);
  const [githubLoading, setGithubLoading] = useState(false);
  const [showHiddenLogin, setShowHiddenLogin] = useState(false);
  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authToken = params.get("auth_token");
    const authUser = params.get("auth_user");
    const authError = params.get("auth_error");

    if (authToken && authUser) {
      try {
        onAuthSuccess(authToken, JSON.parse(authUser));
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch {
        setError("GitHub sign-in returned an invalid session. Please try again.");
      }
      return;
    }

    if (authError) {
      setError(authError);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [onAuthSuccess]);

  const handleGithubLogin = async () => {
    setError(null);
    setGithubLoading(true);
    try {
      const status = await api.getGithubAuthStatus();
      if (!status.configured) {
        setError("GitHub sign-in is not configured yet. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env, then restart DevAssist.");
        return;
      }
      window.location.href = "/api/auth/github";
    } catch (err: any) {
      setError(err.message || "Could not reach DevAssist auth service. Make sure the local server is running.");
    } finally {
      setGithubLoading(false);
    }
  };

  const handleHiddenLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAdminLoading(true);
    try {
      const data = await api.login({ username: adminId, password });
      onAuthSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b13] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-[#0f172a]/95 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-8"
      >
        <div className="text-center mb-8">
          <div 
            className="inline-flex items-center justify-center p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 mb-4 cursor-default"
            onDoubleClick={() => setShowHiddenLogin(!showHiddenLogin)}
          >
            <Terminal size={28} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">DevAssist</h1>
          <p className="text-sm text-slate-400">Multi-agent codebase auditing, testing & documentation</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-900/50 rounded-xl text-sm text-red-400 flex items-start gap-2">
            <Shield className="shrink-0 mt-0.5" size={16} />
            <span>{error}</span>
          </div>
        )}

        {showHiddenLogin ? (
          <form onSubmit={handleHiddenLogin} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="email"
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
              className="w-full bg-[#070b13] border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 text-sm"
              required
            />
            <input
              type="password"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#070b13] border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 text-sm"
              required
            />
            <button
              type="submit"
              disabled={adminLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl py-3 px-4 transition-colors focus:outline-none text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {adminLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Continue"
              )}
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={handleGithubLogin}
            disabled={githubLoading}
            className="w-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-950 font-semibold rounded-xl py-3 px-4 transition-colors focus:outline-none text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {githubLoading ? (
              <span className="w-5 h-5 border-2 border-slate-400/30 border-t-slate-900 rounded-full animate-spin" />
            ) : (
              <>
                <Github size={16} />
                <span>Continue with GitHub</span>
              </>
            )}
          </button>
        )}
      </motion.div>
    </div>
  );
}
