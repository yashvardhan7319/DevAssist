import { create } from "zustand";
import { Repository, Analysis, Notification, User } from "../types";
import { api } from "../services/api";

interface AppState {
  authToken: string | null;
  user: User | null;
  repositories: Repository[];
  activeAnalyses: Analysis[];
  notifications: Notification[];
  showNotifications: boolean;

  setAuthToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  setShowNotifications: (show: boolean) => void;

  handleAuthSuccess: (token: string, user: User) => void;
  handleLogout: () => void;

  fetchUserProfile: () => Promise<void>;
  fetchRepositories: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  fetchRepoDetails: (id: string) => Promise<void>;

  markNotificationRead: (id: string) => Promise<void>;
  
  handleConnectRepo: (payload: {
    name?: string;
    language?: string;
    framework?: string;
    sourceType?: "github" | "zip";
    githubUrl?: string;
    githubToken?: string;
  }) => Promise<void>;
  
  handleDeleteRepo: (id: string, navigate?: (path: string) => void, selectedRepoId?: string | null) => Promise<void>;
  handleSaveFile: (selectedRepoId: string, path: string, content: string) => Promise<void>;
  handleDeleteFile: (selectedRepoId: string, path: string) => Promise<void>;
  handleTriggerAnalysis: (selectedRepoId: string, analysisType: string, payload?: any) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  authToken: localStorage.getItem("ais_auth_token"),
  user: (() => {
    const saved = localStorage.getItem("ais_user");
    return saved ? JSON.parse(saved) : null;
  })(),
  repositories: [],
  activeAnalyses: [],
  notifications: [],
  showNotifications: false,

  setAuthToken: (token) => set({ authToken: token }),
  setUser: (user) => set({ user }),
  setShowNotifications: (show) => set({ showNotifications: show }),

  handleAuthSuccess: (token, user) => {
    localStorage.setItem("ais_auth_token", token);
    localStorage.setItem("ais_user", JSON.stringify(user));
    set({ authToken: token, user });
  },

  handleLogout: () => {
    localStorage.removeItem("ais_auth_token");
    localStorage.removeItem("ais_user");
    set({ authToken: null, user: null, repositories: [], activeAnalyses: [], notifications: [] });
  },

  fetchUserProfile: async () => {
    const { authToken, handleLogout } = get();
    if (!authToken) return;
    try {
      const data = await api.getMe(authToken);
      set({ user: data.user });
      localStorage.setItem("ais_user", JSON.stringify(data.user));
    } catch (e) {
      console.error("Failed to load user profile", e);
      handleLogout();
    }
  },

  fetchRepositories: async () => {
    const { authToken } = get();
    if (!authToken) return;
    try {
      const data = await api.getRepositories(authToken);
      set({ repositories: data.repositories });
    } catch (e) {
      console.error("Failed to fetch repositories", e);
    }
  },

  fetchNotifications: async () => {
    const { authToken } = get();
    if (!authToken) return;
    try {
      const data = await api.getNotifications(authToken);
      set({ notifications: data.notifications });
    } catch (e) {
      console.error("Failed to fetch notifications", e);
    }
  },

  fetchRepoDetails: async (id: string) => {
    const { authToken } = get();
    if (!authToken) return;
    try {
      const data = await api.getRepositoryDetails(authToken, id);
      set((state) => ({
        repositories: state.repositories.some((r) => r.id === id)
          ? state.repositories.map((r) => (r.id === id ? data.repository : r))
          : [data.repository, ...state.repositories],
        activeAnalyses: data.analyses,
      }));
    } catch (e) {
      console.error("Failed to load repo details", e);
    }
  },

  markNotificationRead: async (id: string) => {
    const { authToken } = get();
    if (!authToken) return;
    try {
      await api.markNotificationRead(authToken, id);
      set((state) => ({
        notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
      }));
    } catch (e) {
      console.error("Failed to mark notification read", e);
    }
  },

  handleConnectRepo: async (payload) => {
    const { authToken, fetchNotifications } = get();
    if (!authToken) return;
    try {
      const data = await api.createRepository(authToken, payload);
      set((state) => ({ repositories: [data.repository, ...state.repositories] }));
      await fetchNotifications();
    } catch (e) {
      throw e;
    }
  },

  handleDeleteRepo: async (id: string, navigate?: (path: string) => void, selectedRepoId?: string | null) => {
    const { authToken, fetchNotifications } = get();
    if (!authToken) return;
    if (confirm("Are you sure you want to delete this repository and its analysis history?")) {
      try {
        await api.deleteRepository(authToken, id);
        set((state) => ({ repositories: state.repositories.filter((r) => r.id !== id) }));
        if (navigate && selectedRepoId === id) navigate('/');
        await fetchNotifications();
      } catch (e) {
        throw e;
      }
    }
  },

  handleSaveFile: async (selectedRepoId: string, path: string, content: string) => {
    const { authToken, fetchRepoDetails } = get();
    if (!authToken) return;
    try {
      await api.saveFile(authToken, selectedRepoId, path, content);
      await fetchRepoDetails(selectedRepoId);
    } catch (e) {
      throw e;
    }
  },

  handleDeleteFile: async (selectedRepoId: string, path: string) => {
    const { authToken, fetchRepoDetails } = get();
    if (!authToken) return;
    try {
      await api.deleteFile(authToken, selectedRepoId, path);
      await fetchRepoDetails(selectedRepoId);
    } catch (e) {
      throw e;
    }
  },

  handleTriggerAnalysis: async (selectedRepoId: string, analysisType: string, payload: any = {}) => {
    const { authToken, fetchNotifications } = get();
    if (!authToken) return;
    try {
      const data = await api.triggerAnalysis(authToken, selectedRepoId, analysisType, payload);
      set((state) => ({ activeAnalyses: [data.analysis, ...state.activeAnalyses] }));
      await fetchNotifications();
    } catch (e) {
      throw e;
    }
  },
}));
