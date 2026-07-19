/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { motion } from "motion/react";
import {
  Cpu,
  LogOut,
  Bell,
  CheckCircle,
  AlertCircle,
  Info,
  Clock,
  X,
  Sparkles,
} from "lucide-react";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import RepositoryDetail from "./components/RepositoryDetail";
import { useAppStore } from "./store/useAppStore";

export default function App() {
  const {
    authToken,
    user,
    notifications,
    showNotifications,
    setShowNotifications,
    handleAuthSuccess,
    handleLogout,
    fetchUserProfile,
    fetchRepositories,
    fetchNotifications,
    fetchRepoDetails,
    markNotificationRead,
  } = useAppStore();

  const location = useLocation();
  const navigate = useNavigate();
  
  const repoMatch = location.pathname.match(/^\/repo\/([^\/]+)/);
  const selectedRepoId = repoMatch ? decodeURIComponent(repoMatch[1]) : null;

  useEffect(() => {
    if (authToken) {
      fetchUserProfile();
      fetchRepositories();
      fetchNotifications();
    }
  }, [authToken]);

  useEffect(() => {
    if (authToken && selectedRepoId) {
      fetchRepoDetails(selectedRepoId);
    }
  }, [authToken, selectedRepoId]);

  // Listen for unauthorized/expired session events globally
  useEffect(() => {
    const handleUnauthorized = () => {
      handleLogout();
    };
    window.addEventListener("ais_unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("ais_unauthorized", handleUnauthorized);
    };
  }, []);

  // Periodic polling for async agent completion and notifications updates
  useEffect(() => {
    if (!authToken) return;

    const interval = setInterval(() => {
      fetchRepositories();
      fetchNotifications();
      if (selectedRepoId) {
        fetchRepoDetails(selectedRepoId);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [authToken, selectedRepoId]);



  const unreadNotifications = notifications.filter((n) => !n.read).length;

  if (!authToken) {
    return (
      <Auth 
        onAuthSuccess={(token, userData) => {
          handleAuthSuccess(token, userData);
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#070b13] flex flex-col relative text-slate-100">
      {/* Background ambient glowing blobs */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-indigo-900/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-12 left-10 w-[400px] h-[400px] bg-emerald-900/5 rounded-full blur-3xl -z-10" />

      {/* Main Navbar */}
      <nav className="border-b border-slate-900 bg-slate-950/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div className="p-2 bg-indigo-600/10 border border-indigo-500/20 rounded-lg text-indigo-400">
              <Cpu size={20} />
            </div>
            <span className="font-bold text-white tracking-tight hidden sm:inline-block">
              DevAssist
            </span>
            <span className="font-bold text-white tracking-tight sm:hidden">
              DevAssist
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification trigger */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 hover:bg-slate-900/80 text-slate-400 hover:text-white rounded-xl transition-all border border-transparent hover:border-slate-800/80 focus:outline-none"
              >
                <Bell size={18} />
                {unreadNotifications > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-500 border-2 border-[#070b13] rounded-full" />
                )}
              </button>

              {/* Notifications panel dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-[#0f172a] border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50 p-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Workspace Alerts ({unreadNotifications})
                    </span>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-slate-500 hover:text-white focus:outline-none"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-6">No notifications yet</p>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => markNotificationRead(notif.id)}
                          className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                            notif.read
                              ? "bg-slate-950/20 border-slate-900/60 text-slate-400"
                              : "bg-indigo-600/5 border-indigo-500/20 text-slate-200"
                          }`}
                        >
                          <div className="flex gap-2 items-start">
                            {notif.type === "success" ? (
                              <CheckCircle size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                            ) : notif.type === "error" ? (
                              <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                            ) : (
                              <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
                            )}
                            <div className="flex-grow">
                              <p className="leading-normal font-sans">{notif.message}</p>
                              <span className="text-[9px] text-slate-500 font-mono flex items-center gap-1 mt-1.5">
                                <Clock size={10} />
                                {new Date(notif.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 p-2.5 hover:bg-slate-900/80 text-slate-400 hover:text-white rounded-xl transition-all border border-transparent hover:border-slate-800/80 focus:outline-none text-xs font-semibold"
            >
              <LogOut size={16} />
              <span className="hidden md:inline">Exit Session</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container Workspace */}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/repo/:id/*" element={<RepositoryDetail />} />
        </Routes>
      </main>

      {/* Humble Footer */}
      <footer className="border-t border-slate-950 bg-slate-950/20 py-6 text-center text-xs text-slate-600 font-mono mt-auto">
        AI Software Engineering Assistant • 2026 Sandbox Environment
      </footer>
    </div>
  );
}
