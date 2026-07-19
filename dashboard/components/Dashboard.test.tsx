import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import { useAppStore } from '../store/useAppStore';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual as any,
    useNavigate: () => mockNavigate,
  };
});

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      repositories: [
        { id: '1', name: 'Test Repo 1', language: 'TypeScript', framework: 'React', status: 'ready', sourceType: 'zip', userId: '1', localPath: '/test', branch: 'main', connectedAt: '2026-07-18T00:00:00Z', files: [] },
      ],
      user: { id: '1', username: 'TestUser', email: 'test@example.com', role: 'developer' },
      handleConnectRepo: vi.fn(),
      handleDeleteRepo: vi.fn(),
    });
  });

  const renderDashboard = () => {
    return render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );
  };

  it('renders dashboard with repositories', () => {
    renderDashboard();
    expect(screen.getByText('Test Repo 1')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });

  it('navigates to repository detail on click', () => {
    renderDashboard();
    const repoCard = screen.getByText('Test Repo 1').closest('div.group');
    fireEvent.click(repoCard!);
    expect(mockNavigate).toHaveBeenCalledWith('/repo/1');
  });

  it('toggles connect repository modal', () => {
    renderDashboard();
    const addBtn = screen.getByText('New Workspace Project');
    fireEvent.click(addBtn);
    expect(screen.getByText('Establish AI Assistant Workspace')).toBeInTheDocument();
    
    // Close modal
    fireEvent.click(addBtn); // Toggle off
    expect(screen.queryByText('Establish AI Assistant Workspace')).not.toBeInTheDocument();
  });

  it('submits new repository form', async () => {
    const handleConnectMock = vi.fn().mockResolvedValue({});
    useAppStore.setState({ handleConnectRepo: handleConnectMock });

    renderDashboard();
    fireEvent.click(screen.getByText('New Workspace Project'));

    // Switch to zip tab since it defaults to zip, let's just use it
    fireEvent.change(screen.getByPlaceholderText('e.g. weather-microservice'), { target: { value: 'New Test Project' } });
    
    const submitBtn = screen.getByRole('button', { name: /Initialize/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleConnectMock).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New Test Project',
        sourceType: 'zip',
      }));
    });
  });

  it('calls handleDeleteRepo when delete button is clicked', () => {
    const handleDeleteMock = vi.fn();
    useAppStore.setState({ handleDeleteRepo: handleDeleteMock });

    renderDashboard();
    const deleteBtn = screen.getByTitle('Delete Project Workspace');
    fireEvent.click(deleteBtn);

    expect(handleDeleteMock).toHaveBeenCalledWith('1');
  });
});
