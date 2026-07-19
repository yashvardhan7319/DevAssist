import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from './useAppStore';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    getMe: vi.fn(),
    getRepositories: vi.fn(),
    getNotifications: vi.fn(),
    getRepositoryDetails: vi.fn(),
    markNotificationRead: vi.fn(),
    createRepository: vi.fn(),
    deleteRepository: vi.fn(),
    saveFile: vi.fn(),
    deleteFile: vi.fn(),
    triggerAnalysis: vi.fn(),
  },
}));

describe('useAppStore (State & State API tests)', () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.setState({
      authToken: null,
      user: null,
      repositories: [],
      activeAnalyses: [],
      notifications: [],
      showNotifications: false,
    });
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const state = useAppStore.getState();
    expect(state.authToken).toBeNull();
    expect(state.user).toBeNull();
    expect(state.repositories).toEqual([]);
    expect(state.activeAnalyses).toEqual([]);
    expect(state.notifications).toEqual([]);
    expect(state.showNotifications).toBe(false);
  });

  it('handleAuthSuccess should set token and user, and update localStorage', () => {
    const mockUser = { id: '1', username: 'testuser', email: 'test@example.com', role: 'admin' as const };
    const mockToken = 'mock-token-123';

    useAppStore.getState().handleAuthSuccess(mockToken, mockUser);

    const state = useAppStore.getState();
    expect(state.authToken).toBe(mockToken);
    expect(state.user).toEqual(mockUser);
    expect(localStorage.getItem('ais_auth_token')).toBe(mockToken);
    expect(localStorage.getItem('ais_user')).toBe(JSON.stringify(mockUser));
  });

  it('handleLogout should clear state and localStorage', () => {
    localStorage.setItem('ais_auth_token', 'token');
    localStorage.setItem('ais_user', 'user');
    useAppStore.setState({ authToken: 'token', user: { id: '1' } as any });

    useAppStore.getState().handleLogout();

    const state = useAppStore.getState();
    expect(state.authToken).toBeNull();
    expect(state.user).toBeNull();
    expect(state.repositories).toEqual([]);
    expect(localStorage.getItem('ais_auth_token')).toBeNull();
    expect(localStorage.getItem('ais_user')).toBeNull();
  });

  it('setShowNotifications should toggle notification visibility', () => {
    useAppStore.getState().setShowNotifications(true);
    expect(useAppStore.getState().showNotifications).toBe(true);

    useAppStore.getState().setShowNotifications(false);
    expect(useAppStore.getState().showNotifications).toBe(false);
  });

  it('fetchUserProfile should update user on success', async () => {
    useAppStore.setState({ authToken: 'token' });
    const mockUser = { id: '2', username: 'user2', email: '2@2.com', role: 'developer' as const };
    (api.getMe as any).mockResolvedValue({ user: mockUser });

    await useAppStore.getState().fetchUserProfile();

    expect(useAppStore.getState().user).toEqual(mockUser);
  });

  it('fetchRepositories should update repositories on success', async () => {
    useAppStore.setState({ authToken: 'token' });
    const mockRepos = [{ id: 'repo1', name: 'Repo 1' }];
    (api.getRepositories as any).mockResolvedValue({ repositories: mockRepos });

    await useAppStore.getState().fetchRepositories();

    expect(useAppStore.getState().repositories).toEqual(mockRepos);
  });

  it('fetchNotifications should update notifications', async () => {
    useAppStore.setState({ authToken: 'token' });
    const mockNotifications = [{ id: 'notif1', message: 'Hello', read: false }];
    (api.getNotifications as any).mockResolvedValue({ notifications: mockNotifications });

    await useAppStore.getState().fetchNotifications();

    expect(useAppStore.getState().notifications).toEqual(mockNotifications);
  });

  it('markNotificationRead should update notification read status', async () => {
    useAppStore.setState({ 
      authToken: 'token',
      notifications: [{ id: 'notif1', userId: '1', type: 'info', message: 'Hello', read: false } as any]
    });
    
    (api.markNotificationRead as any).mockResolvedValue({});

    await useAppStore.getState().markNotificationRead('notif1');

    const state = useAppStore.getState();
    expect(state.notifications[0].read).toBe(true);
  });
  
  it('handleConnectRepo should call createRepository and refresh repositories', async () => {
    useAppStore.setState({ authToken: 'token', repositories: [] });
    const mockPayload = { name: 'New Repo', sourceType: 'zip' as const };
    const newRepo = { id: 'repo2', name: 'New Repo' };
    
    (api.createRepository as any).mockResolvedValue({ repository: newRepo });
    (api.getNotifications as any).mockResolvedValue({ notifications: [] });

    await useAppStore.getState().handleConnectRepo(mockPayload);

    expect(api.createRepository).toHaveBeenCalledWith('token', mockPayload);
    expect(useAppStore.getState().repositories).toEqual([newRepo]);
  });
});
